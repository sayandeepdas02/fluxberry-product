'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useJobs } from '@/hooks/use-jobs';
import { useConvertContact } from '@/hooks/use-talent-sourcing';

/**
 * The convert-to-candidate bridge: drop one or more sourced contacts into an
 * existing job's pipeline (as `source: SOURCED`). Contacts without a revealed
 * email are skipped and reported.
 */
export function ConvertDialog({
  open,
  onOpenChange,
  contactIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contactIds: string[];
  onDone?: () => void;
}) {
  const [jobId, setJobId] = useState<string>('');
  const { data: jobs } = useJobs({ status: 'all' });
  const convert = useConvertContact();

  useEffect(() => { if (open) setJobId(''); }, [open]);

  const run = async () => {
    if (!jobId) return;
    const results = await Promise.allSettled(
      contactIds.map((contactId) => convert.mutateAsync({ contactId, jobId })),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    if (ok) toast.success(`${ok} contact${ok !== 1 ? 's' : ''} added to the pipeline`);
    if (failed) toast.error(`${failed} skipped — no email to contact`);
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {contactIds.length > 1 ? `${contactIds.length} contacts` : 'contact'} to a job</DialogTitle>
          <DialogDescription>
            Creates a candidate + application in the job&apos;s pipeline, tagged as sourced.
          </DialogDescription>
        </DialogHeader>
        <Field label="Job">
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
            <SelectContent>
              {(jobs ?? []).map((j) => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} loading={convert.isPending} disabled={!jobId}>
            Add to pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
