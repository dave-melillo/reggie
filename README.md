# Reggie - Wedding Management Platform

Wedding planning app with guest tracking, vendor management, and financial dashboards.

## Status

🚧 **MVP In Progress** - Core database schema complete, building UI modules.

## Features (Planned)

- **Guests**: RSVP tracking, meal preferences, seating
- **Vendors**: Contract and payment tracking  
- **Venue**: Capacity and cost management
- **Financial**: Real-time budget dashboard with guest-driven forecasts
- **Tasks**: Kanban board with auto-task creation
- **Timeline**: Day-of coordination with conflict detection

## Tech Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL
- Tailwind CSS
- TypeScript

## Setup

```bash
npm install
# Add DATABASE_URL to .env
npx prisma generate
npx prisma migrate dev
npm run dev
```

## PRD

Full spec: `/Users/dave/clawd/agent-outputs/IDEA-20260310-002/PRD.md`

Built by X-Men agents: Beast (PRD), Wolverine (code), Magneto (validation pending)
