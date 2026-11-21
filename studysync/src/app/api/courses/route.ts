import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { createCourseSchema } from '@/lib/validation/schemas';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  // Coordinators can only view courses assigned to them
  if (session && session.user.role === 'coordinator') {
    where.coordinator_id = session.user.id;
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      coordinator: { select: { name: true, email: true } },
      _count: { select: { enrollments: true, study_groups: true } },
    },
    orderBy: { course_name: 'asc' },
  });
  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = createCourseSchema.parse(body);
    const course = await prisma.course.create({
      data: { ...data, coordinator_id: session.user.id },
      include: { coordinator: { select: { name: true } } },
    });
    return NextResponse.json(course, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as {name:string}).name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
