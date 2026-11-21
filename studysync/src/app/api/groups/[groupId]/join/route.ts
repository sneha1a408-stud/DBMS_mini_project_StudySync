import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { groupId } = await params;

  try {
    const group = await prisma.studyGroup.findUnique({
      where: { group_id: groupId },
      include: { _count: { select: { memberships: true } } },
    });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    if (group.member_count >= group.max_members || group._count.memberships >= group.max_members) {
      return NextResponse.json({ error: 'Group is full' }, { status: 409 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { student_id_course_id: { student_id: session.user.id, course_id: group.course_id } },
    });
    if (!enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this course' }, { status: 403 });
    }

    const existing = await prisma.groupMembership.findUnique({
      where: { student_id_group_id: { student_id: session.user.id, group_id: groupId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }

    // Database trigger trg_check_group_capacity validates capacity,
    // and trg_update_member_count_insert automatically increments member_count & updates status
    await prisma.groupMembership.create({
      data: {
        student_id: session.user.id,
        group_id: groupId,
        role: 'member',
        skill_level: enrollment.skill_level,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to join group';
    console.error('Join group error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
