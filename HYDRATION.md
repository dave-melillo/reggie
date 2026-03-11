# Reggie Email Hydration Pipeline

Automated data hydration system for Reggie wedding planning app. Extracts structured wedding data from Gmail emails and Google Sheets using AI-powered extraction.

## Features

✅ **Automated Email Scraping** - Daily Gmail sync for new wedding data  
✅ **AI Extraction** - Claude Sonnet 4.5 extracts structured data from emails  
✅ **Known Vendor Recognition** - Pre-configured vendor patterns  
✅ **Google Sheets Import** - Import guest list from spreadsheet  
✅ **Deduplication** - Smart duplicate detection and merging  
✅ **Audit Trail** - Track data sources (email, sheet, manual)  
✅ **Daily Automation** - Vercel Cron job runs at 3am daily  

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      EMAIL SOURCES                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │  Venue   │  │   DJ     │  │  Photography │ + General    │
│  │  Emails  │  │  Emails  │  │    Emails    │   Wedding    │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘   Emails     │
│       │             │                │                       │
│       └─────────────┴────────────────┴──────────────┐       │
│                                                      │       │
└──────────────────────────────────────────────────────┼───────┘
                                                       │
                                                       ▼
                                          ┌────────────────────┐
                                          │   EMAIL FETCHER    │
                                          │  (gog CLI + Gmail) │
                                          └─────────┬──────────┘
                                                    │
                                                    ▼
                                          ┌────────────────────┐
                                          │   EMAIL PROCESSOR  │
                                          │  (orchestrator)    │
                                          └─────────┬──────────┘
                                                    │
                                                    ▼
                                          ┌────────────────────┐
                                          │   AI EXTRACTOR     │
                                          │ (Claude Sonnet 4.5)│
                                          └─────────┬──────────┘
                                                    │
                                                    ▼
                                          ┌────────────────────┐
                                          │   PRISMA DATABASE  │
                                          │  - Guest           │
                                          │  - Vendor          │
                                          │  - Task            │
                                          │  - Timeline        │
                                          │  - Financial       │
                                          │  - Venue           │
                                          │  - EmailLog        │
                                          │  - DataSource      │
                                          └────────────────────┘
```

---

## Setup

### 1. Prerequisites

- **Node.js** 18+ with `npm` or `bun`
- **PostgreSQL** database (Vercel Postgres, Neon, or Supabase)
- **gog CLI** for Gmail access ([install guide](https://gogcli.sh))
- **Anthropic API key** for AI extraction

### 2. Install gog CLI

```bash
# macOS
brew install steipete/tap/gogcli

# Authenticate with Gmail
gog auth credentials /path/to/client_secret.json
gog auth add dmelillo@gmail.com --services gmail,sheets
gog auth list
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Database
DATABASE_URL="your-postgres-connection-string"

# Gmail account (must match gog auth)
GOG_ACCOUNT="dmelillo@gmail.com"

# Anthropic API key
ANTHROPIC_API_KEY="sk-ant-..."

# Cron secret (generate with: openssl rand -base64 32)
CRON_SECRET="your-random-secret"
```

### 4. Install Dependencies

```bash
npm install
# or
bun install
```

### 5. Run Database Migrations

```bash
npx prisma migrate dev --name add-email-hydration
npx prisma generate
```

---

## Usage

### One-Time Backfill (Historical Import)

Import all wedding emails since October 2025 (engagement date):

```bash
npm run backfill
# or
bun run backfill
```

**What it does:**
- Searches Gmail for wedding-related emails from October 2025 onwards
- Extracts structured data using AI (vendors, guests, tasks, etc.)
- Stores in database with deduplication
- Creates audit trail in `EmailLog` and `DataSource` tables

**Expected output:**
```
========================================
  Reggie Email Backfill
========================================

Backfilling emails from 2025-10-01T00:00:00.000Z...

[email-fetcher] Fetched 47 messages
[processor] Processing 47 emails...
[processor] Extraction result for msg123: type=vendor, confidence=0.92
[processor] Created vendor: Trump Golf
...

========================================
  Backfill Complete
========================================
Total emails: 47
Processed: 35
Skipped: 12
Errors: 0

