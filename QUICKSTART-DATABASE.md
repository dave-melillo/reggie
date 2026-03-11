# Quick Database Setup for Reggie

**Status:** Database needs manual setup (auth required)

---

## Fastest Path (5 minutes)

### Option 1: Neon (Recommended)

1. **Go to:** https://console.neon.tech
2. **Sign in** with GitHub (dave-melillo account)
3. **Create project:**
   - Name: `reggie-wedding`
   - Region: `US East`
   - Postgres: `16`
4. **Copy connection string** (looks like this):
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-1.aws.neon.tech/reggie?sslmode=require
   ```
5. **Add to Vercel:**
   ```bash
   cd /Users/dave/clawd/projects/reggie  # Or wherever you want to work
   vercel env add DATABASE_URL
   # Paste the connection string when prompted
   # Select: Production, Preview, Development (all three)
   ```
6. **Run migration:**
   ```bash
   export DATABASE_URL="<paste-connection-string-here>"
   npx prisma migrate deploy
   ```
7. **Redeploy:**
   ```bash
   vercel --prod
   ```

**Done!** Database is live.

---

## Option 2: Railway (Alternative)

If Neon doesn't work:

1. **Go to:** https://railway.app
2. **Sign in** with GitHub
3. **New Project** → **Provision PostgreSQL**
4. **Name:** reggie-wedding
5. **Copy** the Postgres Connection URL
6. **Follow steps 5-7 from Option 1** above

---

## For Hydration Agent

Once database is set up, the `DATABASE_URL` will be available in Vercel env vars.

To get it:
```bash
vercel env pull .env.local
cat .env.local | grep DATABASE_URL
```

Then you can run:
```bash
# Backfill historical emails
npm run backfill

# Import guest list from sheets
npm run import-guests

# Test cron job manually
curl https://reggie-pearl.vercel.app/api/cron/email-sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## What's Blocking

- **Neon requires GitHub OAuth** (can't automate through browser)
- **Vercel CLI doesn't provision databases** (only links existing ones)
- **neonctl requires interactive auth** (can't script)

**Solution:** Manual setup (one-time, 5 minutes)

---

## Current App Status

✅ **Deployed:** https://reggie-pearl.vercel.app  
✅ **Code:** All 6 modules built  
✅ **API routes:** Ready (return empty arrays without DB)  
✅ **Hydration pipeline:** Code reviewed and approved  
❌ **Database:** Needs setup (blocking hydration)

---

## After Database Setup

Everything will work:
- ✅ Guest/Vendor/Task/Timeline/Financial/Venue data storage
- ✅ Email hydration backfill
- ✅ Google Sheets import
- ✅ Daily cron job (3am sync)
- ✅ Complete audit trail

---

**Next:** Dave or hydration agent needs to complete the Neon setup above.
