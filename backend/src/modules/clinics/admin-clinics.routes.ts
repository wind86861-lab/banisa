import { Router } from 'express';
import * as adminClinicsController from './admin-clinics.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { clinicCreateSchema, clinicUpdateSchema, bulkActionSchema, reviewModerationSchema } from './admin-clinics.validation';

const router = Router();

// All routes require SUPER_ADMIN
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

// 1. List all clinics with pagination, filters, search, sort
router.get('/', adminClinicsController.list);

// 2. Get clinic details
router.get('/:id', adminClinicsController.getById);

// 3. Create new clinic
router.post('/', validate(clinicCreateSchema), adminClinicsController.create);

// 4. Update clinic
router.put('/:id', validate(clinicUpdateSchema), adminClinicsController.update);

// 5. Soft delete clinic (deactivate)
router.delete('/:id', adminClinicsController.remove);

// 6. Activate clinic
router.patch('/:id/activate', adminClinicsController.activate);

// 7. Deactivate clinic
router.patch('/:id/deactivate', adminClinicsController.deactivate);

// 8. Approve pending/in-review clinic
router.post('/:id/approve', adminClinicsController.approve);

// 9. Reject pending/in-review clinic
router.post('/:id/reject', adminClinicsController.reject);

// 10. Reopen rejected clinic → back to PENDING
router.post('/:id/reopen', adminClinicsController.reopen);

// 11. Update status (IN_REVIEW, SUSPENDED, DELETED, BLOCKED)
router.patch('/:id/status', adminClinicsController.updateStatus);

// 23. Bulk activate clinics
router.post('/bulk-activate', validate(bulkActionSchema), adminClinicsController.bulkActivate);

// 24. Bulk deactivate clinics
router.post('/bulk-deactivate', validate(bulkActionSchema), adminClinicsController.bulkDeactivate);

// 25. Export clinics to CSV/Excel
router.get('/export/csv', adminClinicsController.exportCSV);

// ─── Nested Resources ─────────────────────────────────────────────────────────

// 18. Get clinic services
router.get('/:id/services', adminClinicsController.getServices);

// 19. Get clinic doctors
router.get('/:id/doctors', adminClinicsController.getDoctors);

// 20. Get clinic statistics (appointments, revenue, rating)
router.get('/:id/stats', adminClinicsController.getStats);

// 21. Get clinic reviews
router.get('/:id/reviews', adminClinicsController.getReviews);

export default router;
