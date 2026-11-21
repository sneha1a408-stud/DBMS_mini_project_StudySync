-- ============================================================
-- StudySync – Stored Functions / Procedures
-- ============================================================

-- ============================================================
-- FUNCTION: fn_create_study_group
-- Creates a new study group and adds the creator as leader.
-- Uses a transaction-like pattern — called within an application
-- transaction for full atomicity.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_create_study_group(
    p_group_name  VARCHAR,
    p_course_id   UUID,
    p_created_by  UUID,
    p_max_members INT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_group_id  UUID;
    v_enrolled  BOOLEAN;
    v_skill     VARCHAR(15);
BEGIN
    -- Validate the student is enrolled in the course
    SELECT EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id = p_created_by AND course_id = p_course_id
    ) INTO v_enrolled;

    IF NOT v_enrolled THEN
        RAISE EXCEPTION 'Student is not enrolled in this course'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- Get skill level for the course
    SELECT skill_level INTO v_skill
    FROM enrollments
    WHERE student_id = p_created_by AND course_id = p_course_id;

    -- Create the group
    INSERT INTO study_groups (group_name, course_id, created_by, max_members, description)
    VALUES (p_group_name, p_course_id, p_created_by, p_max_members, p_description)
    RETURNING group_id INTO v_group_id;

    -- Add creator as leader
    INSERT INTO group_memberships (student_id, group_id, role, skill_level)
    VALUES (p_created_by, v_group_id, 'leader', COALESCE(v_skill, 'Beginner'));

    RETURN v_group_id;
END;
$$;

-- ============================================================
-- FUNCTION: fn_get_enrollment_stats
-- Returns enrollment statistics for a given course.
-- Used by coordinator dashboard and course health analytics.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_enrollment_stats(p_course_id UUID)
RETURNS TABLE (
    total_students      BIGINT,
    beginners           BIGINT,
    intermediates       BIGINT,
    advanced            BIGINT,
    active_groups       BIGINT,
    avg_group_size      NUMERIC(5,2),
    total_sessions      BIGINT,
    completed_sessions  BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT e.student_id)::BIGINT                              AS total_students,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.skill_level = 'Beginner')::BIGINT    AS beginners,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.skill_level = 'Intermediate')::BIGINT AS intermediates,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.skill_level = 'Advanced')::BIGINT    AS advanced,
        COUNT(DISTINCT sg.group_id) FILTER (WHERE sg.status != 'inactive')::BIGINT        AS active_groups,
        COALESCE(AVG(sg.member_count), 0)::NUMERIC(5,2)                   AS avg_group_size,
        COUNT(DISTINCT s.session_id)::BIGINT                              AS total_sessions,
        COUNT(DISTINCT s.session_id) FILTER (WHERE s.status = 'completed')::BIGINT AS completed_sessions
    FROM enrollments e
    LEFT JOIN study_groups sg ON sg.course_id = e.course_id
    LEFT JOIN sessions s      ON s.group_id = sg.group_id
    WHERE e.course_id = p_course_id;
END;
$$;

-- ============================================================
-- FUNCTION: fn_get_group_stats
-- Returns aggregated statistics across all groups.
-- Used by the coordinator global dashboard.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_get_group_stats()
RETURNS TABLE (
    total_groups    BIGINT,
    active_groups   BIGINT,
    full_groups     BIGINT,
    total_members   BIGINT,
    avg_group_size  NUMERIC(5,2)
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT                                                        AS total_groups,
        COUNT(*) FILTER (WHERE status = 'active')::BIGINT                      AS active_groups,
        COUNT(*) FILTER (WHERE status = 'full')::BIGINT                        AS full_groups,
        COALESCE(SUM(member_count), 0)::BIGINT                                 AS total_members,
        COALESCE(AVG(NULLIF(member_count, 0)), 0)::NUMERIC(5,2)                AS avg_group_size
    FROM study_groups;
END;
$$;

-- ============================================================
-- FUNCTION: fn_student_compatibility_data
-- Returns all data needed to compute compatibility between
-- a target student and a list of other students.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_student_compatibility_data(p_student_id UUID)
RETURNS TABLE (
    student_id      UUID,
    name            VARCHAR,
    email           VARCHAR,
    learning_style  VARCHAR,
    bio             TEXT,
    courses         JSON,
    availability    JSON
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.student_id,
        s.name,
        s.email,
        s.learning_style,
        s.bio,
        (
            SELECT json_agg(json_build_object(
                'course_id',    e.course_id,
                'course_name',  c.course_name,
                'department',   c.department,
                'skill_level',  e.skill_level
            ))
            FROM enrollments e
            JOIN courses c ON c.course_id = e.course_id
            WHERE e.student_id = s.student_id
        ) AS courses,
        (
            SELECT json_agg(json_build_object(
                'day',          a.day,
                'start_time',   TO_CHAR(a.start_time, 'HH24:MI'),
                'end_time',     TO_CHAR(a.end_time, 'HH24:MI')
            ))
            FROM availability a
            WHERE a.student_id = s.student_id
        ) AS availability
    FROM students s
    WHERE s.student_id != p_student_id;
END;
$$;

-- ============================================================
-- FUNCTION: fn_join_group (transactional wrapper)
-- Joins a student to a group with all validations.
-- Application code should call this inside a BEGIN/COMMIT block.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_join_group(
    p_student_id UUID,
    p_group_id   UUID
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    v_course_id UUID;
    v_enrolled  BOOLEAN;
    v_already   BOOLEAN;
    v_skill     VARCHAR(15);
BEGIN
    -- Get the course this group belongs to
    SELECT course_id INTO v_course_id
    FROM study_groups WHERE group_id = p_group_id;

    -- Check enrollment
    SELECT EXISTS (
        SELECT 1 FROM enrollments
        WHERE student_id = p_student_id AND course_id = v_course_id
    ) INTO v_enrolled;

    IF NOT v_enrolled THEN
        RAISE EXCEPTION 'Student is not enrolled in the course for this group'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- Check not already a member
    SELECT EXISTS (
        SELECT 1 FROM group_memberships
        WHERE student_id = p_student_id AND group_id = p_group_id
    ) INTO v_already;

    IF v_already THEN
        RAISE EXCEPTION 'Student is already a member of this group'
            USING ERRCODE = 'unique_violation';
    END IF;

    -- Get skill level from enrollment
    SELECT skill_level INTO v_skill
    FROM enrollments
    WHERE student_id = p_student_id AND course_id = v_course_id;

    -- Insert membership (triggers will: check capacity, update count, create notification)
    INSERT INTO group_memberships (student_id, group_id, role, skill_level)
    VALUES (p_student_id, p_group_id, 'member', COALESCE(v_skill, 'Beginner'));
END;
$$;
