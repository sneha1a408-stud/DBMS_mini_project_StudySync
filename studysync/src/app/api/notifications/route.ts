import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const notifications = await prisma.notification.findMany({
    where: { student_id: session.user.id },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const all = searchParams.get('all') === 'true';

  if (all) {
    await prisma.notification.updateMany({
      where: { student_id: session.user.id },
      data: { is_read: true },
    });
  } else if (id) {
    await prisma.notification.update({
      where: { notification_id: id },
      data: { is_read: true },
    });
  }
  return NextResponse.json({ success: true });
}
