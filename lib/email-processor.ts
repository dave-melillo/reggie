/**
 * Email processing orchestrator
 * Fetches emails → Extracts data → Stores in database
 */

import { PrismaClient } from "@prisma/client";
import { fetchAllWeddingEmails, type GmailMessage } from "./email-fetcher";
import {
  extractDataFromEmail,
  classifyKnownVendor,
  type ExtractionResult,
  type VendorExtraction,
  type GuestExtraction,
  type TaskExtraction,
  type TimelineExtraction,
  type FinancialExtraction,
  type VenueExtraction,
} from "./ai-extractor";

const prisma = new PrismaClient();

export interface ProcessingStats {
  totalEmails: number;
  processed: number;
  skipped: number; // Already processed
  created: {
    vendors: number;
    guests: number;
    tasks: number;
    timeline: number;
    financial: number;
    venues: number;
  };
  errors: number;
}

/**
 * Process a single email: extract data and store
 */
async function processEmail(
  message: GmailMessage,
  stats: ProcessingStats
): Promise<void> {
  // Check if already processed
  const existing = await prisma.emailLog.findUnique({
    where: { messageId: message.id },
  });

  if (existing?.processed) {
    console.log(`[processor] Skipping already processed email: ${message.id}`);
    stats.skipped++;
    return;
  }

  try {
    // Store/update email log
    const emailLog = await prisma.emailLog.upsert({
      where: { messageId: message.id },
      create: {
        messageId: message.id,
        threadId: message.threadId,
        from: message.from,
        subject: message.subject,
        receivedAt: new Date(message.date),
        bodyPreview: message.snippet,
        bodyFull: message.body,
        processed: false,
      },
      update: {
        bodyFull: message.body,
      },
    });

    // Check for known vendor classification
    const knownVendor = classifyKnownVendor(message.from, message.body);

    // Extract structured data using AI
    const extraction = await extractDataFromEmail({
      from: message.from,
      subject: message.subject,
      body: message.body,
      receivedAt: new Date(message.date),
    });

    console.log(
      `[processor] Extraction result for ${message.id}: type=${extraction.type}, confidence=${extraction.type !== "none" ? extraction.confidence : "N/A"}`
    );

    // Store extracted data based on type
    if (extraction.type !== "none") {
      await storeExtractedData(extraction, message.id, knownVendor);

      // Update email log with extraction result
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          processed: true,
          extractedData: extraction as any, // Store full extraction for audit
        },
      });

      stats.processed++;
    } else {
      console.log(
        `[processor] No actionable data extracted: ${extraction.reason}`
      );
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          processed: true,
          extractedData: { reason: extraction.reason },
        },
      });
      stats.skipped++;
    }
  } catch (error) {
    console.error(`[processor] Failed to process email ${message.id}:`, error);
    stats.errors++;
  }
}

/**
 * Store extracted data in appropriate database tables
 */
