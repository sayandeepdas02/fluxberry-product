import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'The Fluxberry blog: insights on hiring AI talent';

export default function OpengraphImage() {
  return ogImage(<OGLayout headline="Insights on hiring AI Talent" subtitle="Case studies, discussions and notes from the Fluxberry blog." />);
}
