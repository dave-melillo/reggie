#!/usr/bin/env python3
"""
Import guest list from Google Sheets into Reggie database.
"""

import os
import sys
import subprocess
import re
import psycopg2

# Configuration
SPREADSHEET_ID = "1rECLkZzokcWi1FoJFV6FvnXEDtID60tmVLhowcsMsTY"
SHEET_RANGE = "List_Final!A:Z"
GOG_ACCOUNT = os.getenv("GOG_ACCOUNT", "dmelillo@gmail.com")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

def fetch_sheet_data():
    """Fetch guest list from Google Sheets."""
    print("\n📊 Fetching guest list from Google Sheets...")
    
    cmd = [
        "gog", "sheets", "get",
        SPREADSHEET_ID,
        SHEET_RANGE,
        "--account", GOG_ACCOUNT,
        "--plain"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    
    lines = result.stdout.strip().split('\n')
    
    guests = []
    header = None
    
    for i, line in enumerate(lines):
        if i == 0:
            # Header row
            continue
        
        # Split by tab but filter empty fields (multiple tabs)
        fields = [f.strip() for f in line.split('\t') if f.strip()]
        
        if len(fields) < 1:
            continue
        
        name = fields[0]
        num_guests = fields[1] if len(fields) > 1 else "1"
        
        if not name or name.lower() in ['name', 'total', '']:
            continue
        
        print(f"  Found: {name} ({num_guests} guests)")
        
        guests.append({
            'name': name,
            'num_guests': num_guests
        })
    
    print(f"  ✓ Found {len(guests)} guest groups")
    return guests

def parse_name(name_str):
    """Parse combined name field into individual guests."""
    # Clean up the name
    name_str = name_str.strip()
    
    # Remove trailing "Family" or "+ Family"
    name_str = re.sub(r'\s*\+?\s*[Ff]amily$', '', name_str)
    
    # Handle patterns like "Gina + Dave Melillo" -> ["Gina Melillo", "Dave Melillo"]
    if ' + ' in name_str:
        parts = name_str.split(' + ')
        
        # If last part has a space (last name), use it for all
        last_part = parts[-1].strip()
        if ' ' in last_part:
            first_names = [p.strip() for p in parts[:-1]]
            last_name = last_part.split()[-1]
            
            guests = []
            for first in first_names:
                guests.append({
                    'firstName': first.strip(),
                    'lastName': last_name
                })
            # Add the last person
            full_name = last_part.split()
            guests.append({
                'firstName': full_name[0],
                'lastName': full_name[-1]
            })
            return guests
        else:
            # No last name in last part, treat as single family name
            family_name = last_part
            guests = []
            for first in parts:
                guests.append({
                    'firstName': first.strip(),
                    'lastName': family_name
                })
            return guests
    
    # Handle "The Saravias" -> family name
    if name_str.startswith('The '):
        family_name = name_str[4:].strip()
        return [{
            'firstName': 'Family',
            'lastName': family_name
        }]
    
    # Handle "FirstName LastName"
    parts = name_str.split()
    if len(parts) >= 2:
        return [{
            'firstName': ' '.join(parts[:-1]),
            'lastName': parts[-1]
        }]
    elif len(parts) == 1:
        return [{
            'firstName': parts[0],
            'lastName': 'Guest'
        }]
    
    return []

def insert_guest(conn, first_name, last_name, category='FAMILY', notes=None):
    """Insert a guest into the database."""
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO "Guest" (
                id, "firstName", "lastName", email, phone,
                category, "inviteType", "plusOne", "rsvpStatus",
                "dietaryRestrictions", notes, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid()::text, %s, %s, NULL, NULL,
                %s, 'CEREMONY_RECEPTION', false, 'PENDING',
                NULL, %s, NOW(), NOW()
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (first_name, last_name, category, notes))
        
        result = cursor.fetchone()
        conn.commit()
        
        return result is not None
    except Exception as e:
        print(f"    ⚠️  Error inserting {first_name} {last_name}: {e}")
        conn.rollback()
        return False

def main():
    print("=" * 60)
    print("  Reggie Guest List Import")
    print("=" * 60)
    
    # Fetch sheet data
    guest_groups = fetch_sheet_data()
    
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    
    # Process each guest group
    total_inserted = 0
    total_skipped = 0
    
    print("\n🔄 Importing guests...")
    
    for group in guest_groups:
        name = group['name']
        
        # Parse names
        guests = parse_name(name)
        
        if not guests:
            print(f"  ⚠️  Could not parse: {name}")
            continue
        
        # Insert each guest
        for guest in guests:
            first = guest['firstName']
            last = guest['lastName']
            
            inserted = insert_guest(
                conn, 
                first, 
                last, 
                category='FAMILY',
                notes=f'From guest list: {name}'
            )
            
            if inserted:
                total_inserted += 1
                print(f"  ✓ Added {first} {last}")
            else:
                total_skipped += 1
    
    conn.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("  Import Complete ✓")
    print("=" * 60)
    print(f"  Inserted:  {total_inserted}")
    print(f"  Skipped:   {total_skipped} (duplicates)")
    print("=" * 60)

if __name__ == "__main__":
    main()
