#!/usr/bin/env node
/**
 * Checks every post in content/blog against the blog's SEO rules
 * (docs/blog-seo-playbook.md): `npm run blog:check`, or pass slugs to check
 * only those. Errors break the page or the markup and exit 1; warnings are
 * the playbook's targets, worth fixing before a post ships.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const POSTS_DIR = path.join(ROOT, 'content/blog');
const PUBLIC_DIR = path.join(ROOT, 'public');
const TITLE_SUFFIX = ' · Fluxberry';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const slugs = fs
  .readdirSync(POSTS_DIR)
  .filter((file) => file.endsWith('.md'))
  .map((file) => file.replace(/\.md$/, ''));
const only = process.argv.slice(2);
const registry = fs.readFileSync(path.join(ROOT, 'components/marketing/blog/covers/registry.tsx'), 'utf8');
const pricing = fs.readFileSync(path.join(ROOT, 'lib/pricing.ts'), 'utf8');
const planPrices = [...pricing.matchAll(/(?:monthly|annual):\s*(\d+)/g)].map((m) => m[1]);

/** Markdown with fenced code blanked out (line count kept), so examples inside code blocks aren't checked. */
function stripFences(markdown) {
  return markdown.replace(/^(```|~~~)[\s\S]*?^\1/gm, (block) => block.replace(/[^\n]/g, ''));
}

function plain(text) {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
}

function check(slug) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  const body = stripFences(content);
  const lines = body.split('\n');
  // Report file line numbers: the body starts after the front matter.
  const offset = raw.split('\n').length - lines.length;
  const errors = [];
  const warnings = [];

  // Front matter.
  for (const field of ['title', 'description', 'date', 'category']) {
    if (!data[field]) errors.push(`front matter is missing \`${field}\``);
  }
  const date = String(data.date ?? '');
  const updated = String(data.updated ?? date);
  if (date && !ISO_DATE.test(date)) errors.push(`date "${date}" is not YYYY-MM-DD`);
  if (data.updated && !ISO_DATE.test(updated)) errors.push(`updated "${updated}" is not YYYY-MM-DD`);
  if (updated < date) errors.push(`updated (${updated}) is before date (${date})`);

  const titleTag = `${data.metaTitle ?? data.title ?? ''}${TITLE_SUFFIX}`;
  if (titleTag.length > 60) {
    warnings.push(`title tag is ${titleTag.length} chars with the suffix (aim ≤ 60): add a shorter \`metaTitle\``);
  }
  const description = String(data.description ?? '');
  if (description && (description.length < 120 || description.length > 160)) {
    warnings.push(`description is ${description.length} chars (aim 120–160)`);
  }
  const keywords = Array.isArray(data.keywords) ? data.keywords.map(String) : [];
  if (keywords.length === 0) warnings.push('no `keywords`: list the primary search term first');
  if (!Array.isArray(data.takeaways) || data.takeaways.length === 0) {
    warnings.push('no `takeaways`: add 3–5 answer-first bullets');
  }
  if (!registry.includes(`'${slug}':`)) warnings.push('no cover in covers/registry.tsx (it gets the fallback cover)');

  // Headings.
  let previous = 1;
  let faqQuestions = -1;
  let inFaq = false;
  const h2s = [];
  lines.forEach((line, index) => {
    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!match) return;
    const depth = match[1].length;
    const text = plain(match[2]);
    const at = `line ${index + 1 + offset}`;
    if (depth === 1) errors.push(`${at}: an H1 in the body (the title is the page's only H1)`);
    if (depth > previous + 1) errors.push(`${at}: H${depth} "${text}" skips a level after H${previous}`);
    if (depth >= 4) warnings.push(`${at}: H${depth} "${text}" is left out of the table of contents; use H2/H3`);
    if (depth === 2) {
      h2s.push(text);
      inFaq = /^(frequently asked questions|faqs?)\b/i.test(text);
      if (inFaq) faqQuestions = 0;
    } else if (depth === 3 && inFaq) {
      faqQuestions += 1;
    }
    previous = depth;
  });
  if (faqQuestions < 0) warnings.push('no "Frequently asked questions" H2 (it feeds the FAQPage markup)');
  else if (faqQuestions < 3) warnings.push(`FAQ has ${faqQuestions} question(s) (aim 4–6, each an H3)`);

  // Links.
  const links = [...body.matchAll(/(?<!!)\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)].map((m) => m[1]);
  const blogLinks = links.filter((href) => href.startsWith('/blog/'));
  for (const href of blogLinks) {
    const target = href.replace(/^\/blog\//, '').split(/[#?]/)[0];
    if (!slugs.includes(target)) errors.push(`broken internal link ${href}`);
  }
  const otherPosts = new Set(blogLinks.map((href) => href.split(/[#?]/)[0]).filter((href) => href !== `/blog/${slug}`));
  if (otherPosts.size < 2) warnings.push(`links to ${otherPosts.size} other post(s) (aim ≥ 2)`);
  if (!links.some((href) => /^https?:\/\//.test(href))) {
    warnings.push('no external links: cite sources (pricing pages, docs, research)');
  }

  // Images.
  for (const [, alt, src] of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) {
    if (!alt.trim()) errors.push(`image ${src} has no alt text`);
    else if (alt.length > 125) warnings.push(`image ${src}: alt text is ${alt.length} chars (aim ≤ 125)`);
    if (src.startsWith('/')) {
      if (!fs.existsSync(path.join(PUBLIC_DIR, src.split(/[?#]/)[0]))) errors.push(`image ${src} is not in public/`);
      if (!src.startsWith(`/blog/${slug}/`)) warnings.push(`image ${src} should live in public/blog/${slug}/`);
      if (!/^[a-z0-9]+(-[a-z0-9]+)+\.(webp|png|jpe?g|svg|gif)$/.test(path.basename(src))) {
        warnings.push(`image ${src}: use a descriptive kebab-case file name`);
      }
    }
  }

  // Content.
  const words = content.trim().split(/\s+/).length;
  if (words < 1500) warnings.push(`${words} words (aim ≥ 1,500; comparison guides 2,500+)`);
  const primary = keywords[0]?.toLowerCase();
  if (primary) {
    const opening = plain(body).split(/\s+/).slice(0, 120).join(' ').toLowerCase();
    if (!String(data.title ?? '').toLowerCase().includes(primary) && !String(data.metaTitle ?? '').toLowerCase().includes(primary)) {
      warnings.push(`primary keyword "${primary}" is not in the title`);
    }
    if (!opening.includes(primary)) warnings.push(`primary keyword "${primary}" is not in the first 120 words`);
    if (!h2s.some((h) => h.toLowerCase().includes(primary))) warnings.push(`primary keyword "${primary}" is in no H2`);
  }
  lines.forEach((line, index) => {
    for (const price of planPrices) {
      if (new RegExp(`\\$${price}\\b`).test(line)) {
        warnings.push(`line ${index + 1 + offset}: "$${price}" looks like a Fluxberry price; write it as a {{price:…}} token`);
      }
    }
    if (/\bfree\b/i.test(line)) warnings.push(`line ${index + 1 + offset}: says "free"; Fluxberry has no free plan, check the context`);
  });

  return { errors, warnings };
}

let errorCount = 0;
let warningCount = 0;
for (const slug of only.length > 0 ? only : slugs) {
  if (!slugs.includes(slug)) {
    console.error(`✗ ${slug}: no content/blog/${slug}.md`);
    errorCount += 1;
    continue;
  }
  const { errors, warnings } = check(slug);
  errorCount += errors.length;
  warningCount += warnings.length;
  const mark = errors.length > 0 ? '✗' : warnings.length > 0 ? '△' : '✓';
  console.log(`${mark} ${slug}`);
  for (const message of errors) console.log(`    error    ${message}`);
  for (const message of warnings) console.log(`    warning  ${message}`);
}
console.log(`\n${errorCount} error(s), ${warningCount} warning(s)`);
process.exit(errorCount > 0 ? 1 : 0);
