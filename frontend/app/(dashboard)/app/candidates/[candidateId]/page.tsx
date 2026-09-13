'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CandidateDetailPanel } from '@/components/candidates/candidate-detail-panel';

/**
 * Full-page fallback for a direct visit, refresh, or shared link to a
 * candidate — the same content as the candidates-list modal overlay (see
 * `@modal/(.)[candidateId]/page.tsx`), just without list context, so there's
 * no prev/next here (spec item 4.1).
 */
export default function CandidateProfilePage() {
  const { candidateId } = useParams<{ candidateId: string }>();

  return (
    <div className="space-y-6">
      <Link href="/app/candidates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Candidates
      </Link>
      <CandidateDetailPanel candidateId={candidateId} />
    </div>
  );
}
