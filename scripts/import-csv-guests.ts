#!/usr/bin/env tsx
/**
 * Import guests from a CSV export.
 * CSV columns: Title, First Name, Last Name, Suffix, Wedding (Attending|Declined)
 *
 * Usage:
 *   tsx scripts/import-csv-guests.ts <path-to-csv> [--wipe]
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  firstName: string;
  lastName: string;
  suffix: string;
  wedding: string;
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: Row[] = [];
  // Skip header (first line)
  for (let i = 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i]);
    if (fields.length < 5) continue;
    const [, first, last, suffix, wedding] = fields;
    out.push({
      firstName: first.trim(),
      lastName: last.trim(),
      suffix: suffix.trim(),
      wedding: wedding.trim(),
    });
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function rsvpFor(wedding: string): string {
  const w = wedding.toLowerCase();
  if (w.startsWith("attend")) return "CONFIRMED";
  if (w.startsWith("declin")) return "DECLINED";
  return "PENDING";
}

async function main() {
  const path = process.argv[2];
  const wipe = process.argv.includes("--wipe");
  if (!path) {
    console.error("Usage: tsx scripts/import-csv-guests.ts <path-to-csv> [--wipe]");
    process.exit(1);
  }

  const text = readFileSync(path, "utf8");
  const rows = parseCsv(text);

  // Skip "Guest" placeholders without a last name (unfilled +1 slots)
  const real = rows.filter((r) => !(r.firstName.toLowerCase() === "guest" && !r.lastName));
  console.log(
    `[import] ${rows.length} rows in CSV, ${real.length} after dropping unnamed "Guest" placeholders`
  );

  if (wipe) {
    console.log("[import] --wipe set: deleting existing guests and DataSource/SeatingChart records");
    await prisma.dataSource.deleteMany({ where: { recordType: "GUEST" } });
    await prisma.seatingChart.deleteMany({});
    const del = await prisma.guest.deleteMany({});
    console.log(`[import] Deleted ${del.count} existing guests`);
  }

  let created = 0;
  let skipped = 0;
  for (const r of real) {
    const lastName = r.suffix ? `${r.lastName} ${r.suffix}` : r.lastName;
    if (!r.firstName || !lastName) {
      skipped++;
      continue;
    }
    try {
      await prisma.guest.create({
        data: {
          firstName: r.firstName,
          lastName,
          category: "FAMILY",
          inviteType: "CEREMONY_RECEPTION",
          plusOne: false,
          rsvpStatus: rsvpFor(r.wedding),
        },
      });
      created++;
    } catch (err) {
      console.error(`[import] failed: ${r.firstName} ${lastName}`, err);
      skipped++;
    }
  }

  const total = await prisma.guest.count();
  const confirmed = await prisma.guest.count({ where: { rsvpStatus: "CONFIRMED" } });
  const declined = await prisma.guest.count({ where: { rsvpStatus: "DECLINED" } });
  console.log(`[import] created=${created} skipped=${skipped}`);
  console.log(`[import] DB now has total=${total} confirmed=${confirmed} declined=${declined}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
