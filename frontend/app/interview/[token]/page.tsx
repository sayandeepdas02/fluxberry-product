'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2, Mic, PhoneOff } from 'lucide-react';
import type { PublicInterviewDto, InterviewSessionDto } from '@fluxberry/shared';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageSpinner } from '@/components/ui/spinner';
import { publicConfig } from '@/lib/config';

export default function InterviewTakePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicInterviewDto | null>(null);
  const [session, setSession] = useState<InterviewSessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [step, setStep] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await api.get<PublicInterviewDto>(`/api/v1/public/interviews/${token}`, { public: true });
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Interview not found');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while the interview is being processed after the candidate ends it.
  useEffect(() => {
    if (data?.status !== 'IN_PROGRESS' || session) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [data?.status, session, load]);

  const start = async () => {
    setStarting(true);
    try {
      const s = await api.post<InterviewSessionDto>(`/api/v1/public/interviews/${token}/session`, undefined, { public: true });
      setSession(s);
      // ── Real Bolna seam ────────────────────────────────────────────────
      // When s.provider === 'bolna', hand s.session to the @bolna/web-call SDK:
      //   const { BolnaWebCall } = await import('@bolna/web-call');
      //   const call = new BolnaWebCall({ session: s.session, userData: {...} });
      //   call.on('call-end', () => finish(call.getRunId()));
      //   await call.start();
      // Left as a documented seam (beta / request-access); the mock provider
      // drives the simulated flow below so the feature runs today.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start');
    } finally {
      setStarting(false);
    }
  };

  const finish = async (executionId?: string) => {
    setEnding(true);
    try {
      await api.post(`/api/v1/public/interviews/${token}/complete`, executionId ? { executionId } : {}, { public: true });
      setSession(null);
      setData((d) => (d ? { ...d, status: 'IN_PROGRESS' } : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish');
    } finally {
      setEnding(false);
    }
  };

  if (loading) return <PageSpinner label="Loading interview…" />;

  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:py-16">
      <div className="mb-6 text-sm font-medium text-muted-foreground">{publicConfig.appName}</div>

      {error ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{error}</CardContent></Card>
      ) : data?.status === 'COMPLETED' ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <h1 className="mt-4 text-xl font-semibold">Interview complete</h1>
            <p className="mt-1 text-sm text-muted-foreground">Thanks — we&apos;ve recorded your responses. The team will be in touch.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'IN_PROGRESS' && !session ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Loader2 className="size-10 animate-spin text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Processing your interview…</h1>
            <p className="mt-1 text-sm text-muted-foreground">We&apos;re transcribing and reviewing. You can close this tab.</p>
          </CardContent>
        </Card>
      ) : data?.status === 'EXPIRED' ? (
        <Card><CardContent className="py-12 text-center"><h1 className="text-lg font-semibold">This link has expired</h1><p className="mt-1 text-sm text-muted-foreground">Please contact the recruiter for a new invitation.</p></CardContent></Card>
      ) : session ? (
        <LiveInterview
          session={session}
          jobTitle={data?.jobTitle ?? 'the role'}
          step={step}
          setStep={setStep}
          onEnd={() => finish()}
          ending={ending}
        />
      ) : data ? (
        <Card>
          <CardContent className="space-y-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-semibold">AI interview</h1>
              <p className="mt-1 text-sm text-muted-foreground">{data.jobTitle} · {data.companyName}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {data.introduction || `A short ${data.durationMinutes}-minute voice interview with ${data.questionCount} questions.`}
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">{data.consentText}</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I consent to being recorded for this interview.
            </label>
            <Button size="lg" className="w-full" disabled={!consent} loading={starting} onClick={start}>
              <Mic className="size-4" /> Start interview
            </Button>
            <p className="text-center text-xs text-muted-foreground">Use a quiet space with your microphone enabled.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function LiveInterview({
  session,
  jobTitle,
  step,
  setStep,
  onEnd,
  ending,
}: {
  session: InterviewSessionDto;
  jobTitle: string;
  step: number;
  setStep: (n: number) => void;
  onEnd: () => void;
  ending: boolean;
}) {
  const questions = session.questions ?? [];
  const isLast = step >= questions.length - 1;

  return (
    <Card>
      <CardContent className="space-y-6 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/10" />
            <Mic className="size-7" />
          </span>
          <div className="text-sm font-medium">Interview in progress · {jobTitle}</div>
          <div className="text-xs text-muted-foreground">Speak your answer, then continue to the next question.</div>
        </div>

        {questions.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground">Question {step + 1} / {questions.length}</div>
            <p className="mt-1 text-base font-medium">{questions[step]}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          {isLast ? (
            <Button variant="destructive" className="w-full gap-1.5" loading={ending} onClick={onEnd}>
              <PhoneOff className="size-4" /> End interview
            </Button>
          ) : (
            <div className="flex w-full items-center justify-between">
              <span className="text-xs text-muted-foreground">Answer, then continue</span>
              <Button onClick={() => setStep(Math.min(questions.length - 1, step + 1))}>Next question</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
