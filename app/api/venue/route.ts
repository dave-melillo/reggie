import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(venues);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const venue = await prisma.venue.create({
      data: body,
    });
    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error('Failed to create venue:', error);
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 });
  }
}
