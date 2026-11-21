-- ============================================================
-- StudySync – MySQL Triggers (8.0+)
-- ============================================================
USE studysync;

DELIMITER //

-- ============================================================
-- TRIGGER 1: Check group capacity BEFORE INSERT
-- ============================================================
CREATE TRIGGER trg_check_group_capacity
BEFORE INSERT ON group_memberships
FOR EACH ROW
BEGIN
    DECLARE v_max INT;
    DECLARE v_current INT;

    SELECT max_members, member_count
    INTO v_max, v_current
    FROM study_groups
    WHERE group_id = NEW.group_id;

    IF v_current >= v_max THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Group is full: capacity limit reached';
    END IF;
END//

-- ============================================================
-- TRIGGER 2: Update member_count and status AFTER INSERT
-- ============================================================
CREATE TRIGGER trg_update_member_count_insert
AFTER INSERT ON group_memberships
FOR EACH ROW
BEGIN
    UPDATE study_groups
    SET member_count = member_count + 1,
        status = CASE
            WHEN (member_count + 1) >= max_members THEN 'full'
            ELSE 'active'
        END
    WHERE group_id = NEW.group_id;
END//

-- ============================================================
-- TRIGGER 3: Update member_count and status AFTER DELETE
-- ============================================================
CREATE TRIGGER trg_update_member_count_delete
AFTER DELETE ON group_memberships
FOR EACH ROW
BEGIN
    UPDATE study_groups
    SET member_count = GREATEST(member_count - 1, 0),
        status = CASE
            WHEN (member_count - 1) < max_members THEN 'active'
            ELSE status
        END
    WHERE group_id = OLD.group_id;
END//

-- ============================================================
-- TRIGGER 4: Notify group members when a new session is scheduled
-- ============================================================
CREATE TRIGGER trg_notify_on_session
AFTER INSERT ON sessions
FOR EACH ROW
BEGIN
    INSERT INTO notifications (notification_id, student_id, type, title, message, is_read, related_group_id, related_session_id, created_at)
    SELECT
        UUID(),
        gm.student_id,
        'session_reminder',
        'New Study Session Scheduled',
        CONCAT('A new session for ', COALESCE((SELECT group_name FROM study_groups WHERE group_id = NEW.group_id), 'your study group'), ' has been scheduled on ', DATE_FORMAT(NEW.schedule_time, '%b %e, %Y at %l:%i %p'), ' at ', NEW.location, '.'),
        FALSE,
        NEW.group_id,
        NEW.session_id,
        NOW()
    FROM group_memberships gm
    WHERE gm.group_id = NEW.group_id;
END//

-- ============================================================
-- TRIGGER 5: Notify student when they join a group
-- ============================================================
CREATE TRIGGER trg_notify_on_join
AFTER INSERT ON group_memberships
FOR EACH ROW
BEGIN
    DECLARE v_group_name VARCHAR(200);
    SELECT group_name INTO v_group_name FROM study_groups WHERE group_id = NEW.group_id;

    INSERT INTO notifications (notification_id, student_id, type, title, message, is_read, related_group_id, created_at)
    VALUES (
        UUID(),
        NEW.student_id,
        'group_join',
        'Joined Study Group',
        CONCAT('You have successfully joined the group: ', COALESCE(v_group_name, 'Study Group')),
        FALSE,
        NEW.group_id,
        NOW()
    );
END//

DELIMITER ;
