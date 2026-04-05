import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as homepageController from './homepage.controller';

const router = Router();

router.get('/', homepageController.getAllSections);
router.get('/:section', homepageController.getSection);

router.put('/:section', requireAuth, requireRole(['SUPER_ADMIN']), homepageController.upsertSection);

export default router;
