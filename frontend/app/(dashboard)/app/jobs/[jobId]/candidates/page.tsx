'use client';

import { useParams } from 'next/navigation';
import { CandidatesView } from '@/components/candidates/candidates-view';

export default function JobCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  return <CandidatesView jobId={jobId} />;
}
