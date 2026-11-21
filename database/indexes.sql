-- ============================================================
-- StudySync – Indexes
-- ============================================================
-- Indexes are created AFTER table creation.
-- Each index has a documented justification.
-- ============================================================

-- INDEX: students.email
-- Justification: Login and registration lookups always filter by email.
-- Without this index, every login scans the entire students table.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email ON students(email);

-- INDEX: coordinators.email
-- Justification: Coordinator login filters by email.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coordinators_email ON coordinators(email);

-- INDEX: courses.course_name
-- Justification: Course search and filtering use course_name.
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(course_name);

-- INDEX: courses.department
-- Justification: Coordinator dashboards and analytics group by department frequently.
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);

-- INDEX: courses.coordinator_id
-- Justification: Coordinator pages filter courses by coordinator_id.
CREATE INDEX IF NOT EXISTS idx_courses_coordinator ON courses(coordinator_id);

-- INDEX: enrollments.course_id
-- Justification: Finding all students enrolled in a course requires this lookup.
-- Used heavily in matching, coordinator dashboards, and course health analytics.
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- INDEX: enrollments.student_id
-- Justification: Fetching a student's enrolled courses (profile, matching, group creation).
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

-- INDEX: availability.student_id
-- Justification: Matching algorithm reads all availability records for a student.
-- This index prevents full-table scans during compatibility scoring.
CREATE INDEX IF NOT EXISTS idx_availability_student ON availability(student_id);

-- INDEX: group_memberships.group_id
-- Justification: Fetching group member lists filters by group_id.
-- Used in group details pages and capacity checks.
CREATE INDEX IF NOT EXISTS idx_memberships_group ON group_memberships(group_id);

-- INDEX: group_memberships.student_id
-- Justification: Finding all groups a student belongs to.
CREATE INDEX IF NOT EXISTS idx_memberships_student ON group_memberships(student_id);

-- INDEX: study_groups.course_id
-- Justification: Discovering groups for enrolled courses filters by course_id.
CREATE INDEX IF NOT EXISTS idx_groups_course ON study_groups(course_id);

-- INDEX: study_groups.created_by
-- Justification: Finding groups a student created.
CREATE INDEX IF NOT EXISTS idx_groups_creator ON study_groups(created_by);

-- INDEX: sessions.group_id
-- Justification: Fetching sessions for a group uses group_id.
CREATE INDEX IF NOT EXISTS idx_sessions_group ON sessions(group_id);

-- INDEX: sessions.schedule_time
-- Justification: Upcoming session queries ORDER BY and filter by schedule_time.
-- A B-tree index on schedule_time improves range queries significantly.
CREATE INDEX IF NOT EXISTS idx_sessions_schedule ON sessions(schedule_time);

-- INDEX: notifications.student_id
-- Justification: Notification bell fetches unread notifications by student_id.
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);

-- INDEX: notifications.is_read + student_id composite
-- Justification: Common query pattern is WHERE student_id = X AND is_read = FALSE.
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(student_id, is_read) WHERE is_read = FALSE;
