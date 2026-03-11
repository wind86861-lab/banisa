import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../utils/errors';
import prisma from '../config/database';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
        }

        const token = authHeader.split(' ')[1];
        // VULN-03: use dedicated access-token secret
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string; role: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', 401, ErrorCodes.UNAUTHORIZED);
        }

        req.user = { id: user.id, role: user.role };
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AppError('Invalid token', 401, ErrorCodes.UNAUTHORIZED));
        } else {
            next(error);
        }
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new AppError('Permission denied', 403, ErrorCodes.FORBIDDEN));
        }
        next();
    };
};
