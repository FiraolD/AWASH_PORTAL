import { Router, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import pool from '../../lib/db.js';
import { getSqlConsolePool } from '../../lib/sql-console-db.js';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth.middleware.js';

import { normalizeSql, type SqlOperation } from './sql-console-validation.js';

const router = Router();
const MAX_ROWS = 200;
const STATEMENT_TIMEOUT_MS = 5_000;
const ALLOWED_ROLES = ['MASTER_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'] as const;

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
