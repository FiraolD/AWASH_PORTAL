// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Import centralized API routes
import apiV1Routes from './api/v1/index.js';
// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
// ========================
// MIDDLEWARE
// ========================
app.use(cors({
    origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:5173', 'http://localhost:3011'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Request logging (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}
// ========================
// ROUTES
// ========================
// All API v1 routes
app.use('/api', apiV1Routes);
// Also mount at /api/v1 for explicit versioning
app.use('/api/v1', apiV1Routes);
// ========================
// HEALTH CHECK
// ========================
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});
app.get('/ping', (_req, res) => {
    res.send('pong');
});
// ========================
// STATIC FILES (production)
// ========================
if (process.env.NODE_ENV === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}
// ========================
// 404 HANDLER
// ========================
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
    });
});
// ========================
// GLOBAL ERROR HANDLER
// ========================
app.use((err, req, res, _next) => {
    console.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : err.message,
        timestamp: new Date().toISOString(),
        ...(isProduction ? {} : { stack: err.stack }),
    });
});
// ========================
// START SERVER
// ========================
app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
});
export default app;
