/**
 * Email fetching service using gog CLI
 * Fetches wedding-related emails from Gmail
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface GmailMessage {
  id: string; // Gmail message ID
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string; // ISO timestamp
  snippet: string; // Preview text
  body: string; // Full body (plain text)
}

export interface EmailFetchOptions {
  account?: string; // Gmail account (defaults to env.GOG_ACCOUNT)
  query: string; // Gmail search query
  maxResults?: number; // Max messages to fetch
  after?: Date; // Only fetch emails after this date
}

/**
 * Fetch emails using gog CLI
 */
export async function fetchEmails(
  options: EmailFetchOptions
): Promise<GmailMessage[]> {
  const account = options.account || process.env.GOG_ACCOUNT || "dmelillo@gmail.com";
  const maxResults = options.maxResults || 100;

  let query = options.query;

  // Add date filter if provided
  if (options.after) {
    const afterDate = options.after.toISOString().split("T")[0]; // YYYY-MM-DD
    query = `${query} after:${afterDate}`;
  }

  try {
    // Use gog gmail messages search to get individual emails (not threads)
    const searchCmd = `gog gmail messages search "${query}" --account ${account} --max ${maxResults} --json --no-input`;

    console.log(`[email-fetcher] Running: ${searchCmd}`);
    const { stdout: searchOutput } = await execAsync(searchCmd, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large result sets
    });

    if (!searchOutput.trim()) {
      console.log("[email-fetcher] No messages found");
      return [];
    }

    // Parse search results (one JSON object per line)
    const messages: GmailMessage[] = [];
    const lines = searchOutput.trim().split("\n");

    for (const line of lines) {
      try {
        const msg = JSON.parse(line);

        // Extract basic info from search result
        const message: GmailMessage = {
          id: msg.id,
          threadId: msg.threadId,
          from: msg.from || "",
          to: msg.to || "",
          subject: msg.subject || "",
          date: msg.date || new Date().toISOString(),
          snippet: msg.snippet || "",
          body: "", // Will be fetched separately
        };

        // Fetch full message body
        const getCmd = `gog gmail messages get ${msg.id} --account ${account} --format json --no-input`;
        const { stdout: bodyOutput } = await execAsync(getCmd);

        const fullMsg = JSON.parse(bodyOutput);
        message.body = fullMsg.body || fullMsg.snippet || "";

        messages.push(message);
      } catch (err) {
        console.error(`[email-fetcher] Failed to parse message:`, err);
        continue;
      }
    }

    console.log(`[email-fetcher] Fetched ${messages.length} messages`);
    return messages;
  } catch (error) {
    console.error("[email-fetcher] Failed to fetch emails:", error);
    throw new Error(
      `Email fetch failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Build Gmail search queries for known vendors
 */
export function buildVendorQueries(after?: Date): EmailFetchOptions[] {
  return [
    // Venue
    {
      query: "from:lauren.good@trumpgolf.com",
      after,
      maxResults: 50,
    },
    // DJ
    {
      query: 'from:thisisitent.com OR "this is it entertainment"',
      after,
      maxResults: 50,
    },
    // Photography
    {
      query: '"ann coen photography" OR (photographer ryan)',
      after,
      maxResults: 50,
    },
  ];
}

/**
 * Build general wedding search query
 */
export function buildGeneralWeddingQuery(after?: Date): EmailFetchOptions {
  return {
    query:
      'wedding OR "save the date" OR RSVP OR venue OR catering OR "bridal shower" OR reception OR ceremony',
    after,
    maxResults: 100,
  };
}

/**
 * Fetch all wedding-related emails (vendors + general)
 */
export async function fetchAllWeddingEmails(
  after?: Date
): Promise<GmailMessage[]> {
  const allMessages: GmailMessage[] = [];
  const messageIds = new Set<string>(); // Deduplicate by message ID

  // Fetch known vendor emails
  const vendorQueries = buildVendorQueries(after);
  for (const query of vendorQueries) {
    const messages = await fetchEmails(query);
    for (const msg of messages) {
      if (!messageIds.has(msg.id)) {
        messageIds.add(msg.id);
        allMessages.push(msg);
      }
    }
  }

  // Fetch general wedding emails
  const generalQuery = buildGeneralWeddingQuery(after);
  const generalMessages = await fetchEmails(generalQuery);
  for (const msg of generalMessages) {
    if (!messageIds.has(msg.id)) {
      messageIds.add(msg.id);
      allMessages.push(msg);
    }
  }

  console.log(
    `[email-fetcher] Total unique messages: ${allMessages.length}`
  );
  return allMessages;
}
