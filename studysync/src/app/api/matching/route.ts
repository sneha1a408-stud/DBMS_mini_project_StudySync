import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';
import { rankMatches, StudentMatchData } from '@/lib/matching/algorithm';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetRaw = await prisma.student.findUnique({
    where: { student_id: session.user.id },
    include: {
      availability: true,
      enrollments: { include: { course: true } },
    },
  });
  if (!targetRaw) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  const candidatesRaw = await prisma.student.findMany({
    where: { student_id: { not: session.user.id } },
    include: {
      availability: true,
      enrollments: { include: { course: true } },
    },
  });

  const toMatchData = (s: NonNullable<typeof targetRaw>): StudentMatchData => ({
    student_id: s.student_id,
    name: s.name,
    email: s.email,
    learning_style: s.learning_style,
    bio: s.bio,
    availability: s.availability.map((a: { day: string; start_time: Date; end_time: Date }) => ({
      day: a.day,
      start_time: new Date(a.start_time).toISOString().slice(11, 16),
      end_time: new Date(a.end_time).toISOString().slice(11, 16),
    })),
    enrollments: s.enrollments.map((e: { course_id: string; course: { course_name: string }; skill_level: string }) => ({
      course_id: e.course_id,
      course_name: e.course.course_name,
      skill_level: e.skill_level as 'Beginner' | 'Intermediate' | 'Advanced',
    })),
  });

  const target = toMatchData(targetRaw);
  const candidates = candidatesRaw.map(toMatchData);
  const ranked = rankMatches(target, candidates);

  return NextResponse.json({ matches: ranked, target });
}
