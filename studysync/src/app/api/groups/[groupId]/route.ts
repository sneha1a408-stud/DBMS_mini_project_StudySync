import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const group = await prisma.studyGroup.findUnique({
    where: { group_id: groupId },
    include: {
      course: { include: { coordinator: { select: { name: true } } } },
      creator: { select: { name: true, email: true } },
      memberships: {
        include: {
          student: { select: { student_id: true, name: true, email: true, learning_style: true } },
        },
        orderBy: [{ role: 'desc' }, { joined_at: 'asc' }],
      },
      sessions: { orderBy: { schedule_time: 'asc' } },
    },
  });
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  return NextResponse.json(group);
}
