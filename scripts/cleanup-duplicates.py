#!/usr/bin/env python3
"""
Clean up duplicate records in Reggie database.
Keeps the oldest record for each duplicate group.
"""

import os
import sys
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not set")
    sys.exit(1)

def deduplicate_table(conn, table, group_by_fields):
    """Remove duplicates from a table, keeping the oldest record."""
    cursor = conn.cursor()
    
    # Build the GROUP BY clause with proper quoting
    group_clause = ", ".join([f'"{field}"' for field in group_by_fields])
    
    # Find duplicates and delete all but the oldest
    cursor.execute(f"""
        DELETE FROM "{table}"
        WHERE id IN (
            SELECT id
            FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY {group_clause}
                           ORDER BY "createdAt" ASC
                       ) as rn
                FROM "{table}"
            ) t
            WHERE t.rn > 1
        )
    """)
    
    deleted = cursor.rowcount
    conn.commit()
    
    return deleted

def main():
    print("=" * 60)
    print("  Reggie Duplicate Cleanup")
    print("=" * 60)
    
    conn = psycopg2.connect(DATABASE_URL)
    
    # Deduplicate venues (by name)
    print("\n🗑️  Cleaning Venues...")
    deleted = deduplicate_table(conn, "Venue", ["name"])
    print(f"  Removed {deleted} duplicate venues")
    
    # Deduplicate vendors (by name)
    print("\n🗑️  Cleaning Vendors...")
    deleted = deduplicate_table(conn, "Vendor", ["name"])
    print(f"  Removed {deleted} duplicate vendors")
    
    # Deduplicate timeline (by title + eventDate)
    print("\n🗑️  Cleaning Timeline...")
    deleted = deduplicate_table(conn, "Timeline", ["title", "eventDate"])
    print(f"  Removed {deleted} duplicate timeline events")
    
    # Deduplicate tasks (by title)
    print("\n🗑️  Cleaning Tasks...")
    deleted = deduplicate_table(conn, "Task", ["title"])
    print(f"  Removed {deleted} duplicate tasks")
    
    # Deduplicate guests (by firstName + lastName)
    print("\n🗑️  Cleaning Guests...")
    deleted = deduplicate_table(conn, "Guest", ["firstName", "lastName"])
    print(f"  Removed {deleted} duplicate guests")
    
    # Show final counts
    cursor = conn.cursor()
    print("\n" + "=" * 60)
    print("  Final Counts")
    print("=" * 60)
    
    cursor.execute('SELECT COUNT(*) FROM "Venue"')
    print(f"  Venues:    {cursor.fetchone()[0]}")
    
    cursor.execute('SELECT COUNT(*) FROM "Vendor"')
    print(f"  Vendors:   {cursor.fetchone()[0]}")
    
    cursor.execute('SELECT COUNT(*) FROM "Guest"')
    print(f"  Guests:    {cursor.fetchone()[0]}")
    
    cursor.execute('SELECT COUNT(*) FROM "Timeline"')
    print(f"  Timeline:  {cursor.fetchone()[0]}")
    
    cursor.execute('SELECT COUNT(*) FROM "Task"')
    print(f"  Tasks:     {cursor.fetchone()[0]}")
    
    cursor.execute('SELECT COUNT(*) FROM "Financial"')
    print(f"  Financial: {cursor.fetchone()[0]}")
    
    print("=" * 60)
    
    conn.close()

if __name__ == "__main__":
    main()
