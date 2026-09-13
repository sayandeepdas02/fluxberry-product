'use client';

import { useState } from 'react';
import { REJECTION_REASONS, type RejectionReason } from '@fluxberry/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export const REASON_LABELS: Record<RejectionReason, string> = {
  NOT_ENOUGH_EXPERIENCE: 'Not enough experience',
  SKILL_MISMATCH: 'Skill mismatch',
  COMPENSATION_MISMATCH: 'Compensation mismatch',
  LOCATION_MISMATCH: 'Location mismatch',
  OTHER: 'Other',
};

/** The single reject flow, shared by the candidate detail panel and any row-level "Reject" action (spec item 4.7). */
export function RejectDialog({
  open,
  onOpenChange,
  onReject,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReject: (reason: RejectionReason, note?: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState<RejectionReason>('OTHER');
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject candidate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Reason">
            <Select value={reason} onValueChange={(v) => setReason(v as RejectionReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{REASON_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Note (internal)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => onReject(reason, note || undefined)} loading={loading}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
