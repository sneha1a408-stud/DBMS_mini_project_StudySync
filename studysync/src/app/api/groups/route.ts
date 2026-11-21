import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { withTransaction } from '@/lib/db/postgres';
import { createGroupSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const myGroups = searchParams.get('mine') === 'true';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (courseId) where.course_id = courseId;
  if (myGroups && session.user.role === 'student') {
    where.memberships = { some: { student_id: session.user.id } };
  }

  // Coordinators can only view study groups belonging to courses assigned to them
  if (session.user.role === 'coordinator') {
    where.course = { coordinator_id: session.user.id };
  }

  const groups = await prisma.studyGroup.findMany({
    where,
    include: {
      course: true,
      creator: { select: { name: true } },
      _count: { select: { memberships: true, sessions: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = createGroupSchema.parse(body);

    const enrolled = await prisma.enrollment.findUnique({
      where: { student_id_course_id: { student_id: session.user.id, course_id: data.course_id } },
    });
    if (!enrolled) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to create a group.' },
        { status: 403 }
      );
    }

    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.studyGroup.create({
        data: {
          group_name: data.group_name,
          course_id: data.course_id,
          created_by: session.user.id,
          max_members: data.max_members,
          description: data.description ?? null,
          member_count: 0, // Database trigger increments this to 1 when leader membership is inserted
        },
      });
      await tx.groupMembership.create({
        data: {
          student_id: session.user.id,
          group_id: newGroup.group_id,
          role: 'leader',
          skill_level: enrolled.skill_level,
        },
      });
      return newGroup;
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const issues = (err as { issues?: Array<{ message: string }> }).issues;
      const message = issues && issues.length > 0 ? issues[0].message : 'Validation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Group creation error:', err);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
