'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import type { PublicAssessmentDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { publicConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

export default function AssessmentTakePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicAssessmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number } | null>(null);
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<PublicAssessmentDto>(`/api/v1/public/assessments/${token}`, { public: true });
      setData(d);
      setAnswers(Object.fromEntries(d.savedAnswers.map((a) => [a.questionId, a.answer as string])));
      setRemaining(d.remainingSeconds ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.post<{ score: number; maxScore: number }>(
        `/api/v1/public/assessments/${token}/submit`,
        { answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) },
        { public: true },
      );
      setResult({ score: res.score });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [answers, token]);

  // Server-authoritative countdown; auto-submit at zero.
  useEffect(() => {
    if (data?.status !== 'STARTED' || remaining == null || result) return;
    if (remaining <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining, data?.status, result, submit]);

  const start = async () => {
    const d = await api.post<PublicAssessmentDto>(`/api/v1/public/assessments/${token}/start`, undefined, { public: true });
    setData(d);
    setRemaining(d.remainingSeconds ?? null);
  };

  const choose = (questionId: string, answer: string) => {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
    void api.post(`/api/v1/public/assessments/${token}/answer`, { questionId, answer }, { public: true }).catch(() => {});
  };

  if (loading) return <PageSpinner label="Loading assessment…" />;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <div className="mb-6 text-sm font-medium text-muted-foreground">{publicConfig.appName}</div>

      {error ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : result || data?.status === 'COMPLETED' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <h1 className="mt-4 text-xl font-semibold">Assessment completed</h1>
            <p className="mt-1 text-sm text-muted-foreground">Thanks — your responses have been submitted.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'EXPIRED' ? (
        <Card><CardContent className="py-12 text-center"><h1 className="text-lg font-semibold">This link has expired</h1><p className="mt-1 text-sm text-muted-foreground">Please contact the recruiter for a new invitation.</p></CardContent></Card>
      ) : data?.status === 'INVITED' ? (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}
            <p className="text-sm text-muted-foreground">{data.questions.length} questions · {data.durationMinutes} minutes</p>
            <p className="text-xs text-muted-foreground">The timer starts once you begin and can&apos;t be paused.</p>
            <Button size="lg" onClick={start}>Start assessment</Button>
          </CardContent>
        </Card>
      ) : data ? (
        <TestRunner
          data={data}
          answers={answers}
          current={current}
          setCurrent={setCurrent}
          onChoose={choose}
          onSubmit={submit}
          submitting={submitting}
          remaining={remaining}
        />
      ) : null}
    </div>
  );
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TestRunner({
  data,
  answers,
  current,
  setCurrent,
  onChoose,
  onSubmit,
  submitting,
  remaining,
}: {
  data: PublicAssessmentDto;
  answers: Record<string, string>;
  current: number;
  setCurrent: (n: number) => void;
  onChoose: (q: string, a: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  remaining: number | null;
}) {
  const q = data.questions[current];
  const isLast = current === data.questions.length - 1;
  const answeredCount = data.questions.filter((qq) => answers[qq.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Question {current + 1} / {data.questions.length}</div>
        {remaining != null && (
          <div className={cn('inline-flex items-center gap-1.5 text-sm font-medium tabular-nums', remaining < 60 ? 'text-destructive' : 'text-muted-foreground')}>
            <Clock className="size-4" /> {fmt(remaining)}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-5 py-6">
          <p className="text-base font-medium">{q.questionText}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                  answers[q.id] === opt.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                )}
              >
                <input type="radio" name={q.id} checked={answers[q.id] === opt.id} onChange={() => onChoose(q.id, opt.id)} />
                {opt.text}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>Previous</Button>
        <span className="text-xs text-muted-foreground">{answeredCount} / {data.questions.length} answered</span>
        {isLast ? (
          <Button onClick={onSubmit} loading={submitting}>Submit</Button>
        ) : (
          <Button onClick={() => setCurrent(Math.min(data.questions.length - 1, current + 1))}>Next</Button>
        )}
      </div>
    </div>
  );
}
