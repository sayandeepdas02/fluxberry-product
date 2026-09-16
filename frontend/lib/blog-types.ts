/**
 * Client-safe half of the blog module: types and pure helpers only.
 *
 * `lib/blog.ts` reads the filesystem, so importing anything from it into a client
 * component drags `node:fs` into the browser bundle and fails the build. Anything
 * both sides need lives here instead.
 */

export type Heading = { id: string; text: string; depth: 2 | 3 };

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  featured: boolean;
  readingTime: number;
};

export type Post = PostMeta & { content: string; headings: Heading[] };

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
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
