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
    const membership = await prisma.groupMembership.findUnique({
      where: { student_id_group_id: { student_id: session.user.id, group_id: groupId } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 400 });
    }
    if (membership.role === 'leader') {
      return NextResponse.json({ error: 'Group leader cannot leave. Transfer leadership first.' }, { status: 400 });
    }

    // Database trigger trg_update_member_count_delete automatically decrements member_count and resets status
    await prisma.groupMembership.delete({
      where: { student_id_group_id: { student_id: session.user.id, group_id: groupId } },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to leave group';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
