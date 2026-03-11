import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await prisma.financial.findUnique({
      where: { id: id },
    });
    
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to fetch entry:', error);
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const entry = await prisma.financial.update({
      where: { id: id },
      data: body,
    });
    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to update entry:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.financial.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete entry:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
