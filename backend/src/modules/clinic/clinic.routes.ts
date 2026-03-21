import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
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
    getClinicBookings, updateBookingStatus,
    getClinicProfile, updateClinicProfile,
    getClinicStaff, createClinicStaff, updateClinicStaff, deleteClinicStaff,
    getClinicDiscounts, createClinicDiscount, updateClinicDiscount, deleteClinicDiscount,
} from './clinic-extra.controller';

const router = Router();

// All clinic routes require authentication + CLINIC_ADMIN role
router.use(requireAuth, requireRole(['CLINIC_ADMIN']));

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/me', getClinicMe);

// ─── Diagnostic Services ──────────────────────────────────────────────────────
router.get('/services/available', clinicServicesController.getAvailableServices);
router.post('/services/activate', validate(activateServiceSchema), clinicServicesController.activateService);
router.delete('/services/:serviceId', clinicServicesController.deactivateService);

// ─── Service Customization ───────────────────────────────────────────────────
router.get('/services/:clinicServiceId/customization', customizationController.getCustomization);
router.put('/services/:clinicServiceId/customization', validate(upsertCustomizationSchema), customizationController.upsertCustomization);
router.delete('/services/:clinicServiceId/customization', customizationController.deleteCustomization);
router.post('/services/:clinicServiceId/customization/images', serviceImageUpload, customizationController.uploadImage);
router.delete('/services/:clinicServiceId/customization/images/:imageId', customizationController.deleteImage);
router.put('/services/:clinicServiceId/customization/images/reorder', validate(reorderImagesSchema), customizationController.reorderImages);
router.put('/services/:clinicServiceId/customization/images/:imageId/primary', customizationController.setPrimaryImage);

// ─── Surgical Services ───────────────────────────────────────────────────────
router.get('/surgical-services/available', clinicSurgicalController.getAvailableSurgicalServices);
router.post('/surgical-services/activate', validate(activateSurgicalServiceSchema), clinicSurgicalController.activateSurgicalService);
router.delete('/surgical-services/:serviceId', clinicSurgicalController.deactivateSurgicalService);

// ─── Sanatorium Services ────────────────────────────────────────────────────
router.get('/sanatorium-services/available', clinicSanatoriumController.getAvailableSanatoriumServices);
router.post('/sanatorium-services/activate', validate(activateSanatoriumServiceSchema), clinicSanatoriumController.activateSanatoriumService);
router.delete('/sanatorium-services/:serviceId', clinicSanatoriumController.deactivateSanatoriumService);

// ─── Checkup Packages ─────────────────────────────────────────────────────────
router.get('/checkup-packages/available', clinicCheckupController.getAvailablePackages);
router.post('/checkup-packages/activate', validate(activatePackageSchema), clinicCheckupController.activatePackage);
router.patch('/checkup-packages/:id', validate(updatePackageSchema), clinicCheckupController.updatePackage);
router.delete('/checkup-packages/:id', clinicCheckupController.deactivatePackage);

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings/working-hours', clinicSettingsController.getWorkingHours);
router.put('/settings/working-hours', validate(workingHoursSchema), clinicSettingsController.updateWorkingHours);
router.get('/settings/queue', clinicSettingsController.getQueueSettings);
router.put('/settings/queue', validate(queueSettingsSchema), clinicSettingsController.updateQueueSettings);

// ─── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', getClinicStats);

// ─── Bookings ──────────────────────────────────────────────────────────────────
router.get('/bookings', getClinicBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', getClinicProfile);
router.put('/profile', updateClinicProfile);

// ─── Staff ─────────────────────────────────────────────────────────────────────
router.get('/staff', getClinicStaff);
router.post('/staff', createClinicStaff);
router.put('/staff/:id', updateClinicStaff);
router.delete('/staff/:id', deleteClinicStaff);

// ─── Discounts ─────────────────────────────────────────────────────────────────
router.get('/discounts', getClinicDiscounts);
router.post('/discounts', createClinicDiscount);
router.put('/discounts/:id', updateClinicDiscount);
router.delete('/discounts/:id', deleteClinicDiscount);

export default router;
