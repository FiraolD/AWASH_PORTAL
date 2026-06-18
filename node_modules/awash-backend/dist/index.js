import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler, notFound } from './api/middleware/error.middleware.js';
import { logger } from './lib/logger.js';
// Import routes
import authRoutes from './api/v1/auth.routes.js';
import dashboardRoutes from './api/v1/dashboard.routes.js';
import profileRoutes from './api/v1/profile.routes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Middleware
app.use(cors({
    origin: config.cors.origin,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
// API Routes - v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/profile', profileRoutes);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use(notFound);
app.use(errorHandler);
app.listen(config.port, () => {
    logger.info(`🖥️ Server running on http://localhost:${config.port}`);
    logger.info('✅ API endpoints ready');
});
