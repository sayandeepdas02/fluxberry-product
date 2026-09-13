import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { InterviewTake } from '@/components/interview/interview-take';

export const metadata: Metadata = noIndexMetadata;

export default function InterviewTakePage() {
  return <InterviewTake />;
}
