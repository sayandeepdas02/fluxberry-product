import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICING } from '@/lib/pricing';
import { faqJsonLd, jsonLdScript, publicPageMetadata } from '@/lib/seo';
import { PricingSection } from '@/components/marketing/landing/pricing-section';
import { FaqSection } from '@/components/marketing/landing/faq-section';
import { BRAND, FAQ } from '@/components/marketing/landing/content';

export const metadata: Metadata = publicPageMetadata({
  title: 'Pricing',
  description: `Fluxberry pricing: Pro at $${PLAN_PRICING.PRO.monthly}/month and Max at $${PLAN_PRICING.MAX.monthly}/month, with unlimited jobs, candidates and team members.`,
  path: '/pricing',
  ownImage: true,
  siteName: BRAND,
});

const plans = (['PRO', 'MAX'] as const).map((plan) => ({
  '@type': 'Offer',
  name: `${BRAND} ${PLAN_LABELS[plan]}`,
  description: PLAN_FEATURES[plan].join(', '),
  priceCurrency: 'USD',
  price: PLAN_PRICING[plan].monthly,
  url: `${publicConfig.appUrl}/pricing`,
}));

const jsonLd = {
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: BRAND,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: plans,
    },
    faqJsonLd(FAQ.items),
  ],
};

/** Public pricing page: the landing's plan cards, then the FAQ. Prices come from lib/pricing. */
export default function PricingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <PricingSection titleAs="h1" className="pt-[140px] tablet:pt-[200px]" />
      <FaqSection />
    </>
  );
}
