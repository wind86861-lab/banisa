import { Router } from 'express';
import * as surgicalController from './surgical.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { surgicalServiceSchema, updateSurgicalSchema } from './surgical.validation';

const router = Router();

// Public routes
router.get('/tree', surgicalController.tree);
router.get('/', surgicalController.list);
router.get('/:id', surgicalController.getById);

// Admin only routes
router.post(
    '/',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    validate(surgicalServiceSchema),
    surgicalController.create
);

router.put(
    '/:id',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    validate(updateSurgicalSchema),
    surgicalController.update
);

router.delete(
    '/:id',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    surgicalController.remove
);

export default router;
