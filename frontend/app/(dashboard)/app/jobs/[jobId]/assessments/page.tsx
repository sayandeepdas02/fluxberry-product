'use client';

import { ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// Per-job assessments are built in Slice 6.
export default function JobAssessmentsPage() {
  return (
    <EmptyState
      icon={<ClipboardCheck />}
      title="Assessments"
      description="Send MCQ assessments to candidates for this job and review their results here."
    />
  );
}
