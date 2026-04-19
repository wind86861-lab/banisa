import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isDev = env.NODE_ENV === 'development';

// Custom key generator that handles proxied requests
const keyGenerator = (req: any) => {
  // Get IP from X-Forwarded-For header (set by Nginx) or fallback to req.ip
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list, take the first one
    const ip = forwarded.split(',')[0].trim();
    return ip;
  }
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// General API limit — applied to all routes (disabled in dev)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 5000, // Increased to 5000 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, error: 'Too many requests. Try again in 15 minutes.' },
  skip: () => isDev, // Skip entirely in development
});

// Strict login limit — 5 attempts per IP (disabled in dev)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 50, // Increased for testing
  skipSuccessfulRequests: true,
  keyGenerator,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  skip: () => isDev,
});

// Clinic registration limit — 5 per IP per hour (disabled in dev)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 10000 : 5,
  keyGenerator,
  message: { success: false, error: 'Too many registration attempts. Try again in 1 hour.' },
  skip: () => isDev,
});

// Refresh token limit — very lenient for dev (disabled in dev)
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 10000 : 30,
  keyGenerator,
  message: { success: false, error: 'Too many refresh attempts' },
  skipSuccessfulRequests: false,
  skip: () => isDev,
});
