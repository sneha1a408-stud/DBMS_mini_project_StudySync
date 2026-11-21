-- ============================================================
-- StudySync – PostgreSQL Relational Schema
-- ============================================================
-- Run this file ONCE to create all tables, constraints,
-- indexes, triggers, functions, and views.
-- Prerequisites: PostgreSQL >= 14, extension pgcrypto (optional)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DROP TABLES (for clean re-run, cascade order)
-- ============================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS study_groups CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS coordinators CASCADE;

-- ============================================================
-- DROP VIEWS (re-created later)
-- ============================================================
DROP VIEW IF EXISTS v_student_enrollments CASCADE;
DROP VIEW IF EXISTS v_group_membership_overview CASCADE;
DROP VIEW IF EXISTS v_course_health_summary CASCADE;

-- ============================================================
-- DROP FUNCTIONS / TRIGGERS
-- ============================================================
DROP FUNCTION IF EXISTS fn_update_member_count() CASCADE;
DROP FUNCTION IF EXISTS fn_check_group_capacity() CASCADE;
DROP FUNCTION IF EXISTS fn_create_study_group(VARCHAR, UUID, UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS fn_get_enrollment_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS fn_get_group_stats() CASCADE;

-- ============================================================
-- TABLE: coordinators
-- ============================================================
CREATE TABLE coordinators (
    coordinator_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE coordinators IS 'Coordinator accounts who manage courses and monitor study groups.';

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE students (
    student_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,
    learning_style  VARCHAR(20)   CHECK (learning_style IN ('Visual','Auditory','Reading/Writing','Kinesthetic')),
    bio             TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE students IS 'Student accounts who discover partners and join study groups.';

-- ============================================================
-- TABLE: courses
-- ============================================================
CREATE TABLE courses (
    course_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name     VARCHAR(200)  NOT NULL,
    department      VARCHAR(100)  NOT NULL,
    semester        VARCHAR(20)   NOT NULL,
    coordinator_id  UUID          NOT NULL REFERENCES coordinators(coordinator_id) ON DELETE RESTRICT,
    description     TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE courses IS 'University courses managed by coordinators.';

-- ============================================================
-- TABLE: availability
-- ============================================================
CREATE TABLE availability (
    availability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID         NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    day             VARCHAR(10)  NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time      TIME         NOT NULL,
    end_time        TIME         NOT NULL,
    CONSTRAINT chk_time_range CHECK (end_time > start_time)
);

COMMENT ON TABLE availability IS 'Weekly recurring availability slots for students.';

-- ============================================================
-- TABLE: enrollments
-- ============================================================
CREATE TABLE enrollments (
    student_id      UUID         NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_id       UUID         NOT NULL REFERENCES courses(course_id)   ON DELETE CASCADE,
    enrollment_date DATE         NOT NULL DEFAULT CURRENT_DATE,
    skill_level     VARCHAR(15)  NOT NULL DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
    PRIMARY KEY (student_id, course_id)
);

COMMENT ON TABLE enrollments IS 'Many-to-many relationship between students and courses. skill_level reflects the student competency for that course.';

-- ============================================================
-- TABLE: study_groups
-- ============================================================
CREATE TABLE study_groups (
    group_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_name      VARCHAR(200) NOT NULL,
    course_id       UUID         NOT NULL REFERENCES courses(course_id)  ON DELETE CASCADE,
    created_by      UUID         NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
    description     TEXT,
    status          VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','full')),
    max_members     INT          NOT NULL DEFAULT 6 CHECK (max_members BETWEEN 2 AND 20),
    member_count    INT          NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_capacity CHECK (member_count <= max_members)
);

COMMENT ON TABLE study_groups IS 'Study groups created by students for specific courses. member_count is auto-maintained by triggers.';

-- ============================================================
-- TABLE: group_memberships
-- ============================================================
CREATE TABLE group_memberships (
    student_id  UUID        NOT NULL REFERENCES students(student_id)    ON DELETE CASCADE,
    group_id    UUID        NOT NULL REFERENCES study_groups(group_id)  ON DELETE CASCADE,
    role        VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
    skill_level VARCHAR(15) NOT NULL DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, group_id)
);

COMMENT ON TABLE group_memberships IS 'Many-to-many relationship between students and study groups.';

-- ============================================================
-- TABLE: sessions
-- ============================================================
CREATE TABLE sessions (
    session_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        UUID         NOT NULL REFERENCES study_groups(group_id) ON DELETE CASCADE,
    schedule_time   TIMESTAMPTZ  NOT NULL,
    location        VARCHAR(255) NOT NULL,
    duration_minutes INT         NOT NULL CHECK (duration_minutes > 0),
    status          VARCHAR(15)  NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sessions IS 'Study sessions scheduled by group members.';

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
    notification_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         UUID         NOT NULL REFERENCES students(student_id)    ON DELETE CASCADE,
    type               VARCHAR(30)  NOT NULL CHECK (type IN ('group_invite','group_join','session_reminder','session_update','general')),
    title              VARCHAR(200) NOT NULL,
    message            TEXT         NOT NULL,
    is_read            BOOLEAN      NOT NULL DEFAULT FALSE,
    related_group_id   UUID         REFERENCES study_groups(group_id) ON DELETE SET NULL,
    related_session_id UUID         REFERENCES sessions(session_id)   ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'In-app notifications for students.';
