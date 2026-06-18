import { Router } from 'express';
import express from 'express';
import { handleClickWebhook } from './click.controller';
import { initiateClickPayment } from './click-patient.controller';
import { requireAuth } from '../../middleware/auth.middleware';

// Per-clinic CLICK webhook. The clinic admin pastes
// https://banisa.uz/api/click/webhook/<clinicId> into their CLICK dashboard
// (or for the test environment, the testKey-backed variant of the same URL).
//
// CLICK posts form-urlencoded by default; accept JSON too.
const router = Router();

router.post(
    '/webhook/:clinicId',
    express.urlencoded({ extended: true }),
    express.json(),
    handleClickWebhook,
);

// Patient-facing: returns the my.click.uz redirect URL for a given appointment.
router.post('/initiate', requireAuth, initiateClickPayment);

export default router;
