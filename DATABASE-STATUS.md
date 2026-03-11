# Reggie Database - Setup Complete ✅

**Date:** 2026-03-11  
**Configured by:** Wolverine 🐺

---

## Status: READY FOR HYDRATION

✅ **Neon Postgres database created**  
✅ **Connection string added to Vercel** (all environments)  
✅ **Database schema applied** (Prisma db push)  
✅ **App redeployed** with database connection  
✅ **API routes tested** (returning empty arrays - database connected)

---

## Database Details

**Provider:** Neon  
**Region:** US East  
**Database:** `neondb`  
**Host:** `ep-summer-lake-ahawpmgm-pooler.c-3.us-east-1.aws.neon.tech`

**Connection String:** See `.env.production` (DO NOT COMMIT)

---

## What's Ready

### ✅ Database Schema Applied

All tables created in Neon:
- `Guest` - Guest list with RSVP tracking
- `Vendor` - Vendor contracts and payments
- `Task` - Planning tasks
- `Timeline` - Day-of event schedule
- `Financial` - Budget tracking
- `Venue` - Ceremony/reception venues
- `EmailLog` - Email processing audit trail
- `DataSource` - Data provenance tracking

### ✅ Vercel Environment Variables

Configured for **Production, Preview, Development:**
- `DATABASE_URL` ✅

**Still needed (for hydration pipeline):**
- `GOG_ACCOUNT` - Gmail account for email fetching
- `ANTHROPIC_API_KEY` - AI extraction service
- `CRON_SECRET` - Secure cron job endpoint

### ✅ API Routes Working

Test endpoints:
- https://reggie-pearl.vercel.app/api/guests ✅
- https://reggie-pearl.vercel.app/api/vendors ✅
- https://reggie-pearl.vercel.app/api/tasks ✅
- https://reggie-pearl.vercel.app/api/timeline ✅
- https://reggie-pearl.vercel.app/api/financial ✅
- https://reggie-pearl.vercel.app/api/venue ✅

All returning `[]` (empty arrays) - database connected, no data yet.

---

## Next Steps for Hydration Agent

### 1. Add Remaining Environment Variables to Vercel

```bash
cd /tmp/reggie

# GOG_ACCOUNT
echo "dave.melillo@gmail.com" | vercel env add GOG_ACCOUNT production

# ANTHROPIC_API_KEY (already in keys.env)
cat ~/clawd/keys.env | grep ANTHROPIC_API_KEY | cut -d= -f2 | vercel env add ANTHROPIC_API_KEY production

# CRON_SECRET (generate new)
openssl rand -base64 32 | vercel env add CRON_SECRET production
```

### 2. Merge Hydration PR

**PR:** https://github.com/dave-melillo/reggie/pull/1  
**Branch:** `colossus/email-hydration-pipeline`  
**Status:** Approved by Wolverine ✅

```bash
cd /tmp/reggie
git checkout main
git merge colossus/email-hydration-pipeline
git push
```

### 3. Run Backfill Script

Import historical wedding emails (October 2025+):

```bash
cd /tmp/reggie
export DATABASE_URL="<see .env.production>"
npm run backfill
```

**Expected output:**
- Fetches 30-50 wedding emails from Gmail
- Extracts vendors, guests, tasks, timeline, financial data
- Stores in database with deduplication
- Creates audit trail in `EmailLog` and `DataSource` tables

### 4. Import Guest List from Google Sheets

```bash
npm run import-guests
```

**Expected output:**
- Fetches guest list from Google Sheet
- Imports 50-100 guests
- Deduplicates based on email/name
- Marks source as `SHEETS` in audit trail

### 5. Test Cron Job

Manually trigger daily email sync:

```bash
curl -X GET https://reggie-pearl.vercel.app/api/cron/email-sync \
  -H "Authorization: Bearer <CRON_SECRET>"
```

### 6. Monitor Vercel Function Logs

Check for errors in:
- https://vercel.com/daves-projects-c581a67d/reggie/logs

Look for:
- Email fetching errors (gog CLI)
- AI extraction errors (Anthropic API)
- Database connection errors (Prisma)

---

## Verification Checklist

Before considering hydration complete:

- [ ] Merge hydration PR to main
- [ ] Add `GOG_ACCOUNT`, `ANTHROPIC_API_KEY`, `CRON_SECRET` to Vercel
- [ ] Run backfill script successfully
- [ ] Verify vendors appear in `/vendors` page
- [ ] Verify guests appear in `/guests` page
- [ ] Run guest import script successfully
- [ ] Test cron job endpoint manually
- [ ] Check Vercel logs for errors
- [ ] Verify data in Neon console (SQL editor)

---

## Access Database Directly

### Via Neon Console
https://console.neon.tech

### Via CLI
```bash
psql "postgresql://neondb_owner:npg_n3risejFJuo7@ep-summer-lake-ahawpmgm-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Via Prisma Studio
```bash
cd /tmp/reggie
export DATABASE_URL="<see .env.production>"
npx prisma studio
```

Opens GUI at http://localhost:5555

---

## Troubleshooting

### "Can't reach database server"
- Check connection string format
- Verify Neon project is active (not paused)
- Check SSL mode is `require`

### "No gog CLI found"
- Install: `brew install steipete/tap/gogcli`
- Authenticate: `gog auth add dave.melillo@gmail.com --services gmail,sheets`

### "Anthropic API rate limit"
- Check API key is valid
- Verify account has credits
- Reduce batch size in email processor

### "Cron job unauthorized"
- Verify `CRON_SECRET` matches in Vercel and request header
- Check header format: `Authorization: Bearer <secret>`

---

## Summary

**Database is live and ready.** All API routes are working. Schema is applied.

**What's left:** Configure remaining env vars, merge hydration PR, run backfill/import scripts.

**Estimated time to full hydration:** 30 minutes  
**Estimated data after hydration:** 5-10 vendors, 50-100 guests, 10-20 tasks

**Database is production-ready.** 🐺
