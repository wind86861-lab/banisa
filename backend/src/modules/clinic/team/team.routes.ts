import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../../middleware/clinic-permission.middleware';
import * as ctrl from './team.controller';

const router = Router();

// Every endpoint requires the JWT + CLINIC_ADMIN role + clinic context.
router.use(requireAuth, requireRole(['CLINIC_ADMIN', 'PENDING_CLINIC']), loadClinicContext);

router.get('/me', ctrl.whoami);

// TEAM_VIEW gates the list endpoints — most roles hold it.
router.get('/members', requireClinicPermission(ClinicPermission.TEAM_VIEW), ctrl.listMembers);
router.get('/roles', requireClinicPermission(ClinicPermission.TEAM_VIEW), ctrl.listRoles);

router.post('/invite',          requireClinicPermission(ClinicPermission.TEAM_INVITE),      ctrl.invite);
router.patch('/members/:userId', requireClinicPermission(ClinicPermission.TEAM_ROLE_CHANGE), ctrl.changeRole);
router.delete('/members/:userId', requireClinicPermission(ClinicPermission.TEAM_REMOVE),     ctrl.remove);
router.post('/members/:userId/bot-link', requireClinicPermission(ClinicPermission.TEAM_INVITE), ctrl.botLink);

// Anyone can leave themselves regardless of permission.
router.post('/leave', ctrl.leave);

export default router;
