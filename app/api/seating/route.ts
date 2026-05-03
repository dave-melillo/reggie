import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const charts = await prisma.seatingChart.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(charts);
  } catch (error) {
    console.error('Failed to fetch seating charts:', error);
    return NextResponse.json({ error: 'Failed to fetch seating charts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chart = await prisma.seatingChart.create({
      data: {
        name: body.name,
        numTables: body.numTables,
        seatsPerTable: body.seatsPerTable,
        assignments: body.assignments ?? {},
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(chart, { status: 201 });
  } catch (error) {
    console.error('Failed to create seating chart:', error);
    return NextResponse.json({ error: 'Failed to create seating chart' }, { status: 500 });
  }
}
