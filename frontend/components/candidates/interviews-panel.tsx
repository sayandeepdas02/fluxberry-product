'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarPlus, Plus, Calendar, MapPin, Video, Trash2, XCircle, ThumbsDown, ThumbsUp, Star } from 'lucide-react';
import type { InterviewFeedbackRating } from '@/lib/shared';
import { useScheduledInterviews, useDeleteScheduledInterview } from '@/hooks/use-scheduled-interviews';
import { useInterviewFeedback } from '@/hooks/use-interview-feedback';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { ScheduleInterviewDialog } from './schedule-interview-dialog';
import { AddFeedbackDialog } from './add-feedback-dialog';

const RATING_STYLES: Record<InterviewFeedbackRating, { label: string; icon: React.ReactNode; className: string }> = {
  STRONG_NO: { label: 'Strong No', icon: <XCircle className="size-3.5" />, className: 'bg-destructive/10 text-destructive' },
  NO: { label: 'No', icon: <ThumbsDown className="size-3.5" />, className: 'bg-destructive/10 text-destructive' },
  YES: { label: 'Yes', icon: <ThumbsUp className="size-3.5" />, className: 'bg-success/10 text-success' },
  STRONG_YES: { label: 'Strong Yes', icon: <Star className="size-3.5" />, className: 'bg-success/10 text-success' },
};

export function InterviewsPanel({
  applicationId,
  candidateName,
  candidateEmail,
  onDialogOpenChange,
}: {
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  /** Lets the parent panel suppress its keyboard shortcuts while either dialog here is open. */
  onDialogOpenChange?: (open: boolean) => void;
}) {
  const { data: interviews, isLoading: loadingInterviews } = useScheduledInterviews(applicationId);
  const { data: feedback, isLoading: loadingFeedback } = useInterviewFeedback(applicationId);
  const deleteInterview = useDeleteScheduledInterview();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    onDialogOpenChange?.(scheduleOpen || feedbackOpen);
  }, [scheduleOpen, feedbackOpen, onDialogOpenChange]);

  const isLoading = loadingInterviews || loadingFeedback;
  const hasContent = (interviews?.length ?? 0) > 0 || (feedback?.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader><CardTitle>Interviews</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !hasContent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CalendarPlus className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No interviews yet</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
                <Plus className="size-4" /> Add feedback
              </Button>
              <Button size="sm" onClick={() => setScheduleOpen(true)}>
                <Calendar className="size-4" /> Schedule interview
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(interviews ?? []).map((iv) => (
              <div key={iv.id} className="group rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{iv.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(iv.start), 'EEE, MMM d · h:mma')} – {format(new Date(iv.end), 'h:mma')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      deleteInterview.mutate(
                        { applicationId, id: iv.id },
                        { onSuccess: () => toast.success('Interview cancelled'), onError: () => toast.error('Could not cancel interview') },
                      )
                    }
                    className="text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {iv.locationType === 'ONLINE' ? (
                    <>
                      <Video className="size-3.5" />
                      {iv.meetingLink ? (
                        <a href={iv.meetingLink} target="_blank" rel="noopener" className="text-primary hover:underline">
                          Join meeting
                        </a>
                      ) : (
                        'Online'
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin className="size-3.5" /> {iv.locationDetail || 'In-person'}
                    </>
                  )}
                </div>
                {iv.interviewers.length > 0 && (
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    Interviewers: {iv.interviewers.map((i) => i.name || i.email).join(', ')}
                  </div>
                )}
              </div>
            ))}

            {(feedback ?? []).map((f) => {
              const r = RATING_STYLES[f.rating];
              return (
                <div key={f.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{f.title}</div>
                    <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', r.className)}>
                      {r.icon} {r.label}
                    </span>
                  </div>
                  {f.notes && <p className="mt-1.5 text-sm text-muted-foreground">{f.notes}</p>}
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    {f.authorLabel} · {format(new Date(f.createdAt), 'MMM d, h:mma')}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
                <Plus className="size-4" /> Add feedback
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
                <Calendar className="size-4" /> Schedule interview
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        applicationId={applicationId}
        candidateName={candidateName}
        candidateEmail={candidateEmail}
      />
      <AddFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} applicationId={applicationId} />
    </Card>
  );
}
