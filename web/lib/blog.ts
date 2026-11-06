import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { slugifyHeading, type Faq, type Heading, type Post, type PostMeta } from './blog-types';
import { PLAN_PRICING } from './pricing';
import { toPlainDescription } from './seo';

export type { Faq, Heading, Post, PostMeta } from './blog-types';
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

/**
 * The Q&As under a post's "Frequently asked questions" H2: each H3 is a
 * question, the text up to the next heading its answer. They feed the post's
 * FAQPage structured data, so the markup always says what the page says.
 */
export function extractFaqs(markdown: string): Faq[] {
  const faqs: Faq[] = [];
  let inSection = false;
  let current: { question: string; lines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const answer = toPlainDescription(current.lines.join('\n'), Number.POSITIVE_INFINITY);
    if (answer) faqs.push({ question: current.question, answer });
    current = null;
  };

  for (const line of markdown.split('\n')) {
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      flush();
      inSection = /^(frequently asked questions|faqs?)\b/i.test(cleanInline(h2[1]));
      continue;
    }
    if (!inSection) continue;
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      flush();
      current = { question: cleanInline(h3[1]), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return faqs;
}

/**
 * Posts quote prices as tokens, e.g. `{{price:pro:monthly}}` for "$39", filled in
 * from lib/pricing at build time, so a price change can never leave a post quoting
 * an old price. Write every price in a post this way.
 */
function fillPrices(markdown: string): string {
  return markdown.replace(/\{\{price:(pro|max):(monthly|annual)\}\}/g, (_, plan: string, cycle: 'monthly' | 'annual') => {
    return `$${PLAN_PRICING[plan.toUpperCase() as 'PRO' | 'MAX'][cycle]}`;
  });
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).length;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function parse(slug: string, raw: string): Post {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const yaml = require('js-yaml');
  const { data, content: source } = matter(raw, {
    engines: { yaml: { parse: (s: string) => yaml.load(s) as Record<string, unknown> } },
  });
  const content = fillPrices(source);
  const date = String(data.date ?? '');
  const wordCount = countWords(content);
  return {
    slug,
    title: String(data.title ?? slug),
    ...(data.metaTitle ? { metaTitle: String(data.metaTitle) } : {}),
    description: String(data.description ?? ''),
    date,
    updated: String(data.updated ?? date),
    author: String(data.author ?? 'Sayandeep Das'),
    category: String(data.category ?? 'Product'),
    keywords: stringList(data.keywords),
    featured: Boolean(data.featured),
    readingTime: Math.max(1, Math.round(wordCount / 220)),
    content,
    headings: extractHeadings(content),
    takeaways: stringList(data.takeaways).map(fillPrices),
    faqs: extractFaqs(content),
    wordCount,
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

function toMeta(post: Post): PostMeta {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, headings, takeaways, faqs, wordCount, ...meta } = post;
  return meta;
}

export function getAllPosts(): PostMeta[] {
  return loadAll().map(toMeta);
}

/**
 * Posts to read next: the same category first, then those sharing the most
 * target keywords, newest first on a tie. Every article links to a few others,
 * so no post is an orphan that crawlers only reach from the index.
 */
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const all = loadAll();
  const post = all.find((p) => p.slug === slug);
  if (!post) return [];
  const keywords = new Set(post.keywords.map((k) => k.toLowerCase()));
  const score = (other: Post) =>
    (other.category === post.category ? 10 : 0) + other.keywords.filter((k) => keywords.has(k.toLowerCase())).length;

  return all
    .filter((other) => other.slug !== slug)
    .map((other, index) => ({ other, index, score: score(other) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ other }) => toMeta(other));
}

export function getPost(slug: string): Post | null {
  return loadAll().find((post) => post.slug === slug) ?? null;
}

export function getCategories(): string[] {
  return Array.from(new Set(loadAll().map((post) => post.category)));
}
