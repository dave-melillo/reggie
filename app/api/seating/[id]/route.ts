import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chart = await prisma.seatingChart.findUnique({ where: { id } });
    if (!chart) {
      return NextResponse.json({ error: 'Seating chart not found' }, { status: 404 });
    }
    return NextResponse.json(chart);
  } catch (error) {
    console.error('Failed to fetch seating chart:', error);
    return NextResponse.json({ error: 'Failed to fetch seating chart' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const chart = await prisma.seatingChart.update({
      where: { id },
      data: {
        name: body.name,
        numTables: body.numTables,
        seatsPerTable: body.seatsPerTable,
        assignments: body.assignments,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(chart);
  } catch (error) {
    console.error('Failed to update seating chart:', error);
    return NextResponse.json({ error: 'Failed to update seating chart' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.seatingChart.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete seating chart:', error);
    return NextResponse.json({ error: 'Failed to delete seating chart' }, { status: 500 });
  }
}
