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
import clickRoutes from './modules/click/click.routes';
import clickClinicRoutes from './modules/click/click-clinic.routes';
import alifRoutes from './modules/alif/alif.routes';
import alifClinicRoutes from './modules/alif/alif-clinic.routes';
import clinicReportsRoutes from './modules/clinic/reports.routes';
import clinicTeamRoutes from './modules/clinic/team/team.routes';
import clinicDoctorsRoutes from './modules/clinic/doctors.routes';
import clinicAmbulancesRoutes from './modules/clinic/ambulances.routes';
import clinicSkoryRequestsRoutes from './modules/clinic/skory-requests.routes';
import skoryRoutes from './modules/skory/skory.routes';
import adminAmbulanceSettingsRoutes from './modules/admin/ambulance-settings.routes';
import doctorReviewsRoutes from './modules/reviews/doctor-reviews.routes';
import paymeAdminRoutes from './modules/payme/payme-admin.routes';
import clickAdminRoutes from './modules/click/click-admin.routes';
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
import telegramRoutes, { telegramPublicRouter } from './modules/telegram/telegram.routes';
import { telegramWebhookRouter } from './modules/telegram/telegram.webhook';
import metadataTemplateRoutes from './modules/metadata/metadata-template.routes';
import appointmentMetadataRoutes from './modules/metadata/appointment-metadata.routes';

const app = express();

// Security Middleware — CSP allowlist. The public origin used to be the
// hardcoded literal "https://banisa.uz" which broke any staging or
// regional deploy whose host differed; now we read it from env so the
// same code ships everywhere. CORS_ORIGIN serves the same role at the
// fetch layer.
const cspConnectExtras = [env.PUBLIC_API_BASE_URL, ...env.CORS_ORIGIN.split(',').map(o => o.trim())]
    .filter((s) => s && s.startsWith('http'));
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
            connectSrc: ["'self'", ...cspConnectExtras],
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

// ─── Healthcheck ────────────────────────────────────────────────────────────
// Three flavors, all under /api/health:
//   GET /api/health          → full status (db ping + uptime + version)
//   GET /api/health/live     → liveness probe, no DB hit (fast)
//   GET /api/health/ready    → readiness probe, returns 503 if DB is down
//
// Used by: nginx upstream check, PM2, external uptime monitors, the
// payment self-tests' "is the backend even up" sanity hint.
const APP_BOOTED_AT = Date.now();
let APP_VERSION = 'unknown';
try {
    APP_VERSION = (require('../package.json')?.version as string) || 'unknown';
} catch { /* non-fatal */ }

app.get('/api/health/live', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
});

app.get('/api/health/ready', async (_req, res) => {
    try {
        const prisma = (await import('./config/database')).default;
        const t0 = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        res.json({ ok: true, dbPingMs: Date.now() - t0, ts: Date.now() });
    } catch {
        res.status(503).json({ ok: false, db: 'down' });
    }
});

app.get('/api/health', async (_req, res) => {
    const payload: any = {
        ok: true,
        ts: Date.now(),
        uptimeSec: Math.floor((Date.now() - APP_BOOTED_AT) / 1000),
        version: APP_VERSION,
        env: process.env.NODE_ENV || 'unknown',
        pid: process.pid,
        node: process.version,
        memory: {
            rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
    };
    try {
        const prisma = (await import('./config/database')).default;
        const t0 = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        payload.db = { ok: true, pingMs: Date.now() - t0 };
    } catch (e: any) {
        payload.ok = false;
        payload.db = { ok: false, error: e?.message?.slice(0, 200) || 'unknown' };
        return res.status(503).json(payload);
    }
    res.json(payload);
});

// Static file serving (uploaded documents, logos, licenses)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user/auth', userAuthRoutes);
// Public Telegram auth endpoints MUST be registered BEFORE the broad
// /api/user mount — that mount applies requireAuth to every nested path,
// so without this earlier registration Express would 401 the public
// miniapp-login + widget-login routes before they could ever run.
app.use('/api/user/auth/telegram', telegramPublicRouter);
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
app.use('/api/click', clickRoutes);
app.use('/api/clinic/payments/click', clickClinicRoutes);
app.use('/api/alif', alifRoutes);
app.use('/api/clinic/payments/alif', alifClinicRoutes);
app.use('/api/clinic/reports', clinicReportsRoutes);
app.use('/api/clinic/team', clinicTeamRoutes);
app.use('/api/clinic/doctors', clinicDoctorsRoutes);
app.use('/api/clinic/ambulances', clinicAmbulancesRoutes);
app.use('/api/clinic/skory-requests', clinicSkoryRequestsRoutes);
app.use('/api/skory', skoryRoutes);
app.use('/api/admin/ambulance-settings', adminAmbulanceSettingsRoutes);
app.use('/api/user/doctor-reviews', doctorReviewsRoutes);
app.use('/api/admin/payme', paymeAdminRoutes);
app.use('/api/admin/click', clickAdminRoutes);
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

// ─── Telegram bot ────────────────────────────────────────────────────────────
// Webhook is mounted BEFORE the JSON body-parser? No — grammy's webhookCallback
// needs req.body (express.json must run first). Our pipeline already parses JSON
// for the entire /api tree, so this is fine.
app.use('/api/telegram', telegramWebhookRouter);
// /api/user/auth/telegram is mounted earlier (before /api/user) so the
// broad requireAuth on userRoutes doesn't shadow it. Duplicate removed.
app.use('/api/user/telegram', telegramRoutes);

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
