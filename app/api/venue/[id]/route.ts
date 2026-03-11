import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const venue = await prisma.venue.findUnique({
      where: { id: id },
    });
    
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    return NextResponse.json(venue);
  } catch (error) {
    console.error('Failed to fetch venue:', error);
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const venue = await prisma.venue.update({
      where: { id: id },
      data: body,
    });
    return NextResponse.json(venue);
  } catch (error) {
    console.error('Failed to update venue:', error);
    return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.venue.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete venue:', error);
    return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 });
  }
}
