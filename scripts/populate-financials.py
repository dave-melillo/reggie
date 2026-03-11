#!/usr/bin/env python3
"""
Populate financial entries for main wedding vendors.
Uses placeholder costs that can be updated manually.
"""

import os
import sys
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

# Main wedding vendors with typical cost ranges
VENDORS = [
    {
        "category": "VENUE",
        "description": "Trump Golf Club - Venue Rental & Catering",
        "budgetAmount": 5000000,  # $50,000 placeholder
        "notes": "Update with actual contracted amount"
    },
    {
        "category": "PHOTOGRAPHY",
        "description": "Ann Coen Photography",
        "budgetAmount": 500000,  # $5,000 placeholder
        "notes": "Update with actual contracted amount"
    },
    {
        "category": "DJ",
        "description": "This Is It Entertainment - DJ Services",
        "budgetAmount": 200000,  # $2,000 placeholder
        "notes": "Update with actual contracted amount"
    },
    {
        "category": "FLORIST",
        "description": "Flowers & Florals",
        "budgetAmount": 300000,  # $3,000 placeholder
        "notes": "TBD - Update vendor and amount"
    },
    {
        "category": "OTHER",
        "description": "Invitations & Stationery",
        "budgetAmount": 100000,  # $1,000 placeholder
        "notes": "Update with actual costs"
    },
    {
        "category": "OTHER",
        "description": "Wedding Attire",
        "budgetAmount": 300000,  # $3,000 placeholder
        "notes": "Update with actual costs"
    },
    {
        "category": "OTHER",
        "description": "Transportation",
        "budgetAmount": 150000,  # $1,500 placeholder
        "notes": "Update with actual costs"
    },
]

def main():
    print("=" * 60)
    print("  Reggie Financial Setup")
    print("=" * 60)
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Clear existing financial records
    print("\n🗑️  Clearing existing financial records...")
    cursor.execute("DELETE FROM \"Financial\"")
    deleted = cursor.rowcount
    conn.commit()
    print(f"  Removed {deleted} records")
    
    # Insert new records
    print("\n💰 Adding financial entries...")
    
    for vendor in VENDORS:
        cursor.execute("""
            INSERT INTO "Financial" (
                id, category, description, "budgetAmount", 
                "actualAmount", "paidAmount", notes,
                "createdAt", "updatedAt"
            ) VALUES (
                gen_random_uuid()::text, %s, %s, %s,
                0, 0, %s,
                NOW(), NOW()
            )
        """, (
            vendor["category"],
            vendor["description"],
            vendor["budgetAmount"],
            vendor["notes"]
        ))
        
        print(f"  ✓ {vendor['description']}")
        print(f"    Budget: ${vendor['budgetAmount'] / 100:,.2f}")
    
    conn.commit()
    
    # Show total budget
    cursor.execute("SELECT SUM(\"budgetAmount\") FROM \"Financial\"")
    total = cursor.fetchone()[0]
    
    print("\n" + "=" * 60)
    print("  Financial Setup Complete")
    print("=" * 60)
    print(f"  Total Budget: ${total / 100:,.2f}")
    print(f"  Records: {len(VENDORS)}")
    print("\n  ⚠️  All amounts are placeholders!")
    print("  Update them in the app as you get actual contracts.")
    print("=" * 60)
    
    conn.close()

if __name__ == "__main__":
    main()
