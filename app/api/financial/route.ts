import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const entries = await prisma.financial.findMany({
      orderBy: { category: 'asc' },
    });
    return NextResponse.json(entries);
  } catch (error) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = await prisma.financial.create({
      data: body,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Failed to create financial entry:', error);
    return NextResponse.json({ error: 'Failed to create financial entry' }, { status: 500 });
  }
}
