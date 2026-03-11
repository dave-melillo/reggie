import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guest = await prisma.guest.findUnique({
      where: { id },
    });
    
    if (!guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }
    
    return NextResponse.json(guest);
  } catch (error) {
    console.error('Failed to fetch guest:', error);
    return NextResponse.json({ error: 'Failed to fetch guest' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const guest = await prisma.guest.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(guest);
  } catch (error) {
    console.error('Failed to update guest:', error);
    return NextResponse.json({ error: 'Failed to update guest' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.guest.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete guest:', error);
    return NextResponse.json({ error: 'Failed to delete guest' }, { status: 500 });
  }
}
