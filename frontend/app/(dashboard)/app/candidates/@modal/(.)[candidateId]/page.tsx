'use client';

import { useParams, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCandidateListIds } from '../../candidate-list-context';
import { CandidateDetailPanel } from '@/components/candidates/candidate-detail-panel';
import { Sheet, SheetContent, SheetBody, SheetTitle, SheetDescription } from '@/components/ui/sheet';

/**
 * Intercepts navigation to `/app/candidates/[candidateId]` when it originates
 * from within `/app/candidates` (e.g. clicking a table row or board card) and
 * renders it as an overlay on top of the still-mounted list, with prev/next
 * chevrons fixed to the screen edges — spec item 4.1. A direct visit or
 * refresh bypasses this and hits the real page at
 * `candidates/[candidateId]/page.tsx` instead.
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
      <SheetContent
        className="p-0"
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement)?.closest?.('[data-candidate-nav]')) e.preventDefault();
        }}
      >
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
      </SheetContent>

      {(prevId || nextId) && (
        // Portaled alongside SheetContent/Overlay so it shares their stacking
        // context. Radix's modal Dialog also sets `pointer-events: none` on
        // <body> while open, re-enabling it only on its own Overlay/Content —
        // pointer-events-auto opts these buttons back in, or clicks pass
        // straight through to the overlay underneath despite the higher z-index.
        <DialogPrimitive.Portal>
          {prevId && (
            <button
              type="button"
              data-candidate-nav
              onClick={() => navigate('prev')}
              aria-label="Previous candidate"
              className="pointer-events-auto fixed left-4 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-border bg-background p-2 text-foreground shadow-lg transition hover:bg-accent"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {nextId && (
            <button
              type="button"
              data-candidate-nav
              onClick={() => navigate('next')}
              aria-label="Next candidate"
              className="pointer-events-auto fixed right-4 top-1/2 z-[60] -translate-y-1/2 rounded-full border border-border bg-background p-2 text-foreground shadow-lg transition hover:bg-accent"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </DialogPrimitive.Portal>
      )}
    </Sheet>
  );
}
