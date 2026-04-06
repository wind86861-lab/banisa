import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import categoryRoutes from './modules/categories/categories.routes';
import diagnosticRoutes from './modules/diagnostics/diagnostics.routes';
import surgicalRoutes from './modules/surgical/surgical.routes';
import sanatoriumRoutes from './modules/sanatorium/sanatorium.routes';
import clinicRoutes from './modules/clinics/clinics.routes';
import adminClinicRoutes from './modules/clinics/admin-clinics.routes';
import adminReviewRoutes from './modules/reviews/admin-reviews.routes';
import checkupPackageRoutes, { adminCheckupPackageRoutes } from './modules/checkup-packages/checkup-packages.routes';
import adminRoutes from './modules/admin/admin.routes';
import clinicAdminRoutes from './modules/clinic/clinic.routes';
import userRoutes from './modules/user/user.routes';
import userAuthRoutes from './modules/user-auth/user-auth.routes';
import publicRoutes from './modules/public/public.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import { apiLimiter } from './middleware/rateLimiter';
import paymeRoutes from './modules/payme/payme.routes';
import homepageRoutes from './modules/homepage/homepage.routes';
import uploadRoutes from './modules/upload/upload.routes';

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const corsOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'multipart/form-data'],
    credentials: true,
}));

// Global rate limiter — 100 req / 15 min per IP (VULN-02)
app.use('/api/', apiLimiter);

// Logic Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // required for HttpOnly refresh-token cookie (VULN-03)

// Static file serving (uploaded documents, logos, licenses)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user/auth', userAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/surgical', surgicalRoutes);
app.use('/api/sanatorium', sanatoriumRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/admin/clinics', adminClinicRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/checkup-packages', checkupPackageRoutes);
app.use('/api/admin/checkup-packages', adminCheckupPackageRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/clinic', clinicAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payme', paymeRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/upload', uploadRoutes);

// ─── Serve frontend in production ────────────────────────────────────────────
if (env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../../code/dist');
    app.use(express.static(frontendPath, { index: false }));
    // Catch-all route for SPA - must be after all API routes
    app.use((_req, res) => {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Error Handling
app.use(errorHandler);

export default app;
