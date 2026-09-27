'use client';

import { useParams } from 'next/navigation';
import { CandidatesView } from '@/components/candidates/candidates-view';
import { ScreenPendingBanner } from '@/components/jobs/screen-pending-banner';

export default function JobCandidatesPage() {
  const { jobId } = useParams<{ jobId: string }>();
  return (
    <div className="space-y-4">
      <ScreenPendingBanner jobId={jobId} />
      <CandidatesView jobId={jobId} />
    </div>
  );
}
