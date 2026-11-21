-- ============================================================
-- StudySync – Advanced SQL Queries Demo
-- ============================================================
-- This file demonstrates various SQL concepts required for
-- a Level 3 DBMS project. These queries are used in the
-- application or can be run independently for demonstration.
-- ============================================================

-- =============================================
-- A. DDL: CREATE, ALTER, DROP
-- =============================================

-- CREATE (shown in schema.sql — example here for reference)
-- CREATE TABLE example_table (id SERIAL PRIMARY KEY, label TEXT);

-- ALTER: Add a column to availability for recurring notes
ALTER TABLE availability ADD COLUMN IF NOT EXISTS notes TEXT;

-- DROP: Remove the notes column (reverting the ALTER above)
ALTER TABLE availability DROP COLUMN IF EXISTS notes;

-- =============================================
-- B. DML: INSERT, UPDATE, DELETE
-- =============================================

-- INSERT example (see seed.sql for full data)
-- INSERT INTO students (name, email, password_hash, learning_style)
-- VALUES ('Jane Doe', 'jane@example.com', 'hash', 'Visual');

-- UPDATE: Mark all past upcoming sessions as completed
UPDATE sessions
SET status = 'completed'
WHERE status = 'upcoming'
  AND schedule_time < NOW();

-- DELETE: Remove old read notifications older than 30 days
DELETE FROM notifications
WHERE is_read = TRUE
  AND created_at < NOW() - INTERVAL '30 days';

-- =============================================
-- C. SELECT with JOIN
-- =============================================

-- Get all group members with their courses and skill levels
SELECT
    sg.group_name,
    s.name            AS student_name,
    s.learning_style,
    gm.role,
    gm.skill_level,
    c.course_name
FROM study_groups sg
JOIN group_memberships gm ON gm.group_id  = sg.group_id
JOIN students          s  ON s.student_id = gm.student_id
JOIN courses           c  ON c.course_id  = sg.course_id
ORDER BY sg.group_name, gm.role DESC, s.name;

-- =============================================
-- D. GROUP BY + HAVING + Aggregate Functions
-- =============================================

-- Find courses with more than 3 active study groups
SELECT
    c.course_name,
    c.department,
    COUNT(sg.group_id)             AS total_groups,
    SUM(sg.member_count)           AS total_members,
    AVG(sg.member_count)           AS avg_members_per_group,
    MAX(sg.member_count)           AS largest_group
FROM courses c
JOIN study_groups sg ON sg.course_id = c.course_id
WHERE sg.status != 'inactive'
GROUP BY c.course_id, c.course_name, c.department
HAVING COUNT(sg.group_id) > 3
ORDER BY total_groups DESC;

-- =============================================
-- E. ORDER BY + Subquery
-- =============================================

-- Find the top 5 most enrolled courses
SELECT
    c.course_name,
    c.department,
    (
        SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id
    ) AS enrollment_count
FROM courses c
ORDER BY enrollment_count DESC
LIMIT 5;

-- Students who are in more than 2 study groups
SELECT
    s.name,
    s.email,
    COUNT(gm.group_id) AS group_count
FROM students s
JOIN group_memberships gm ON gm.student_id = s.student_id
GROUP BY s.student_id, s.name, s.email
HAVING COUNT(gm.group_id) > 2
ORDER BY group_count DESC;

-- =============================================
-- F. Advanced: Window Functions
-- =============================================

-- Rank students by number of groups within each course
SELECT
    c.course_name,
    s.name,
    COUNT(gm.group_id) AS group_count,
    RANK() OVER (PARTITION BY c.course_id ORDER BY COUNT(gm.group_id) DESC) AS rank_in_course
FROM students s
JOIN group_memberships gm ON gm.student_id = s.student_id
JOIN study_groups sg      ON sg.group_id  = gm.group_id
JOIN courses c            ON c.course_id  = sg.course_id
GROUP BY c.course_id, c.course_name, s.student_id, s.name
ORDER BY c.course_name, rank_in_course;

-- =============================================
-- G. CTE (Common Table Expression)
-- =============================================

-- Find students who are enrolled in a course but have NOT joined any group for it
WITH enrolled AS (
    SELECT e.student_id, e.course_id
    FROM enrollments e
),
in_group AS (
    SELECT DISTINCT gm.student_id, sg.course_id
    FROM group_memberships gm
    JOIN study_groups sg ON sg.group_id = gm.group_id
)
SELECT
    s.name        AS student_name,
    c.course_name,
    e.skill_level
FROM enrolled e
JOIN students s ON s.student_id = e.student_id
JOIN courses  c ON c.course_id  = e.course_id
WHERE NOT EXISTS (
    SELECT 1 FROM in_group ig
    WHERE ig.student_id = e.student_id
      AND ig.course_id  = e.course_id
)
ORDER BY c.course_name, s.name;

-- =============================================
-- H. Correlated Subquery
-- =============================================

-- Find groups where member_count equals max_members (full groups)
SELECT
    sg.group_name,
    c.course_name,
    sg.member_count,
    sg.max_members,
    (
        SELECT s.name FROM students s WHERE s.student_id = sg.created_by
    ) AS creator_name
FROM study_groups sg
JOIN courses c ON c.course_id = sg.course_id
WHERE sg.member_count = sg.max_members;

-- =============================================
-- I. UNION / EXCEPT
-- =============================================

-- Get all people (students + coordinators) with their role
SELECT name, email, 'student'     AS role FROM students
UNION ALL
SELECT name, email, 'coordinator' AS role FROM coordinators
ORDER BY role, name;

-- =============================================
-- J. Transaction Example (application-level)
-- =============================================

-- This demonstrates transaction syntax; actual transactional
-- group joining uses fn_join_group() called in a transaction block.
BEGIN;
    -- Join a student to a group (triggers run within transaction)
    SELECT fn_join_group(
        '00000000-0000-0000-0000-000000000001'::UUID,  -- student_id
        '00000000-0000-0000-0000-000000000002'::UUID   -- group_id
    );
COMMIT;
-- If any step fails: ROLLBACK;

-- =============================================
-- K. View Usage
-- =============================================

-- Use the enrollment overview view
SELECT * FROM v_student_enrollments WHERE department = 'Computer Science';

-- Use course health view ordered by health score
SELECT course_name, total_enrolled, active_groups, health_score
FROM v_course_health_summary
ORDER BY health_score DESC;

-- Use group membership overview
SELECT group_name, student_name, role, member_skill_level
FROM v_group_membership_overview
WHERE department = 'Computer Science'
ORDER BY group_name, role DESC;
