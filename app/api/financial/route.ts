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
