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
import paymeClinicRoutes from './modules/payme/payme-clinic.routes';
import clinicReportsRoutes from './modules/clinic/reports.routes';
import clinicDoctorsRoutes from './modules/clinic/doctors.routes';
import clinicAmbulancesRoutes from './modules/clinic/ambulances.routes';
import doctorReviewsRoutes from './modules/reviews/doctor-reviews.routes';
import paymeAdminRoutes from './modules/payme/payme-admin.routes';
import specialtyAdminRoutes from './modules/admin/specialty.routes';
import { listSpecialtiesPublic } from './modules/admin/specialty.controller';
import homepageRoutes from './modules/homepage/homepage.routes';
import uploadRoutes from './modules/upload/upload.routes';
import cartRoutes from './modules/cart/cart.routes';
import ofertaRoutes from './modules/oferta/oferta.routes';
import {
    patientAppointmentRouter,
    operatorAppointmentRouter,
    clinicAppointmentRouter,
} from './modules/appointments/appointment.routes';
import notificationsRoutes, { patientNotificationsRouter } from './modules/notifications/notifications.routes';
import metadataTemplateRoutes from './modules/metadata/metadata-template.routes';
import appointmentMetadataRoutes from './modules/metadata/appointment-metadata.routes';

const app = express();

// Security Middleware
app.use(helmet({
    // We enable CSP with a narrow allowlist below; permissive ('unsafe-inline'
    // for styles) is the minimum a React+Vite SPA needs without refactoring.
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc: ["'self'", 'https://banisa.uz'],
            frameSrc: ["'self'", 'https://checkout.paycom.uz', 'https://*.paycom.uz'],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'", 'https://checkout.paycom.uz'],
            frameAncestors: ["'self'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const corsOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
app.use(cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match'],
    credentials: true,
    maxAge: 86400,
}));

// Trust proxy (behind nginx) — required for express-rate-limit to read X-Forwarded-For
app.set('trust proxy', 1);

// Global rate limiter — 100 req / 15 min per IP (VULN-02)
app.use('/api/', apiLimiter);

// Logic Middleware — explicit body limits so a single oversized payload
// can't tie up event loop / memory (uploads use multer, not express.json).
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser()); // required for HttpOnly refresh-token cookie (VULN-03)

// Lightweight healthcheck for nginx / PM2 / uptime monitors.
app.get('/api/health', async (_req, res) => {
    try {
        const prisma = (await import('./config/database')).default;
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, ts: Date.now() });
    } catch {
        res.status(503).json({ ok: false });
    }
});

// Static file serving (uploaded documents, logos, licenses)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user/auth', userAuthRoutes);
app.use('/api/user/appointments', patientAppointmentRouter);
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
app.use('/api/clinic/payments/payme', paymeClinicRoutes);
app.use('/api/clinic/reports', clinicReportsRoutes);
app.use('/api/clinic/doctors', clinicDoctorsRoutes);
app.use('/api/clinic/ambulances', clinicAmbulancesRoutes);
app.use('/api/user/doctor-reviews', doctorReviewsRoutes);
app.use('/api/admin/payme', paymeAdminRoutes);
app.use('/api/admin/specialties', specialtyAdminRoutes);
app.get('/api/public/specialties', listSpecialtiesPublic);
app.use('/api/homepage', homepageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/oferta', ofertaRoutes);

// ─── Appointment workflow (new) ──────────────────────────────────────────────
app.use('/api/admin/appointments', operatorAppointmentRouter);
app.use('/api/clinic/appointments', clinicAppointmentRouter);
app.use('/api/clinic/notifications', notificationsRoutes);
app.use('/api/user/notifications', patientNotificationsRouter);

// ─── Metadata System ──────────────────────────────────────────────────────────
app.use('/api/admin/metadata-templates', metadataTemplateRoutes);
app.use('/api/clinic/appointments', appointmentMetadataRoutes);

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
