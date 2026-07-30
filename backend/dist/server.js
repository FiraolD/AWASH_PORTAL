import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiV1Routes from './api/v1/index.js';
import pool from './lib/db.js';
import { getAllowedOrigins, getJwtSecret } from './lib/security.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables
dotenv.config();
// Validate production secrets early
getJwtSecret();
const allowedOrigins = getAllowedOrigins();
const app = express();
const PORT = process.env.PORT || 5001;
// Trust proxy (for correct IP detection behind load balancers)
app.set('trust proxy', 1);
// ========================
// CORS CONFIGURATION
// ========================
app.use(cors({
  origin: [
    'https://awash-portal.vercel.app',
    'https://awash-portal.onrender.com',
    'http://localhost:5173',
    'http://localhost:3011',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ========================
// MIDDLEWARE
// ========================
// Body parsers with size limits
app.use(express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
        // Store raw body for signature verification if needed
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: '1y',
    etag: true,
    lastModified: true
}));
// ========================
// HEALTH CHECK
// ========================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Simple ping endpoint for load balancers
app.get('/ping', (req, res) => {
    res.send('pong');
});
// ========================
// ROUTES
// ========================
// Main API routes
app.use('/api/v1', apiV1Routes);
app.use('/api', apiV1Routes); // For backward compatibility
// ========================
// ERROR HANDLING
// ========================
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    // Don't leak error details in production
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        timestamp: new Date().toISOString(),
        ...(isProduction ? {} : { stack: err.stack })
    });
});
// ========================
// DATABASE CONNECTION
// ========================
async function testDatabaseConnection() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connected successfully via pg pool');
        // Log database connection details (without exposing credentials)
        const client = await pool.connect();
        const result = await client.query('SELECT version()');
        console.log(`✅ PostgreSQL version: ${result.rows[0].version}`);
        client.release();
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        // Don't exit in production, retry instead
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
        else {
            console.error('⚠️  Database connection failed. Server will continue but API endpoints may fail.');
        }
    }
}
// ========================
// SERVER STARTUP
// ========================
let server;
async function startServer() {
    // Test database connection
    await testDatabaseConnection();
    // Start the server
    server = app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔒 CORS allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'none'}`);
        console.log(`📁 Uploads directory: ${path.join(__dirname, '../uploads')}`);
        console.log(`\n✨ Server ready to handle requests\n`);
    });
    return server;
}
// Start the server
startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
// ========================
// GRACEFUL SHUTDOWN
// ========================
async function gracefulShutdown(signal) {
    console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);
    const shutdownTimeout = setTimeout(() => {
        console.error('❌ Shutdown timeout, forcing exit...');
        process.exit(1);
    }, 30000); // 30 seconds timeout
    try {
        // Close database connections
        console.log('📦 Closing database connections...');
        await pool.end();
        console.log('✅ Database connections closed');
        // Close server
        if (server) {
            console.log('🛑 Closing server...');
            await new Promise((resolve, reject) => {
                server.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve(null);
                });
            });
            console.log('✅ Server closed');
        }
        // Clear timeout
        clearTimeout(shutdownTimeout);
        console.log('👋 Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error during graceful shutdown:', error);
        process.exit(1);
    }
}
// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// ========================
// EXPORTS FOR TESTING
// ========================
export default app;
export { server };