async function storeExtractedData(
  extraction: Exclude<ExtractionResult, { type: "none" }>,
  emailId: string,
  knownVendor?: { isKnown: boolean; category?: string; name?: string }
): Promise<void> {
  const stats = {
    vendors: 0,
    guests: 0,
    tasks: 0,
    timeline: 0,
    financial: 0,
    venues: 0,
  };

  switch (extraction.type) {
    case "vendor": {
      const data = (extraction as VendorExtraction).data;

      // Override category if known vendor
      if (knownVendor?.isKnown && knownVendor.category) {
        data.category = knownVendor.category as any;
      }
      if (knownVendor?.name) {
        data.name = knownVendor.name;
      }

      // Check for duplicate vendor (by email or name)
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          OR: [
            { email: data.email },
            { name: { equals: data.name, mode: "insensitive" } },
          ],
        },
      });

      let vendorId: string;

      if (existingVendor) {
        // Update existing vendor with new info
        const updated = await prisma.vendor.update({
          where: { id: existingVendor.id },
          data: {
            contact: data.contact || existingVendor.contact,
            phone: data.phone || existingVendor.phone,
            contractedAmount:
              data.contractedAmount || existingVendor.contractedAmount,
            paidAmount: data.paidAmount || existingVendor.paidAmount,
            dueDate: data.dueDate
              ? new Date(data.dueDate)
              : existingVendor.dueDate,
            status: data.status || existingVendor.status,
            notes: data.notes
              ? `${existingVendor.notes || ""}\n${data.notes}`.trim()
              : existingVendor.notes,
          },
        });
        vendorId = updated.id;
        console.log(`[processor] Updated existing vendor: ${data.name}`);
      } else {
        // Create new vendor
        const created = await prisma.vendor.create({
          data: {
            name: data.name,
            category: data.category,
            contact: data.contact,
            email: data.email,
            phone: data.phone,
            contractedAmount: data.contractedAmount || 0,
            paidAmount: data.paidAmount || 0,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            status: data.status || "PENDING",
            notes: data.notes,
          },
        });
        vendorId = created.id;
        stats.vendors++;
        console.log(`[processor] Created vendor: ${data.name}`);
      }

      // Track data source
      await prisma.dataSource.create({
        data: {
          recordType: "VENDOR",
          recordId: vendorId,
          source: "EMAIL",
          sourceId: emailId,
          confidence: extraction.confidence,
        },
      });

      break;
    }

    case "guest": {
      const data = (extraction as GuestExtraction).data;

      // Check for duplicate guest (by email or name)
      const existingGuest = await prisma.guest.findFirst({
        where: {
          OR: [
            { email: data.email },
            {
              AND: [
                { firstName: { equals: data.firstName, mode: "insensitive" } },
                { lastName: { equals: data.lastName, mode: "insensitive" } },
              ],
            },
          ],
        },
      });

      let guestId: string;

      if (existingGuest) {
        // Update existing guest
        const updated = await prisma.guest.update({
          where: { id: existingGuest.id },
          data: {
            email: data.email || existingGuest.email,
            phone: data.phone || existingGuest.phone,
            category: data.category || existingGuest.category,
            inviteType: data.inviteType || existingGuest.inviteType,
            plusOne: data.plusOne ?? existingGuest.plusOne,
            rsvpStatus: data.rsvpStatus || existingGuest.rsvpStatus,
            dietaryRestrictions:
              data.dietaryRestrictions || existingGuest.dietaryRestrictions,
            notes: data.notes
              ? `${existingGuest.notes || ""}\n${data.notes}`.trim()
              : existingGuest.notes,
          },
        });
        guestId = updated.id;
        console.log(`[processor] Updated existing guest: ${data.firstName} ${data.lastName}`);
      } else {
        // Create new guest
        const created = await prisma.guest.create({
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            category: data.category,
            inviteType: data.inviteType,
            plusOne: data.plusOne || false,
            rsvpStatus: data.rsvpStatus || "PENDING",
            dietaryRestrictions: data.dietaryRestrictions,
            notes: data.notes,
          },
        });
        guestId = created.id;
        stats.guests++;
        console.log(`[processor] Created guest: ${data.firstName} ${data.lastName}`);
      }

      await prisma.dataSource.create({
        data: {
          recordType: "GUEST",
          recordId: guestId,
          source: "EMAIL",
          sourceId: emailId,
          confidence: extraction.confidence,
        },
      });

      break;
    }

    case "task": {
      const data = (extraction as TaskExtraction).data;

      // Create task (tasks are less likely to be duplicates)
      const created = await prisma.task.create({
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority || "MEDIUM",
          status: data.status || "TODO",
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          assignedTo: data.assignedTo,
        },
      });

      stats.tasks++;
      console.log(`[processor] Created task: ${data.title}`);

      await prisma.dataSource.create({
        data: {
          recordType: "TASK",
          recordId: created.id,
          source: "EMAIL",
          sourceId: emailId,
          confidence: extraction.confidence,
        },
      });

      break;
    }

    case "timeline": {
      const data = (extraction as TimelineExtraction).data;

      // Check for duplicate timeline event (by date + title)
      const existingEvent = await prisma.timeline.findFirst({
        where: {
          eventDate: new Date(data.eventDate),
          title: { equals: data.title, mode: "insensitive" },
        },
      });

      let eventId: string;

      if (existingEvent) {
        // Update existing event
        const updated = await prisma.timeline.update({
          where: { id: existingEvent.id },
          data: {
            description: data.description || existingEvent.description,
            location: data.location || existingEvent.location,
            duration: data.duration || existingEvent.duration,
            category: data.category || existingEvent.category,
            status: data.status || existingEvent.status,
          },
        });
        eventId = updated.id;
        console.log(`[processor] Updated existing timeline event: ${data.title}`);
      } else {
        // Create new event
        const created = await prisma.timeline.create({
          data: {
            eventDate: new Date(data.eventDate),
            title: data.title,
            description: data.description,
            location: data.location,
            duration: data.duration || 60,
            category: data.category,
            status: data.status || "PLANNED",
          },
        });
        eventId = created.id;
        stats.timeline++;
        console.log(`[processor] Created timeline event: ${data.title}`);
      }

      await prisma.dataSource.create({
        data: {
          recordType: "TIMELINE",
          recordId: eventId,
          source: "EMAIL",
          sourceId: emailId,
          confidence: extraction.confidence,
        },
      });

      break;
    }

    case "financial": {
      const data = (extraction as FinancialExtraction).data;

      // Create financial entry (or check for duplicates by category + description)
      const existingEntry = await prisma.financial.findFirst({
        where: {
          category: { equals: data.category, mode: "insensitive" },
          description: { equals: data.description, mode: "insensitive" },
        },
      });

      let entryId: string;

      if (existingEntry) {
        // Update existing entry
        const updated = await prisma.financial.update({
          where: { id: existingEntry.id },
          data: {
            budgetAmount: data.budgetAmount || existingEntry.budgetAmount,
            actualAmount: data.actualAmount || existingEntry.actualAmount,
            paidAmount: data.paidAmount || existingEntry.paidAmount,
            notes: data.notes
              ? `${existingEntry.notes || ""}\n${data.notes}`.trim()
              : existingEntry.notes,
          },
        });
        entryId = updated.id;
        console.log(`[processor] Updated existing financial entry: ${data.description}`);
      } else {
        // Create new entry
        const created = await prisma.financial.create({
          data: {
            category: data.category,
            description: data.description,
            budgetAmount: data.budgetAmount || 0,
            actualAmount: data.actualAmount || 0,
            paidAmount: data.paidAmount || 0,
            notes: data.notes,
          },
        });
        entryId = created.id;
        stats.financial++;
        console.log(`[processor] Created financial entry: ${data.description}`);
      }

      await prisma.dataSource.create({
        data: {
          recordType: "FINANCIAL",
          recordId: entryId,
          source: "EMAIL",
          sourceId: emailId,
          confidence: extraction.confidence,
        },
      });

      break;
    }

    case "venue": {
      const data = (extraction as VenueExtraction).data;

      // Check for duplicate venue (by name)
      const existingVenue = await prisma.venue.findFirst({
        where: {
          name: { equals: data.name, mode: "insensitive" },
        },
      });

      let venueId: string;

      if (existingVenue) {
        // Update existing venue
        const updated = await prisma.venue.update({
          where: { id: existingVenue.id },
          data: {
            type: data.type || existingVenue.type,
            address: data.address || existingVenue.address,
            capacity: data.capacity || existingVenue.capacity,
            rentalCost: data.rentalCost || existingVenue.rentalCost,
            contact: data.contact || existingVenue.contact,
            phone: data.phone || existingVenue.phone,
            email: data.email || existingVenue.email,
            availableFrom: data.availableFrom
              ? new Date(data.availableFrom)
              : existingVenue.availableFrom,
            availableTo: data.availableTo
              ? new Date(data.availableTo)
              : existingVenue.availableTo,
            notes: data.notes
              ? `${existingVenue.notes || ""}\n${data.notes}`.trim()
              : existingVenue.notes,
          },
        });
        venueId = updated.id;
        console.log(`[processor] Updated existing venue: ${data.name}`);
      } else {
        // Create new venue
        const created = await prisma.venue.create({
          data: {
            name: data.name,
            type: data.type,
            address: data.address,
            capacity: data.capacity || 0,
            rentalCost: data.rentalCost || 0,
            contact: data.contact,
            phone: data.phone,
            email: data.email,
            availableFrom: data.availableFrom
              ? new Date(data.availableFrom)
              : new Date(),
            availableTo: data.availableTo
              ? new Date(data.availableTo)
              : new Date(),
            notes: data.notes,
          },
        });
        venueId = created.id;
        stats.venues++;
        console.log(`[processor] Created venue: ${data.name}`);
      }

      await prisma.dataSource.create({
        data: {
          recordType: "VENUE",
          recordId: venueId,
          source: "EMAIL",
          sourceId: emailId,
          confidence: extraction.confidence,
        },
      });

      break;
    }
  }
}

/**
 * Process all wedding emails from Gmail
 */
export async function processAllEmails(
  after?: Date
): Promise<ProcessingStats> {
  console.log("[processor] Starting email processing...");

  const stats: ProcessingStats = {
    totalEmails: 0,
    processed: 0,
    skipped: 0,
    created: {
      vendors: 0,
      guests: 0,
      tasks: 0,
      timeline: 0,
      financial: 0,
      venues: 0,
    },
    errors: 0,
  };

  try {
    // Fetch all wedding emails
    const messages = await fetchAllWeddingEmails(after);
    stats.totalEmails = messages.length;

    console.log(`[processor] Processing ${messages.length} emails...`);

    // Process each email sequentially (to avoid rate limits)
    for (const message of messages) {
      await processEmail(message, stats);

      // Small delay to avoid overwhelming the AI API
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("[processor] Processing complete:", stats);
    return stats;
  } catch (error) {
    console.error("[processor] Fatal error during processing:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
