import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
// file-type@16 (last CJS-compatible version) uses a default export with fromBuffer
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer } = require('file-type') as { fromBuffer: (buf: Buffer) => Promise<{ mime: string; ext: string } | undefined> };

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Multer — memory storage with extension pre-filter
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error(`File type not allowed: ${file.originalname}. Only PDF, JPG, PNG, WEBP accepted.`));
    }
    cb(null, true);
  },
});

// Deep content validation — verifies magic bytes, not just MIME header
export const validateFileContent = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.files && !req.file) return next();

  const files: Express.Multer.File[] = req.file
    ? [req.file]
    : Array.isArray(req.files)
      ? (req.files as Express.Multer.File[])
      : Object.values(req.files as { [field: string]: Express.Multer.File[] }).flat();

  for (const file of files) {
    const detected = await fromBuffer(file.buffer);
    if (!detected || !ALLOWED_MIMES.includes(detected.mime)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file content detected in: ${file.originalname}. Only PDF, JPG, PNG accepted.`,
      });
    }
  }

  next();
};
