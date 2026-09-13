import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { AssessmentTake } from '@/components/assessments/assessment-take';

export const metadata: Metadata = noIndexMetadata;

export default function AssessmentTakePage() {
  return <AssessmentTake />;
}
