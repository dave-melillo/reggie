#!/usr/bin/env python3
"""
Reggie Email Hydration Script
Fetches wedding emails from Gmail and extracts structured data using AI.
"""

import os
import sys
import json
import subprocess
from datetime import datetime
from typing import List, Optional
import anthropic
import psycopg2
from psycopg2.extras import RealDictCursor

# Configuration
GOG_ACCOUNT = os.getenv("GOG_ACCOUNT", "dmelillo@gmail.com")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not ANTHROPIC_API_KEY:
    print("❌ ANTHROPIC_API_KEY not set")
    sys.exit(1)

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

# Initialize Anthropic client
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# Database connection
def get_db():
    return psycopg2.connect(DATABASE_URL)

def fetch_wedding_emails():
    """Fetch wedding-related emails from Gmail using gog CLI."""
    print("\n📧 Fetching wedding emails from Gmail...")
    
    # Known wedding vendors and general wedding search
    searches = [
        "from:lauren.good@trumpgolf.com after:2025-10-01",  # Venue
        "from:thisisitents@yahoo.com after:2025-10-01",      # DJ/Entertainment  
        "from:ann@anncoen.com after:2025-10-01",             # Photography
        "subject:wedding after:2025-10-01",                  # General wedding emails
    ]
    
    all_emails = []
    seen_ids = set()
    
    for search_query in searches:
        print(f"\n  Searching: {search_query}")
        try:
            # Fetch emails matching this search
            cmd = [
                "gog", "gmail", "messages", "search",
                search_query,
                "--account", GOG_ACCOUNT,
                "--max", "20"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"  Got {len(result.stdout.split(chr(10)))} lines of output")
            
            # Parse table format output
            # Format: ID    THREAD    DATE    FROM    SUBJECT    LABELS
            lines = result.stdout.strip().split('\n')
            
            for i, line in enumerate(lines):
                # Skip header (first line) and empty lines
                if i == 0 or not line.strip() or line.startswith('#'):
                    continue
                
                # First column is the message ID
                parts = line.split(None, 1)  # Split on first whitespace
                if parts:
                    msg_id = parts[0].strip()
                    
                    # Skip if we've already seen this message
                    if msg_id in seen_ids:
                        print(f"    (skip duplicate {msg_id[:16]})")
                        continue
                    seen_ids.add(msg_id)
                    
                    print(f"    Fetching body for {msg_id[:16]}...")
                    
                    # Fetch full email body
                    body_cmd = [
                        "gog", "gmail", "get", msg_id,
                        "--account", GOG_ACCOUNT
                    ]
                    
                    body_result = subprocess.run(body_cmd, capture_output=True, text=True)
                    
                    if body_result.returncode == 0:
                        all_emails.append({
                            "id": msg_id,
                            "search": search_query,
                            "text": body_result.stdout
                        })
                        print(f"    ✓ Got {len(body_result.stdout)} chars")
                    else:
                        print(f"    ✗ Failed (code {body_result.returncode}): {body_result.stderr[:100]}")
        
        except subprocess.CalledProcessError as e:
            print(f"  ⚠️  Error with search '{search_query}': {e}")
            continue
    
    print(f"\n✓ Fetched {len(all_emails)} unique emails")
    return all_emails

