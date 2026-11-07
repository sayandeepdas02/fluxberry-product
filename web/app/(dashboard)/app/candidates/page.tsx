'use client';

import { CandidatesView } from '@/components/candidates/candidates-view';

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Candidates</h1>
      <CandidatesView />
    </div>
  );
}
