import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { query } from '@/lib/db/postgres';
import { getFeedbackCollection } from '@/lib/db/mongodb';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'coordinator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Course health from PostgreSQL view
  const courseHealth = await query(
    `SELECT * FROM v_course_health_summary
     WHERE coordinator_name = (SELECT name FROM coordinators WHERE coordinator_id = $1)
     ORDER BY health_score DESC`,
    [session.user.id]
  );

  // Global stats for this coordinator
  const [stats] = await query<{
    total_students: number;
    total_courses: number;
    active_groups: number;
    total_sessions: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM students)                                                        AS total_students,
       (SELECT COUNT(*) FROM courses WHERE coordinator_id = $1)                               AS total_courses,
       (SELECT COUNT(*) FROM study_groups sg JOIN courses c ON c.course_id = sg.course_id
        WHERE c.coordinator_id = $1 AND sg.status != 'inactive')                             AS active_groups,
       (SELECT COUNT(*) FROM sessions se JOIN study_groups sg ON sg.group_id = se.group_id
        JOIN courses c ON c.course_id = sg.course_id WHERE c.coordinator_id = $1)            AS total_sessions`,
    [session.user.id]
  );

  // Skill distribution
  const skillDistribution = await query<{ skill_level: string; count: number }>(
    `SELECT e.skill_level, COUNT(*) AS count
     FROM enrollments e
     JOIN courses c ON c.course_id = e.course_id
     WHERE c.coordinator_id = $1
     GROUP BY e.skill_level
     ORDER BY count DESC`,
    [session.user.id]
  );

  // Learning style distribution
  const learningStyles = await query<{ learning_style: string; count: number }>(
    `SELECT s.learning_style, COUNT(*) AS count
     FROM students s
     JOIN enrollments e ON e.student_id = s.student_id
     JOIN courses c ON c.course_id = e.course_id
     WHERE c.coordinator_id = $1 AND s.learning_style IS NOT NULL
     GROUP BY s.learning_style`,
    [session.user.id]
  );

  // MongoDB NoSQL Aggregation: Calculate real-time avg rating and feedback count per course
  const courseIds = courseHealth.map((c) => (c as Record<string, unknown>).course_id as string);
  let feedbackAgg: Array<{ _id: string; avgRating: number; totalFeedback: number }> = [];

  if (courseIds.length > 0) {
    try {
      feedbackAgg = (await getFeedbackCollection().aggregate([
        // Stage 1: $match filters documents for the coordinator's managed courses (uses index on course_id)
        { $match: { course_id: { $in: courseIds } } },
        // Stage 2: $group computes average rating and total review counts per course
        {
          $group: {
            _id: '$course_id',
            avgRating: { $avg: '$rating' },
            totalFeedback: { $sum: 1 },
          },
        },
      ]).toArray()) as Array<{ _id: string; avgRating: number; totalFeedback: number }>;
    } catch (mongoErr) {
      console.warn('MongoDB feedback aggregation unavailable (degraded mode):', mongoErr);
      feedbackAgg = [];
    }
  }

  // Merge MongoDB NoSQL feedback aggregates with MySQL relational view data
  const enrichedCourseHealth = courseHealth.map((c) => {
    const ch = c as Record<string, unknown>;
    const fb = feedbackAgg.find((f) => f._id === ch.course_id);
    return {
      ...ch,
      avg_rating: fb ? Math.round((fb.avgRating as number) * 10) / 10 : null,
      total_feedback: fb?.totalFeedback ?? 0,
    };
  });

  return NextResponse.json({ stats, courseHealth: enrichedCourseHealth, skillDistribution, learningStyles });
}
