import type { Metadata } from 'next';
import { publicConfig } from './config';
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
  url: '/opengraph-image?v=2',
  width: 1200,
  height: 630,
  alt: 'Fluxberry, the AI native hiring platform for founders and hiring managers',
};

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
}: {
  title: string;
  description: string;
  path: string;
  ownImage?: boolean;
}): Metadata {
  // Share previews carry the site name, as the tab title does ("Blog · Fluxberry").
  const shareTitle = `${title} · ${publicConfig.appName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shareTitle,
      description,
      type: 'website',
      url: path,
      siteName: publicConfig.appName,
      locale: 'en_US',
      ...(ownImage ? {} : { images: [DEFAULT_SHARE_IMAGE] }),
    },
    // No images here: X inherits the page's final og:image, which may be its own file.
    twitter: { card: 'summary_large_image', site: FOUNDER.xHandle, creator: FOUNDER.xHandle, title: shareTitle, description },
  };
}
