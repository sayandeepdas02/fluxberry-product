import { OG_SIZE, OGHeroLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fluxberry, the AI native hiring platform: its hiring dashboard on the landing page sky';

/** Default social share image: the homepage (and pages without their own opengraph-image), with the dashboard as in the hero. */
export default function OpengraphImage() {
  return ogImage(<OGHeroLayout headline="The AI Native Hiring Platform" subtitle="Built for founders & hiring managers." />);
}
