# Reggie Database Setup

## Current Status
❌ **No database configured yet**

The Reggie app is deployed to Vercel but has no DATABASE_URL set. Need to create a PostgreSQL database.

---

## Option 1: Neon (Recommended)

**Why Neon:**
- Vercel's official recommendation (Vercel Postgres is deprecated)
- Free tier: 0.5GB storage, 3 databases
- Serverless (scales to zero)
- Native Vercel integration

**Setup Steps:**

1. **Create Neon Database:**
   - Go to: https://console.neon.tech
   - Sign in with GitHub
   - Create new project: "reggie-wedding"
   - Region: US East (closest to Vercel)
   - Postgres version: 16 (latest)

2. **Get Connection String:**
   - In Neon console, go to "Connection Details"
   - Copy the connection string (starts with `postgresql://`)
   - Format: `postgresql://user:password@host/dbname?sslmode=require`

3. **Add to Vercel:**
   ```bash
   cd /tmp/reggie
   vercel env add DATABASE_URL
   # Paste the Neon connection string when prompted
   # Select: Production, Preview, Development (all)
   ```

4. **Run Migration:**
   ```bash
   # Set DATABASE_URL locally first
   export DATABASE_URL="<your-neon-connection-string>"
   
   # Run migration
   npx prisma migrate deploy
   ```

5. **Redeploy Vercel:**
   ```bash
   vercel --prod
   ```

---

## Option 2: Supabase

**Why Supabase:**
- Free tier: 500MB storage, 2 databases
- Includes Auth, Storage, Realtime (if needed later)
- Good PostgreSQL GUI

**Setup Steps:**

1. **Create Supabase Project:**
   - Go to: https://supabase.com
   - Sign in with GitHub
   - New Project: "reggie-wedding"
   - Region: US East
   - Strong database password (save it!)

2. **Get Connection String:**
   - Go to Project Settings → Database
   - Copy "Connection string" (URI format)
   - Replace `[YOUR-PASSWORD]` with your database password

3. **Add to Vercel** (same as Neon steps 3-5)

---

## Option 3: Railway

**Why Railway:**
- Simple setup
- Free tier: $5 credit/month (usually enough)
- Good for hobby projects

**Setup Steps:**

1. **Create Railway Project:**
   - Go to: https://railway.app
   - Sign in with GitHub
   - New Project → PostgreSQL
   - Name: "reggie-wedding"

2. **Get Connection String:**
   - Click on Postgres service
   - Go to "Connect" tab
   - Copy "Postgres Connection URL"

3. **Add to Vercel** (same as Neon steps 3-5)

---

## Quick Setup (Neon - Fastest)

If you have Neon CLI installed:

```bash
# Install Neon CLI (one-time)
npm install -g neonctl

# Authenticate
neonctl auth

# Create database
neonctl projects create --name reggie-wedding --region us-east-1

# Get connection string
neonctl connection-string reggie-wedding

# Add to Vercel
cd /tmp/reggie
vercel env add DATABASE_URL
# Paste the connection string

# Run migration
export DATABASE_URL="<connection-string>"
npx prisma migrate deploy

# Redeploy
vercel --prod
```

---

## After Database Setup

Once DATABASE_URL is configured:

1. ✅ API routes will work (currently return empty arrays)
2. ✅ Email hydration backfill can run: `npm run backfill`
3. ✅ Guest sheets import can run: `npm run import-guests`
4. ✅ Cron job will work (3am daily sync)

---

## Connection String Format

All providers give a similar format:

```
postgresql://username:password@host:port/database?sslmode=require
```

Example (Neon):
```
postgresql://neondb_owner:abc123xyz@ep-cool-sound-123456.us-east-1.aws.neon.tech/reggie?sslmode=require
```

---

## Security Notes

- ✅ Never commit DATABASE_URL to git (.env.local is in .gitignore)
- ✅ Use different databases for development/production
- ✅ Rotate passwords periodically
- ✅ Enable SSL mode (required by most providers)

---

## My Recommendation

**Use Neon.** It's free, fast to set up, and officially recommended by Vercel.

**Quick Start:**
1. Go to https://console.neon.tech
2. Create project "reggie-wedding"
3. Copy connection string
4. `vercel env add DATABASE_URL` → paste string
5. `npx prisma migrate deploy`
6. `vercel --prod`

Done in 5 minutes. 🚀
