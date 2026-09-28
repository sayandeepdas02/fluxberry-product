import { OG_SIZE, OGLayout, ogImage } from '@/lib/og-image';
import { PLAN_PRICING } from '@/lib/pricing';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Fluxberry pricing: Pro and Max plans';

/** Prices come from lib/pricing, so this card can't drift from the pricing section. */
export default function OpengraphImage() {
  return ogImage(
    <OGLayout
      headline="Simple, transparent pricing"
      subtitle={`Pro from $${PLAN_PRICING.PRO.monthly}/month. Max from $${PLAN_PRICING.MAX.monthly}/month.`}
    />,
  );
}
