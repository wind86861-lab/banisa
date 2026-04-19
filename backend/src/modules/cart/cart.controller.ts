import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { cartService } from './cart.service';
import { sendSuccess } from '../../utils/response';

export const addToCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await cartService.addToCart(req.user!.id, req.body);
        sendSuccess(res, result, null, 'Savatga qo\'shildi', 201);
    } catch (error) {
        next(error);
    }
};

export const getCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const cart = await cartService.getCart(req.user!.id);
        sendSuccess(res, cart);
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await cartService.removeFromCart(req.user!.id, req.params.id as string);
        sendSuccess(res, null, null, 'Savatdan o\'chirildi');
    } catch (error) {
        next(error);
    }
};

export const updateQuantity = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await cartService.updateQuantity(req.user!.id, req.params.id as string, req.body.quantity);
        sendSuccess(res, result, null, 'Miqdor yangilandi');
    } catch (error) {
        next(error);
    }
};

export const clearCart = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await cartService.clearCart(req.user!.id);
        sendSuccess(res, null, null, 'Savat tozalandi');
    } catch (error) {
        next(error);
    }
};

export const getCartCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await cartService.getCartCount(req.user!.id);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};
