import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { createCourseSchema } from '@/lib/validation/schemas';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { course_id: courseId },
    include: {
      coordinator: { select: { name: true, email: true } },
      enrollments: {
        include: { student: { select: { name: true, email: true, learning_style: true } } },
      },
      study_groups: {
        include: { _count: { select: { memberships: true } } },
      },
    },
  });
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  return NextResponse.json(course);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { courseId } = await params;
  const course = await prisma.course.findUnique({ where: { course_id: courseId } });
  if (!course || course.coordinator_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const data = createCourseSchema.partial().parse(body);
    const updated = await prisma.course.update({ where: { course_id: courseId }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { courseId } = await params;
  await prisma.course.delete({ where: { course_id: courseId } });
  return NextResponse.json({ success: true });
}
