import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { Hero } from '@/components/marketing/landing/hero';
import { ContextSection } from '@/components/marketing/landing/context';
import { FeatureRows } from '@/components/marketing/landing/feature-rows';
import { TrustSection } from '@/components/marketing/landing/trust';
import { ClosingSection } from '@/components/marketing/landing/closing';

const description =
  'Fluxberry scores every applicant on arrival, runs assessments and interviews, and moves your pipeline forward — AI-native applicant tracking for small hiring teams.';

export const metadata: Metadata = {
  description,
  alternates: { canonical: '/' },
  openGraph: { title: publicConfig.appName, description, type: 'website', url: '/' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: publicConfig.appName,
  applicationCategory: 'BusinessApplication',
  description: 'A simple, AI-native applicant tracking system.',
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
