import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { DEFAULT_SHARE_IMAGE } from '@/lib/seo';
import { PLAN_PRICING } from '@/lib/pricing';
import { FOUNDER } from '@/lib/founder';
import { Hero } from '@/components/marketing/landing/hero';
import { ProductSection } from '@/components/marketing/landing/product-section';
import { SolutionsSection } from '@/components/marketing/landing/solutions-section';
import { PricingSection } from '@/components/marketing/landing/pricing-section';
import { FaqSection } from '@/components/marketing/landing/faq-section';
import { BRAND } from '@/components/marketing/landing/content';

const title = `${BRAND} - AI Native Hiring Platform`;
const description =
  'Fluxberry scores every applicant against your job, runs your pipeline and careers page, and helps you source candidates. The AI native hiring platform for founders and hiring managers.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { title, description, type: 'website', url: '/', siteName: BRAND, locale: 'en_US', images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: 'summary_large_image', site: FOUNDER.xHandle, creator: FOUNDER.xHandle, title, description },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: BRAND,
  applicationCategory: 'BusinessApplication',
  description: 'AI Native Hiring Platform. AI-native applicant tracking for founders and hiring managers.',
  // The plans' monthly prices, from lib/pricing, so search results can't show a stale price.
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: PLAN_PRICING.PRO.monthly,
    highPrice: PLAN_PRICING.MAX.monthly,
    offerCount: 2,
    url: `${publicConfig.appUrl}/#pricing`,
  },
};

/** The public landing page, converted from the Framer design (sections top to bottom). */
export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Hero />
      <ProductSection />
      <SolutionsSection />
      <PricingSection />
      <FaqSection />
    </>
  );
}
