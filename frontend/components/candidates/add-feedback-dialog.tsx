'use client';

import { useState } from 'react';
import { XCircle, ThumbsDown, ThumbsUp, Star } from 'lucide-react';
import type { InterviewFeedbackRating } from '@fluxberry/shared';
import { useCreateInterviewFeedback } from '@/hooks/use-interview-feedback';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const RATINGS: { value: InterviewFeedbackRating; label: string; icon: React.ReactNode }[] = [
  { value: 'STRONG_NO', label: 'Strong No', icon: <XCircle className="size-4" /> },
  { value: 'NO', label: 'No', icon: <ThumbsDown className="size-4" /> },
  { value: 'YES', label: 'Yes', icon: <ThumbsUp className="size-4" /> },
  { value: 'STRONG_YES', label: 'Strong Yes', icon: <Star className="size-4" /> },
];

export function AddFeedbackDialog({
  open,
  onOpenChange,
  applicationId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  applicationId: string;
}) {
  const create = useCreateInterviewFeedback();
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState<InterviewFeedbackRating | null>(null);
  const [notes, setNotes] = useState('');

  const reset = () => {
    setTitle('');
    setRating(null);
    setNotes('');
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Add a title');
      return;
    }
    if (!rating) {
      toast.error('Select an overall rating');
      return;
    }
    try {
      await create.mutateAsync({ applicationId, input: { title: title.trim(), rating, notes: notes.trim() || undefined } });
      toast.success('Feedback added');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add feedback');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">Add feedback</DialogTitle>

        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your answer..." autoFocus />
        </Field>

        <Field label="Overall rating" required>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRating(r.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  rating === r.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {r.icon} {r.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Additional notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Type here..." rows={4} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} loading={create.isPending}>Add feedback</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
