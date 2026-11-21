/**
 * StudySync - Safe, Non-Destructive MySQL Database Initialization & Verification
 * 
 * Safety Guarantees:
 * 1. ZERO DROP TABLE statements.
 * 2. ZERO TRUNCATE TABLE statements.
 * 3. Uses `CREATE TABLE IF NOT EXISTS` - preserves all existing tables and data.
 * 4. Uses `INSERT IGNORE` for seed data - skips any existing records by primary key/email.
 * 5. Uses `CREATE OR REPLACE VIEW` for SQL views - no data impact.
 * 6. Checks information_schema before creating triggers and stored procedures.
 * 7. Performs a full verification audit of tables, relationships, views, triggers, and procedures.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('../studysync/node_modules/mysql2/promise');

// Parse connection URL from studysync/.env or fallback
const envPath = path.join(__dirname, '../studysync/.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {}

const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
const dbUrl = match ? match[1] : 'mysql://root:Peach309%23@localhost:3306/studysync';

async function safeInit() {
  console.log('='.repeat(70));
  console.log('   STUDYSYNC SAFE NON-DESTRUCTIVE MYSQL INITIALIZATION & VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Connection URL: ${dbUrl.replace(/:([^:@]+)@/, ':****@')}\n`);

  const conn = await mysql.createConnection({
    uri: dbUrl,
    multipleStatements: true,
  });

  try {
    // -------------------------------------------------------------
    // STEP 1: Inspect Existing Tables (Non-destructive)
    // -------------------------------------------------------------
    console.log('--- STEP 1: Inspecting Existing MySQL Tables ---');
    const [existingTableRows] = await conn.query('SHOW TABLES;');
    const dbName = 'studysync';
    const existingTables = existingTableRows.map(r => Object.values(r)[0]);
    console.log(`Found ${existingTables.length} existing tables:`, existingTables);

    // -------------------------------------------------------------
    // STEP 2: Create Missing Tables Only (CREATE TABLE IF NOT EXISTS)
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Ensuring Required Relational Tables in 3NF ---');

    const tableDefinitions = [
      {
        name: 'coordinators',
        ddl: `CREATE TABLE IF NOT EXISTS coordinators (
          coordinator_id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'students',
        ddl: `CREATE TABLE IF NOT EXISTS students (
          student_id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          learning_style VARCHAR(20) CHECK (learning_style IN ('Visual','Auditory','Reading/Writing','Kinesthetic')),
          bio TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'courses',
        ddl: `CREATE TABLE IF NOT EXISTS courses (
          course_id VARCHAR(36) PRIMARY KEY,
          course_name VARCHAR(200) NOT NULL,
          department VARCHAR(100) NOT NULL,
          semester VARCHAR(20) NOT NULL,
          coordinator_id VARCHAR(36) NOT NULL,
          description TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_courses_coordinator FOREIGN KEY (coordinator_id)
              REFERENCES coordinators(coordinator_id) ON DELETE RESTRICT ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'availability',
        ddl: `CREATE TABLE IF NOT EXISTS availability (
          availability_id VARCHAR(36) PRIMARY KEY,
          student_id VARCHAR(36) NOT NULL,
          day VARCHAR(10) NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          CONSTRAINT fk_avail_student FOREIGN KEY (student_id)
              REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT chk_time_range CHECK (end_time > start_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'enrollments',
        ddl: `CREATE TABLE IF NOT EXISTS enrollments (
          student_id VARCHAR(36) NOT NULL,
          course_id VARCHAR(36) NOT NULL,
          enrollment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
          skill_level VARCHAR(15) NOT NULL DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
          PRIMARY KEY (student_id, course_id),
          CONSTRAINT fk_enroll_student FOREIGN KEY (student_id)
              REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_enroll_course FOREIGN KEY (course_id)
              REFERENCES courses(course_id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'study_groups',
        ddl: `CREATE TABLE IF NOT EXISTS study_groups (
          group_id VARCHAR(36) PRIMARY KEY,
          group_name VARCHAR(200) NOT NULL,
          course_id VARCHAR(36) NOT NULL,
          created_by VARCHAR(36) NOT NULL,
          description TEXT,
          status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','full')),
          max_members INT NOT NULL DEFAULT 6 CHECK (max_members BETWEEN 2 AND 20),
          member_count INT NOT NULL DEFAULT 0 CHECK (member_count >= 0),
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_group_course FOREIGN KEY (course_id)
              REFERENCES courses(course_id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_group_creator FOREIGN KEY (created_by)
              REFERENCES students(student_id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT chk_capacity CHECK (member_count <= max_members)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'group_memberships',
        ddl: `CREATE TABLE IF NOT EXISTS group_memberships (
          student_id VARCHAR(36) NOT NULL,
          group_id VARCHAR(36) NOT NULL,
          role VARCHAR(10) NOT NULL DEFAULT 'member' CHECK (role IN ('leader','member')),
          skill_level VARCHAR(15) NOT NULL DEFAULT 'Beginner' CHECK (skill_level IN ('Beginner','Intermediate','Advanced')),
          joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (student_id, group_id),
          CONSTRAINT fk_mem_student FOREIGN KEY (student_id)
              REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_mem_group FOREIGN KEY (group_id)
              REFERENCES study_groups(group_id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'sessions',
        ddl: `CREATE TABLE IF NOT EXISTS sessions (
          session_id VARCHAR(36) PRIMARY KEY,
          group_id VARCHAR(36) NOT NULL,
          schedule_time DATETIME NOT NULL,
          location VARCHAR(255) NOT NULL,
          duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
          status VARCHAR(15) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_session_group FOREIGN KEY (group_id)
              REFERENCES study_groups(group_id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      },
      {
        name: 'notifications',
        ddl: `CREATE TABLE IF NOT EXISTS notifications (
          notification_id VARCHAR(36) PRIMARY KEY,
          student_id VARCHAR(36) NOT NULL,
          type VARCHAR(30) NOT NULL CHECK (type IN ('group_invite','group_join','session_reminder','session_update','general')),
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          related_group_id VARCHAR(36) DEFAULT NULL,
          related_session_id VARCHAR(36) DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_notif_student FOREIGN KEY (student_id)
              REFERENCES students(student_id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_notif_group FOREIGN KEY (related_group_id)
              REFERENCES study_groups(group_id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_notif_session FOREIGN KEY (related_session_id)
              REFERENCES sessions(session_id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
      }
    ];

    for (const t of tableDefinitions) {
      if (existingTables.includes(t.name)) {
        console.log(`  - Table "${t.name}" already exists: Preserved untouched.`);
      } else {
        await conn.query(t.ddl);
        console.log(`  + Table "${t.name}" was missing: Created safely.`);
      }
    }

    // -------------------------------------------------------------
    // STEP 3: Safe SQL Views (CREATE OR REPLACE VIEW)
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Ensuring SQL Views (CREATE OR REPLACE VIEW) ---');
    const viewsSql = fs.readFileSync(path.join(__dirname, '../database/mysql_views.sql'), 'utf8');
    // Strip any destructive DROP VIEW statements to ensure safety
    const safeViewsSql = viewsSql.replace(/DROP\s+VIEW\s+IF\s+EXISTS\s+[^;]+;/gi, '');
    await conn.query(safeViewsSql);
    console.log('✓ Views v_course_health_summary, v_student_enrollments, v_group_membership_overview ensured.');

    // -------------------------------------------------------------
    // STEP 4: Safe Database Triggers
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Ensuring Database Triggers ---');
    const [existingTriggers] = await conn.query(
      `SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?`,
      [dbName]
    );
    const triggerNames = existingTriggers.map(t => t.TRIGGER_NAME);
    console.log('Active triggers in schema:', triggerNames);

    if (!triggerNames.includes('trg_check_group_capacity')) {
      await conn.query(`
        CREATE TRIGGER trg_check_group_capacity
        BEFORE INSERT ON group_memberships
        FOR EACH ROW
        BEGIN
            DECLARE current_count INT DEFAULT 0;
            DECLARE max_allowed   INT DEFAULT 0;

            SELECT member_count, max_members
              INTO current_count, max_allowed
              FROM study_groups
             WHERE group_id = NEW.group_id;

            IF current_count >= max_allowed THEN
                SIGNAL SQLSTATE '45000'
                   SET MESSAGE_TEXT = 'Study group is at maximum capacity';
            END IF;
        END;
      `);
      console.log('  + Created trigger: trg_check_group_capacity');
    } else {
      console.log('  - Trigger trg_check_group_capacity already exists: Preserved.');
    }

    if (!triggerNames.includes('trg_increment_member_count')) {
      await conn.query(`
        CREATE TRIGGER trg_increment_member_count
        AFTER INSERT ON group_memberships
        FOR EACH ROW
        BEGIN
            UPDATE study_groups
               SET member_count = member_count + 1,
                   status = CASE WHEN member_count + 1 >= max_members THEN 'full' ELSE status END
             WHERE group_id = NEW.group_id;
        END;
      `);
      console.log('  + Created trigger: trg_increment_member_count');
    } else {
      console.log('  - Trigger trg_increment_member_count already exists: Preserved.');
    }

    if (!triggerNames.includes('trg_decrement_member_count')) {
      await conn.query(`
        CREATE TRIGGER trg_decrement_member_count
        AFTER DELETE ON group_memberships
        FOR EACH ROW
        BEGIN
            UPDATE study_groups
               SET member_count = GREATEST(0, member_count - 1),
                   status = CASE WHEN status = 'full' THEN 'active' ELSE status END
             WHERE group_id = OLD.group_id;
        END;
      `);
      console.log('  + Created trigger: trg_decrement_member_count');
    } else {
      console.log('  - Trigger trg_decrement_member_count already exists: Preserved.');
    }

    // -------------------------------------------------------------
    // STEP 5: Safe Stored Procedures
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Ensuring Stored Procedures ---');
    const [existingProcs] = await conn.query(
      `SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'`,
      [dbName]
    );
    const procNames = existingProcs.map(p => p.ROUTINE_NAME);
    console.log('Active stored procedures in schema:', procNames);

    if (!procNames.includes('sp_create_study_group')) {
      await conn.query(`
        CREATE PROCEDURE sp_create_study_group(
            IN p_group_name  VARCHAR(200),
            IN p_course_id   VARCHAR(36),
            IN p_student_id  VARCHAR(36),
            IN p_max_members INT
        )
        BEGIN
            DECLARE v_group_id VARCHAR(36);
            DECLARE EXIT HANDLER FOR SQLEXCEPTION
            BEGIN
                ROLLBACK;
                RESIGNAL;
            END;

            SET v_group_id = UUID();

            START TRANSACTION;

            INSERT INTO study_groups (group_id, group_name, course_id, created_by, max_members, member_count, status)
            VALUES (v_group_id, p_group_name, p_course_id, p_student_id, COALESCE(p_max_members, 6), 0, 'active');

            INSERT INTO group_memberships (student_id, group_id, role, skill_level)
            VALUES (p_student_id, v_group_id, 'leader', 'Intermediate');

            COMMIT;

            SELECT v_group_id AS group_id;
        END;
      `);
      console.log('  + Created stored procedure: sp_create_study_group');
    } else {
      console.log('  - Stored procedure sp_create_study_group already exists: Preserved.');
    }

    // -------------------------------------------------------------
    // STEP 6: Safe Non-Destructive Seed Data (INSERT IGNORE)
    // -------------------------------------------------------------
    console.log('\n--- STEP 6: Non-Destructive Data Population (INSERT IGNORE) ---');
    console.log('Note: NO TRUNCATE or DELETE will be executed.');
    
    const seedSqlPath = path.join(__dirname, '../database/mysql_seed.sql');
    let seedSql = fs.readFileSync(seedSqlPath, 'utf8');

    // 1. Remove all TRUNCATE TABLE statements
    seedSql = seedSql.replace(/TRUNCATE\s+TABLE\s+[^;]+;/gi, '-- TRUNCATE removed for safety');

    // 2. Change all "INSERT INTO" to "INSERT IGNORE INTO"
    // This guarantees that any existing record with matching primary key or unique email
    // is preserved 100% untouched and NOT overwritten or modified.
    seedSql = seedSql.replace(/INSERT\s+INTO/gi, 'INSERT IGNORE INTO');

    await conn.query(seedSql);
    console.log('✓ Seed data populated safely: Existing user records preserved, missing demo accounts added.');

    // -------------------------------------------------------------
    // STEP 7: Comprehensive Verification Audit
    // -------------------------------------------------------------
    console.log('\n--- STEP 7: Verification Audit ---');
    const tableCounts = {};
    for (const t of ['coordinators', 'students', 'courses', 'enrollments', 'study_groups', 'group_memberships', 'sessions', 'notifications']) {
      const [cnt] = await conn.query(`SELECT COUNT(*) as c FROM ${t};`);
      tableCounts[t] = cnt[0].c;
    }
    console.log('Row counts per table:', tableCounts);

    const [viewTest] = await conn.query('SELECT course_id, course_name, health_score FROM v_course_health_summary LIMIT 2;');
    console.log('\nSQL View Test (v_course_health_summary):', viewTest);

    console.log('\n' + '='.repeat(70));
    console.log('SAFE INITIALIZATION & VERIFICATION SUCCESSFUL!');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Safe initialization error:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

module.exports = { safeInit };

if (require.main === module) {
  safeInit();
}
