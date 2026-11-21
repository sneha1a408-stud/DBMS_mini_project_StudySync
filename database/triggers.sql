-- ============================================================
-- StudySync – Triggers
-- ============================================================
-- TRIGGER 1: Auto-update member_count on group_memberships INSERT/DELETE
-- TRIGGER 2: Reject INSERT into group_memberships if group is full
-- ============================================================

-- ============================================================
-- TRIGGER 1: Maintain member_count
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_member_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE study_groups
        SET    member_count = member_count + 1,
               status = CASE
                   WHEN (member_count + 1) >= max_members THEN 'full'
                   ELSE 'active'
               END
        WHERE  group_id = NEW.group_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE study_groups
        SET    member_count = GREATEST(member_count - 1, 0),
               status = CASE
                   WHEN (member_count - 1) < max_members THEN 'active'
                   ELSE status
               END
        WHERE  group_id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_member_count ON group_memberships;
CREATE TRIGGER trg_update_member_count
AFTER INSERT OR DELETE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION fn_update_member_count();

-- ============================================================
-- TRIGGER 2: Enforce group capacity BEFORE INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION fn_check_group_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_max     INT;
    v_current INT;
BEGIN
    SELECT max_members, member_count
    INTO   v_max, v_current
    FROM   study_groups
    WHERE  group_id = NEW.group_id;

    IF v_current >= v_max THEN
        RAISE EXCEPTION 'Group is full (% / % members)', v_current, v_max
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_group_capacity ON group_memberships;
CREATE TRIGGER trg_check_group_capacity
BEFORE INSERT ON group_memberships
FOR EACH ROW EXECUTE FUNCTION fn_check_group_capacity();

-- ============================================================
-- TRIGGER 3: Notify student when they join a group
-- (creates a notification record automatically)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_notify_on_join()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_group_name VARCHAR(200);
BEGIN
    SELECT group_name INTO v_group_name
    FROM study_groups WHERE group_id = NEW.group_id;

    INSERT INTO notifications (student_id, type, title, message, related_group_id)
    VALUES (
        NEW.student_id,
        'group_join',
        'You joined a study group',
        'You have successfully joined the group: ' || v_group_name,
        NEW.group_id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_join ON group_memberships;
CREATE TRIGGER trg_notify_on_join
AFTER INSERT ON group_memberships
FOR EACH ROW EXECUTE FUNCTION fn_notify_on_join();

-- ============================================================
-- TRIGGER 4: Notify group leader when a new session is created
-- ============================================================
CREATE OR REPLACE FUNCTION fn_notify_on_session()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Notify all members of the group
    INSERT INTO notifications (student_id, type, title, message, related_group_id, related_session_id)
    SELECT
        gm.student_id,
        'session_reminder',
        'New study session scheduled',
        'A new session has been scheduled for ' || TO_CHAR(NEW.schedule_time, 'YYYY-MM-DD HH24:MI') || ' at ' || NEW.location,
        NEW.group_id,
        NEW.session_id
    FROM group_memberships gm
    WHERE gm.group_id = NEW.group_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_session ON sessions;
CREATE TRIGGER trg_notify_on_session
AFTER INSERT ON sessions
FOR EACH ROW EXECUTE FUNCTION fn_notify_on_session();
