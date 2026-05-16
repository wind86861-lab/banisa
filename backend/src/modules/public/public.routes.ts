import { Router } from 'express';
import { getPublicServices, getPublicServiceDetail, getPublicServiceFilters } from './public-services.controller';
import { getPublicClinics, getPublicClinicDetail } from './public-clinics.controller';
import { getHome, autocomplete } from './public-home.controller';

const router = Router();

router.get('/home', getHome);
router.get('/search/autocomplete', autocomplete);
router.get('/services', getPublicServices);
router.get('/services/filters', getPublicServiceFilters);
router.get('/services/:id', getPublicServiceDetail);
router.get('/clinics', getPublicClinics);
router.get('/clinics/:id', getPublicClinicDetail);

export default router;
