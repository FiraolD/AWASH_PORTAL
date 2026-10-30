import { Router, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import pool from '../../lib/db.js';
import { getSqlConsolePool } from '../../lib/sql-console-db.js';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth.middleware.js';

const router = Router();
const MAX_SQL_LENGTH = 10_000;
const MAX_ROWS = 200;
const STATEMENT_TIMEOUT_MS = 5_000;
const ALLOWED_ROLES = ['MASTER_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'] as const;
const BLOCKED_KEYWORDS = /\b(delete|merge|upsert|create|alter|drop|truncate|grant|revoke|comment|copy|call|do|execute|prepare|deallocate|refresh|vacuum|analyze|reindex|cluster|listen|notify|unlisten|reset|discard|lock|begin|commit|rollback|savepoint|release)\b/i;
const BLOCKED_FUNCTIONS = /\b(nextval|setval|set_config|pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|dblink|dblink_exec|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_stat_reset|pg_stat_reset_shared|pg_advisory_lock|pg_advisory_xact_lock)\s*\(/i;

type SqlOperation = 'SELECT' | 'INSERT' | 'UPDATE';

function stripQuotedContent(sql: string): string {
  return sql
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""')
    .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)?\$[\s\S]*?\$\1?\$/g, '$$');
}

export function normalizeSql(input: unknown): { sql: string; operation: SqlOperation } {
  if (typeof input !== 'string') throw new Error('Enter a SQL query.');
  const sql = input.trim();
  if (!sql) throw new Error('Enter a SQL query.');
  if (sql.length > MAX_SQL_LENGTH) throw new Error('Query exceeds the ' + MAX_SQL_LENGTH.toLocaleString() + ' character limit.');
  if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
    throw new Error('SQL comments are not supported in the query console.');
  }

  const statement = sql.replace(/;\s*$/, '').trim();
  if (!statement || statement.includes(';')) throw new Error('Only one SQL statement can be executed at a time.');

  const operationMatch = statement.match(/^(select|with|insert|update)\b/i);
  if (!operationMatch) throw new Error('Only SELECT, INSERT and UPDATE statements are allowed.');
  const operation = operationMatch[1].toUpperCase() as SqlOperation | 'WITH';
  const safeScan = stripQuotedContent(statement);

  if (BLOCKED_KEYWORDS.test(safeScan)) {
    throw new Error('This query contains a command that is not allowed. DELETE and schema/administrative operations are disabled.');
  }
  if (BLOCKED_FUNCTIONS.test(safeScan)) {
    throw new Error('This query calls a function that is not allowed in the SQL console.');
  }

  if (operation === 'WITH') {
    if (/\b(insert|update|delete|merge)\b/i.test(safeScan)) {
      throw new Error('Data-modifying CTEs are not supported. Run a direct INSERT or UPDATE statement instead.');
    }
    if (!/\bselect\b/i.test(safeScan)) throw new Error('Only read-only SELECT CTE queries are allowed.');
    return { sql: statement, operation: 'SELECT' };
  }

  if (operation === 'SELECT') {
    if (/\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/i.test(safeScan)) {
      throw new Error('Locking SELECT queries are not supported.');
    }
    if (BLOCKED_FUNCTIONS.test(safeScan)) throw new Error('This query calls a function that is not allowed in the SQL console.');
  }

  if (operation !== 'SELECT' && /\baudit_logs\b/i.test(statement)) {
    throw new Error('The audit_logs table is protected from direct SQL modifications.');
  }

  if (operation === 'INSERT' && !/\breturning\b/i.test(safeScan)) {
    throw new Error('INSERT statements must include RETURNING so the affected rows can be reviewed.');
  }
  if (operation === 'UPDATE') {
    if (!/\bwhere\b/i.test(safeScan)) throw new Error('UPDATE statements must include a WHERE clause.');
    if (!/\breturning\b/i.test(safeScan)) throw new Error('UPDATE statements must include RETURNING so the affected rows can be reviewed.');
  }

  return { sql: statement, operation };
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonSafe(item)]));
  }
  return value;
}

