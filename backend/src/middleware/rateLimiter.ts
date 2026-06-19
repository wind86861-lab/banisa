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
  max: isDev ? 10000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { success: false, error: 'Too many requests. Try again in 15 minutes.' },
  skip: () => isDev,
  validate: false,
});

// Strict login limit — 5 attempts per IP (disabled in dev)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 50,
  skipSuccessfulRequests: true,
  keyGenerator,
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  skip: () => isDev,
  validate: false,
});

// Clinic registration limit — 5 per IP per hour (disabled in dev)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 10000 : 5,
  keyGenerator,
  message: { success: false, error: 'Too many registration attempts. Try again in 1 hour.' },
  skip: () => isDev,
  validate: false,
});

// Patient scan-checkin — 20 per 5 min per IP (prevents secret brute-force)
export const scanCheckInLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 10000 : 20,
  keyGenerator,
  message: { success: false, error: 'Juda ko\'p urinish. Birozdan keyin qayta urining.' },
  skip: () => isDev,
  validate: false,
});

// Refresh token limit
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 100,
  keyGenerator,
  message: { success: false, error: 'Too many refresh attempts' },
  skipSuccessfulRequests: true,
  skip: () => isDev,
  validate: false,
});

// Password change limit — even with a valid session token, brute-force-
// guessing the current password is a recovery-token attack vector. Caps the
// authenticated user at 10 attempts per 15 minutes per IP.
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 10,
  keyGenerator,
  message: { success: false, error: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urining.' },
  skipSuccessfulRequests: true,
  skip: () => isDev,
  validate: false,
});
