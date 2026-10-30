import { Router, Response } from 'express';
import { createHash } from 'node:crypto';
import pool from '../../lib/db.js';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth.middleware.js';

const router = Router();
const MAX_SQL_LENGTH = 10_000;
const MAX_ROWS = 200;
const STATEMENT_TIMEOUT_MS = 5_000;
const ALLOWED_ROLES = ['MASTER_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'];

/**
 * This console is intentionally read-only. The PostgreSQL transaction is also
 * marked READ ONLY, so database permissions are not delegated to the browser.
 */
function normalizeSql(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Enter a SQL query.');
  }

  const sql = input.trim();
  if (!sql) throw new Error('Enter a SQL query.');
  if (sql.length > MAX_SQL_LENGTH) {
    throw new Error(`Query exceeds the ${MAX_SQL_LENGTH.toLocaleString()} character limit.`);
  }

  // Keep the console deliberately narrow: one SELECT/CTE statement, no comments
  // or statement separators that could hide additional commands.
  if (sql.includes('--') || sql.includes('/*') || sql.includes('*/')) {
    throw new Error('SQL comments are not supported in the query console.');
  }

  const statement = sql.replace(/;\s*$/, '').trim();
  if (statement.includes(';')) {
    throw new Error('Only one SQL statement can be executed at a time.');
  }

  if (!/^(select|with)\b/i.test(statement)) {
    throw new Error('Only SELECT queries and read-only CTE queries are allowed.');
  }

  if (/\b(insert|update|delete|merge|upsert|create|alter|drop|truncate|grant|revoke|comment|copy|call|do|execute|prepare|deallocate|refresh|vacuum|analyze|reindex|cluster|listen|notify|unlisten|set|reset|discard|lock)\b/i.test(statement)) {
    throw new Error('This query contains a command that is not allowed in the read-only console.');
  }

  return statement;
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return value.toString('base64');
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, toJsonSafe(item)])
    );
  }
  return value;
}

async function writeQueryAudit(
  req: AuthRequest,
  queryHash: string,
  durationMs: number,
  rowCount: number,
  success: boolean
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        ("userId", action, "entityType", "entityId", "newValues", "ipAddress", "userAgent")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        req.user?.id || null,
        success ? 'SQL_QUERY_EXECUTED' : 'SQL_QUERY_FAILED',
        'DATABASE',
        queryHash,
        JSON.stringify({ queryHash, durationMs, rowCount, success }),
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );
  } catch (auditError) {
    // Query execution must not be reported as failed solely because audit
    // persistence is temporarily unavailable. This is still surfaced to logs.
    console.error('[SQL_CONSOLE] Failed to persist query audit event:', auditError);
  }
}

router.post('/query', authenticate, authorize(...ALLOWED_ROLES), async (req: AuthRequest, res: Response) => {
  let sql: string;
  try {
    sql = normalizeSql(req.body?.sql);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid SQL query.' });
    return;
  }

  const queryHash = createHash('sha256').update(sql).digest('hex');
  const startedAt = Date.now();
  const client = await pool.connect();

  try {
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    await client.query('SET LOCAL idle_in_transaction_session_timeout = 10000');

    // Wrap the submitted SELECT to enforce a hard result cap at the database.
    const result = await client.query({
      text: `SELECT * FROM (\n${sql}\n) AS admin_sql_result LIMIT ${MAX_ROWS + 1}`,
      rowMode: 'array',
    });

    await client.query('COMMIT');

    const truncated = result.rows.length > MAX_ROWS;
    const rows = result.rows.slice(0, MAX_ROWS).map((row) => toJsonSafe(row));
    const durationMs = Date.now() - startedAt;

    await writeQueryAudit(req, queryHash, durationMs, rows.length, true);

    res.json({
      columns: result.fields.map((field) => field.name),
      rows,
      rowCount: rows.length,
      truncated,
      maxRows: MAX_ROWS,
      durationMs,
      readOnly: true,
    });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection may already have been aborted by PostgreSQL.
    }

    const durationMs = Date.now() - startedAt;
    await writeQueryAudit(req, queryHash, durationMs, 0, false);
    console.error('[SQL_CONSOLE] Query failed:', {
      queryHash,
      code: error?.code,
      message: error?.message,
      userId: req.user?.id,
    });

    const status = error?.code === '57014' ? 408 : 400;
    res.status(status).json({
      error: error?.code === '57014'
        ? 'Query timed out. The execution limit is 5 seconds.'
        : 'The query could not be executed. Check SQL syntax, table/column names, and database permissions.',
      queryHash,
    });
  } finally {
    client.release();
  }
});

export default router;
