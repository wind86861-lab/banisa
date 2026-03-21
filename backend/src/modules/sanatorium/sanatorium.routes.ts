import { Router } from 'express';
import * as sanatoriumController from './sanatorium.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { sanatoriumServiceSchema, updateSanatoriumSchema } from './sanatorium.validation';

const router = Router();

// Public routes
router.get('/', sanatoriumController.list);
router.get('/:id', sanatoriumController.getById);

// Admin only routes
router.post(
    '/',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    validate(sanatoriumServiceSchema),
    sanatoriumController.create
);

router.put(
    '/:id',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    validate(updateSanatoriumSchema),
    sanatoriumController.update
);

router.delete(
    '/:id',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    sanatoriumController.remove
);

export default router;
