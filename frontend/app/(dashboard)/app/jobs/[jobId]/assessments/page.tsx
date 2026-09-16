'use client';

import { useParams } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { useJobAssessments } from '@/hooks/use-assessments';
import { useFeature } from '@/hooks/use-features';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { JobAssessmentsTable } from '@/components/candidates/job-assessments-table';

export default function JobAssessmentsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const enabled = useFeature('ASSESSMENTS');
  const { data, isLoading } = useJobAssessments(jobId);

  if (!enabled) {
    return <EmptyState icon={<ClipboardCheck />} title="Assessments are off" description="This feature is coming in a future release." />;
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck />}
        title="No assessments sent yet"
        description="Send an assessment to a candidate from their profile to see results here."
      />
    );
  }

  return <JobAssessmentsTable items={data} />;
}