async function writeQueryAudit(req: AuthRequest, queryHash: string, operation: SqlOperation, durationMs: number, rowCount: number, success: boolean): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO audit_logs (id, "userId", action, "entityType", "entityId", "newValues", "ipAddress", "userAgent") VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)',
      [
        randomUUID(),
        req.user?.id || null,
        success ? 'SQL_QUERY_EXECUTED' : 'SQL_QUERY_FAILED',
        'DATABASE',
        queryHash,
        JSON.stringify({ queryHash, operation, durationMs, rowCount, success }),
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );
  } catch (auditError) {
    console.error('[SQL_CONSOLE] Failed to persist query audit event:', auditError);
  }
}

router.post('/query', authenticate, authorize(...ALLOWED_ROLES), async (req: AuthRequest, res: Response) => {
  let parsed: { sql: string; operation: SqlOperation };
  try {
    parsed = normalizeSql(req.body?.sql);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid SQL query.' });
    return;
  }

  const { sql, operation } = parsed;
  const queryHash = createHash('sha256').update(sql).digest('hex');
  const startedAt = Date.now();
  let client: PoolClient | undefined;
  let sqlPool: ReturnType<typeof getSqlConsolePool>;

  try {
    try {
      sqlPool = getSqlConsolePool();
    } catch (configurationError) {
      console.error('[SQL_CONSOLE] Dedicated database connection configuration is invalid:', configurationError);
      res.status(503).json({ error: 'SQL Console database connection is not configured correctly.' });
      return;
    }

    if (!sqlPool) {
      res.status(503).json({ error: 'SQL Console is unavailable: SQL_CONSOLE_DATABASE_URL is not configured.' });
      return;
    }

    client = await sqlPool.connect();
    await client.query(operation === 'SELECT' ? 'BEGIN READ ONLY' : 'BEGIN');
    await client.query('SET LOCAL statement_timeout = ' + STATEMENT_TIMEOUT_MS);
    await client.query('SET LOCAL idle_in_transaction_session_timeout = 10000');

    const result = operation === 'SELECT'
      ? await client.query({
          text: 'SELECT * FROM (\n' + sql + '\n) AS admin_sql_result LIMIT ' + (MAX_ROWS + 1),
          rowMode: 'array',
        })
      : await client.query({ text: sql, rowMode: 'array' });

    if (operation !== 'SELECT' && (result.rowCount ?? 0) > MAX_ROWS) {
      await client.query('ROLLBACK');
      const durationMs = Date.now() - startedAt;
      await writeQueryAudit(req, queryHash, operation, durationMs, 0, false);
      res.status(400).json({ error: 'Write cancelled: more than ' + MAX_ROWS + ' rows would be affected. Narrow the WHERE clause and retry.', queryHash });
      return;
    }

    await client.query('COMMIT');
    const truncated = operation === 'SELECT' && result.rows.length > MAX_ROWS;
    const rows = result.rows.slice(0, MAX_ROWS).map((row) => toJsonSafe(row));
    const durationMs = Date.now() - startedAt;
    await writeQueryAudit(req, queryHash, operation, durationMs, result.rowCount ?? rows.length, true);

    res.json({
      columns: result.fields.map((field) => field.name),
      rows,
      rowCount: result.rowCount ?? rows.length,
      truncated,
      maxRows: MAX_ROWS,
      durationMs,
      operation,
      readOnly: operation === 'SELECT',
    });
  } catch (error: any) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { /* transaction may already be aborted */ }
    }
    const durationMs = Date.now() - startedAt;
    await writeQueryAudit(req, queryHash, operation, durationMs, 0, false);
    console.error('[SQL_CONSOLE] Query failed:', { queryHash, operation, code: error?.code, message: error?.message, userId: req.user?.id });
    const connectionFailure = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', '28P01', '3D000'].includes(error?.code);
    res.status(error?.code === '57014' ? 408 : connectionFailure ? 503 : 400).json({
      error: error?.code === '57014'
        ? 'Query timed out. The execution limit is 5 seconds.'
        : 'The query could not be executed. Check SQL syntax, table/column names, and database permissions.',
      queryHash,
    });
  } finally {
    client?.release();
  }
});

export default router;
