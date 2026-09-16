'use client';

import { useParams } from 'next/navigation';
import { useAssessment } from '@/hooks/use-assessments';
import { useFeature } from '@/hooks/use-features';
import { AssessmentBuilder } from '@/components/assessments/assessment-builder';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function EditAssessmentPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const enabled = useFeature('ASSESSMENTS');
  const { data: assessment, isLoading } = useAssessment(assessmentId);
  if (!enabled) {
    return <EmptyState title="Assessments are off" description="This feature is coming in a future release." />;
  }
  if (isLoading || !assessment) return <Skeleton className="h-96 w-full" />;
  return <AssessmentBuilder initial={assessment} />;
}
