import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload dirs exist
['uploads', 'uploads/logos', 'uploads/licenses', 'uploads/certificates', 'uploads/services'].forEach(dir => {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'logo') {
      cb(null, path.join(UPLOAD_DIR, 'logos'));
    } else if (file.fieldname === 'licenseFile') {
      cb(null, path.join(UPLOAD_DIR, 'licenses'));
    } else {
      cb(null, path.join(UPLOAD_DIR, 'certificates'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|pdf|svg|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error(`Fayl turi qo'llab-quvvatlanmaydi: ${file.mimetype}`));
  }
};

export const clinicRegistrationUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 12,                   // 1 logo + 1 license + 10 certificates
  },
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'licenseFile', maxCount: 1 },
  { name: 'certificates', maxCount: 10 },
]);

// ─── Service image upload ───────────────────────────────────────────────────
const serviceImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'services'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `service-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const serviceImageUpload = multer({
  storage: serviceImageStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max per image
    files: 1,
  },
}).single('image');
