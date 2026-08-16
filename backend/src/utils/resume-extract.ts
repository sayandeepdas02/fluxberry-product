import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { detectResumeType } from './file-validation';

/**
 * Extract plain text from a resume buffer. Resilient to malformed files
 * (spec §27) — tries the proper parser, then a naive fallback, and never throws
 * for content issues.
 */
export async function extractResumeText(buf: Buffer): Promise<string> {
  const type = detectResumeType(buf);
  if (type === 'pdf') {
    let text = '';
    try {
      const data = await pdfParse(buf);
      text = (data.text ?? '').trim();
    } catch {
      /* fall back below */
    }
    if (text.length < 10) text = naivePdfText(buf);
    return text;
  }
  if (type === 'docx') {
    try {
      const result = await mammoth.extractRawText({ buffer: buf });
      return (result.value ?? '').trim();
    } catch {
      return naivePrintable(buf);
    }
  }
  if (type === 'doc') {
    return naivePrintable(buf);
  }
  return buf.toString('utf8').trim();
}

/** Extract string literals from an uncompressed PDF content stream. */
function naivePdfText(buf: Buffer): string {
  const raw = buf.toString('latin1');
  const parts: string[] = [];
  const re = /\(((?:\\.|[^\\()])*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const s = m[1].replace(/\\([()\\])/g, '$1');
    if (s.trim()) parts.push(s);
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.length >= 10 ? text : naivePrintable(buf);
}

/** Last-resort: printable ASCII runs. */
function naivePrintable(buf: Buffer): string {
  return buf
    .toString('latin1')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
