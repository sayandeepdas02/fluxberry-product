import { unsupportedMediaType } from './errors';

/** Detect a resume file type from its magic bytes (content signature, spec §62). */
export function detectResumeType(buf: Buffer): 'pdf' | 'docx' | 'doc' | null {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  // DOCX (and other OOXML) are ZIP archives -> "PK\x03\x04"
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) return 'docx';
  // Legacy .doc (OLE compound file)
  if (buf.length >= 8 && buf.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1') return 'doc';
  return null;
}

/** Throw unless the file's real content matches an allowed resume type. */
export function assertValidResume(buf: Buffer): 'pdf' | 'docx' | 'doc' {
  const type = detectResumeType(buf);
  if (!type) throw unsupportedMediaType('That file does not look like a valid PDF, DOC, or DOCX');
  return type;
}

/** Detect an image file type from its magic bytes. */
export function detectImageType(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buf.length >= 8 && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/** Throw unless the file's real content matches an allowed image type. */
export function assertValidImage(buf: Buffer): 'png' | 'jpeg' | 'webp' {
  const type = detectImageType(buf);
  if (!type) throw unsupportedMediaType('That file does not look like a valid PNG, JPEG, or WEBP image');
  return type;
}
