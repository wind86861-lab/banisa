import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'images');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});

const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
};

const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.post(
    '/image',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    upload.single('image'),
    (req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const url = `/uploads/images/${req.file.filename}`;
        res.json({ success: true, data: { url } });
    }
);

// ─── PDF Upload ────────────────────────────────────────────────────────────────
const pdfDir = path.join(process.cwd(), 'uploads', 'docs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

const pdfStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, pdfDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, name);
    },
});

const pdfFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are allowed'));
    }
};

const uploadPdf = multer({ storage: pdfStorage, fileFilter: pdfFilter, limits: { fileSize: 20 * 1024 * 1024 } });

router.post(
    '/pdf',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    uploadPdf.single('file'),
    (req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        const url = `/uploads/docs/${req.file.filename}`;
        res.json({ success: true, data: { url } });
    }
);

// ─── Service Images Upload (Multiple) ──────────────────────────────────────────
router.post(
    '/service-images',
    requireAuth,
    requireRole(['CLINIC_ADMIN']),
    upload.array('images', 10),
    (req: Request, res: Response, next: NextFunction) => {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'No files uploaded' });
            return;
        }
        const urls = files.map(file => `/uploads/images/${file.filename}`);
        res.json({ success: true, data: { urls } });
    }
);

export default router;
