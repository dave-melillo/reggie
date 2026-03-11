import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { id: id },
    });
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }
    
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Failed to fetch vendor:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const vendor = await prisma.vendor.update({
      where: { id: id },
      data: body,
    });
    return NextResponse.json(vendor);
  } catch (error) {
    console.error('Failed to update vendor:', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.vendor.delete({
      where: { id: id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
