import { Router } from 'express';
import { getPublicServices, getPublicServiceDetail } from './public-services.controller';
import { getPublicClinics, getPublicClinicDetail } from './public-clinics.controller';

const router = Router();

router.get('/services', getPublicServices);
router.get('/services/:id', getPublicServiceDetail);
router.get('/clinics', getPublicClinics);
router.get('/clinics/:id', getPublicClinicDetail);

export default router;
