#!/usr/bin/env python3
"""
Import guest list from Google Sheets - FIXED VERSION
Only uses the name column, properly parses couples/families.
"""

import os
import sys
import subprocess
import re
import psycopg2

# Configuration
SPREADSHEET_ID = "1rECLkZzokcWi1FoJFV6FvnXEDtID60tmVLhowcsMsTY"
SHEET_RANGE = "List_Final!A:A"  # ONLY fetch the name column
GOG_ACCOUNT = os.getenv("GOG_ACCOUNT", "dmelillo@gmail.com")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

def fetch_sheet_data():
    """Fetch guest names from Google Sheets (column A only)."""
    print("\n📊 Fetching guest names from Google Sheets...")
    
    cmd = [
        "gog", "sheets", "get",
        SPREADSHEET_ID,
        SHEET_RANGE,
        "--account", GOG_ACCOUNT,
        "--plain"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    
    lines = result.stdout.strip().split('\n')
    
    names = []
    
    for i, line in enumerate(lines):
        if i == 0:
            # Skip header
            continue
        
        name = line.strip()
        
        if not name or name.lower() in ['name', 'total', '']:
            continue
        
        # Skip the summary row (starts with a number)
        if re.match(r'^\d+\s+\d+', name):
            continue
        
        names.append(name)
    
    print(f"  ✓ Found {len(names)} guest groups")
    return names

def parse_guest_group(name_str):
    """
    Parse a name string into individual guests.
    
    Examples:
    - "Gina + Dave Melillo" → [("Gina", "Melillo"), ("Dave", "Melillo")]
    - "The Saravias" → [("The Saravias", "")]
    - "John Ahmuty" → [("John", "Ahmuty")]
    - "Marina + Dan" → [("Marina", ""), ("Dan", "")]
    """
    
    # Remove trailing "Family" or "+ Family"
    name_str = re.sub(r'\s*\+?\s*[Ff]amily\s*$', '', name_str).strip()
    
    # Handle "The [LastName]" format
    if name_str.startswith('The '):
        family_name = name_str[4:].strip()
        return [(family_name, "")]
    
    # Handle "[Name] + [Name]" format
    if ' + ' in name_str:
        parts = name_str.split(' + ')
        
        # If the last part has a space, it's "FirstName LastName"
        # Use that last name for everyone
        last_part = parts[-1].strip()
        
        if ' ' in last_part:
            # Last person has full name
            first_names = [p.strip() for p in parts[:-1]]
            last_person = last_part.split()
            last_name = last_person[-1]
            
            guests = []
            # Add first people with shared last name
            for first in first_names:
                guests.append((first, last_name))
            # Add last person
            guests.append((' '.join(last_person[:-1]), last_name))
            return guests
        else:
            # No last name, just first names
            return [(p.strip(), "") for p in parts]
    
    # Handle "FirstName LastName" format
    parts = name_str.split()
    if len(parts) >= 2:
        first_name = ' '.join(parts[:-1])
        last_name = parts[-1]
        return [(first_name, last_name)]
    elif len(parts) == 1:
        return [(parts[0], "")]
    
    return []

def insert_guest(conn, first_name, last_name):
    """Insert a guest into the database."""
    cursor = conn.cursor()
    
    # Use empty string instead of None for last name if missing
    if not last_name:
        last_name = ""
    
    try:
        cursor.execute("""
            INSERT INTO "Guest" (
                id, "firstName", "lastName", email, phone,
                category, "inviteType", "plusOne", "rsvpStatus",
                "dietaryRestrictions", notes, "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid()::text, %s, %s, NULL, NULL,
                'FAMILY', 'CEREMONY_RECEPTION', false, 'PENDING',
                NULL, 'Imported from guest list', NOW(), NOW()
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        """, (first_name, last_name))
        
        result = cursor.fetchone()
        conn.commit()
        
        return result is not None
    except Exception as e:
        print(f"    ⚠️  Error inserting {first_name} {last_name}: {e}")
        conn.rollback()
        return False

def main():
    print("=" * 60)
    print("  Reggie Guest List Import (FIXED)")
    print("=" * 60)
    
    # Fetch names from sheet
    guest_groups = fetch_sheet_data()
    
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    
    # Process each guest group
    total_inserted = 0
    total_skipped = 0
    
    print("\n🔄 Importing guests...\n")
    
    for group_name in guest_groups:
        # Parse into individual guests
        guests = parse_guest_group(group_name)
        
        if not guests:
            print(f"  ⚠️  Could not parse: {group_name}")
            continue
        
        print(f"  {group_name}")
        
        # Insert each guest
        for first, last in guests:
            inserted = insert_guest(conn, first, last)
            
            display_name = f"{first} {last}".strip()
            if inserted:
                total_inserted += 1
                print(f"    ✓ {display_name}")
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
