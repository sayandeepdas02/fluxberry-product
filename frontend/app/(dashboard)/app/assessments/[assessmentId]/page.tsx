'use client';

import { useParams } from 'next/navigation';
import { useAssessment } from '@/hooks/use-assessments';
import { AssessmentBuilder } from '@/components/assessments/assessment-builder';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditAssessmentPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const { data: assessment, isLoading } = useAssessment(assessmentId);
  if (isLoading || !assessment) return <Skeleton className="h-96 w-full" />;
  return <AssessmentBuilder initial={assessment} />;
}
