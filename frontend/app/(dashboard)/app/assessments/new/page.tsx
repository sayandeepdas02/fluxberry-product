'use client';

import { AssessmentBuilder } from '@/components/assessments/assessment-builder';
import { useFeature } from '@/hooks/use-features';
import { EmptyState } from '@/components/ui/empty-state';

export default function NewAssessmentPage() {
  const enabled = useFeature('ASSESSMENTS');
  if (!enabled) {
    return <EmptyState title="Assessments are off" description="This feature is coming in a future release." />;
  }
  return <AssessmentBuilder />;
}
