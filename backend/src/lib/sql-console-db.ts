import pkg from 'pg';

const { Pool } = pkg;

let sqlConsolePool: InstanceType<typeof Pool> | null = null;

/**
 * Returns the dedicated least-privilege SQL Console pool.
 * Intentionally never falls back to the application's primary database pool.
 */
export function getSqlConsolePool(): InstanceType<typeof Pool> | null {
  const connectionString = process.env.SQL_CONSOLE_DATABASE_URL?.trim();
  if (!connectionString) return null;

  if (!sqlConsolePool) {
    const databaseUrl = new URL(connectionString);
    const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname);
    const ssl = isLocalDatabase
      ? false
      : {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
          ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}),
        };

    sqlConsolePool = new Pool({
      connectionString,
      ssl,
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      application_name: 'awash_sql_console',
    });

    sqlConsolePool.on('error', (error: Error) => {
      console.error('[SQL_CONSOLE] Unexpected dedicated database pool error:', error.message);
    });
  }

  return sqlConsolePool;
}
