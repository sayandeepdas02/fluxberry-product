import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { Hero } from '@/components/marketing/landing/hero';
import { ContextSection } from '@/components/marketing/landing/context';
import { FeatureRows } from '@/components/marketing/landing/feature-rows';
import { TrustSection } from '@/components/marketing/landing/trust';
import { ClosingSection } from '@/components/marketing/landing/closing';

const title = `${publicConfig.appName} - AI Native Hiring Platform`;
const description =
  'Fluxberry AI scores every applicant on arrival, runs assessments and interviews, and moves your pipeline forward — the AI-native hiring platform for small teams.';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's `%s · Fluxberry AI` template — this
  // title already states the tagline in full and shouldn't get the suffix appended.
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
  description: 'AI Native Hiring Platform — AI-native applicant tracking for small hiring teams.',
  offers: { '@type': 'Offer', category: 'SaaS' },
};

export default function LandingPage() {
  const [latest] = getAllPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Hero announcement={latest ? { href: `/blog/${latest.slug}`, title: latest.title } : undefined} />
      <ContextSection />
      <FeatureRows />
      <TrustSection />
      <ClosingSection />
    </>
  );
}
