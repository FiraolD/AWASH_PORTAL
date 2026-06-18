import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiV1Routes from './api/v1/index.js';
import pool from './lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: true, // This allows any origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Test database connection
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully via pg pool');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

await testConnection();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', apiV1Routes);
app.use('/api', apiV1Routes); // For backward compatibility

// Start server
app.listen(PORT, () => {
  console.log(`\n🖥️ Server running on http://localhost:${PORT}`);
  //console.log('✅ Using PostgreSQL pg pool for database operations\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

export default app;