import mysql from 'mysql2/promise';

// Singleton pool for direct MySQL queries
// Used for raw SQL: stored procedures, triggers verification, advanced queries, and views
const globalForMysql = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

// Parse DATABASE_URL for MySQL
const databaseUrl = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/studysync';

export const pool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    uri: databaseUrl.startsWith('mysql') ? databaseUrl : 'mysql://root:password@localhost:3306/studysync',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== 'production') globalForMysql.mysqlPool = pool;

/**
 * Execute a query and return all rows.
 * Automatically adapts Postgres positional parameters ($1, $2, ...) to MySQL (?)
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  if (!params || params.length === 0) {
    const [rows] = await pool.query(sql);
    return rows as T[];
  }

  // Convert Postgres positional parameters ($1, $2, ...) to MySQL (?) placeholders,
  // expanding repeated parameters so each '?' receives the corresponding value.
  const expandedParams: unknown[] = [];
  const mysqlSql = sql.replace(/\$(\d+)/g, (_match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    expandedParams.push(params[idx]);
    return '?';
  });

  const finalParams = expandedParams.length > 0 ? expandedParams : params;
  const [rows] = await pool.query(mysqlSql, finalParams as any);
  return rows as T[];
}

/**
 * Execute a query and return the first row (or null).
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Run multiple queries in a single transaction.
 * Automatically rolls back on error.
 */
export async function withTransaction<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
