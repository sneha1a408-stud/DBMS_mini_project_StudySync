-- ============================================================
-- StudySync – MySQL Stored Procedures (8.0+)
-- ============================================================
USE studysync;

DELIMITER //

-- ============================================================
-- PROCEDURE: sp_create_study_group
-- Atomically creates a study group and adds the creator as leader
-- ============================================================
CREATE PROCEDURE sp_create_study_group(
    IN  p_group_id    VARCHAR(36),
    IN  p_group_name  VARCHAR(200),
    IN  p_course_id   VARCHAR(36),
    IN  p_created_by  VARCHAR(36),
    IN  p_max_members INT,
    IN  p_description TEXT
)
BEGIN
    DECLARE v_skill VARCHAR(15);
    DECLARE v_enrolled INT DEFAULT 0;

    -- Validate enrollment
    SELECT COUNT(*) INTO v_enrolled
    FROM enrollments
    WHERE student_id = p_created_by AND course_id = p_course_id;

    IF v_enrolled = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student is not enrolled in this course';
    END IF;

    -- Retrieve student skill level in course
    SELECT skill_level INTO v_skill
    FROM enrollments
    WHERE student_id = p_created_by AND course_id = p_course_id;

    -- Insert new study group
    INSERT INTO study_groups (group_id, group_name, course_id, created_by, max_members, description)
    VALUES (p_group_id, p_group_name, p_course_id, p_created_by, p_max_members, p_description);

    -- Insert creator as leader
    INSERT INTO group_memberships (student_id, group_id, role, skill_level)
    VALUES (p_created_by, p_group_id, 'leader', COALESCE(v_skill, 'Beginner'));
END//

-- ============================================================
-- PROCEDURE: sp_get_enrollment_stats
-- Returns enrollment statistics breakdown for a course
-- ============================================================
CREATE PROCEDURE sp_get_enrollment_stats(IN p_course_id VARCHAR(36))
BEGIN
    SELECT
        COUNT(*) AS total_students,
        SUM(CASE WHEN skill_level = 'Beginner' THEN 1 ELSE 0 END) AS beginner_count,
        SUM(CASE WHEN skill_level = 'Intermediate' THEN 1 ELSE 0 END) AS intermediate_count,
        SUM(CASE WHEN skill_level = 'Advanced' THEN 1 ELSE 0 END) AS advanced_count
    FROM enrollments
    WHERE course_id = p_course_id;
END//

DELIMITER ;
