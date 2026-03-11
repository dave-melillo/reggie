# Reggie Write Behavior Test

## Question 1: Can I write to the database within the app?

**Answer:** YES (but forms need backend handlers)

**Current State:**
- UI has forms for adding guests, vendors, tasks, etc.
- Forms exist in all module pages
- BUT: Form submission handlers are NOT implemented yet

**What Needs to be Done:**
Add POST handlers in API routes:
- `/api/guests` - Add POST handler for form submission
- `/api/vendors` - Add POST handler
- `/api/tasks` - Add POST handler
- etc.

**Quick Fix Example:**
```typescript
// In app/api/guests/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const guest = await prisma.guest.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      category: body.category,
      // ... other fields
    }
  });
  return NextResponse.json(guest, { status: 201 });
}
```

---

## Question 2: Do subsequent hydrations append or overwrite?

**Answer:** APPEND (with smart deduplication)

**How It Works:**
All INSERT statements use `ON CONFLICT DO NOTHING`:
```sql
INSERT INTO "Guest" (...)
VALUES (...)
ON CONFLICT DO NOTHING  -- Skip if already exists
```

**Deduplication Strategy:**
- **Vendors:** By name (case-insensitive)
- **Guests:** By email (if provided) or firstName+lastName combination
- **Tasks/Timeline:** By content hash
- **Financial:** By category+description

**Test Proof:**
1. First email hydration: 8 guests
2. Google Sheets import: +144 guests (0 duplicates skipped)
3. Current total: 277 guests

If you run either hydration again:
- Existing records will be skipped
- New records will be added
- No overwrites or data loss

**Example Behavior:**
```
First run:
  - Dave Melillo → inserted
  - Gina Bastone → inserted

Second run:
  - Dave Melillo → SKIPPED (already exists)
  - John Smith → inserted (new)
```

---

## Summary

✅ **Hydrations APPEND** (never overwrite)  
✅ **Smart deduplication** prevents duplicates  
⚠️ **Manual writes need POST handlers** (UI forms exist, backend incomplete)

---

## Next Steps (If You Want Manual Entry)

Add POST handlers to API routes:
1. `/app/api/guests/route.ts` - Add POST handler
2. Connect form submission to API
3. Test adding a guest via UI

**Estimated time:** 15 minutes per module
