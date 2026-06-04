import { Router } from 'express';
import { getPublicServices, getPublicServiceDetail, getPublicServiceFilters } from './public-services.controller';
import { getPublicClinics, getPublicClinicDetail } from './public-clinics.controller';
import { getHome, autocomplete } from './public-home.controller';
import { listDoctors, getDoctorDetail } from './public-doctors.controller';
import { getDoctorSlots } from './public-doctor-slots.controller';
import { listPublicAmbulances } from './public-ambulances.controller';

const router = Router();

router.get('/home', getHome);
router.get('/search/autocomplete', autocomplete);
router.get('/services', getPublicServices);
router.get('/services/filters', getPublicServiceFilters);
router.get('/services/:id', getPublicServiceDetail);
router.get('/clinics', getPublicClinics);
router.get('/clinics/:id', getPublicClinicDetail);
router.get('/doctors', listDoctors);
router.get('/doctors/:id', getDoctorDetail);
router.get('/doctors/:id/slots', getDoctorSlots);
router.get('/ambulances', listPublicAmbulances);

export default router;
