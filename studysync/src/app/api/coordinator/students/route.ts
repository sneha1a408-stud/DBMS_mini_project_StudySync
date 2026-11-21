import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { query } from '@/lib/db/postgres';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Use the v_student_enrollments view — only active students enrolled in this coordinator's courses
  const students = await query(
    `SELECT DISTINCT
       se.student_id,
       se.student_name,
       se.student_email,
       se.learning_style,
       COUNT(DISTINCT se.course_id) AS enrolled_courses,
       COUNT(DISTINCT gm.group_id)  AS group_count
     FROM v_student_enrollments se
     JOIN students s ON s.student_id = se.student_id
     LEFT JOIN group_memberships gm ON gm.student_id = se.student_id
     WHERE se.coordinator_name = (SELECT name FROM coordinators WHERE coordinator_id = $1)
       AND (s.is_active = TRUE OR s.is_active = 1)
     GROUP BY se.student_id, se.student_name, se.student_email, se.learning_style
     ORDER BY se.student_name`,
    [session.user.id]
  );
  return NextResponse.json(students);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');

  if (!studentId) {
    return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
  }

  try {
    // 1. Verify this student is enrolled in at least one course assigned to this coordinator
    const enrolledInCoordinatorCourse = await query(
      `SELECT 1 FROM enrollments e
       JOIN courses c ON c.course_id = e.course_id
       WHERE e.student_id = $1 AND c.coordinator_id = $2
       LIMIT 1`,
      [studentId, session.user.id]
    );

    if (!enrolledInCoordinatorCourse || enrolledInCoordinatorCourse.length === 0) {
      return NextResponse.json(
        { error: 'You can only delete students enrolled in your assigned courses.' },
        { status: 403 }
      );
    }

    // 2. Fetch group memberships belonging to this coordinator's courses
    const memberGroups = await query<{ group_id: string }>(
      `SELECT gm.group_id FROM group_memberships gm
       JOIN study_groups sg ON sg.group_id = gm.group_id
       JOIN courses c ON c.course_id = sg.course_id
       WHERE gm.student_id = $1 AND c.coordinator_id = $2`,
      [studentId, session.user.id]
    );

    // Delete single-table rows to allow MySQL trigger trg_update_member_count_delete to safely update study_groups
    for (const g of memberGroups) {
      await query(
        `DELETE FROM group_memberships WHERE student_id = $1 AND group_id = $2`,
        [studentId, g.group_id]
      );
    }

    // 3. Fetch & remove enrollments for this coordinator's courses
    const enrollments = await query<{ course_id: string }>(
      `SELECT e.course_id FROM enrollments e
       JOIN courses c ON c.course_id = e.course_id
       WHERE e.student_id = $1 AND c.coordinator_id = $2`,
      [studentId, session.user.id]
    );

    for (const e of enrollments) {
      await query(
        `DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2`,
        [studentId, e.course_id]
      );
    }

    // 4. Mark student account as revoked/deleted in the database
    await query(
      `UPDATE students 
       SET is_active = FALSE, 
           deleted_at = NOW(), 
           deleted_by = $1 
       WHERE student_id = $2`,
      [session.user.id, studentId]
    );

    return NextResponse.json({
      success: true,
      message: 'Student account has been removed. Login access has been revoked.',
    });
  } catch (err: unknown) {
    console.error('Coordinator student deletion error:', err);
    const msg = err instanceof Error ? err.message : 'Failed to delete student account';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
