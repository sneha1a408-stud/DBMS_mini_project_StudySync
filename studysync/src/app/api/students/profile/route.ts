import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { updateProfileSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const student = await prisma.student.findUnique({
    where: { student_id: session.user.id },
    select: {
      student_id: true,
      name: true,
      email: true,
      learning_style: true,
      bio: true,
      created_at: true,
      enrollments: {
        include: { course: { include: { coordinator: { select: { name: true } } } } },
        orderBy: { enrollment_date: 'desc' },
      },
      memberships: {
        include: { group: { include: { course: true } } },
        orderBy: { joined_at: 'desc' },
      },
      availability: { orderBy: [{ day: 'asc' }, { start_time: 'asc' }] },
    },
  });
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  return NextResponse.json(student);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);
    const updated = await prisma.student.update({
      where: { student_id: session.user.id },
      data,
      select: { student_id: true, name: true, email: true, learning_style: true, bio: true },
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as {name:string}).name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