def extract_data_from_email(email_text: str, search_query: str):
    """Use Claude to extract structured wedding data from email text."""
    
    prompt = f"""You are extracting wedding planning data from an email.

Search context: {search_query}
Email content:
---
{email_text[:4000]}  
---

Extract any relevant wedding information and return JSON in this exact structure:
{{
  "vendors": [
    {{
      "name": "string",
      "category": "VENUE|CATERING|PHOTOGRAPHY|DJ|FLORIST|OTHER",
      "contact": "string",
      "email": "string or null",
      "phone": "string or null",
      "contractedAmount": 0,  // in cents, e.g. $50.00 = 5000
      "paidAmount": 0,
      "notes": "string or null"
    }}
  ],
  "guests": [
    {{
      "firstName": "string",
      "lastName": "string",
      "email": "string or null",
      "phone": "string or null",
      "category": "FAMILY|FRIEND|WORK|VENDOR",
      "plusOne": false,
      "dietaryRestrictions": "string or null"
    }}
  ],
  "tasks": [
    {{
      "title": "string",
      "description": "string or null",
      "category": "PLANNING|VENDOR|GUEST|DAY_OF",
      "priority": "LOW|MEDIUM|HIGH",
      "dueDate": "2025-12-31 or null"
    }}
  ],
  "timeline": [
    {{
      "eventDate": "2026-05-XX 15:00:00",  // wedding date + time
      "title": "string",
      "description": "string or null",
      "location": "string or null",
      "duration": 60,  // minutes
      "category": "CEREMONY|RECEPTION|VENDOR"
    }}
  ],
  "financial": [
    {{
      "category": "string",
      "description": "string",
      "budgetAmount": 0,  // cents
      "actualAmount": 0
    }}
  ],
  "venues": [
    {{
      "name": "string",
      "type": "CEREMONY|RECEPTION|BOTH",
      "address": "string",
      "capacity": 0,
      "rentalCost": 0,  // cents
      "contact": "string",
      "phone": "string or null",
      "email": "string or null"
    }}
  ]
}}

Rules:
- Only include data explicitly mentioned in the email
- Use cents for all dollar amounts (multiply by 100)
- Return empty arrays [] for categories with no data
- Be conservative - if unsure, don't include it
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Extract JSON from response
        text = response.content[0].text
        
        # Find JSON in response (might have markdown code blocks)
        if "```json" in text:
            json_text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            json_text = text.split("```")[1].split("```")[0].strip()
        else:
            json_text = text.strip()
        
        data = json.loads(json_text)
        return data
    
    except Exception as e:
        print(f"  ❌ AI extraction error: {e}")
        return None

def insert_vendors(conn, vendors: List[dict], source_email: str):
    """Insert vendors into database."""
    cursor = conn.cursor()
    inserted = 0
    
    for v in vendors:
        try:
            cursor.execute("""
                INSERT INTO "Vendor" (
                    id, name, category, contact, email, phone,
                    "contractedAmount", "paidAmount", status, notes,
                    "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s, %s,
                    %s, %s, 'PENDING', %s,
                    NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            """, (
                v.get('name'),
                v.get('category', 'OTHER'),
                v.get('contact', source_email),
                v.get('email'),
                v.get('phone'),
                v.get('contractedAmount', 0),
                v.get('paidAmount', 0),
                v.get('notes')
            ))
            inserted += cursor.rowcount
        except Exception as e:
            print(f"    ⚠️  Vendor insert error: {e}")
    
    conn.commit()
    return inserted

def insert_guests(conn, guests: List[dict]):
    """Insert guests into database."""
    cursor = conn.cursor()
    inserted = 0
    
    for g in guests:
        try:
            cursor.execute("""
                INSERT INTO "Guest" (
                    id, "firstName", "lastName", email, phone,
                    category, "inviteType", "plusOne", "rsvpStatus",
                    "dietaryRestrictions", "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s,
                    %s, 'CEREMONY_RECEPTION', %s, 'PENDING',
                    %s, NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            """, (
                g.get('firstName'),
                g.get('lastName'),
                g.get('email'),
                g.get('phone'),
                g.get('category', 'FRIEND'),
                g.get('plusOne', False),
                g.get('dietaryRestrictions')
            ))
            inserted += cursor.rowcount
        except Exception as e:
            print(f"    ⚠️  Guest insert error: {e}")
    
    conn.commit()
    return inserted

def insert_tasks(conn, tasks: List[dict]):
    """Insert tasks into database."""
    cursor = conn.cursor()
    inserted = 0
    
    for t in tasks:
        try:
            due_date = t.get('dueDate')
            if due_date:
                due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
            
            cursor.execute("""
                INSERT INTO "Task" (
                    id, title, description, category, priority, status,
                    "dueDate", "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s, 'TODO',
                    %s, NOW(), NOW()
                )
            """, (
                t.get('title'),
                t.get('description'),
                t.get('category', 'PLANNING'),
                t.get('priority', 'MEDIUM'),
                due_date
            ))
            inserted += cursor.rowcount
        except Exception as e:
            print(f"    ⚠️  Task insert error: {e}")
    
    conn.commit()
    return inserted

def insert_timeline(conn, events: List[dict]):
    """Insert timeline events into database."""
    cursor = conn.cursor()
    inserted = 0
    
    for e in events:
        try:
            event_date = datetime.fromisoformat(e['eventDate'].replace('Z', '+00:00'))
            
            cursor.execute("""
                INSERT INTO "Timeline" (
                    id, "eventDate", title, description, location, duration,
                    category, status, "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s, %s,
                    %s, 'PLANNED', NOW(), NOW()
                )
            """, (
                event_date,
                e.get('title'),
                e.get('description'),
                e.get('location'),
                e.get('duration', 60),
                e.get('category', 'VENDOR')
            ))
            inserted += cursor.rowcount
        except Exception as e:
            print(f"    ⚠️  Timeline insert error: {e}")
    
    conn.commit()
    return inserted

def insert_financial(conn, items: List[dict]):
    """Insert financial items into database."""
    cursor = conn.cursor()
    inserted = 0
    
    for f in items:
        try:
            cursor.execute("""
                INSERT INTO "Financial" (
                    id, category, description, "budgetAmount", "actualAmount",
                    "paidAmount", "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s,
                    0, NOW(), NOW()
                )
            """, (
                f.get('category'),
                f.get('description'),
                f.get('budgetAmount', 0),
                f.get('actualAmount', 0)
            ))
            inserted += cursor.rowcount
        except Exception as e:
            print(f"    ⚠️  Financial insert error: {e}")
    
    conn.commit()
    return inserted

def insert_venues(conn, venues: List[dict]):
    """Insert venues into database."""
    cursor = conn.cursor()
    inserted = 0
    
    for v in venues:
        try:
            # Default dates if not provided
            available_from = datetime(2026, 5, 10, 9, 0)  # 9am wedding day
            available_to = datetime(2026, 5, 10, 23, 0)  # 11pm wedding day
            
            cursor.execute("""
                INSERT INTO "Venue" (
                    id, name, type, address, capacity, "rentalCost",
                    contact, phone, email, "availableFrom", "availableTo",
                    "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    NOW(), NOW()
                )
                ON CONFLICT DO NOTHING
            """, (
                v.get('name'),
                v.get('type', 'BOTH'),
                v.get('address'),
                v.get('capacity', 150),
                v.get('rentalCost', 0),
                v.get('contact'),
                v.get('phone'),
                v.get('email'),
                available_from,
                available_to
            ))
            inserted += cursor.rowcount
        except Exception as e:
            print(f"    ⚠️  Venue insert error: {e}")
    
    conn.commit()
    return inserted

def main():
    print("=" * 60)
    print("  Reggie Email Hydration - AI Extraction")
    print("=" * 60)
    
    # Fetch emails
    emails = fetch_wedding_emails()
    
    if not emails:
        print("\n❌ No emails fetched. Exiting.")
        return
    
    # Connect to database
    conn = get_db()
    
    # Process each email
    stats = {
        "vendors": 0,
        "guests": 0,
        "tasks": 0,
        "timeline": 0,
        "financial": 0,
        "venues": 0
    }
    
    print("\n🤖 Extracting data with AI...")
    
    for email in emails:
        print(f"\n  Processing: {email['id'][:20]}...")
        
        # Extract data using AI
        data = extract_data_from_email(email['text'], email['search'])
        
        if not data:
            print("    ⚠️  Skipping (extraction failed)")
            continue
        
        # Insert to database
        if data.get('vendors'):
            count = insert_vendors(conn, data['vendors'], email['id'])
            stats['vendors'] += count
            if count > 0:
                print(f"    ✓ Added {count} vendor(s)")
        
        if data.get('guests'):
            count = insert_guests(conn, data['guests'])
            stats['guests'] += count
            if count > 0:
                print(f"    ✓ Added {count} guest(s)")
        
        if data.get('tasks'):
            count = insert_tasks(conn, data['tasks'])
            stats['tasks'] += count
            if count > 0:
                print(f"    ✓ Added {count} task(s)")
        
        if data.get('timeline'):
            count = insert_timeline(conn, data['timeline'])
            stats['timeline'] += count
            if count > 0:
                print(f"    ✓ Added {count} timeline event(s)")
        
        if data.get('financial'):
            count = insert_financial(conn, data['financial'])
            stats['financial'] += count
            if count > 0:
                print(f"    ✓ Added {count} financial item(s)")
        
        if data.get('venues'):
            count = insert_venues(conn, data['venues'])
            stats['venues'] += count
            if count > 0:
                print(f"    ✓ Added {count} venue(s)")
    
    conn.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("  Hydration Complete ✓")
    print("=" * 60)
    print(f"  Vendors:   {stats['vendors']}")
    print(f"  Guests:    {stats['guests']}")
    print(f"  Tasks:     {stats['tasks']}")
    print(f"  Timeline:  {stats['timeline']}")
    print(f"  Financial: {stats['financial']}")
    print(f"  Venues:    {stats['venues']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
