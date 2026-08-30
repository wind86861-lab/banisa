import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requirePartnerKey } from '../../middleware/partner-auth.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import {
    getOperations,
    getClinics,
    getClinicOperations,
    createLinkTicket,
} from './partner.controller';

/**
 * Partner API — read-only catalog feeds for trusted external platforms
 * (KlinikaTop). Two auth models live here, so the guard is per-route rather
 * than a blanket router.use():
 *   - partner-key routes: server-to-server pulls (X-API-Key / Bearer).
 *   - link-ticket: a CLINIC's own action, so it uses the clinic session +
 *     CLINIC_SETTINGS_EDIT (present on CLINIC_ADMIN, absent on read-only
 *     DIRECTOR) — connecting to another platform is a clinic-level decision.
 */
export const partnerRouter = Router();

// ── partner-key (server-to-server) ────────────────────────────────────────
// Surgical-operation catalog (categories + operation names) from the master
// catalog — reflects super-admin edits on the next pull.
partnerRouter.get('/operations', requirePartnerKey, getOperations);
// Clinic profiles for KlinikaTop to fill its own records (ids required, ≤200).
partnerRouter.get('/clinics', requirePartnerKey, getClinics);
// Per-clinic enabled operations — the steady-state ~10-min sync (clinicIds required).
partnerRouter.get('/clinic-operations', requirePartnerKey, getClinicOperations);

// ── clinic session ────────────────────────────────────────────────────────
// The "Connect to KlinikaTop" button — mints a 60s hand-off ticket.
partnerRouter.post(
    '/link-ticket',
    requireAuth,
    loadClinicContext,
    requireClinicPermission(ClinicPermission.CLINIC_SETTINGS_EDIT),
    createLinkTicket,
);

export default partnerRouter;
