import { Router } from 'express';
import express from 'express';
import { alifWebhook, initiateAlifPayment } from './alif.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Alif payment notification. RAW body is required so the HMAC-SHA256 Signature
// can be verified over the exact bytes Alif sent.
router.post('/webhook', express.raw({ type: '*/*', limit: '1mb' }), alifWebhook);

// Patient starts an Alif (Nasiya) payment for their booking.
router.post('/initiate', requireAuth, initiateAlifPayment);

export default router;
