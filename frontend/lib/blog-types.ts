/**
 * Client-safe half of the blog module: types and pure helpers only.
 *
 * `lib/blog.ts` reads the filesystem, so importing anything from it into a client
 * component drags `node:fs` into the browser bundle and fails the build. Anything
 * both sides need lives here instead.
 */

export type Heading = { id: string; text: string; depth: 2 | 3 };

/** A question and answer from a post's "Frequently asked questions" section, as plain text. */
export type Faq = { question: string; answer: string };

export type PostMeta = {
  slug: string;
  /** The on-page H1. */
  title: string;
  /**
   * The <title> tag when it should differ from the H1, e.g. to lead with the
   * search term or fit Google's ~60 characters once " · Fluxberry" is added.
   */
  metaTitle?: string;
  description: string;
  date: string;
  /** Last substantive revision (ISO date); equals `date` for a post never revised. */
  updated: string;
  author: string;
  category: string;
  /** The search terms the post targets, primary first. */
  keywords: string[];
  featured: boolean;
  readingTime: number;
};

export type Post = PostMeta & {
  content: string;
  headings: Heading[];
  /** Short answer-first summary shown above the body ("Key takeaways"). */
  takeaways: string[];
  faqs: Faq[];
  wordCount: number;
};

/**
 * One slug implementation, used by both the table of contents and the markdown
 * renderer — if they ever diverged, every anchor link would quietly break.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatPostDate(date: string): string {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
