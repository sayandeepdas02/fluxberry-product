import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * Legal pages (privacy, terms, cookies, refunds). Like the blog, each is a
 * markdown file in `content/legal`, read at build time, so the wording can be
 * edited without touching components. Server-only by virtue of `node:fs`.
 */

const LEGAL_DIR = path.join(process.cwd(), 'content/legal');

export type LegalSlug = 'privacy' | 'terms' | 'cookies' | 'refund-policy';

export interface LegalDoc {
  title: string;
  description: string;
  /** ISO date the document last changed. */
  updated: string;
  content: string;
}

export function getLegalDoc(slug: LegalSlug): LegalDoc {
  const { data, content } = matter(fs.readFileSync(path.join(LEGAL_DIR, `${slug}.md`), 'utf8'));
  return {
    title: String(data.title),
    description: String(data.description),
    updated: String(data.updated),
    content,
  };
}
