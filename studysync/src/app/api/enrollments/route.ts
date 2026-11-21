import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { enrollmentSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = enrollmentSchema.parse(body);
    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: { student_id_course_id: { student_id: session.user.id, course_id: data.course_id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 409 });
    }
    const enrollment = await prisma.enrollment.create({
      data: { student_id: session.user.id, course_id: data.course_id, skill_level: data.skill_level },
      include: { course: true },
    });
    return NextResponse.json(enrollment, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as {name:string}).name === 'ZodError') {
      const issues = (err as { issues?: Array<{ message: string }> }).issues;
      const message = issues && issues.length > 0 ? issues[0].message : 'Validation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 });
  await prisma.enrollment.deleteMany({
    where: { student_id: session.user.id, course_id: courseId },
  });
  return NextResponse.json({ success: true });
}
