import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'About Fluxberry: the simplest ATS, built by an indie hacker';

export default function OpengraphImage() {
  return ogImage(<OGLayout headline="Built by an indie hacker" subtitle="Fluxberry is the simplest ATS for lean teams and founders hiring their first people." />);
}
