import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DEPLOYED_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Set DEPLOYED_DATABASE_URL or DATABASE_URL before starting the API');
}

const databaseHost = new URL(connectionString).hostname;
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseHost);
const ssl = isLocalDatabase
  ? false
  : {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n') } : {}),
    };

const pool = new Pool({
  connectionString,
  ssl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected database error:', err);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

export default pool;