Created records:
  - Vendors: 5
  - Guests: 18
  - Tasks: 7
  - Timeline: 3
  - Financial: 2
  - Venues: 1
========================================
```

### Import Guest List from Google Sheets

```bash
npm run import-guests
# or
bun run import-guests
```

**What it does:**
- Fetches guest list from Google Sheet `List_Final` tab
- Maps columns to Guest model fields
- Deduplicates based on email/name
- Marks data source as `SHEETS` in audit trail

**Expected output:**
```
========================================
  Reggie Guest List Import
========================================

[sheets] Fetching guest list from 1rECLkZzokcWi1FoJFV6FvnXEDtID60tmVLhowcsMsTY...
[sheets] Fetched 87 rows
[import] Parsed 85 guests from sheet

[import] Created guest: John Smith
[import] Updated guest: Jane Doe
...

========================================
  Import Complete
========================================
Created: 45
Updated: 40
Skipped: 0
========================================
```

### Daily Automation (Vercel Cron)

The daily sync runs automatically at **3am daily** via Vercel Cron.

**Cron configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/email-sync",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**What it does:**
- Fetches emails from the last 7 days (catches any missed ones)
- Extracts and stores new data
- Deduplicates automatically
- Logs results to Vercel Function logs

**Manual trigger** (for testing):
```bash
curl -X GET https://your-app.vercel.app/api/cron/email-sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Known Vendor Patterns

The system recognizes these vendors automatically:

| Vendor | Email Pattern | Category |
|--------|--------------|----------|
| **Trump Golf** | `lauren.good@trumpgolf.com` | VENUE |
| **This Is It Entertainment** | `thisisitent.com` or body contains "this is it entertainment" | DJ |
| **Ann Coen Photography** | body contains "ann coen photography" or "photographer ryan" | PHOTOGRAPHY |

Other vendors are detected via AI extraction from email content.

---

## Data Models

### EmailLog
Tracks processed emails to prevent duplicates.

```typescript
{
  messageId: string;    // Gmail message ID (unique)
  threadId: string;     // Gmail thread ID
  from: string;         // Sender email
  subject: string;      // Email subject
  receivedAt: Date;     // Email date
  bodyPreview: string;  // Snippet
  bodyFull: string;     // Full email body
  processed: boolean;   // Processing status
  extractedData: JSON;  // AI extraction result
}
```

### DataSource
Audit trail for data provenance.

```typescript
{
  recordType: string;   // GUEST | VENDOR | TASK | etc.
  recordId: string;     // Foreign key to actual record
  source: string;       // EMAIL | SHEETS | MANUAL
  sourceId: string;     // Email messageId or sheet reference
  confidence: number;   // AI extraction confidence (0-1)
  metadata: JSON;       // Additional context
}
```

---

## AI Extraction

### Extraction Types

The AI can extract these data types from emails:

1. **Vendor** - Suppliers/vendors (venue, catering, DJ, photography, etc.)
2. **Guest** - Guest information and RSVP status
3. **Task** - Planning tasks and action items
4. **Timeline** - Wedding day schedule events
5. **Financial** - Budget items, payments, invoices
6. **Venue** - Venue details (ceremony/reception locations)

### Confidence Scoring

- **0.9-1.0** - Explicit wedding data with clear fields
- **0.7-0.9** - Strong indicators but some missing details
- **0.5-0.7** - Weak signals or ambiguous content
- **Below 0.5** - Low confidence (may be noise)

### Example Extraction

**Input email:**
```
From: lauren.good@trumpgolf.com
Subject: Your Wedding Venue Contract

Hi Dave and [Partner],

Congratulations! Here's your venue contract for Trump National Golf Club.

Event Date: June 15, 2026
Capacity: 150 guests
Rental Cost: $8,500
Deposit: $2,500 (due by March 1, 2026)

Please sign and return by February 28th.

Best,
Lauren Good
```

**Extracted data:**
```json
{
  "type": "vendor",
  "data": {
    "name": "Trump Golf",
    "category": "VENUE",
    "contact": "Lauren Good",
    "email": "lauren.good@trumpgolf.com",
    "contractedAmount": 850000,
    "paidAmount": 250000,
    "dueDate": "2026-03-01",
    "status": "CONTRACTED"
  },
  "confidence": 0.95
}
```

---

## Deduplication Strategy

