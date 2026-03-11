#!/usr/bin/env python3
"""
Import guests correctly from Google Sheets.
Expands groups based on # of guests column.
Example: "FFF" with 3 guests → FFF1, FFF2, FFF3
Example: "Josh + Annie Alonso" with 2 guests → Josh Alonso, Annie Alonso
"""

import os
import sys
import subprocess
import psycopg2

SPREADSHEET_ID = "1rECLkZzokcWi1FoJFV6FvnXEDtID60tmVLhowcsMsTY"
SHEET_RANGE = "List_Final!A:B"  # Name + # of guests
GOG_ACCOUNT = os.getenv("GOG_ACCOUNT", "dmelillo@gmail.com")
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

def fetch_sheet_data():
    """Fetch names and guest counts from Google Sheets."""
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
    
    groups = []
    
    for i, line in enumerate(lines):
        if i == 0:
            # Skip header
            continue
        
        # Split by multiple spaces (columns are space-aligned)
        parts = line.split()
        
        if len(parts) < 2:
            continue
        
        # Last part is the number, everything else is the name
        try:
            num_guests = int(parts[-1])
        except:
            continue
        
        name = ' '.join(parts[:-1])
        
        # Skip summary rows
        if name.lower() in ['name', 'total', ''] or name[0].isdigit():
            continue
        
        groups.append({
            'name': name,
            'count': num_guests
        })
    
    print(f"  ✓ Found {len(groups)} guest groups")
    return groups

def expand_guest_group(name, count):
    """
    Expand a guest group into individual guest records.
    
    Rules:
    - If name has " + " (couple): split into individual names
    - If name is generic (FFF, Appenzeller, etc): create numbered entries
    - Preserve last names when possible
    """
    
    # Remove trailing "Family" or "+ Family"
    name = name.replace('+ Family', '').replace('Family', '').strip()
    
    # Handle "The [Name]" groups
    if name.startswith('The '):
        base_name = name[4:].strip()
        return [(f"{base_name}", "") for _ in range(count)]
    
    # Handle "[Name] + [Name]" couples
    if ' + ' in name:
        parts = name.split(' + ')
        
        # If we have exactly count parts, use them
        if len(parts) == count:
            guests = []
            for part in parts:
                part_words = part.strip().split()
                if len(part_words) >= 2:
                    guests.append((part_words[0], part_words[-1]))
                else:
                    guests.append((part.strip(), ""))
            return guests
        
        # Otherwise, extract last name and apply to all
        last_part = parts[-1].strip()
        last_part_words = last_part.split()
        
        if len(last_part_words) >= 2:
            # Last person has full name
            last_name = last_part_words[-1]
            guests = []
            
            # Add first people with last name
            for part in parts[:-1]:
                guests.append((part.strip(), last_name))
            
            # Add last person
            guests.append((last_part_words[0], last_name))
            
            return guests
        else:
            # No last name, just use first names
            return [(part.strip(), "") for part in parts]
    
    # Handle single names with count > 1 (like "FFF" with 3 guests)
    words = name.split()
    
    if len(words) == 1:
        # Single word - create numbered entries
        base_name = words[0]
        if count == 1:
            return [(base_name, "")]
        else:
            return [(f"{base_name}{i+1}", "") for i in range(count)]
    
    # Handle "FirstName LastName" with count > 1
    # This shouldn't happen in the data, but handle it
    if len(words) >= 2 and count == 1:
        return [(' '.join(words[:-1]), words[-1])]
    
    # Fallback: create numbered entries
    base_name = ' '.join(words)
    if count == 1:
        return [(base_name, "")]
    else:
        return [(f"{base_name}{i+1}", "") for i in range(count)]

def insert_guest(conn, first_name, last_name):
    """Insert a guest into the database."""
    cursor = conn.cursor()
    
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
    print("  Reggie Guest List Import (CORRECTED)")
    print("=" * 60)
    
    # Fetch from sheet
    groups = fetch_sheet_data()
    
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Delete old guest list imports
    print("\n🗑️  Removing old guest list...")
    cursor.execute("DELETE FROM \"Guest\" WHERE notes = 'Imported from guest list'")
    deleted = cursor.rowcount
    conn.commit()
    print(f"  Removed {deleted} old records")
    
    # Process each group
    total_inserted = 0
    
    print("\n🔄 Importing guests...\n")
    
    for group in groups:
        name = group['name']
        count = group['count']
        
        # Expand into individual guests
        guests = expand_guest_group(name, count)
        
        print(f"  {name} ({count} guests)")
        
        for first, last in guests:
            inserted = insert_guest(conn, first, last)
            
            if inserted:
                total_inserted += 1
                display_name = f"{first} {last}".strip()
                print(f"    ✓ {display_name}")
    
    conn.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("  Import Complete ✓")
    print("=" * 60)
    print(f"  Inserted:  {total_inserted} guests")
    print("=" * 60)

if __name__ == "__main__":
    main()
