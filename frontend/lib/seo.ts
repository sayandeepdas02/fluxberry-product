import type { Metadata } from 'next';
import { FOUNDER } from './founder';

/**
 * Strips common markdown syntax so descriptions read as plain text in search/OG
 * previews. Only strips markdown *constructs* (links, leading list/heading/quote
 * markers, emphasis) — a global strip of `-` would mangle prose like "AI-native".
 */
export function toPlainDescription(markdown: string, maxLength = 160): string {
  const text = markdown
    .replace(/!?\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/^[#>*-]+\s*/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  // Cut at the last word that fits, so a share preview never ends mid-word ("organised b").
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.—-]+$/, '')}…`;
}

/**
 * The site-wide share image (app/opengraph-image.tsx). When a page sets its own
 * `openGraph`, Next replaces the parent's wholesale, file-based image included,
 * so a page that sets one must list an image or it shares with none (the
 * homepage, articles and legal pages all did). An image set in metadata also
 * overrides a page's own opengraph-image file, so those pages opt out
 * (`ownImage`). Bump `v` whenever the image changes, so X, LinkedIn and Slack
 * fetch the new one instead of their cached copy.
 */
export const DEFAULT_SHARE_IMAGE = {
  url: '/opengraph-image?v=3',
  width: 1200,
  height: 630,
  alt: 'Fluxberry, the AI native hiring platform: its hiring dashboard on the landing page sky',
};

/**
 * Public path of a post's share image (app/(marketing)/blog/[slug]/opengraph-image.tsx),
 * for structured data, which can't read the og:image Next writes. Next suffixes
 * image routes inside a route group with a hash of the route's folder so they
 * can't collide (`getMetadataRouteSuffix` in next/dist/lib/metadata): djb2 of
 * the folder path, base 36, six characters. Update ROUTE if the file moves.
 */
export function postShareImagePath(slug: string): string {
  const ROUTE = '/(marketing)/blog/[slug]';
  let hash = 5381;
  for (let i = 0; i < ROUTE.length; i++) hash = ((hash << 5) + hash + ROUTE.charCodeAt(i)) & 0xffffffff;
  return `/blog/${slug}/opengraph-image-${(hash >>> 0).toString(36).slice(0, 6)}`;
}

/** Every auth, dashboard, and token-gated route spreads this into its metadata export. */
export const noIndexMetadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Shared shape for the public pages (blog, legal pages, careers board, job apply page).
 * Pages with their own opengraph-image file pass `ownImage`: an image set here would
 * override that file.
 */
export function publicPageMetadata({
  title,
  description,
  path,
  ownImage = false,
  siteName,
}: {
  title: string;
  description: string;
  path: string;
  ownImage?: boolean;
  /** Marketing pages pass the brand: previews then carry it ("Blog · Fluxberry") and the X handle. */
  siteName?: string;
}): Metadata {
  const shareTitle = siteName ? `${title} · ${siteName}` : title;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description,
      type: 'website',
      url: path,
      ...(siteName ? { siteName, locale: 'en_US' } : {}),
      ...(ownImage ? {} : { images: [DEFAULT_SHARE_IMAGE] }),
    },
    // No images here: X inherits the page's final og:image, which may be its own file.
    twitter: {
      card: 'summary_large_image',
      ...(siteName ? { site: FOUNDER.xHandle, creator: FOUNDER.xHandle } : {}),
      title: shareTitle,
      description,
    },
  };
}

/** FAQPage structured data for a Q&A list that the page also shows as visible text. */
export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** Serializes JSON-LD for a script tag; `<` is escaped so page text can't close the tag. */
export function jsonLdScript(data: object): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
}
