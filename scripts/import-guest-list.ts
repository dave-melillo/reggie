#!/usr/bin/env tsx
/**
 * Import guest list from Google Sheets
 * Run: tsx scripts/import-guest-list.ts
 */

import { exec } from "child_process";
import { promisify } from "util";
import { PrismaClient } from "@prisma/client";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const SHEET_ID = "1rECLkZzokcWi1FoJFV6FvnXEDtID60tmVLhowcsMsTY";
const SHEET_TAB = "List_Final";
const SHEET_RANGE = `${SHEET_TAB}!A:Z`; // Fetch all columns

interface SheetRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  category?: string;
  inviteType?: string;
  plusOne?: boolean;
  rsvpStatus?: string;
  dietaryRestrictions?: string;
  notes?: string;
}

async function fetchGuestListFromSheets(): Promise<any[][]> {
  console.log(`[sheets] Fetching guest list from ${SHEET_ID}...`);

  const cmd = `gog sheets get ${SHEET_ID} "${SHEET_RANGE}" --json --no-input`;

  try {
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);

    if (!data.values || !Array.isArray(data.values)) {
      throw new Error("Invalid sheet data format");
    }

    console.log(`[sheets] Fetched ${data.values.length} rows`);
    return data.values;
  } catch (error) {
    console.error("[sheets] Failed to fetch guest list:", error);
    throw error;
  }
}

function parseSheetRows(rows: any[][]): SheetRow[] {
  if (rows.length === 0) {
    return [];
  }

  // Assume first row is headers
  const headers = rows[0].map((h: string) =>
    h.toLowerCase().replace(/\s+/g, "")
  );

  const guests: SheetRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const guest: SheetRow = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      if (!value) continue;

      switch (header) {
        case "firstname":
        case "first":
          guest.firstName = String(value).trim();
          break;
        case "lastname":
        case "last":
          guest.lastName = String(value).trim();
          break;
        case "email":
          guest.email = String(value).trim();
          break;
        case "phone":
        case "phonenumber":
          guest.phone = String(value).trim();
          break;
        case "category":
        case "type":
          guest.category = mapCategory(String(value).trim());
          break;
        case "invitetype":
        case "invite":
          guest.inviteType = mapInviteType(String(value).trim());
          break;
        case "plusone":
        case "+1":
          guest.plusOne = parseBoolean(String(value).trim());
          break;
        case "rsvp":
        case "rsvpstatus":
          guest.rsvpStatus = mapRsvpStatus(String(value).trim());
          break;
        case "dietary":
        case "dietaryrestrictions":
        case "restrictions":
          guest.dietaryRestrictions = String(value).trim();
          break;
        case "notes":
        case "comments":
          guest.notes = String(value).trim();
          break;
      }
    }

    // Only include rows with at least first and last name
    if (guest.firstName && guest.lastName) {
      guests.push(guest);
    }
  }

  return guests;
}

function mapCategory(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("FAMILY")) return "FAMILY";
  if (normalized.includes("FRIEND")) return "FRIEND";
  if (normalized.includes("WORK")) return "WORK";
  if (normalized.includes("VENDOR")) return "VENDOR";
  return "FRIEND"; // Default
}

function mapInviteType(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("RECEPTION")) return "RECEPTION_ONLY";
  return "CEREMONY_RECEPTION"; // Default
}

function mapRsvpStatus(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized.includes("CONFIRM") || normalized.includes("YES"))
    return "CONFIRMED";
  if (normalized.includes("DECLIN") || normalized.includes("NO"))
    return "DECLINED";
  return "PENDING"; // Default
}

function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1" ||
    normalized === "y"
  );
}

async function importGuests(guests: SheetRow[]): Promise<{
  created: number;
  updated: number;
  skipped: number;
}> {
  const stats = { created: 0, updated: 0, skipped: 0 };

  for (const guest of guests) {
    if (!guest.firstName || !guest.lastName) {
      stats.skipped++;
      continue;
    }

    try {
      // Check for existing guest (by email or name)
      const existing = await prisma.guest.findFirst({
        where: {
          OR: [
            { email: guest.email },
            {
              AND: [
                {
                  firstName: { equals: guest.firstName, mode: "insensitive" },
                },
                { lastName: { equals: guest.lastName, mode: "insensitive" } },
              ],
            },
          ],
        },
      });

      if (existing) {
        // Update existing guest (prefer sheet data over existing)
        await prisma.guest.update({
          where: { id: existing.id },
          data: {
            email: guest.email || existing.email,
            phone: guest.phone || existing.phone,
            category: guest.category || existing.category,
            inviteType: guest.inviteType || existing.inviteType,
            plusOne: guest.plusOne ?? existing.plusOne,
            rsvpStatus: guest.rsvpStatus || existing.rsvpStatus,
            dietaryRestrictions:
              guest.dietaryRestrictions || existing.dietaryRestrictions,
            notes: guest.notes
              ? `${existing.notes || ""}\n[Sheet import] ${guest.notes}`.trim()
              : existing.notes,
          },
        });

        console.log(
          `[import] Updated guest: ${guest.firstName} ${guest.lastName}`
        );
        stats.updated++;
      } else {
        // Create new guest
        const created = await prisma.guest.create({
          data: {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            category: guest.category || "FRIEND",
            inviteType: guest.inviteType || "CEREMONY_RECEPTION",
            plusOne: guest.plusOne || false,
            rsvpStatus: guest.rsvpStatus || "PENDING",
            dietaryRestrictions: guest.dietaryRestrictions,
            notes: guest.notes,
          },
        });

        // Track data source
        await prisma.dataSource.create({
          data: {
            recordType: "GUEST",
            recordId: created.id,
            source: "SHEETS",
            sourceId: `${SHEET_ID}/${SHEET_TAB}`,
            confidence: 1.0, // Manual sheet data is high confidence
          },
        });

        console.log(
          `[import] Created guest: ${guest.firstName} ${guest.lastName}`
        );
        stats.created++;
      }
    } catch (error) {
      console.error(
        `[import] Failed to import guest ${guest.firstName} ${guest.lastName}:`,
        error
      );
      stats.skipped++;
    }
  }

  return stats;
}

async function main() {
  console.log("========================================");
  console.log("  Reggie Guest List Import");
  console.log("========================================\n");

  try {
    // Fetch guest list from Google Sheets
    const rows = await fetchGuestListFromSheets();

    // Parse rows into guest objects
    const guests = parseSheetRows(rows);
    console.log(`[import] Parsed ${guests.length} guests from sheet\n`);

    // Import guests into database
    const stats = await importGuests(guests);

    console.log("\n========================================");
    console.log("  Import Complete");
    console.log("========================================");
    console.log(`Created: ${stats.created}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log("========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("[import] Import failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
