import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import { getClinicMe } from './clinic.controller';
import { clinicServicesController } from './services/services.controller';
import { clinicCheckupController } from './services/checkup.controller';
import { clinicSurgicalController } from './services/surgical.controller';
import { clinicSanatoriumController } from './services/sanatorium.controller';
import { clinicSettingsController } from './services/settings.controller';
import {
    activateServiceSchema,
    activateSurgicalServiceSchema,
    activateSanatoriumServiceSchema,
    activatePackageSchema,
    updatePackageSchema,
    workingHoursSchema,
    queueSettingsSchema,
} from './services/validation';
import {
    upsertCustomizationSchema,
    uploadImageSchema,
    reorderImagesSchema,
} from './services/customization.validation';
import { customizationController } from './services/customization.controller';
import { serviceImageUpload } from '../../middleware/upload.middleware';
import {
    getClinicStats,
    getClinicProfile, updateClinicProfile,
    resolveMapLink,
} from './clinic-extra.controller';

const router = Router();

// All clinic routes require authentication + CLINIC_ADMIN role, then load the
// clinic membership so per-action permissions can be enforced. Reads stay
// member-only (any member, incl. the read-only DIRECTOR); mutations require
// the matching write permission (SERVICE_MANAGE / CLINIC_SETTINGS_EDIT), which
// DIRECTOR does not hold.
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Write-permission gates (reused across routes below).
const SVC = requireClinicPermission(ClinicPermission.SERVICE_MANAGE);
const SETTINGS = requireClinicPermission(ClinicPermission.CLINIC_SETTINGS_EDIT);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/me', getClinicMe);

// ─── Diagnostic Services ──────────────────────────────────────────────────────
router.get('/services/available', clinicServicesController.getAvailableServices);
router.get('/services/:serviceId/metadata-templates', clinicServicesController.getServiceMetadata);
router.put('/services/:serviceId/metadata-values', SVC, clinicServicesController.saveServiceMetadata);
router.post('/services/activate', SVC, validate(activateServiceSchema), clinicServicesController.activateService);
router.delete('/services/:serviceId', SVC, clinicServicesController.deactivateService);

// ─── Service Customization ───────────────────────────────────────────────────
router.get('/services/:clinicServiceId/customization', customizationController.getCustomization);
router.put('/services/:clinicServiceId/customization', SVC, validate(upsertCustomizationSchema), customizationController.upsertCustomization);
router.delete('/services/:clinicServiceId/customization', SVC, customizationController.deleteCustomization);
router.post('/services/:clinicServiceId/customization/images', SVC, serviceImageUpload, customizationController.uploadImage);
router.delete('/services/:clinicServiceId/customization/images/:imageId', SVC, customizationController.deleteImage);
router.put('/services/:clinicServiceId/customization/images/reorder', SVC, validate(reorderImagesSchema), customizationController.reorderImages);
router.put('/services/:clinicServiceId/customization/images/:imageId/primary', SVC, customizationController.setPrimaryImage);

// ─── Surgical Services ───────────────────────────────────────────────────────
router.get('/surgical-services/available', clinicSurgicalController.getAvailableSurgicalServices);
router.post('/surgical-services/activate', SVC, validate(activateSurgicalServiceSchema), clinicSurgicalController.activateSurgicalService);
router.delete('/surgical-services/:serviceId', SVC, clinicSurgicalController.deactivateSurgicalService);

// ─── Surgical Service Customization ──────────────────────────────────────────
router.get('/surgical-services/:serviceId/customization', clinicSurgicalController.getCustomization);
router.put('/surgical-services/:serviceId/customization', SVC, clinicSurgicalController.upsertCustomization);
router.delete('/surgical-services/:serviceId/customization', SVC, clinicSurgicalController.deleteCustomization);

// ─── Sanatorium Services ────────────────────────────────────────────────────
router.get('/sanatorium-services/available', clinicSanatoriumController.getAvailableSanatoriumServices);
router.post('/sanatorium-services/activate', SVC, validate(activateSanatoriumServiceSchema), clinicSanatoriumController.activateSanatoriumService);
router.delete('/sanatorium-services/:serviceId', SVC, clinicSanatoriumController.deactivateSanatoriumService);

// ─── Checkup Packages ─────────────────────────────────────────────────────────
router.get('/checkup-packages/available', clinicCheckupController.getAvailablePackages);
router.post('/checkup-packages/activate', SVC, validate(activatePackageSchema), clinicCheckupController.activatePackage);
router.patch('/checkup-packages/:id', SVC, validate(updatePackageSchema), clinicCheckupController.updatePackage);
router.delete('/checkup-packages/:id', SVC, clinicCheckupController.deactivatePackage);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings/working-hours', clinicSettingsController.getWorkingHours);
router.put('/settings/working-hours', SETTINGS, validate(workingHoursSchema), clinicSettingsController.updateWorkingHours);
router.get('/settings/queue', clinicSettingsController.getQueueSettings);
router.put('/settings/queue', SETTINGS, validate(queueSettingsSchema), clinicSettingsController.updateQueueSettings);

// ─── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', getClinicStats);

// /api/clinic/bookings is the legacy endpoint — the SPA talks to
// /api/clinic/appointments instead. Removed to stop stale bookmarks from
// hitting code that still uses the old where.status cast.

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', getClinicProfile);
router.put('/profile', SETTINGS, updateClinicProfile);
router.post('/resolve-map-link', SETTINGS, resolveMapLink);

export default router;
