'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, MapPin, Video, CheckCircle2, XCircle, ThumbsDown, ThumbsUp, Star } from 'lucide-react';
import type { InterviewerAccessDto, InterviewFeedbackRating } from '@/lib/shared';
import { fetchInterviewerAccess, submitInterviewerFeedback } from '@/hooks/use-interview-feedback';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { PageSpinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const RATINGS: { value: InterviewFeedbackRating; label: string; icon: React.ReactNode }[] = [
  { value: 'STRONG_NO', label: 'Strong No', icon: <XCircle className="size-4" /> },
  { value: 'NO', label: 'No', icon: <ThumbsDown className="size-4" /> },
  { value: 'YES', label: 'Yes', icon: <ThumbsUp className="size-4" /> },
  { value: 'STRONG_YES', label: 'Strong Yes', icon: <Star className="size-4" /> },
];

export default function InterviewFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<InterviewerAccessDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [title, setTitle] = useState('');
  const [rating, setRating] = useState<InterviewFeedbackRating | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchInterviewerAccess(token);
      setData(d);
      setTitle(d.interview.title);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This interview link was not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!title.trim() || !rating) {
      toast.error('Add a title and select an overall rating');
      return;
    }
    setSubmitting(true);
    try {
      await submitInterviewerFeedback(token, { title: title.trim(), rating, notes: notes.trim() || undefined });
      setSubmitted(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-20 text-center text-sm text-muted-foreground">
        {error ?? 'This interview link was not found'}
      </div>
    );
  }

  const done = submitted || data.alreadySubmitted;

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">{data.companyName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{data.interview.title}</h1>
        <p className="text-sm text-muted-foreground">{data.jobTitle}</p>
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            {format(new Date(data.interview.start), 'EEEE, MMMM d · h:mmaaa')} –{' '}
            {format(new Date(data.interview.end), 'h:mmaaa')}
          </div>
          {data.interview.locationType === 'ONLINE' ? (
            <div className="flex items-center gap-2">
              <Video className="size-4 text-muted-foreground" />
              {data.interview.meetingLink ? (
                <a href={data.interview.meetingLink} target="_blank" rel="noopener" className="text-primary hover:underline">
                  Join meeting
                </a>
              ) : (
                'Online'
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" /> In-person
            </div>
          )}
          {data.interview.description && <p className="pt-1 text-muted-foreground">{data.interview.description}</p>}
        </CardContent>
      </Card>

      {data.candidate && (
        <Card>
          <CardHeader><CardTitle>Candidate</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Name</div>{data.candidate.name}</div>
            <div><div className="text-xs text-muted-foreground">Email</div>{data.candidate.email}</div>
            {data.candidate.location && (
              <div><div className="text-xs text-muted-foreground">Location</div>{data.candidate.location}</div>
            )}
            {data.candidate.linkedinUrl && (
              <div>
                <div className="text-xs text-muted-foreground">LinkedIn</div>
                <a href={data.candidate.linkedinUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
                  Profile
                </a>
              </div>
            )}
            {data.candidate.expectedSalary != null && (
              <div><div className="text-xs text-muted-foreground">Expected salary</div>{data.candidate.expectedSalary}</div>
            )}
          </CardContent>
        </Card>
      )}

      {data.pastFeedback.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Past feedback</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.pastFeedback.map((f, i) => (
              <div key={i}>
                <div className="font-medium">{f.title} — {f.rating.replace('_', ' ').toLowerCase()}</div>
                {f.notes && <p className="text-muted-foreground">{f.notes}</p>}
                <div className="text-xs text-muted-foreground">{f.authorLabel}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.feedbackTemplate && (
        <Card>
          <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
          <CardContent>
            {done ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="size-8 text-success" />
                <p className="text-sm text-muted-foreground">Feedback submitted. Thanks!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Title" required>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
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
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Type here..." />
                </Field>
                <Button onClick={submit} loading={submitting} className="w-full">Add feedback</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