### Guests
- **Primary key:** Email address
- **Fallback:** First name + Last name (case-insensitive)
- **Behavior:** Update existing record with new data

### Vendors
- **Primary key:** Email address
- **Fallback:** Name (case-insensitive)
- **Behavior:** Update existing record, append notes

### Tasks
- **No automatic deduplication** (tasks are usually unique)
- **Behavior:** Always create new task

### Timeline Events
- **Composite key:** Event date + Title (case-insensitive)
- **Behavior:** Update existing event

### Financial Entries
- **Composite key:** Category + Description (case-insensitive)
- **Behavior:** Update existing entry

### Venues
- **Primary key:** Name (case-insensitive)
- **Behavior:** Update existing venue

---

## Troubleshooting

### gog CLI not authenticated

**Error:** `gog: not authenticated`

**Fix:**
```bash
gog auth credentials /path/to/client_secret.json
gog auth add dmelillo@gmail.com --services gmail,sheets
```

### Anthropic API rate limits

**Error:** `429 Too Many Requests`

**Fix:** The processor adds a 1-second delay between emails. If rate limits persist:
- Reduce `maxResults` in `email-fetcher.ts`
- Increase delay in `email-processor.ts` (line: `setTimeout(resolve, 1000)`)

### Database connection errors

**Error:** `Can't reach database server`

**Fix:**
- Verify `DATABASE_URL` in `.env.local`
- Check Vercel Postgres/Neon/Supabase connection string
- Run `npx prisma db push` to sync schema

### Emails not being processed

**Debug steps:**
1. Check `EmailLog` table for raw email storage
2. Review extraction results in `EmailLog.extractedData` field
3. Check Vercel Function logs for cron job errors
4. Manually test extraction:
   ```typescript
   import { extractDataFromEmail } from './lib/ai-extractor';
   const result = await extractDataFromEmail({
     from: "test@example.com",
     subject: "Test Wedding Email",
     body: "...",
     receivedAt: new Date()
   });
   console.log(result);
   ```

---

## Manual Data Entry

The hydration pipeline complements (not replaces) manual data entry. Users can still:

- **Add guests manually** via `/guests` page
- **Create vendors** via `/vendors` page
- **Add tasks** via `/tasks` page
- **Create timeline events** via `/timeline` page
- **Enter financial data** via `/financial` page
- **Add venues** via `/venue` page

All manually entered data is tracked with `source: "MANUAL"` in the `DataSource` table.

---

## Future Enhancements

- [ ] **Link extraction** - Follow links in emails and scrape web pages
- [ ] **Email attachments** - Parse PDFs (contracts, invoices)
- [ ] **Calendar integration** - Sync timeline events to Google Calendar
- [ ] **Conflict resolution UI** - Manual review of low-confidence extractions
- [ ] **Smart notifications** - Alert on important deadlines/payments
- [ ] **Vendor response tracking** - Track email threads per vendor
- [ ] **Budget variance alerts** - Notify when spending exceeds budget

---

## File Structure

```
reggie/
├── app/
│   └── api/
│       └── cron/
│           └── email-sync/
│               └── route.ts          # Daily cron job endpoint
├── lib/
│   ├── ai-extractor.ts               # AI extraction service (Claude)
│   ├── email-fetcher.ts              # Gmail fetching (gog CLI)
│   └── email-processor.ts            # Orchestrator (fetch + extract + store)
├── prisma/
│   └── schema.prisma                 # Database schema (includes EmailLog, DataSource)
├── scripts/
│   ├── backfill-emails.ts            # One-time historical import
│   └── import-guest-list.ts          # Google Sheets import
├── .env.example                      # Environment variable template
├── vercel.json                       # Vercel cron configuration
├── HYDRATION.md                      # This file
└── package.json                      # Dependencies + scripts
```

---

## Credits

Built with:
- [gog CLI](https://gogcli.sh) - Google Workspace CLI
- [Anthropic Claude](https://anthropic.com) - AI extraction
- [Prisma](https://prisma.io) - Database ORM
- [Vercel](https://vercel.com) - Hosting + Cron
- [Next.js](https://nextjs.org) - Framework

---

**Questions?** Open an issue or contact the team.

**Strong like steel. Reliable like Colossus.** 🦾
