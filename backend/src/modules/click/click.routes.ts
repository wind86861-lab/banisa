import { Router } from 'express';
import express from 'express';
import { handleClickWebhook, handleClickSplitWebhook } from './click.controller';
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

// SHOP SPLIT webhook — one global Banisa service_id (106290). Paste
// https://banisa.uz/api/click/split-webhook into the Split-Shop dashboard.
router.post(
    '/split-webhook',
    express.urlencoded({ extended: true }),
    express.json(),
    handleClickSplitWebhook,
);

// Patient-facing: returns the my.click.uz redirect URL for a given appointment.
router.post('/initiate', requireAuth, initiateClickPayment);

export default router;
