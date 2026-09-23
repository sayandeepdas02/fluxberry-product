import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import { slugifyHeading, type Heading, type Post, type PostMeta } from './blog-types';

export type { Heading, Post, PostMeta } from './blog-types';
export { slugifyHeading, formatPostDate } from './blog-types';

/**
 * File-based blog. Posts are markdown files in `content/blog`, read at build time
 * (every blog route is statically generated), so there is no CMS, no database
 * call, and no runtime filesystem access in production. Server-only by virtue of
 * `node:fs` — importing it from a client component fails the build.
 */

const POSTS_DIR = path.join(process.cwd(), 'content/blog');

/** Strips markdown that would otherwise show up as literal characters in a heading. */
function cleanInline(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  let fenceMarker = '';
  const slugCounts = new Map<string, number>();

  for (const line of markdown.split('\n')) {
    const trimmed = line.trimStart();
    if (!inFence && (trimmed.startsWith('```') || trimmed.startsWith('~~~'))) {
      inFence = true;
      fenceMarker = trimmed.startsWith('```') ? '```' : '~~~';
      continue;
    }
    if (inFence && trimmed.startsWith(fenceMarker)) {
      inFence = false;
      fenceMarker = '';
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.*)$/.exec(line);
    if (!match) continue;

    const text = cleanInline(match[2]);
    const slug = slugifyHeading(text);
    const count = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, count + 1);
    const id = count === 0 ? slug : `${slug}-${count}`;
    headings.push({ id, text, depth: match[1].length as 2 | 3 });
  }
  return headings;
}

function readingTimeMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function parse(slug: string, raw: string): Post {
  const { data, content } = matter(raw, {
    engines: { yaml: { parse: (s: string) => yaml.load(s) as Record<string, unknown> } },
  });
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    date: String(data.date ?? ''),
    author: String(data.author ?? 'Fluxberry'),
    category: String(data.category ?? 'Product'),
    featured: Boolean(data.featured),
    readingTime: readingTimeMinutes(content),
    content,
    headings: extractHeadings(content),
  };
}

function loadAll(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md'))
    .map((file) => parse(file.replace(/\.md$/, ''), fs.readFileSync(path.join(POSTS_DIR, file), 'utf8')))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllPosts(): PostMeta[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return loadAll().map(({ content, headings, ...meta }) => meta);
}

export function getPost(slug: string): Post | null {
  return loadAll().find((post) => post.slug === slug) ?? null;
}

export function getCategories(): string[] {
  return Array.from(new Set(loadAll().map((post) => post.category)));
}
