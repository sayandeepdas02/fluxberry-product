'use client';

import type { CandidateDetailState } from '@/hooks/use-candidate-detail';
import { RejectDialog } from '@/components/candidates/reject-dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Kbd } from '@/components/ui/kbd';
import { toast } from '@/components/ui/sonner';

/**
 * "Move to stage" + Shortlist/Reject actions for the active application.
 * Rendered as a plain sibling of the scrollable body content (e.g. inside
 * `SheetFooter`) so it never overlaps content scrolling underneath it.
 */
export function CandidateActionBar({ state }: { state: CandidateDetailState }) {
  const { activeApp, jobStages, doMove, canShortlist, canReject, shortlist, reject, rejectOpen, setRejectOpen } = state;
  if (!activeApp) return null;

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Field label="Move to stage" className="w-44">
        <Select value={activeApp.stage} onValueChange={(v) => doMove(v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(jobStages.data ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="ml-auto flex items-center gap-2">
        {canShortlist && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => shortlist.mutate({ applicationId: activeApp.id }, { onSuccess: () => toast.success('Candidate shortlisted') })}
          >
            Shortlist <Kbd>S</Kbd>
          </Button>
        )}
        {canReject && (
          <Button variant="outline" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setRejectOpen(true)}>
            Reject <Kbd>A</Kbd>
          </Button>
        )}
      </div>

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onReject={(reason, note) =>
          reject.mutate(
            { applicationId: activeApp.id, body: { reason, note } },
            { onSuccess: () => { toast.success('Candidate rejected and notified'); setRejectOpen(false); } },
          )
        }
        loading={reject.isPending}
      />
    </div>
  );
}
