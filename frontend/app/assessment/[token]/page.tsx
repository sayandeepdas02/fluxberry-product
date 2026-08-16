'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, Play } from 'lucide-react';
import {
  CODING_LANGUAGES,
  type PublicAssessmentDto,
  type RunCodeResult,
  type SubmitAssessmentResult,
} from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { publicConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

type CodeAnswer = { code: string; languageId: number };

const langLabel = (id: number) => CODING_LANGUAGES.find((l) => l.id === id)?.label ?? `Language ${id}`;

export default function AssessmentTakePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicAssessmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({}); // MCQ: option id
  const [codeAnswers, setCodeAnswers] = useState<Record<string, CodeAnswer>>({}); // CODING
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const submittedRef = useRef(false);

  const isCoding = data?.type === 'CODING';

  const applyData = useCallback((d: PublicAssessmentDto) => {
    setData(d);
    setRemaining(d.remainingSeconds ?? null);
    setAnswers(
      Object.fromEntries(
        d.savedAnswers.filter((a) => a.answer != null).map((a) => [a.questionId, a.answer as string]),
      ),
    );
    const code: Record<string, CodeAnswer> = {};
    for (const q of d.questions) {
      if (q.type !== 'CODING' || !q.coding) continue;
      const saved = d.savedAnswers.find((a) => a.questionId === q.id && a.code != null);
      const languageId = saved?.languageId ?? q.coding.languageIds[0];
      const starter = q.coding.starterCode.find((s) => s.languageId === languageId)?.code ?? '';
      code[q.id] = { code: saved?.code ?? starter, languageId };
    }
    setCodeAnswers(code);
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api.get<PublicAssessmentDto>(`/api/v1/public/assessments/${token}`, { public: true });
      applyData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment not found');
    } finally {
      setLoading(false);
    }
  }, [token, applyData]);

  useEffect(() => {
    void load();
  }, [load]);

  // While a coding submission grades, poll until it finalizes.
  useEffect(() => {
    if (data?.status !== 'GRADING') return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [data?.status, load]);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = isCoding
        ? Object.entries(codeAnswers).map(([questionId, v]) => ({ questionId, code: v.code, languageId: v.languageId }))
        : Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
      const res = await api.post<SubmitAssessmentResult>(
        `/api/v1/public/assessments/${token}/submit`,
        { answers: payload },
        { public: true },
      );
      if (res.status === 'GRADING') {
        setData((d) => (d ? { ...d, status: 'GRADING' } : d));
        submittedRef.current = false; // grading is server-side; nothing more to submit
      } else {
        setDone(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit');
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [answers, codeAnswers, isCoding, token]);

  // Server-authoritative countdown; auto-submit at zero.
  useEffect(() => {
    if (data?.status !== 'STARTED' || remaining == null || done) return;
    if (remaining <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [remaining, data?.status, done, submit]);

  const start = async () => {
    const d = await api.post<PublicAssessmentDto>(`/api/v1/public/assessments/${token}/start`, undefined, { public: true });
    applyData(d);
  };

  const choose = (questionId: string, answer: string) => {
    setAnswers((a) => ({ ...a, [questionId]: answer }));
    void api.post(`/api/v1/public/assessments/${token}/answer`, { questionId, answer }, { public: true }).catch(() => {});
  };

  const saveCode = (questionId: string, ca: CodeAnswer) => {
    void api
      .post(`/api/v1/public/assessments/${token}/answer`, { questionId, code: ca.code, languageId: ca.languageId }, { public: true })
      .catch(() => {});
  };

  if (loading) return <PageSpinner label="Loading assessment…" />;

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <div className="mb-6 text-sm font-medium text-muted-foreground">{publicConfig.appName}</div>

      {error ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : done || data?.status === 'COMPLETED' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <h1 className="mt-4 text-xl font-semibold">Assessment completed</h1>
            <p className="mt-1 text-sm text-muted-foreground">Thanks — your responses have been submitted.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'GRADING' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Grading your submission…</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your code is running against the test cases. This can take a moment.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'EXPIRED' ? (
        <Card><CardContent className="py-12 text-center"><h1 className="text-lg font-semibold">This link has expired</h1><p className="mt-1 text-sm text-muted-foreground">Please contact the recruiter for a new invitation.</p></CardContent></Card>
      ) : data?.status === 'INVITED' ? (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            {data.description && <p className="text-sm text-muted-foreground">{data.description}</p>}
            <p className="text-sm text-muted-foreground">{data.questions.length} {data.type === 'CODING' ? 'coding problems' : 'questions'} · {data.durationMinutes} minutes</p>
            <p className="text-xs text-muted-foreground">The timer starts once you begin and can&apos;t be paused.</p>
            <Button size="lg" onClick={start}>Start assessment</Button>
          </CardContent>
        </Card>
      ) : data && isCoding ? (
        <CodingRunner
          data={data}
          token={token}
          codeAnswers={codeAnswers}
          setCodeAnswers={setCodeAnswers}
          saveCode={saveCode}
          current={current}
          setCurrent={setCurrent}
          onSubmit={submit}
          submitting={submitting}
          remaining={remaining}
        />
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

function Timer({ remaining }: { remaining: number | null }) {
  if (remaining == null) return null;
  return (
    <div className={cn('inline-flex items-center gap-1.5 text-sm font-medium tabular-nums', remaining < 60 ? 'text-destructive' : 'text-muted-foreground')}>
      <Clock className="size-4" /> {fmt(remaining)}
    </div>
  );
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
        <Timer remaining={remaining} />
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

function CodingRunner({
  data,
  token,
  codeAnswers,
  setCodeAnswers,
  saveCode,
  current,
  setCurrent,
  onSubmit,
  submitting,
  remaining,
}: {
  data: PublicAssessmentDto;
  token: string;
  codeAnswers: Record<string, CodeAnswer>;
  setCodeAnswers: React.Dispatch<React.SetStateAction<Record<string, CodeAnswer>>>;
  saveCode: (questionId: string, ca: CodeAnswer) => void;
  current: number;
  setCurrent: (n: number) => void;
  onSubmit: () => void;
  submitting: boolean;
  remaining: number | null;
}) {
  const q = data.questions[current];
  const spec = q.coding!;
  const ca = codeAnswers[q.id] ?? { code: '', languageId: spec.languageIds[0] };
  const [runResult, setRunResult] = useState<RunCodeResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const isLast = current === data.questions.length - 1;

  useEffect(() => {
    setRunResult(null);
    setRunError(null);
  }, [current]);

  const setCode = (code: string) => setCodeAnswers((prev) => ({ ...prev, [q.id]: { ...ca, code } }));
  const setLang = (languageId: number) => {
    const starter = spec.starterCode.find((s) => s.languageId === languageId)?.code ?? '';
    setCodeAnswers((prev) => ({ ...prev, [q.id]: { code: ca.code.trim() ? ca.code : starter, languageId } }));
  };

  const run = async () => {
    setRunning(true);
    setRunError(null);
    saveCode(q.id, ca);
    try {
      const r = await api.post<RunCodeResult>(
        `/api/v1/public/assessments/${token}/run`,
        { questionId: q.id, code: ca.code, languageId: ca.languageId },
        { public: true },
      );
      setRunResult(r);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Problem {current + 1} / {data.questions.length}</div>
        <Timer remaining={remaining} />
      </div>

      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="whitespace-pre-wrap text-sm">{q.questionText}</p>

          {spec.sampleTestCases.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Sample cases</div>
              {spec.sampleTestCases.map((tc, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-2 font-mono text-xs">
                  <div><span className="text-muted-foreground">Input</span><pre className="mt-1 whitespace-pre-wrap">{tc.input || '—'}</pre></div>
                  <div><span className="text-muted-foreground">Expected</span><pre className="mt-1 whitespace-pre-wrap">{tc.expected || '—'}</pre></div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Select value={String(ca.languageId)} onValueChange={(v) => setLang(Number(v))}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {spec.languageIds.map((id) => (
                  <SelectItem key={id} value={String(id)}>{langLabel(id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={run} loading={running} className="gap-1.5">
              <Play className="size-4" /> Run
            </Button>
          </div>

          <textarea
            value={ca.code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => saveCode(q.id, ca)}
            spellCheck={false}
            rows={14}
            className="w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:ring-1 focus:ring-ring"
            placeholder="Write your solution here…"
          />

          {runError && <p className="text-sm text-destructive">{runError}</p>}
          {runResult && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="text-sm font-medium">
                {runResult.passed}/{runResult.total} sample cases passed
              </div>
              {runResult.compileOutput && (
                <pre className="whitespace-pre-wrap rounded bg-destructive/10 p-2 font-mono text-xs text-destructive">{runResult.compileOutput}</pre>
              )}
              {runResult.cases.map((c, i) => (
                <div key={i} className="font-mono text-xs">
                  <span className={cn('font-medium', c.passed ? 'text-success' : 'text-destructive')}>
                    Case {i + 1}: {c.passed ? 'Passed' : c.status}
                  </span>
                  {c.stdout && <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">out: {c.stdout}</pre>}
                  {c.stderr && <pre className="mt-1 whitespace-pre-wrap text-destructive">err: {c.stderr}</pre>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>Previous</Button>
        {isLast ? (
          <Button onClick={onSubmit} loading={submitting}>Submit</Button>
        ) : (
          <Button onClick={() => setCurrent(Math.min(data.questions.length - 1, current + 1))}>Next</Button>
        )}
      </div>
    </div>
  );
}
