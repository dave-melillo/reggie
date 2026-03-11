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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const vendor = await prisma.vendor.create({
      data: body,
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    console.error('Failed to create vendor:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
