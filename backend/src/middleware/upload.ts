import multer from 'multer';
import { unsupportedMediaType } from '../utils/errors';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** In-memory single-file resume upload, 10MB cap, PDF/DOC/DOCX only (spec §62). */
export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(unsupportedMediaType('Please upload a PDF, DOC, or DOCX file') as unknown as null, false);
  },
}).single('resume');

const ALLOWED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

/** In-memory single-file logo upload, 1MB cap, PNG/JPEG/WEBP only. */
export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.has(file.mimetype)) cb(null, true);
    else cb(unsupportedMediaType('Please upload a PNG, JPEG, or WEBP image') as unknown as null, false);
  },
}).single('logo');
