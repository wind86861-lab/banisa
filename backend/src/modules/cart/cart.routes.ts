import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as cartController from './cart.controller';

const router = Router();

router.use(requireAuth, requireRole(['PATIENT']));

router.post('/', cartController.addToCart);
router.get('/', cartController.getCart);
router.get('/count', cartController.getCartCount);
router.delete('/:id', cartController.removeFromCart);
router.patch('/:id/quantity', cartController.updateQuantity);
router.delete('/', cartController.clearCart);
router.post('/checkout', cartController.checkout);

export default router;
