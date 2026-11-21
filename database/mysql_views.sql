-- ============================================================
-- StudySync – MySQL Views (8.0+)
-- ============================================================
USE studysync;

-- ============================================================
-- VIEW: v_student_enrollments
-- ============================================================
CREATE VIEW v_student_enrollments AS
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

-- ============================================================
-- VIEW: v_group_membership_overview
-- ============================================================
CREATE VIEW v_group_membership_overview AS
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

-- ============================================================
-- VIEW: v_course_health_summary
-- Course health score (0–100) based on enrollments, active groups,
-- and completed study sessions.
-- ============================================================
CREATE VIEW v_course_health_summary AS
SELECT
    c.course_id,
    c.course_name,
    c.department,
    c.semester,
    co.name                                                                 AS coordinator_name,
    COUNT(DISTINCT e.student_id)                                            AS total_students,
    COUNT(DISTINCT sg.group_id)                                             AS active_groups,
    COUNT(DISTINCT se.session_id)                                           AS completed_sessions,
    LEAST(100, (COUNT(DISTINCT e.student_id) * 10
              + COUNT(DISTINCT sg.group_id) * 20
              + COUNT(DISTINCT se.session_id) * 15))                        AS health_score
FROM courses c
JOIN coordinators co ON co.coordinator_id = c.coordinator_id
LEFT JOIN enrollments  e  ON e.course_id = c.course_id
LEFT JOIN study_groups sg ON sg.course_id = c.course_id AND sg.status != 'inactive'
LEFT JOIN sessions     se ON se.group_id = sg.group_id AND se.status = 'completed'
GROUP BY c.course_id, c.course_name, c.department, c.semester, co.name;
