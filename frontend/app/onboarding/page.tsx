import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';

export const metadata: Metadata = noIndexMetadata;

export default function OnboardingPage() {
  return <OnboardingForm />;
}
