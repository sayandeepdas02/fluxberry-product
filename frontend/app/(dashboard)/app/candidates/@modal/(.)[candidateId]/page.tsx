'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCandidateListIds } from '../../candidate-list-context';
import { CandidateDetailPanel } from '@/components/candidates/candidate-detail-panel';
import { Sheet, SheetContent, SheetBody, SheetTitle, SheetDescription } from '@/components/ui/sheet';

/**
 * Intercepts navigation to `/app/candidates/[candidateId]` when it originates
 * from within `/app/candidates` (e.g. clicking a table row or board card) and
 * renders it as an overlay on top of the still-mounted list, with prev/next
 * chevrons pinned to the dialog card's own edges — spec item 4.1. A direct
 * visit or refresh bypasses this and hits the real page at
 * `candidates/[candidateId]/page.tsx` instead.
 *
 * The chevrons render inside `SheetContent` (not a sibling portal) so they
 * stay within Radix's focus trap and the dialog's accessibility tree — Tab
 * and screen readers can reach them, not just a mouse. `SheetContent` is
 * itself `position: fixed` with a transform, which makes it the containing
 * block for `position: absolute` descendants, so the chevrons are positioned
 * relative to the card rather than the viewport.
 */
export default function CandidateModal() {
  const router = useRouter();
  const { candidateId } = useParams<{ candidateId: string }>();
  const { ids } = useCandidateListIds();

  const index = ids.indexOf(candidateId);
  const prevId = index > 0 ? ids[index - 1] : undefined;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : undefined;

  const close = () => router.back();
  const navigate = (direction: 'prev' | 'next') => {
    const target = direction === 'prev' ? prevId : nextId;
    // Replace, not push — otherwise closing (Escape/backdrop/X, all router.back())
    // would step back through every candidate visited instead of returning to the list.
    if (target) router.replace(`/app/candidates/${target}`);
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent className="p-0">
        <SheetTitle className="sr-only">Candidate profile</SheetTitle>
        <SheetDescription className="sr-only">Candidate details, screening, and actions</SheetDescription>
        <SheetBody className="pt-10">
          <CandidateDetailPanel
            candidateId={candidateId}
            onNavigate={navigate}
            hasPrev={Boolean(prevId)}
            hasNext={Boolean(nextId)}
          />
        </SheetBody>

        {prevId && (
          <button
            type="button"
            onClick={() => navigate('prev')}
            aria-label="Previous candidate"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background p-2 text-foreground shadow-lg transition hover:bg-accent"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        {nextId && (
          <button
            type="button"
            onClick={() => navigate('next')}
            aria-label="Next candidate"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-background p-2 text-foreground shadow-lg transition hover:bg-accent"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
