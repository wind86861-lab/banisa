import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as cartController from './cart.controller';
import { addToCartSchema, updateQuantitySchema, checkoutSchema } from './cart.validation';

const router = Router();

router.use(requireAuth, requireRole(['PATIENT']));

router.post('/', validate(addToCartSchema), cartController.addToCart);
router.get('/', cartController.getCart);
router.get('/count', cartController.getCartCount);
router.delete('/:id', cartController.removeFromCart);
router.patch('/:id/quantity', validate(updateQuantitySchema), cartController.updateQuantity);
router.delete('/', cartController.clearCart);
router.post('/checkout', validate(checkoutSchema), cartController.checkout);

export default router;
