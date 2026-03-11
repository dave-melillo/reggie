# Reggie Email Hydration - Fixed Approach

## Problem
Colossus's approach tried to parse gog CLI JSON output line-by-line, which fails on multi-line JSON. Got 0 emails processed.

## New Approach
1. **Fetch emails as raw text** - Use gog to get email body/subject as plain text
2. **AI extraction** - Pass raw email to Claude with Pydantic schema
3. **Structured output** - Claude returns JSON matching our Prisma models
4. **Insert to database** - Write extracted data directly to Postgres

## Architecture

```
Gmail 
  → gog CLI (get raw text)
  → AI Extractor (Claude + Pydantic)
  → Prisma (insert to DB)
```

## Pydantic Models (match Prisma schema)

```python
class Vendor(BaseModel):
    name: str
    category: str  # VENUE, CATERING, PHOTOGRAPHY, DJ, FLORIST
    contact: str
    email: Optional[str]
    phone: Optional[str]
    contracted_amount: int  # cents
    paid_amount: int = 0
    due_date: Optional[datetime]
    status: str = "PENDING"
    notes: Optional[str]

class Guest(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str]
    phone: Optional[str]
    category: str  # FAMILY, FRIEND, WORK, VENDOR
    invite_type: str = "CEREMONY_RECEPTION"
    plus_one: bool = False
    rsvp_status: str = "PENDING"
    dietary_restrictions: Optional[str]
    notes: Optional[str]

class Task(BaseModel):
    title: str
    description: Optional[str]
    category: str  # PLANNING, VENDOR, GUEST, DAY_OF
    priority: str = "MEDIUM"
    status: str = "TODO"
    due_date: Optional[datetime]
    assigned_to: Optional[str]

class TimelineEvent(BaseModel):
    event_date: datetime
    title: str
    description: Optional[str]
    location: Optional[str]
    duration: int  # minutes
    category: str  # CEREMONY, RECEPTION, VENDOR
    status: str = "PLANNED"

class Financial(BaseModel):
    category: str
    description: str
    budget_amount: int  # cents
    actual_amount: int = 0
    paid_amount: int = 0
    notes: Optional[str]

class Venue(BaseModel):
    name: str
    type: str  # CEREMONY, RECEPTION, BOTH
    address: str
    capacity: int
    rental_cost: int  # cents
    contact: str
    phone: Optional[str]
    email: Optional[str]
    available_from: datetime
    available_to: datetime
    notes: Optional[str]
```

## AI Extraction Prompt

```
You are extracting wedding planning data from emails.

Email:
---
{email_subject}
{email_body}
---

Extract any vendors, guests, tasks, timeline events, financial items, or venue information.

Return JSON with this structure:
{
  "vendors": [...],
  "guests": [...],
  "tasks": [...],
  "timeline": [...],
  "financial": [...],
  "venues": [...]
}

Use null for missing fields. Amounts in cents (e.g., $50.00 = 5000).
```

## Implementation Steps

1. ✅ Create Python script: `scripts/hydrate.py`
2. ✅ Fetch emails from Gmail using gog (plain text)
3. ✅ Pass each email to Claude with Pydantic schema
4. ✅ Parse JSON response
5. ✅ Insert to Postgres via Prisma (or direct SQL)
6. ✅ Google Sheets import (same AI approach)
7. ✅ Test on real data

## Timeline
- **Fix & test:** 30-45 minutes
- **Full backfill:** 5-10 minutes (depends on email count)

## Success Criteria
- ✅ Import 20+ vendors from Gmail
- ✅ Import 50+ guests from Google Sheet
- ✅ Import 10+ tasks/timeline events
- ✅ Database populated with real data
- ✅ No parsing errors

---

**Starting now.** 🐺
