'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCandidateListIds } from '../../candidate-list-context';
import { useCandidateDetail } from '@/hooks/use-candidate-detail';
import { CandidateDetailBody } from '@/components/candidates/candidate-detail-body';
import { CandidateActionBar } from '@/components/candidates/candidate-action-bar';
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription } from '@/components/ui/sheet';

/**
 * Intercepts navigation to `/app/candidates/[candidateId]` when it originates
 * from within `/app/candidates` (e.g. clicking a table row or board card) and
 * renders it as an overlay on top of the still-mounted list, with prev/next
 * navigation in a header toolbar — spec item 4.1. A direct visit or refresh
 * bypasses this and hits the real page at `candidates/[candidateId]/page.tsx`
 * instead.
 *
 * The prev/next controls live in a visible `SheetHeader` row (rather than
 * floating absolutely over the card, which used to land them on top of the
 * "Interviews" card at the card's vertical midpoint) so they stay within
 * Radix's focus trap and the dialog's accessibility tree, and never overlap
 * body content.
 *
 * The body and the "Move to stage" action bar are rendered as siblings —
 * body inside `SheetBody` (the scrollable region), action bar inside
 * `SheetFooter` (a fixed, non-scrolling sibling) — via `useCandidateDetail`
 * directly, rather than the single-`div` `CandidateDetailPanel` used by the
 * full-page route. That's what keeps the action bar from overlapping content
 * still scrolling underneath it.
 */
export default function CandidateModal() {
  const router = useRouter();
  const { candidateId } = useParams<{ candidateId: string }>();
  const { ids } = useCandidateListIds();

  const index = ids.indexOf(candidateId);
  const prevId = index > 0 ? ids[index - 1] : undefined;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : undefined;
  const showNav = index >= 0 && ids.length > 1;

  const close = () => router.back();
  const navigate = (direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? prevId : nextId;
    // Replace, not push — otherwise closing (Escape/backdrop/X, all router.back())
    // would step back through every candidate visited instead of returning to the list.
    if (target) router.replace(`/app/candidates/${target}`);
  };

  const state = useCandidateDetail(candidateId, { onNavigate: navigate, hasPrev: Boolean(prevId), hasNext: Boolean(nextId) });

  return (
    <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent className="p-0">
        <SheetTitle className="sr-only">Candidate profile</SheetTitle>
        <SheetDescription className="sr-only">Candidate details, screening, and actions</SheetDescription>

        {showNav && (
          <SheetHeader>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('prev')}
                disabled={!prevId}
                aria-label="Previous candidate"
                className="rounded-md p-1.5 text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {index + 1} of {ids.length}
              </span>
              <button
                type="button"
                onClick={() => navigate('next')}
                disabled={!nextId}
                aria-label="Next candidate"
                className="rounded-md p-1.5 text-foreground transition hover:bg-accent disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </SheetHeader>
        )}

        <SheetBody className={showNav ? undefined : 'pt-10'}>
          <CandidateDetailBody state={state} />
        </SheetBody>

        {state.activeApp && (
          <SheetFooter>
            <CandidateActionBar state={state} />
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
