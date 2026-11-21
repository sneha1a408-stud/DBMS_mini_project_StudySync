-- ============================================================
-- StudySync – SQL Views
-- ============================================================

-- ============================================================
-- VIEW: v_student_enrollments
-- Provides a flattened view of student course enrollments with
-- coordinator and course information. Used in coordinator's
-- student management and student's course overview pages.
-- ============================================================
CREATE OR REPLACE VIEW v_student_enrollments AS
SELECT
    s.student_id,
    s.name            AS student_name,
    s.email           AS student_email,
    s.learning_style,
    c.course_id,
    c.course_name,
    c.department,
    c.semester,
    e.enrollment_date,
    e.skill_level,
    co.name           AS coordinator_name
FROM students s
JOIN enrollments  e  ON e.student_id = s.student_id
JOIN courses      c  ON c.course_id  = e.course_id
JOIN coordinators co ON co.coordinator_id = c.coordinator_id;

COMMENT ON VIEW v_student_enrollments IS 'Denormalized view of student enrollments with course and coordinator details.';

-- ============================================================
-- VIEW: v_group_membership_overview
-- Full view of study group membership with student and course
-- details. Used in group details pages and coordinator monitoring.
-- ============================================================
CREATE OR REPLACE VIEW v_group_membership_overview AS
SELECT
    sg.group_id,
    sg.group_name,
    sg.status          AS group_status,
    sg.max_members,
    sg.member_count,
    sg.created_at      AS group_created_at,
    c.course_id,
    c.course_name,
    c.department,
    s.student_id,
    s.name             AS student_name,
    s.email            AS student_email,
    s.learning_style,
    gm.role,
    gm.skill_level     AS member_skill_level,
    gm.joined_at,
    creator.name       AS creator_name
FROM study_groups sg
JOIN courses            c       ON c.course_id  = sg.course_id
JOIN students           creator ON creator.student_id = sg.created_by
LEFT JOIN group_memberships gm  ON gm.group_id  = sg.group_id
LEFT JOIN students      s       ON s.student_id = gm.student_id;

COMMENT ON VIEW v_group_membership_overview IS 'Comprehensive group membership view with student, course, and creator details.';

-- ============================================================
-- VIEW: v_course_health_summary
-- Aggregated course health metrics per course.
-- Used by the coordinator course health dashboard.
-- Course Health Score formula (normalized 0–100):
--   Health = 0.30 × enrollment_ratio
--           + 0.25 × group_ratio
--           + 0.25 × avg_rating_normalized   (from MongoDB)
--           + 0.20 × session_completion_ratio
-- (avg_rating_normalized is applied in application layer from MongoDB)
-- ============================================================
CREATE OR REPLACE VIEW v_course_health_summary AS
WITH enrollment_stats AS (
    SELECT
        c.course_id,
        c.course_name,
        c.department,
        c.semester,
        co.name                                                          AS coordinator_name,
        COUNT(DISTINCT e.student_id)                                     AS total_enrolled,
        COUNT(DISTINCT sg.group_id)                                      AS total_groups,
        COUNT(DISTINCT sg.group_id) FILTER (WHERE sg.status != 'inactive') AS active_groups,
        COALESCE(AVG(sg.member_count), 0)                                AS avg_group_size,
        COUNT(DISTINCT sess.session_id)                                  AS total_sessions,
        COUNT(DISTINCT sess.session_id) FILTER (WHERE sess.status = 'completed') AS completed_sessions,
        COUNT(DISTINCT gm.student_id)                                    AS total_group_participants
    FROM courses c
    JOIN coordinators co   ON co.coordinator_id = c.coordinator_id
    LEFT JOIN enrollments e ON e.course_id = c.course_id
    LEFT JOIN study_groups sg ON sg.course_id = c.course_id
    LEFT JOIN group_memberships gm ON gm.group_id = sg.group_id
    LEFT JOIN sessions sess ON sess.group_id = sg.group_id
    GROUP BY c.course_id, c.course_name, c.department, c.semester, co.name
)
SELECT
    *,
    ROUND(
        (
            LEAST(total_enrolled::NUMERIC / NULLIF(30, 0) * 100, 100) * 0.30 +
            LEAST(active_groups::NUMERIC / NULLIF(GREATEST(total_enrolled, 1), 0) * 10 * 100, 100) * 0.25 +
            CASE WHEN total_sessions > 0
                THEN (completed_sessions::NUMERIC / total_sessions * 100) * 0.20
                ELSE 0
            END +
            CASE WHEN total_enrolled > 0
                THEN (total_group_participants::NUMERIC / total_enrolled * 100) * 0.25
                ELSE 0
            END
        )::NUMERIC, 1
    ) AS health_score
FROM enrollment_stats;

COMMENT ON VIEW v_course_health_summary IS 'Course health metrics aggregated from actual DB records. Health score is calculated from enrollment, group, session, and participation ratios.';
