import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fluxberry, the AI native hiring platform for founders and hiring managers';

/** Default social share image: the homepage and every page without its own opengraph-image. */
export default function OpengraphImage() {
  return ogImage(<OGLayout headline="The AI Native Hiring Platform" subtitle="Built for founders & hiring managers." />);
}
