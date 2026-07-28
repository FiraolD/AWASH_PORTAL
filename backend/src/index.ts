// backend/src/index.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './api/v1/auth.routes.js';
import usersRoutes from './api/v1/user.routes.js';
import productsRoutes from './api/v1/products.routes.js';
import policiesRoutes from './api/v1/policy.routes.js';
import claimsRoutes from './api/v1/claim.routes.js';
import paymentsRoutes from './api/v1/payment.routes.js';  // ✅ Add this
import settingsRoutes from './api/v1/settings.routes.js';
// ... other imports

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/payments', paymentsRoutes);    // ✅ Add this
app.use('/api/settings', settingsRoutes);
// ... other routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;