const path = require('path');
const mysql = require(path.join(__dirname, '../studysync/node_modules/mysql2/promise'));

async function main() {
  const conn = await mysql.createConnection('mysql://root:Peach309%23@localhost:3306/studysync');
  console.log('Connected to MySQL.');

  console.log('1. Dropping old triggers if any...');
  await conn.query('DROP TRIGGER IF EXISTS trg_notify_on_session');
  await conn.query('DROP TRIGGER IF EXISTS trg_notify_on_join');

  console.log('2. Creating trg_notify_on_session...');
  await conn.query(`
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
    END
  `);

  console.log('3. Creating trg_notify_on_join...');
  await conn.query(`
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
    END
  `);

  console.log('4. Backfilling notifications for existing sessions...');
  await conn.query('DELETE FROM notifications');

  const [sessionRows] = await conn.query(`
    SELECT s.session_id, s.group_id, s.schedule_time, s.location, s.status, sg.group_name, gm.student_id, s.created_at
    FROM sessions s
    JOIN study_groups sg ON s.group_id = sg.group_id
    JOIN group_memberships gm ON gm.group_id = sg.group_id
  `);

  console.log(`Found ${sessionRows.length} session-member pairs to backfill.`);
  for (const row of sessionRows) {
    const d = new Date(row.schedule_time);
    const formattedDate = d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    await conn.query(`
      INSERT INTO notifications (notification_id, student_id, type, title, message, is_read, related_group_id, related_session_id, created_at)
      VALUES (UUID(), ?, 'session_reminder', 'New Study Session Scheduled', ?, ?, ?, ?, ?)
    `, [
      row.student_id,
      `A new session for ${row.group_name} has been scheduled on ${formattedDate} at ${row.location}.`,
      row.status === 'completed' ? 1 : 0,
      row.group_id,
      row.session_id,
      row.created_at || new Date()
    ]);
  }

  console.log('5. Backfilling notifications for group memberships...');
  const [membershipRows] = await conn.query(`
    SELECT gm.student_id, gm.group_id, gm.joined_at, sg.group_name
    FROM group_memberships gm
    JOIN study_groups sg ON gm.group_id = sg.group_id
  `);
  for (const row of membershipRows) {
    await conn.query(`
      INSERT INTO notifications (notification_id, student_id, type, title, message, is_read, related_group_id, created_at)
      VALUES (UUID(), ?, 'group_join', 'Joined Study Group', ?, 1, ?, ?)
    `, [
      row.student_id,
      `You have successfully joined the group: ${row.group_name}`,
      row.group_id,
      row.joined_at || new Date()
    ]);
  }

  const [count] = await conn.query('SELECT COUNT(*) as c FROM notifications');
  console.log(`Total notifications in database now: ${count[0].c}`);

  const [aliceNotifs] = await conn.query(`
    SELECT title, message, is_read, created_at 
    FROM notifications 
    WHERE student_id = ? 
    ORDER BY created_at DESC
  `, ['UGCS001']);
  console.log('Alice (UGCS001) notifications:', aliceNotifs);

  await conn.end();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error running setup:', err);
  process.exit(1);
});
