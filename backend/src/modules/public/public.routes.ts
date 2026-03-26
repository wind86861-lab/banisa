import { Router } from 'express';
import { getPublicServices, getPublicServiceDetail } from './public-services.controller';

const router = Router();

router.get('/services', getPublicServices);
router.get('/services/:id', getPublicServiceDetail);

export default router;
