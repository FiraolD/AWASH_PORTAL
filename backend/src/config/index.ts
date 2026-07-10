import type { SignOptions } from 'jsonwebtoken';
import { getAllowedOrigins, getJwtSecret } from '../lib/security.js';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5001),
  cors: {
    origins: getAllowedOrigins(),
  },
  jwt: {
    secret: getJwtSecret(),
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  },
};

