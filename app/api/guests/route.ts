import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      orderBy: { lastName: 'asc' },
    });
    return NextResponse.json(guests);
  } catch (error) {
    console.error('Failed to fetch guests:', error);
    return NextResponse.json({ error: 'Failed to fetch guests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guest = await prisma.guest.create({
      data: body,
    });
    return NextResponse.json(guest, { status: 201 });
  } catch (error) {
    console.error('Failed to create guest:', error);
    return NextResponse.json({ error: 'Failed to create guest' }, { status: 500 });
  }
}
