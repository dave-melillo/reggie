# Reggie Hydration Checklist

## Database Setup
- [ ] Set up Vercel Postgres database (or Neon/Supabase)
- [ ] Configure `DATABASE_URL` environment variable in Vercel
- [ ] Run `npx prisma migrate dev` to apply schema
- [ ] Verify database connection

## API Routes to Create
- [ ] `/api/guests` (GET, POST, PUT, DELETE)
- [ ] `/api/vendors` (GET, POST, PUT, DELETE)
- [ ] `/api/tasks` (GET, POST, PUT, DELETE)
- [ ] `/api/timeline` (GET, POST, PUT, DELETE)
- [ ] `/api/financial` (GET, POST, PUT, DELETE)
- [ ] `/api/venue` (GET, POST, PUT, DELETE)

## Sample Data to Seed
- [ ] **Guests** - 10-20 sample guests with varied categories (FAMILY, FRIEND, WORK)
- [ ] **Vendors** - 5-10 vendors (VENUE, CATERING, PHOTOGRAPHY, DJ, FLORIST)
- [ ] **Tasks** - 15-20 tasks across categories (PLANNING, VENDOR, GUEST, DAY_OF)
- [ ] **Timeline** - 10-15 events for wedding day (ceremony, cocktails, reception, etc.)
- [ ] **Financial** - Budget items matching vendor categories + extras
- [ ] **Venue** - 2-3 venues (ceremony, reception, or combined)

## Form Handlers to Implement
- [ ] Guest form submission (create/edit)
- [ ] Vendor form submission (create/edit)
- [ ] Task form submission (create/edit)
- [ ] Timeline event form submission (create/edit)
- [ ] Financial entry form submission (create/edit)
- [ ] Venue form submission (create/edit)

## UI Features Needing Data
- [ ] Dashboard stats (guest count, budget, vendor count, tasks)
- [ ] Guest list table with filtering
- [ ] Vendor list with payment tracking
- [ ] Task board (TODO, IN_PROGRESS, DONE)
- [ ] Timeline view (chronological events)
- [ ] Financial breakdown (budget vs actual)
- [ ] Venue capacity vs guest count

## Cross-Module Features (for later)
- [ ] Guest count → Venue capacity validation
- [ ] Vendor costs → Financial budget tracking
- [ ] Timeline conflicts detection (overlapping events)
- [ ] Task deadlines → Calendar integration
- [ ] RSVP confirmed → Update guest count
- [ ] Vendor payments → Financial spent tracking

## Notes
- All monetary amounts stored as integers in cents (e.g., $50.00 = 5000)
- Use React Query for data fetching/caching
- Forms use react-hook-form + zod validation
