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

const ALLOWED_QUESTION_FILE_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/webm',
  'video/mp4',
  'video/quicktime',
]);

/**
 * Full public-apply upload: the resume (10MB, PDF/DOC/DOCX) plus any custom
 * FILE_UPLOAD/VIDEO_RECORDING question answers (up to 100MB each, to fit a
 * recorded webcam clip — documents and images are far smaller in practice).
 */
export const applicationUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 11 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'resume') {
      if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
      return cb(unsupportedMediaType('Please upload a PDF, DOC, or DOCX file') as unknown as null, false);
    }
    if (ALLOWED_QUESTION_FILE_MIME.has(file.mimetype)) return cb(null, true);
    cb(unsupportedMediaType('Unsupported file type') as unknown as null, false);
  },
}).fields([
  { name: 'resume', maxCount: 1 },
  { name: 'questionFiles', maxCount: 10 },
]);

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
