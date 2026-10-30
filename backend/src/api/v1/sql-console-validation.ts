// SQL Console validation kept separate from route/database initialization so it can be unit-tested without credentials.
const MAX_SQL_LENGTH = 10_000;
const BLOCKED_KEYWORDS = /\b(delete|merge|upsert|create|alter|drop|truncate|grant|revoke|comment|copy|call|do|execute|prepare|deallocate|refresh|vacuum|analyze|reindex|cluster|listen|notify|unlisten|reset|discard|lock|begin|commit|rollback|savepoint|release|explain)\b/i;
// This denylist is defense-in-depth, not a complete PostgreSQL function sandbox.
const BLOCKED_FUNCTIONS = /\b(nextval|setval|set_config|pg_read_file|pg_read_binary_file|pg_ls_dir|lo_import|lo_export|lo_create|lo_put|lo_unlink|dblink|dblink_exec|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_stat_reset|pg_stat_reset_shared|pg_advisory_lock|pg_advisory_xact_lock|pg_advisory_unlock|pg_advisory_unlock_all|pg_notify|pg_logical_emit_message|pg_sleep|pg_sleep_for|pg_sleep_until)\s*\(/i;

export type SqlOperation = 'SELECT' | 'INSERT' | 'UPDATE';

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
  // The regex validator is not a PostgreSQL parser. Reject lexical forms whose
  // escaping rules are easy to misinterpret rather than attempting to sanitize them.
  if (/\$([a-zA-Z_][a-zA-Z0-9_]*)?\$/.test(sql) || /\bE\s*'/i.test(sql)) {
    throw new Error('Dollar-quoted and escape-string literals are not supported in the SQL Console.');
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
    if (/\binto\b/i.test(safeScan)) {
      throw new Error('SELECT INTO is not supported in the SQL Console.');
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

