import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(vendors);
  } catch (error) {
    return NextResponse.json([], { status: 200 }); // Return empty array if DB not connected
  }
}
