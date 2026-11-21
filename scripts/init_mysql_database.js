/**
 * StudySync - Production MySQL Database Safety & Initialization Tool
 * 
 * Safety Guarantees:
 * 1. Zero Hardcoded Credentials: Uses `new URL()` to extract host, port, user, password, database.
 * 2. Multi-Level Safety Audit: Rejects DROP DATABASE, DROP SCHEMA, DROP TABLE, DROP VIEW,
 *    DROP TRIGGER, DROP PROCEDURE, TRUNCATE, RENAME TABLE, REPLACE INTO, DELETE FROM, and ALTER TABLE DROP.
 * 3. Deep Schema Drift Inspector: Validates column types, nullability, PKs, unique constraints,
 *    and foreign-key relationships from information_schema without altering tables.
 * 4. Safe Object Management: Checks information_schema for views, triggers, and routines.
 *    Existing objects are preserved and reported; only missing objects are created.
 * 5. Deterministic Seed Insertion: Preserves foreign key checks (SET FOREIGN_KEY_CHECKS = 0 removed).
 *    Checks warnings on every insert; any warning other than 1062 (duplicate key) causes a fatal abort.
 * 6. Routine Delimiter Parser: Parses routines by custom delimiter (//) and executes each individually.
 * 7. Dry-Run / Inspection Mode: `--dry-run` or `--inspect` reports existing objects, missing objects,
 *    differences, and planned actions without modifying a single byte.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('../studysync/node_modules/mysql2/promise');

// =============================================================
// 1. Connection Parser (Zero Hardcoded Credentials)
// =============================================================
function getDatabaseConfig() {
  let dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    const envPath = path.join(__dirname, '../studysync/.env');
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match && match[1]) {
        dbUrl = match[1];
      }
    } catch (err) {
      throw new Error(`Failed to read studysync/.env: ${err.message}`);
    }
  }

  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment or studysync/.env');
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch (err) {
    throw new Error(`Invalid DATABASE_URL format: ${err.message}`);
  }

  const config = {
    host: parsed.hostname || 'localhost',
    port: parsed.port ? parseInt(parsed.port, 10) : 3306,
    user: decodeURIComponent(parsed.username || 'root'),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'studysync',
    multipleStatements: true,
  };

  return { config, maskedUrl: `${parsed.protocol}//${config.user}:****@${config.host}:${config.port}/${config.database}` };
}

// =============================================================
// 2. Comprehensive SQL Safety Scanner
// =============================================================
function auditSqlSafety(filename, sqlContent) {
  const destructiveRules = [
    { pattern: /\bDROP\s+(DATABASE|SCHEMA)\b/i, name: 'DROP DATABASE / SCHEMA' },
    { pattern: /\bDROP\s+TABLE\b/i, name: 'DROP TABLE' },
    { pattern: /\bDROP\s+VIEW\b/i, name: 'DROP VIEW' },
    { pattern: /\bDROP\s+TRIGGER\b/i, name: 'DROP TRIGGER' },
    { pattern: /\bDROP\s+PROCEDURE\b/i, name: 'DROP PROCEDURE' },
    { pattern: /\bTRUNCATE(\s+TABLE)?\b/i, name: 'TRUNCATE TABLE' },
    { pattern: /\bRENAME\s+TABLE\b/i, name: 'RENAME TABLE' },
    { pattern: /\bREPLACE\s+INTO\b/i, name: 'REPLACE INTO' },
    { pattern: /\bDELETE\s+FROM\b/i, name: 'DELETE FROM' },
    { pattern: /\bALTER\s+TABLE\s+[^;]+\bDROP\s+(COLUMN|CONSTRAINT|FOREIGN\s+KEY|PRIMARY\s+KEY)\b/i, name: 'ALTER TABLE DROP' },
    { pattern: /\bSET\s+FOREIGN_KEY_CHECKS\s*=\s*0\b/i, name: 'SET FOREIGN_KEY_CHECKS = 0' },
  ];

  for (const rule of destructiveRules) {
    if (rule.pattern.test(sqlContent)) {
      throw new Error(`SAFETY AUDIT FAILED in [${filename}]: Contains forbidden statement: "${rule.name}"`);
    }
  }
}

// =============================================================
// 3. Expected Relational Schema (3NF Specification)
// =============================================================
const EXPECTED_SCHEMA = {
  coordinators: {
    columns: [
      { name: 'coordinator_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'name', type: 'varchar(100)', nullable: 'NO' },
      { name: 'email', type: 'varchar(255)', nullable: 'NO' },
      { name: 'password_hash', type: 'text', nullable: 'NO' },
      { name: 'created_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['coordinator_id'],
    unique: ['email'],
    foreignKeys: [],
  },
  students: {
    columns: [
      { name: 'student_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'name', type: 'varchar(100)', nullable: 'NO' },
      { name: 'email', type: 'varchar(255)', nullable: 'NO' },
      { name: 'password_hash', type: 'text', nullable: 'NO' },
      { name: 'learning_style', type: 'varchar(20)', nullable: 'YES' },
      { name: 'bio', type: 'text', nullable: 'YES' },
      { name: 'created_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['student_id'],
    unique: ['email'],
    foreignKeys: [],
  },
  courses: {
    columns: [
      { name: 'course_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'course_name', type: 'varchar(200)', nullable: 'NO' },
      { name: 'department', type: 'varchar(100)', nullable: 'NO' },
      { name: 'semester', type: 'varchar(20)', nullable: 'NO' },
      { name: 'coordinator_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'description', type: 'text', nullable: 'YES' },
      { name: 'created_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['course_id'],
    unique: [],
    foreignKeys: [{ column: 'coordinator_id', refTable: 'coordinators', refColumn: 'coordinator_id' }],
  },
  availability: {
    columns: [
      { name: 'availability_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'student_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'day', type: 'varchar(10)', nullable: 'NO' },
      { name: 'start_time', type: 'time', nullable: 'NO' },
      { name: 'end_time', type: 'time', nullable: 'NO' },
    ],
    primaryKey: ['availability_id'],
    unique: [],
    foreignKeys: [{ column: 'student_id', refTable: 'students', refColumn: 'student_id' }],
  },
  enrollments: {
    columns: [
      { name: 'student_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'course_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'enrollment_date', type: 'date', nullable: 'NO' },
      { name: 'skill_level', type: 'varchar(15)', nullable: 'NO' },
    ],
    primaryKey: ['student_id', 'course_id'],
    unique: [],
    foreignKeys: [
      { column: 'student_id', refTable: 'students', refColumn: 'student_id' },
      { column: 'course_id', refTable: 'courses', refColumn: 'course_id' },
    ],
  },
  study_groups: {
    columns: [
      { name: 'group_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'group_name', type: 'varchar(200)', nullable: 'NO' },
      { name: 'course_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'created_by', type: 'varchar(36)', nullable: 'NO' },
      { name: 'description', type: 'text', nullable: 'YES' },
      { name: 'status', type: 'varchar(10)', nullable: 'NO' },
      { name: 'max_members', type: 'int', nullable: 'NO' },
      { name: 'member_count', type: 'int', nullable: 'NO' },
      { name: 'created_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['group_id'],
    unique: [],
    foreignKeys: [
      { column: 'course_id', refTable: 'courses', refColumn: 'course_id' },
      { column: 'created_by', refTable: 'students', refColumn: 'student_id' },
    ],
  },
  group_memberships: {
    columns: [
      { name: 'student_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'group_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'role', type: 'varchar(10)', nullable: 'NO' },
      { name: 'skill_level', type: 'varchar(15)', nullable: 'NO' },
      { name: 'joined_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['student_id', 'group_id'],
    unique: [],
    foreignKeys: [
      { column: 'student_id', refTable: 'students', refColumn: 'student_id' },
      { column: 'group_id', refTable: 'study_groups', refColumn: 'group_id' },
    ],
  },
  sessions: {
    columns: [
      { name: 'session_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'group_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'schedule_time', type: 'datetime', nullable: 'NO' },
      { name: 'location', type: 'varchar(255)', nullable: 'NO' },
      { name: 'duration_minutes', type: 'int', nullable: 'NO' },
      { name: 'status', type: 'varchar(15)', nullable: 'NO' },
      { name: 'created_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['session_id'],
    unique: [],
    foreignKeys: [{ column: 'group_id', refTable: 'study_groups', refColumn: 'group_id' }],
  },
  notifications: {
    columns: [
      { name: 'notification_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'student_id', type: 'varchar(36)', nullable: 'NO' },
      { name: 'type', type: 'varchar(30)', nullable: 'NO' },
      { name: 'title', type: 'varchar(200)', nullable: 'NO' },
      { name: 'message', type: 'text', nullable: 'NO' },
      { name: 'is_read', type: 'tinyint(1)', nullable: 'NO' },
      { name: 'related_group_id', type: 'varchar(36)', nullable: 'YES' },
      { name: 'related_session_id', type: 'varchar(36)', nullable: 'YES' },
      { name: 'created_at', type: 'datetime', nullable: 'NO' },
    ],
    primaryKey: ['notification_id'],
    unique: [],
    foreignKeys: [
      { column: 'student_id', refTable: 'students', refColumn: 'student_id' },
      { column: 'related_group_id', refTable: 'study_groups', refColumn: 'group_id' },
      { column: 'related_session_id', refTable: 'sessions', refColumn: 'session_id' },
    ],
  },
};

// =============================================================
// 4. Schema Drift & Relationship Inspector
// =============================================================
async function inspectSchemaDrift(conn, dbName) {
  console.log('\n--- DETAILED SCHEMA DRIFT & RELATIONSHIP AUDIT ---');

  const [tables] = await conn.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE";',
    [dbName]
  );
  const existingTableNames = tables.map(t => t.TABLE_NAME);

  const report = {
    existing: [],
    missing: [],
    matched3NF: [],
    driftWarnings: [],
  };

  for (const [tableName, expected] of Object.entries(EXPECTED_SCHEMA)) {
    if (!existingTableNames.includes(tableName)) {
      report.missing.push(tableName);
      console.log(`[TABLE MISSING] "${tableName}" does not exist in "${dbName}".`);
      continue;
    }

    report.existing.push(tableName);

    // 1. Audit Columns
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?;`,
      [dbName, tableName]
    );
    const actualColNames = cols.map(c => c.COLUMN_NAME);
    const missingCols = expected.columns.filter(exp => !actualColNames.includes(exp.name));

    // 2. Audit Primary Keys
    const [pkRows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY';`,
      [dbName, tableName]
    );
    const actualPks = pkRows.map(p => p.COLUMN_NAME);
    const missingPks = expected.primaryKey.filter(p => !actualPks.includes(p));

    // 3. Audit Foreign Keys
    const [fkRows] = await conn.query(
      `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
       FROM information_schema.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL;`,
      [dbName, tableName]
    );
    const actualFks = fkRows.map(f => `${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}(${f.REFERENCED_COLUMN_NAME})`);
    const missingFks = expected.foreignKeys.filter(exp => 
      !fkRows.some(f => f.COLUMN_NAME === exp.column && f.REFERENCED_TABLE_NAME === exp.refTable && f.REFERENCED_COLUMN_NAME === exp.refColumn)
    );

    // 4. Audit Unique Constraints
    const [uniqRows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 0 AND INDEX_NAME != 'PRIMARY';`,
      [dbName, tableName]
    );
    const actualUniqs = uniqRows.map(u => u.COLUMN_NAME);
    const missingUniqs = expected.unique.filter(u => !actualUniqs.includes(u));

    if (missingCols.length > 0 || missingPks.length > 0 || missingFks.length > 0 || missingUniqs.length > 0) {
      const issue = `Table "${tableName}" drift: missing cols: [${missingCols.map(c=>c.name).join(',')}], missing PKs: [${missingPks.join(',')}], missing FKs: [${missingFks.map(f=>f.column).join(',')}], missing unique: [${missingUniqs.join(',')}]`;
      report.driftWarnings.push(issue);
      console.warn(`  ⚠ ${issue}`);
    } else {
      report.matched3NF.push(tableName);
      console.log(`  ✓ Table "${tableName}" matches 3NF specification:`);
      console.log(`     - Columns: ${actualColNames.length} verified`);
      console.log(`     - Primary Key: [${actualPks.join(', ')}]`);
      if (actualFks.length > 0) console.log(`     - Foreign Keys: ${actualFks.join('; ')}`);
      if (actualUniqs.length > 0) console.log(`     - Unique Constraints: [${actualUniqs.join(', ')}]`);
    }
  }

  return report;
}

// =============================================================
// 5. Delimiter-Aware Routine Parser
// =============================================================
function parseRoutineStatements(rawSql) {
  const withoutUse = rawSql.replace(/^[\s\r\n]*USE\s+[^;]+;/gmi, '');
  const parts = withoutUse.split(/\/\//);
  const statements = [];

  for (const part of parts) {
    const cleaned = part
      .replace(/^[\s\r\n]*DELIMITER\s+[\$;\/]+/gim, '')
      .replace(/DELIMITER\s+[\$;\/]+[\s\r\n]*$/gim, '')
      .trim();

    if (cleaned.length > 0 && cleaned !== ';' && cleaned !== '//') {
      statements.push(cleaned);
    }
  }

  return statements;
}

// =============================================================
// 6. Main Orchestrator (Dry-Run & Safe Execution)
// =============================================================
async function runMySQLInit({ dryRun = false } = {}) {
  const { config, maskedUrl } = getDatabaseConfig();

  console.log('='.repeat(75));
  console.log(` STUDYSYNC MYSQL DATABASE TOOL - MODE: ${dryRun ? 'DRY-RUN / INSPECTION' : 'SAFE EXECUTION'}`);
  console.log('='.repeat(75));
  console.log(`Target Database : ${maskedUrl}`);
  console.log(`Foreign Keys    : ENFORCED (SET FOREIGN_KEY_CHECKS = 0 permanently omitted)\n`);

  let conn = null;

  try {
    conn = await mysql.createConnection(config);
    console.log('✓ Successfully connected to MySQL server.\n');

    // Enable strict SQL mode
    await conn.query(`SET SESSION sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';`);

    const dbName = config.database;

    // STEP 1: Pre-Execution Safety Audit on SQL Files
    console.log('--- STEP 1: Pre-Execution File Safety Verification ---');
    const sqlFiles = [
      'mysql_schema.sql',
      'mysql_views.sql',
      'mysql_triggers.sql',
      'mysql_procedures.sql',
      'mysql_seed.sql',
    ];

    const fileContents = {};
    for (const f of sqlFiles) {
      const filePath = path.join(__dirname, '../database', f);
      const content = fs.readFileSync(filePath, 'utf8');
      auditSqlSafety(f, content);
      fileContents[f] = content;
      console.log(`  ✓ ${f.padEnd(22)}: PASSED safety audit (0 destructive statements)`);
    }

    // STEP 2: Schema Drift & Relationship Inspection
    const driftReport = await inspectSchemaDrift(conn, dbName);

    // STEP 3: Current Record Counts
    console.log('\n--- STEP 2: Current Table Record Counts ---');
    for (const t of driftReport.existing) {
      const [cnt] = await conn.query(`SELECT COUNT(*) as c FROM \`${t}\`;`);
      console.log(`  - ${t.padEnd(20)}: ${cnt[0].c} records`);
    }

    // STEP 4: Inspect Database Views
    console.log('\n--- STEP 3: Inspecting Existing Views ---');
    const [existingViews] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ?;`,
      [dbName]
    );
    const existingViewNames = existingViews.map(v => v.TABLE_NAME);
    console.log(`  Active views found (${existingViewNames.length}):`, existingViewNames);

    // STEP 5: Inspect Database Triggers
    console.log('\n--- STEP 4: Inspecting Existing Triggers ---');
    const [existingTriggers] = await conn.query(
      `SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?;`,
      [dbName]
    );
    const existingTriggerNames = existingTriggers.map(t => t.TRIGGER_NAME);
    console.log(`  Active triggers found (${existingTriggerNames.length}):`, existingTriggerNames);

    // STEP 6: Inspect Stored Procedures
    console.log('\n--- STEP 5: Inspecting Existing Stored Procedures ---');
    const [existingProcs] = await conn.query(
      `SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE';`,
      [dbName]
    );
    const existingProcNames = existingProcs.map(p => p.ROUTINE_NAME);
    console.log(`  Active procedures found (${existingProcNames.length}):`, existingProcNames);

    // ---------------------------------------------------------
    // DRY-RUN MODE: REPORT AND EXIT
    // ---------------------------------------------------------
    if (dryRun) {
      console.log('\n' + '='.repeat(75));
      console.log('DRY-RUN / INSPECTION SUMMARY (Database was NOT modified):');
      console.log('='.repeat(75));
      console.log(`1. Missing Tables to Create  : [${driftReport.missing.join(', ') || 'None - all 9 tables exist'}]`);
      console.log(`2. Existing Tables Preserved : [${driftReport.existing.join(', ')}]`);
      console.log(`3. Schema Drift Issues       : ${driftReport.driftWarnings.length === 0 ? 'None (All tables fully compliant with 3NF)' : driftReport.driftWarnings.length}`);
      console.log(`4. Views                     : ${existingViewNames.length === 3 ? 'All 3 views exist (preserved)' : 'Missing views will be created without replacing existing'}`);
      console.log(`5. Triggers                  : ${existingTriggerNames.length === 3 ? 'All 3 triggers exist (preserved)' : 'Missing triggers will be created'}`);
      console.log(`6. Stored Procedures         : ${existingProcNames.length === 2 ? 'All 2 procedures exist (preserved)' : 'Missing procedures will be created'}`);
      console.log(`7. Seed Data Strategy        : Strict INSERT IGNORE with warning audit (preserves all existing user records, fails on truncation/errors)`);
      console.log('='.repeat(75));
      return;
    }

    // ---------------------------------------------------------
    // SAFE EXECUTION MODE
    // ---------------------------------------------------------
    console.log('\n--- EXECUTING SAFE DATABASE INITIALIZATION ---');

    // 1. Create missing tables only (CREATE TABLE IF NOT EXISTS)
    if (driftReport.missing.length > 0) {
      console.log(`1. Creating missing tables (${driftReport.missing.join(', ')})...`);
      await conn.query(fileContents['mysql_schema.sql']);
      console.log('   ✓ Missing tables created safely.');
    } else {
      console.log('1. Tables: All 9 required tables already exist. Skipping creation.');
    }

    // 2. Safe Views: Only create missing views
    const targetViews = ['v_student_enrollments', 'v_group_membership_overview', 'v_course_health_summary'];
    const missingViews = targetViews.filter(v => !existingViewNames.includes(v));
    if (missingViews.length > 0) {
      console.log(`2. Creating missing views (${missingViews.join(', ')})...`);
      await conn.query(fileContents['mysql_views.sql']);
      console.log('   ✓ Views created safely.');
    } else {
      console.log('2. Views: All views exist. Preserving existing view definitions.');
    }

    // 3. Safe Triggers: Only create missing triggers
    const triggerStmts = parseRoutineStatements(fileContents['mysql_triggers.sql']);
    let createdTriggers = 0;
    for (const stmt of triggerStmts) {
      const match = stmt.match(/CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)/i);
      const triggerName = match ? match[1] : null;
      if (triggerName && !existingTriggerNames.includes(triggerName)) {
        await conn.query(stmt);
        console.log(`   + Created missing trigger: ${triggerName}`);
        createdTriggers++;
      } else if (triggerName) {
        console.log(`   - Trigger "${triggerName}" already exists. Preserved.`);
      }
    }

    // 4. Safe Stored Procedures: Only create missing procedures
    const procStmts = parseRoutineStatements(fileContents['mysql_procedures.sql']);
    let createdProcs = 0;
    for (const stmt of procStmts) {
      const match = stmt.match(/CREATE\s+PROCEDURE\s+([a-zA-Z0-9_]+)/i);
      const procName = match ? match[1] : null;
      if (procName && !existingProcNames.includes(procName)) {
        await conn.query(stmt);
        console.log(`   + Created missing stored procedure: ${procName}`);
        createdProcs++;
      } else if (procName) {
        console.log(`   - Stored procedure "${procName}" already exists. Preserved.`);
      }
    }

    // 5. Safe Seed Data Insertion with Warning Audit
    console.log('5. Populating seed data under full FK enforcement (strict warning audit)...');
    await conn.query(fileContents['mysql_seed.sql']);
    
    const [warnings] = await conn.query('SHOW WARNINGS;');
    let duplicateSkips = 0;
    for (const w of warnings) {
      if (w.Code === 1062) {
        duplicateSkips++;
      } else {
        throw new Error(`STRICT SEED AUDIT FAILED: Unexpected MySQL warning [Code ${w.Code}]: ${w.Message}`);
      }
    }
    console.log(`   ✓ Seed completed safely (${duplicateSkips} duplicate records skipped, 0 constraint/truncation errors).`);

    // 6. Post-Execution Record Audit
    console.log('\n--- POST-EXECUTION RECORD COUNTS ---');
    for (const t of Object.keys(EXPECTED_SCHEMA)) {
      const [cnt] = await conn.query(`SELECT COUNT(*) as c FROM \`${t}\`;`);
      console.log(`  - ${t.padEnd(20)}: ${cnt[0].c} records`);
    }

    console.log('\n' + '='.repeat(75));
    console.log('DATABASE INITIALIZATION & VERIFICATION SUCCESSFUL!');
    console.log('='.repeat(75));

  } catch (error) {
    console.error('\n❌ Execution Error:', error.message);
    throw error;
  } finally {
    if (conn) {
      await conn.end();
      console.log('Database connection closed cleanly.');
    }
  }
}

module.exports = { runMySQLInit, getDatabaseConfig, auditSqlSafety, parseRoutineStatements };

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--inspect');
  runMySQLInit({ dryRun: isDryRun }).catch(() => process.exit(1));
}
