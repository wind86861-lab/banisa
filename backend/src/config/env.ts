import dotenv from 'dotenv';
import path from 'path';

// Works in both dev (src/) and production (dist/) — DigitalOcean injects env vars directly
dotenv.config({ path: path.join(process.cwd(), '.env') });

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    DATABASE_URL: process.env.DATABASE_URL || '',
    // Legacy single secret (kept for backwards compatibility — auth middleware still reads this)
    JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    // VULN-03: separate secrets for access vs refresh tokens
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access-secret-change-in-production',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
