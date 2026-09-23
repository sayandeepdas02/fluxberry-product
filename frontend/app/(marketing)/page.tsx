import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { Hero02 } from '@/components/ui/hero-02';
import Feature08 from '@/components/ui/feature-08';
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
      <Hero02
        title="The #1 AI Native"
        titleLine2="Hiring Platform"
        description="Fluxberry AI scores every applicant on arrival, runs assessments and interviews, and moves your pipeline forward. Built for founders & hiring managers."
        washImage="https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80"
        animation="subtle"
      />
      <Feature08 />
      <PricingSection />
      <ClosingSection />
    </>
  );
}
