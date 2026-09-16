'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { CheckCircle2, Clock, Loader2, Play } from 'lucide-react';
import {
  CODING_LANGUAGES,
  type PublicAssessmentDto,
  type PublicQuestionDto,
  type RunCodeResult,
  type SubmitAssessmentResult,
} from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { useFeature } from '@/hooks/use-features';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageSpinner } from '@/components/ui/spinner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { publicConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

// Monaco Editor loaded dynamically to avoid SSR bundle size issues.
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <div className="h-[360px] animate-pulse rounded-md border border-border bg-muted" /> });

type CodeAnswer = { code: string; languageId: number };
// MCQ answers: single string for radio, string[] for multi-select checkboxes.
type MCQAnswers = Record<string, string | string[]>;

const langById = (id: number) => CODING_LANGUAGES.find((l) => l.id === id);
const langLabel = (id: number) => langById(id)?.label ?? `Language ${id}`;
const monacoLang = (id: number) => langById(id)?.monaco ?? 'plaintext';

export function AssessmentTake() {
  const { token } = useParams<{ token: string }>();
  const enabled = useFeature('ASSESSMENTS');
  const [data, setData] = useState<PublicAssessmentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<MCQAnswers>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, CodeAnswer>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const submittedRef = useRef(false);

  const isCoding = data?.type === 'CODING';

  const applyData = useCallback((d: PublicAssessmentDto) => {
    setData(d);
    setRemaining(d.remainingSeconds ?? null);
    const hydratedAnswers: MCQAnswers = {};
    for (const a of d.savedAnswers) {
      if (a.answer == null) continue;
      hydratedAnswers[a.questionId] = Array.isArray(a.answer) ? (a.answer as string[]) : (a.answer as string);
    }
    setAnswers(hydratedAnswers);
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
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assessment not found');
    } finally {
      setLoading(false);
    }
  }, [token, applyData]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [load, enabled]);

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
        submittedRef.current = false;
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

  if (!enabled) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16">
        <EmptyState title="Assessment unavailable" description="This assessment link is no longer active." />
      </div>
    );
  }

  const start = async () => {
    try {
      const d = await api.post<PublicAssessmentDto>(`/api/v1/public/assessments/${token}/start`, undefined, { public: true });
      applyData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start assessment');
    }
  };

  const choose = (questionId: string, optionId: string, isMultiSelect: boolean) => {
    let next: string | string[];
    if (isMultiSelect) {
      const current = (answers[questionId] as string[] | undefined) ?? [];
      next = current.includes(optionId) ? current.filter((x) => x !== optionId) : [...current, optionId];
    } else {
      next = optionId;
    }
    setAnswers((a) => ({ ...a, [questionId]: next }));
    void api
      .post(`/api/v1/public/assessments/${token}/answer`, { questionId, answer: next }, { public: true })
      .catch(() => {});
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
            <h1 className="mt-4 text-page-title">Assessment completed</h1>
            <p className="mt-1 text-sm text-muted-foreground">Thanks — your responses have been submitted.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'GRADING' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
            <h1 className="mt-4 text-page-title">Grading your submission…</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your code is running against the test cases. This can take a moment.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'EXPIRED' ? (
        <Card><CardContent className="py-12 text-center"><h1 className="text-page-title">This link has expired</h1><p className="mt-1 text-sm text-muted-foreground">Please contact the recruiter for a new invitation.</p></CardContent></Card>
      ) : data?.status === 'INVITED' ? (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <h1 className="text-page-title">{data.name}</h1>
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

function isAnswered(q: PublicQuestionDto, answers: MCQAnswers): boolean {
  const a = answers[q.id];
  if (a == null) return false;
  return Array.isArray(a) ? a.length > 0 : a !== '';
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
  answers: MCQAnswers;
  current: number;
  setCurrent: (n: number) => void;
  onChoose: (q: string, a: string, multi: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  remaining: number | null;
}) {
  const q = data.questions[current];
  const isLast = current === data.questions.length - 1;
  const answeredCount = data.questions.filter((qq) => isAnswered(qq, answers)).length;
  const isMulti = Boolean(q.isMultiSelect);
  const selected = answers[q.id];
  const selectedSet = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Question {current + 1} / {data.questions.length}</div>
        <Timer remaining={remaining} />
      </div>

      <Card>
        <CardContent className="space-y-5 py-6">
          <p className="text-base font-medium">{q.questionText}</p>
          {isMulti && <p className="text-xs text-muted-foreground">Select all that apply.</p>}
          <div className="space-y-2">
            {q.options.map((opt) => {
              const checked = selectedSet.has(opt.id);
              return (
                <label
                  key={opt.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
                    checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                  )}
                >
                  <input
                    type={isMulti ? 'checkbox' : 'radio'}
                    name={q.id}
                    checked={checked}
                    onChange={() => onChoose(q.id, opt.id, isMulti)}
                  />
                  {opt.text}
                </label>
              );
            })}
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

  // The Monaco instance is reused across questions (no key/path), so its onMount
  // blur handler closes over whatever q/ca were current when it first mounted.
  // Read the live question/language from a ref instead, or a blur after
  // navigating saves the visible code under the previous question's id.
  const liveRef = useRef({ questionId: q.id, languageId: ca.languageId });
  liveRef.current = { questionId: q.id, languageId: ca.languageId };

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

          <div className="overflow-hidden rounded-md border border-border">
            <MonacoEditor
              height="360px"
              language={monacoLang(ca.languageId)}
              value={ca.code}
              onChange={(v) => { if (v !== undefined) setCode(v); }}
              onMount={(editor) => {
                editor.onDidBlurEditorWidget(() => {
                  const { questionId, languageId } = liveRef.current;
                  saveCode(questionId, { code: editor.getValue(), languageId });
                });
              }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

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
