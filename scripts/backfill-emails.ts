#!/usr/bin/env tsx
/**
 * One-time backfill script to import historical wedding emails
 * Run: tsx scripts/backfill-emails.ts
 */

import { processAllEmails } from "../lib/email-processor";

async function main() {
  console.log("========================================");
  console.log("  Reggie Email Backfill");
  console.log("========================================\n");

  // Backfill from October 2025 (engagement date)
  const startDate = new Date("2025-10-01");

  console.log(`Backfilling emails from ${startDate.toISOString()}...\n`);

  const stats = await processAllEmails(startDate);

  console.log("\n========================================");
  console.log("  Backfill Complete");
  console.log("========================================");
  console.log(`Total emails: ${stats.totalEmails}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
  console.log("\nCreated records:");
  console.log(`  - Vendors: ${stats.created.vendors}`);
  console.log(`  - Guests: ${stats.created.guests}`);
  console.log(`  - Tasks: ${stats.created.tasks}`);
  console.log(`  - Timeline: ${stats.created.timeline}`);
  console.log(`  - Financial: ${stats.created.financial}`);
  console.log(`  - Venues: ${stats.created.venues}`);
  console.log("========================================\n");

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
