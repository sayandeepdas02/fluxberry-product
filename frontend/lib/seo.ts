import type { Metadata } from 'next';

/** Strips common markdown syntax so descriptions read as plain text in search/OG previews. */
export function toPlainDescription(markdown: string, maxLength = 160): string {
  return markdown.replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Every auth, dashboard, and token-gated route spreads this into its metadata export. */
export const noIndexMetadata: Metadata = { robots: { index: false, follow: false } };

/** Shared shape for the public marketing detail pages (careers board, job apply page). */
export function publicPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: 'website', url: path },
    twitter: { card: 'summary_large_image', title, description },
  };
}
