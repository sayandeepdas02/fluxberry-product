'use client';

import { useCandidateDetail } from '@/hooks/use-candidate-detail';
import { CandidateDetailBody } from '@/components/candidates/candidate-detail-body';
import { CandidateActionBar } from '@/components/candidates/candidate-action-bar';

/**
 * The full candidate profile — body content plus the "Move to stage" action
 * bar — for the full-page route (`candidates/[candidateId]/page.tsx`, used
 * for direct/deep links), where there's a single page-level scroll region so
 * the action bar can safely sit in normal flow below the body.
 *
 * The modal overlay (`@modal/(.)[candidateId]/page.tsx`) has its own inner
 * scroll region (`SheetBody`), so it calls `useCandidateDetail` directly and
 * renders `CandidateDetailBody`/`CandidateActionBar` as siblings of that
 * scroll container instead of using this wrapper — that's what keeps the
 * action bar from overlapping scrolling content there.
 */
export function CandidateDetailPanel({
  candidateId,
  onNavigate,
  hasPrev = false,
  hasNext = false,
  hotkeysEnabled = true,
}: {
  candidateId: string;
  /** Move to the previous/next candidate in the list this panel was opened from (modal context only). */
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  hotkeysEnabled?: boolean;
}) {
  const state = useCandidateDetail(candidateId, { onNavigate, hasPrev, hasNext, hotkeysEnabled });

  return (
    <div className="space-y-6">
      <CandidateDetailBody state={state} />
      {state.activeApp && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <CandidateActionBar state={state} />
        </div>
      )}
    </div>
  );
}
