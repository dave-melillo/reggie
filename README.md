# Reggie - Wedding Management App 💍

A comprehensive wedding planning application built with Next.js 16, Prisma, and Tailwind CSS.

## Live Preview
🔗 **https://reggie-pearl.vercel.app**

## Features

### 6 Core Modules
1. **Dashboard** - Overview of all wedding metrics
2. **Guests** - Guest list management with RSVP tracking
3. **Vendors** - Vendor contracts and payment tracking
4. **Timeline** - Day-of event scheduling
5. **Financial** - Budget tracking and expense management
6. **Venue** - Ceremony and reception venue details
7. **Tasks** - Task management across all categories

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Prisma v5 + PostgreSQL
- **Styling**: Tailwind CSS
- **State**: React Query (installed, ready to integrate)
- **Forms**: react-hook-form + zod (installed, ready to integrate)
- **Auth**: NextAuth (installed, ready to integrate)

## Current Status

✅ **Complete**
- All 6 module pages with detailed views
- Navigation and responsive UI
- Prisma schema (ready for database)
- API route stubs for all modules
- Dashboard with summary stats

⏳ **Needs Setup** (see HYDRATION-CHECKLIST.md)
- Database connection (Vercel Postgres / Neon / Supabase)
- Sample data seeding
- Form submission handlers
- Cross-module features (cascading updates, conflict detection)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database
```bash
# Configure DATABASE_URL in .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/reggie"

# Run migrations
npx prisma migrate dev

# (Optional) Seed sample data
npx prisma db seed
```

### 3. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Database Schema

All monetary amounts are stored as **integers in cents** (e.g., $50.00 = 5000).

### Models
- **Guest** - First/last name, email, phone, category, RSVP status, dietary restrictions
- **Vendor** - Name, category, contact, contracted/paid amounts, due dates
- **Task** - Title, description, category, priority, status, assignee
- **Timeline** - Event date/time, duration, location, category, status
- **Financial** - Budget/actual/paid amounts per category
- **Venue** - Name, type, address, capacity, rental cost, availability

## Hydration Checklist

See **HYDRATION-CHECKLIST.md** for the complete list of:
- Database setup steps
- API routes to implement
- Sample data to seed
- Form handlers needed
- Cross-module features

## Deployment

Deployed to **Vercel** with automatic deployments on push to `main`.

### Environment Variables (Vercel)
```
DATABASE_URL=<your-postgres-connection-string>
NEXTAUTH_URL=https://reggie-pearl.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

## Notes

- **No database errors**: API routes return empty arrays if DB not connected
- **Mobile responsive**: All views work on mobile/tablet/desktop
- **Ready for data**: Once database is connected, all views will populate automatically
- **Extensible**: Easy to add new categories, fields, or modules

## License
Private - Wedding Planning for Dave & Partner
