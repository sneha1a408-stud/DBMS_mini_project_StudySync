-- ============================================================
-- StudySync – MySQL Relational Schema (8.0+)
-- ============================================================
-- Prerequisites: MySQL >= 8.0
-- Database: studysync
-- ============================================================

CREATE DATABASE IF NOT EXISTS studysync
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE studysync;

-- ============================================================
-- TABLE: coordinators (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS coordinators (
    coordinator_id  VARCHAR(36)  PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: students (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    student_id      VARCHAR(36)  PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   TEXT          NOT NULL,
    learning_style  VARCHAR(20)   CHECK (learning_style IN ('Visual','Auditory','Reading/Writing','Kinesthetic')),
    bio             TEXT,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    deleted_at      DATETIME      NULL,
    deleted_by      VARCHAR(36)   NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: courses (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    course_id       VARCHAR(36)  PRIMARY KEY,
    course_name     VARCHAR(200)  NOT NULL,
    department      VARCHAR(100)  NOT NULL,
    semester        VARCHAR(20)   NOT NULL,
    coordinator_id  VARCHAR(36)   NOT NULL,
    description     TEXT,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_courses_coordinator FOREIGN KEY (coordinator_id)
        REFERENCES coordinators(coordinator_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: availability (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS availability (
    availability_id VARCHAR(36)  PRIMARY KEY,
    student_id      VARCHAR(36)  NOT NULL,
    day             VARCHAR(10)  NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
    start_time      TIME         NOT NULL,
    end_time        TIME         NOT NULL,
    CONSTRAINT fk_avail_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_time_range CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: enrollments (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
    student_id      VARCHAR(36)  NOT NULL,
    course_id       VARCHAR(36)  NOT NULL,
    enrollment_date DATE         NOT NULL DEFAULT (CURRENT_DATE),
    skill_level     VARCHAR(15)  NOT NULL DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
    PRIMARY KEY (student_id, course_id),
    CONSTRAINT fk_enroll_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_enroll_course FOREIGN KEY (course_id)
        REFERENCES courses(course_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: study_groups (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_groups (
    group_id        VARCHAR(36)  PRIMARY KEY,
    group_name      VARCHAR(200) NOT NULL,
    course_id       VARCHAR(36)  NOT NULL,
    created_by      VARCHAR(36)  NOT NULL,
    description     TEXT,
    status          VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','full')),
    max_members     INT          NOT NULL DEFAULT 6 CHECK (max_members BETWEEN 2 AND 20),
    member_count    INT          NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_course FOREIGN KEY (course_id)
        REFERENCES courses(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_group_creator FOREIGN KEY (created_by)
        REFERENCES students(student_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_capacity CHECK (member_count <= max_members)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: group_memberships (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS group_memberships (
    student_id  VARCHAR(36) NOT NULL,
    group_id    VARCHAR(36) NOT NULL,
    role        VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
    skill_level VARCHAR(15) NOT NULL DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
    joined_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, group_id),
    CONSTRAINT fk_mem_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mem_group FOREIGN KEY (group_id)
        REFERENCES study_groups(group_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: sessions (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id       VARCHAR(36)  PRIMARY KEY,
    group_id         VARCHAR(36)  NOT NULL,
    schedule_time    DATETIME     NOT NULL,
    location         VARCHAR(255) NOT NULL,
    duration_minutes INT          NOT NULL CHECK (duration_minutes > 0),
    status           VARCHAR(15)  NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_group FOREIGN KEY (group_id)
        REFERENCES study_groups(group_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notifications (Safe: CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id    VARCHAR(36)  PRIMARY KEY,
    student_id         VARCHAR(36)  NOT NULL,
    type               VARCHAR(30)  NOT NULL CHECK (type IN ('group_invite','group_join','session_reminder','session_update','general')),
    title              VARCHAR(200) NOT NULL,
    message            TEXT         NOT NULL,
    is_read            BOOLEAN      NOT NULL DEFAULT FALSE,
    related_group_id   VARCHAR(36)  DEFAULT NULL,
    related_session_id VARCHAR(36)  DEFAULT NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notif_group FOREIGN KEY (related_group_id)
        REFERENCES study_groups(group_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_notif_session FOREIGN KEY (related_session_id)
        REFERENCES sessions(session_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
