import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { availabilitySchema } from '@/lib/validation/schemas';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const slots = await prisma.availability.findMany({
    where: { student_id: session.user.id },
    orderBy: [{ day: 'asc' }, { start_time: 'asc' }],
  });
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = availabilitySchema.parse(body);
    const slot = await prisma.availability.create({
      data: {
        student_id: session.user.id,
        day: data.day,
        start_time: new Date(`1970-01-01T${data.start_time}:00`),
        end_time: new Date(`1970-01-01T${data.end_time}:00`),
      },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', issues: (err as unknown as { issues: unknown[] }).issues }, { status: 400 });
    }
    console.error('Availability error:', err);
    return NextResponse.json({ error: 'Failed to add availability' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  await prisma.availability.deleteMany({
    where: { availability_id: id, student_id: session.user.id },
  });
  return NextResponse.json({ success: true });
}
