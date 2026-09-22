import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { Hero } from '@/components/marketing/landing/hero';
import { FeaturesSection } from '@/components/marketing/landing/features';
import { VideoSection } from '@/components/marketing/landing/video';
import { PricingSection } from '@/components/marketing/pricing';
import { ClosingSection } from '@/components/marketing/landing/closing';

const title = `${publicConfig.appName} - AI Native Hiring Platform`;
const description =
  'Fluxberry AI scores every applicant on arrival, runs assessments and interviews, and moves your pipeline forward. The AI-native hiring platform for small teams.';

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
  description: 'AI Native Hiring Platform. AI-native applicant tracking for small hiring teams.',
  offers: { '@type': 'Offer', category: 'SaaS' },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Hero />
      <FeaturesSection />
      <VideoSection />
      <PricingSection />
      <ClosingSection />
    </>
  );
}
