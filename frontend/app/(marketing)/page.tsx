import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { Hero } from '@/components/marketing/landing/hero';
import { ProductSection } from '@/components/marketing/landing/product-section';
import { SolutionsSection } from '@/components/marketing/landing/solutions-section';
import { PricingSection } from '@/components/marketing/landing/pricing-section';
import { FaqSection } from '@/components/marketing/landing/faq-section';

const title = `${publicConfig.appName} - AI Native Hiring Platform`;
const description =
  'Fluxberry AI scores every applicant against your job, runs your pipeline and careers page, and helps you source candidates. The AI native hiring platform for founders and hiring managers.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { title, description, type: 'website', url: '/' },
  twitter: { card: 'summary_large_image', title, description },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: publicConfig.appName,
  applicationCategory: 'BusinessApplication',
  description: 'AI Native Hiring Platform. AI-native applicant tracking for founders and hiring managers.',
  offers: { '@type': 'Offer', category: 'SaaS' },
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
