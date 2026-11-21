import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { createSessionSchema } from '@/lib/validation/schemas';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');
  const status = searchParams.get('status');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (groupId) where.group_id = groupId;
  if (status) where.status = status;

  if (session.user.role === 'student') {
    where.group = { memberships: { some: { student_id: session.user.id } } };
  }

  const sessions = await prisma.session.findMany({
    where,
    include: { group: { include: { course: true } } },
    orderBy: { schedule_time: 'asc' },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const data = createSessionSchema.parse(body);

    const membership = await prisma.groupMembership.findUnique({
      where: { student_id_group_id: { student_id: session.user.id, group_id: data.group_id } },
    });
    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of this group to schedule sessions.' },
        { status: 403 }
      );
    }

    const newSession = await prisma.session.create({
      data: {
        group_id: data.group_id,
        schedule_time: new Date(data.schedule_time),
        location: data.location,
        duration_minutes: data.duration_minutes,
      },
      include: { group: { include: { course: true } } },
    });
    return NextResponse.json(newSession, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const issues = (err as { issues?: Array<{ message: string }> }).issues;
      const message = issues && issues.length > 0 ? issues[0].message : 'Validation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error('Session creation error:', err);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
