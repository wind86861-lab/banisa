import { Router } from 'express';
import { MetadataTemplateController } from './metadata-template.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const controller = new MetadataTemplateController();

// All routes require SUPER_ADMIN role
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/', controller.listTemplates.bind(controller));
router.post('/', controller.createTemplate.bind(controller));
router.put('/:id', controller.updateTemplate.bind(controller));
router.delete('/:id', controller.deleteTemplate.bind(controller));
router.post('/:id/link-service', controller.linkToService.bind(controller));
router.delete('/links/:linkId', controller.unlinkFromService.bind(controller));

export default router;
