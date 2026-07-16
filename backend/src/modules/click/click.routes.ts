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

// SHOP SPLIT webhook — one global Banisa service_id (106290). Our single
// handler dispatches by the `action` field, but Click's Split-Shop dashboard
// asks for TWO addresses: Prepare URL (Адрес проверки) and Complete URL
// (Адрес результата). Expose named aliases for each field plus the generic
// /split-webhook — all three feed the same handler.
const splitBody = [express.urlencoded({ extended: true }), express.json()];
router.post('/split-webhook', ...splitBody, handleClickSplitWebhook);
router.post('/split-prepare', ...splitBody, handleClickSplitWebhook);  // Адрес проверки
router.post('/split-complete', ...splitBody, handleClickSplitWebhook); // Адрес результата

// Patient-facing: returns the my.click.uz redirect URL for a given appointment.
router.post('/initiate', requireAuth, initiateClickPayment);

export default router;
