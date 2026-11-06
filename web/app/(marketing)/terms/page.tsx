import { LegalPage, legalMetadata } from '@/components/marketing/legal-page';

export const metadata = legalMetadata('terms');

export default function Page() {
  return <LegalPage slug="terms" />;
}
