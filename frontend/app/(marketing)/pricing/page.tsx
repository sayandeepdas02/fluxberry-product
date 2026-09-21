import type { Metadata } from 'next';
import { publicConfig } from '@/lib/config';
import { PricingSection } from '@/components/marketing/pricing';
import { ClosingSection } from '@/components/marketing/landing/closing';

const title = `Pricing · ${publicConfig.appName}`;
const description =
  'Simple, transparent pricing. Start free and upgrade to Pro when you need advanced analytics, bulk import, GDPR tools, and webhooks.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/pricing' },
  openGraph: { title, description, type: 'website', url: '/pricing' },
  twitter: { card: 'summary_large_image', title, description },
};

export default function PricingPage() {
  return (
    <>
      <PricingSection />
      <ClosingSection />
    </>
  );
}
