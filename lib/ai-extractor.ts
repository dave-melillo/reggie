/**
 * AI-powered email extraction service
 * Uses Claude Sonnet 4.5 to extract structured wedding data from emails
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface EmailContext {
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

export interface VendorExtraction {
  type: "vendor";
  data: {
    name: string;
    category: "VENUE" | "CATERING" | "PHOTOGRAPHY" | "DJ" | "FLORIST" | "OTHER";
    contact: string;
    email?: string;
    phone?: string;
    contractedAmount?: number; // in cents
    paidAmount?: number; // in cents
    dueDate?: string; // ISO date
    status?: "PENDING" | "CONTRACTED" | "PAID";
    notes?: string;
  };
  confidence: number; // 0-1
}

export interface GuestExtraction {
  type: "guest";
  data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    category: "FAMILY" | "FRIEND" | "WORK" | "VENDOR";
    inviteType: "CEREMONY_RECEPTION" | "RECEPTION_ONLY";
    plusOne?: boolean;
    rsvpStatus?: "PENDING" | "CONFIRMED" | "DECLINED";
    dietaryRestrictions?: string;
    notes?: string;
  };
  confidence: number;
}

export interface TaskExtraction {
  type: "task";
  data: {
    title: string;
    description?: string;
    category: "PLANNING" | "VENDOR" | "GUEST" | "DAY_OF";
    priority?: "LOW" | "MEDIUM" | "HIGH";
    status?: "TODO" | "IN_PROGRESS" | "DONE";
    dueDate?: string; // ISO date
    assignedTo?: string;
  };
  confidence: number;
}

export interface TimelineExtraction {
  type: "timeline";
  data: {
    eventDate: string; // ISO datetime
    title: string;
    description?: string;
    location?: string;
    duration?: number; // minutes
    category: "CEREMONY" | "RECEPTION" | "VENDOR";
    status?: "PLANNED" | "CONFIRMED" | "COMPLETE";
  };
  confidence: number;
}

export interface FinancialExtraction {
  type: "financial";
  data: {
    category: string;
    description: string;
    budgetAmount?: number; // in cents
    actualAmount?: number; // in cents
    paidAmount?: number; // in cents
    notes?: string;
  };
  confidence: number;
}

export interface VenueExtraction {
  type: "venue";
  data: {
    name: string;
    type: "CEREMONY" | "RECEPTION" | "BOTH";
    address: string;
    capacity?: number;
    rentalCost?: number; // in cents
    contact: string;
    phone?: string;
    email?: string;
    availableFrom?: string; // ISO datetime
    availableTo?: string; // ISO datetime
    notes?: string;
  };
  confidence: number;
}

export type ExtractionResult =
  | VendorExtraction
  | GuestExtraction
  | TaskExtraction
  | TimelineExtraction
  | FinancialExtraction
  | VenueExtraction
  | { type: "none"; reason: string };

const SYSTEM_PROMPT = `You are an AI wedding planning assistant. Your job is to extract structured data from wedding-related emails.

Given an email, analyze it and extract relevant wedding information. Classify the data into one of these categories:
- vendor: Vendors/suppliers (venue, catering, photography, DJ, florist, etc.)
- guest: Guest information (names, contact info, RSVP status)
- task: Planning tasks or action items
- timeline: Wedding day schedule/timeline events
- financial: Budget items, payments, invoices
- venue: Venue details (ceremony/reception locations)

Known vendor patterns (high confidence):
- lauren.good@trumpgolf.com → VENUE category
- thisisitent.com OR "this is it entertainment" → DJ category
- "ann coen photography" OR photographer named "ryan" → PHOTOGRAPHY category

For monetary amounts:
- Convert to cents (e.g., $50.00 → 5000)
- Extract from phrases like "deposit of $X", "total cost $Y", "paid $Z"

For dates:
- Return ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
- Look for "due by", "event date", "available from/to"

Return JSON in this exact format:
{
  "type": "vendor" | "guest" | "task" | "timeline" | "financial" | "venue" | "none",
  "data": { /* structured fields based on type */ },
  "confidence": 0.0 to 1.0,
  "reason": "explanation if type is none"
}

If the email is not wedding-related or contains no actionable data, return:
{ "type": "none", "reason": "brief explanation" }

Be conservative with confidence scores:
- 0.9-1.0: Explicit wedding data with clear fields
- 0.7-0.9: Strong indicators but some missing details
- 0.5-0.7: Weak signals or ambiguous content
- Below 0.5: Low confidence, may be noise`;

export async function extractDataFromEmail(
  context: EmailContext
): Promise<ExtractionResult> {
  const prompt = `From: ${context.from}
Subject: ${context.subject}
Date: ${context.receivedAt.toISOString()}

Body:
${context.body}

---

Extract structured wedding data from this email.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 2048,
      temperature: 0.0, // Deterministic extraction
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Claude response");
    }

    const result = JSON.parse(jsonMatch[0]) as ExtractionResult;

    // Validate confidence score
    if (
      result.type !== "none" &&
      (result.confidence < 0 || result.confidence > 1)
    ) {
      console.warn(
        `Invalid confidence score: ${result.confidence}, clamping to [0,1]`
      );
      result.confidence = Math.max(0, Math.min(1, result.confidence));
    }

    return result;
  } catch (error) {
    console.error("AI extraction failed:", error);
    return {
      type: "none",
      reason: `Extraction error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Extract links from email body
 */
export function extractLinks(body: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"]+/gi;
  return Array.from(new Set(body.match(urlRegex) || []));
}

/**
 * Determine if email is from a known vendor
 */
export function classifyKnownVendor(from: string, body: string): {
  isKnown: boolean;
  category?: string;
  name?: string;
} {
  const fromLower = from.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Venue
  if (fromLower.includes("lauren.good@trumpgolf.com")) {
    return { isKnown: true, category: "VENUE", name: "Trump Golf" };
  }

  // DJ
  if (
    fromLower.includes("thisisitent.com") ||
    bodyLower.includes("this is it entertainment")
  ) {
    return { isKnown: true, category: "DJ", name: "This Is It Entertainment" };
  }

  // Photography
  if (
    bodyLower.includes("ann coen photography") ||
    (bodyLower.includes("photographer") && bodyLower.includes("ryan"))
  ) {
    return {
      isKnown: true,
      category: "PHOTOGRAPHY",
      name: "Ann Coen Photography",
    };
  }

  return { isKnown: false };
}
