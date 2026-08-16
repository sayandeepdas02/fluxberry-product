'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { INTERVIEW_TONES, type InterviewTone, type UpsertInterviewConfigInput } from '@fluxberry/shared';
import { useInterviewConfig, useSaveInterviewConfig } from '@/hooks/use-interview';
import { useFeature } from '@/hooks/use-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';

const uid = () => Math.random().toString(36).slice(2, 9);
type Q = { id: string; text: string; followUpAllowed: boolean };
const TONE_LABELS: Record<InterviewTone, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  conversational: 'Conversational',
};

export default function InterviewConfigPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const enabled = useFeature('AI_INTERVIEW');
  const { data: cfg, isLoading } = useInterviewConfig(jobId);
  const save = useSaveInterviewConfig(jobId);

  const [objective, setObjective] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [questions, setQuestions] = useState<Q[]>([]);
  const [duration, setDuration] = useState('6');
  const [tone, setTone] = useState<InterviewTone>('professional');
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (cfg && !loaded) {
      setObjective(cfg.objective);
      setIntroduction(cfg.introduction);
      setQuestions(cfg.questions.length ? cfg.questions.map((q) => ({ ...q })) : [{ id: uid(), text: '', followUpAllowed: false }]);
      setDuration(String(cfg.durationMinutes));
      setTone(cfg.tone);
      setActive(cfg.status === 'ACTIVE');
      setLoaded(true);
    }
  }, [cfg, loaded]);

  if (!enabled) {
    return <EmptyState title="AI Interview is off" description="Enable FEATURE_AI_INTERVIEW to configure voice interviews." />;
  }
  if (isLoading || !loaded) return <Skeleton className="h-96 w-full" />;

  const onSave = async () => {
    const payload: UpsertInterviewConfigInput = {
      objective: objective.trim(),
      introduction: introduction.trim(),
      questions: questions.filter((q) => q.text.trim()).map((q) => ({ id: q.id, text: q.text.trim(), followUpAllowed: q.followUpAllowed })),
      durationMinutes: Number(duration) || 6,
      tone,
      language: 'en',
      status: active ? 'ACTIVE' : 'DRAFT',
    };
    try {
      await save.mutateAsync(payload);
      toast.success('Interview configuration saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure the AI voice interviewer for this job. Candidates take it from a link — the agent asks your questions in order.
      </p>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <Field label="Objective" hint="What this screening interview is for.">
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} placeholder="Screen for backend fundamentals, communication, and ownership." />
          </Field>
          <Field label="Introduction / welcome" hint="Spoken first. Use {candidate_name} and {job_title} placeholders.">
            <Textarea value={introduction} onChange={(e) => setIntroduction(e.target.value)} rows={2} placeholder="Hi {candidate_name}, thanks for joining. This is a short interview for the {job_title} role." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)"><Input type="number" min={1} max={30} value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
            <Field label="Tone">
              <Select value={tone} onValueChange={(v) => setTone(v as InterviewTone)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVIEW_TONES.map((t) => <SelectItem key={t} value={t}>{TONE_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Questions</div>
            <span className="text-xs text-muted-foreground">Asked in order</span>
          </div>
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-2">
              <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-1.5">
                <Textarea
                  value={q.text}
                  onChange={(e) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))}
                  rows={2}
                  placeholder={`Question ${i + 1}`}
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={q.followUpAllowed} onChange={(e) => setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, followUpAllowed: e.target.checked } : x)))} />
                  Allow a follow-up
                </label>
              </div>
              {questions.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}><Trash2 className="size-4" /></Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setQuestions((qs) => [...qs, { id: uid(), text: '', followUpAllowed: false }])}>
            <Plus className="size-4" /> Add question
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <div className="text-sm font-medium">Activate</div>
          <div className="text-xs text-muted-foreground">Allow this interview to be sent and used in the workflow.</div>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} loading={save.isPending} disabled={questions.filter((q) => q.text.trim()).length === 0}>
          Save configuration
        </Button>
      </div>
    </div>
  );
}
