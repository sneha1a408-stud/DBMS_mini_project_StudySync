import { Pool, PoolClient } from 'pg';
import * as mysqlDb from './mysql';

const isMysql = (process.env.DATABASE_URL || '').startsWith('mysql');

// Singleton pool for direct PostgreSQL queries
// Used for raw SQL: stored procedures, triggers verification, advanced queries
const globalForPool = globalThis as unknown as {
  pgPool: Pool | undefined;
};

export const pool =
  !isMysql && (globalForPool.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }));

if (!isMysql && process.env.NODE_ENV !== 'production' && pool) globalForPool.pgPool = pool as Pool;

/**
 * Execute a query and return all rows.
 * Automatically handles MySQL or PostgreSQL based on DATABASE_URL.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  if (isMysql) {
    return mysqlDb.query<T>(sql, params);
  }
  if (!pool) throw new Error('Database pool not initialized');
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return the first row (or null).
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  if (isMysql) {
    return mysqlDb.queryOne<T>(sql, params);
  }
  if (!pool) throw new Error('Database pool not initialized');
  const result = await pool.query(sql, params);
  return (result.rows[0] as T) ?? null;
}

/**
 * Run multiple queries in a single transaction.
 * Automatically rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: any) => Promise<T>
): Promise<T> {
  if (isMysql) {
    return mysqlDb.withTransaction(fn);
  }
  if (!pool) throw new Error('Database pool not initialized');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
