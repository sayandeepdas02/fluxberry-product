'use client';

import { useState } from 'react';
import { useAssessments, useSendAssessment } from '@/hooks/use-assessments';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

export function SendAssessmentDialog({
  applicationId,
  open,
  onOpenChange,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: assessments } = useAssessments();
  const send = useSendAssessment();
  const [assessmentId, setAssessmentId] = useState('');

  const published = (assessments ?? []).filter((a) => a.status === 'PUBLISHED');

  const submit = () => {
    if (!assessmentId) return;
    send.mutate(
      { applicationId, input: { assessmentId, expiresInHours: 168 } },
      {
        onSuccess: () => {
          toast.success('Assessment sent');
          onOpenChange(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not send'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send assessment</DialogTitle></DialogHeader>
        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published assessments yet. Create and publish one in Assessments first.
          </p>
        ) : (
          <Field label="Assessment">
            <Select value={assessmentId} onValueChange={setAssessmentId}>
              <SelectTrigger><SelectValue placeholder="Choose an assessment" /></SelectTrigger>
              <SelectContent>
                {published.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} · {a.questionCount} questions</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!assessmentId} loading={send.isPending}>Send</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
