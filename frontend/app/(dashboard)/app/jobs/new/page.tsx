'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wand2 } from 'lucide-react';
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  type EmploymentType,
  type WorkMode,
  type StructuredRequirements,
  type CreateJobInput,
} from '@/lib/shared';
import { useCreateJob, useUpdateJob, usePublishJob, useJob, generateJd } from '@/hooks/use-jobs';
import { useApplicationFormEditor } from '@/hooks/use-application-form-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { Markdown } from '@/components/ui/markdown';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SkillsInput } from '@/components/jobs/skills-input';
import { ApplicationFormFields } from '@/components/jobs/application-form-fields';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

type Step = 'details' | 'form';

const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));
const DRAFT_ID_KEY = 'fluxberry:new-job-draft-id';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function NewJobPage() {
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [restoreChecked, setRestoreChecked] = useState(false);
  const createJob = useCreateJob();
  const updateJob = useUpdateJob(jobId ?? '');
  const publishJob = usePublishJob();
  const restoredJob = useJob(jobId ?? '');

  const [title, setTitle] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [workMode, setWorkMode] = useState<WorkMode>('ONSITE');
  const [location, setLocation] = useState('');
  const [openings, setOpenings] = useState('1');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expMin, setExpMin] = useState('');
  const [expMax, setExpMax] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [structuredRequirements, setSR] = useState<StructuredRequirements | null>(null);
  const [aiMeta, setAiMeta] = useState<{ provider: string; model: string; promptVersion: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [step, setStep] = useState<Step>('details');
  const formEditor = useApplicationFormEditor(jobId ?? '');

  const loadedRef = useRef(false);
  const creatingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Resume an in-progress draft after a refresh — the job was already created
  // server-side by autosave, so the draft persists even if this tab's state
  // doesn't (spec item 4.2).
  useEffect(() => {
    const stored = sessionStorage.getItem(DRAFT_ID_KEY);
    if (stored) setJobId(stored);
    setRestoreChecked(true);
  }, []);

  useEffect(() => {
    if (restoredJob.data && !loadedRef.current) {
      loadedRef.current = true;
      const job = restoredJob.data;
      if (job.status !== 'DRAFT') {
        router.replace(`/app/jobs/${job.id}`);
        return;
      }
      setTitle(job.title);
      setEmploymentType(job.employmentType);
      setWorkMode(job.workMode);
      setLocation(job.location ?? '');
      setOpenings(String(job.openings));
      setSalaryMin(job.salary?.min != null ? String(job.salary.min) : '');
      setSalaryMax(job.salary?.max != null ? String(job.salary.max) : '');
      setCurrency(job.salary?.currency ?? 'INR');
      setExpMin(job.experience?.min != null ? String(job.experience.min) : '');
      setExpMax(job.experience?.max != null ? String(job.experience.max) : '');
      setSkills(job.skills.map((s) => s.name));
      setDescription(job.description);
      if (job.structuredRequirements) setSR(job.structuredRequirements);
    }
  }, [restoredJob.data, router]);

  const buildInput = (): CreateJobInput => ({
    title: title.trim(),
    employmentType,
    workMode,
    location: location || undefined,
    openings: Number(openings) || 1,
    salary: { min: numOrUndef(salaryMin), max: numOrUndef(salaryMax), currency },
    experience: { min: numOrUndef(expMin), max: numOrUndef(expMax) },
    skills: skills.map((name) => ({ name, required: true, weight: 1 })),
    description,
    structuredRequirements: structuredRequirements ?? undefined,
    rawGenerationPrompt: aiMeta ? aiPrompt : undefined,
    aiMeta: aiMeta ?? undefined,
  });

  const flushSave = async (): Promise<string | null> => {
    clearTimeout(debounceRef.current);
    if (!title.trim()) return jobId;
    setSaveState('saving');
    try {
      if (!jobId) {
        if (creatingRef.current) return null;
        creatingRef.current = true;
        try {
          const job = await createJob.mutateAsync(buildInput());
          sessionStorage.setItem(DRAFT_ID_KEY, job.id);
          loadedRef.current = true;
          setJobId(job.id);
          setSaveState('saved');
          return job.id;
        } finally {
          creatingRef.current = false;
        }
      }
      await updateJob.mutateAsync(buildInput());
      setSaveState('saved');
      return jobId;
    } catch (err) {
      setSaveState('error');
      throw err;
    }
  };

  // Debounced autosave — the draft is created on the first meaningful edit
  // rather than only on an explicit submit (spec item 4.2).
  useEffect(() => {
    if (!restoreChecked || !title.trim()) return;
    // If we're resuming an existing draft, wait for its fields to hydrate first —
    // otherwise this would autosave the still-blank defaults over the real draft.
    if (jobId && !loadedRef.current) return;
    clearTimeout(debounceRef.current);
    // Autosave failures already set saveState('error') for the indicator near the
    // title; nothing else to do in the background here, but the rejection must be
    // caught or it surfaces as an unhandled promise rejection on every keystroke.
    debounceRef.current = setTimeout(() => { flushSave().catch(() => {}); }, 800);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    restoreChecked, jobId, title, employmentType, workMode, location, openings,
    salaryMin, salaryMax, currency, expMin, expMax, skills, description,
    structuredRequirements, aiMeta,
  ]);

  const handleGenerate = async () => {
    if (!title.trim()) return;
    setGenerating(true);
    try {
      const r = await generateJd({
        title,
        userPrompt: aiPrompt || undefined,
        employmentType,
        workMode,
        location: location || undefined,
        salary: { min: numOrUndef(salaryMin), max: numOrUndef(salaryMax), currency },
        experience: { min: numOrUndef(expMin), max: numOrUndef(expMax) },
        skills,
      });
      setDescription(r.description);
      setSR(r.structuredRequirements);
      setAiMeta({ provider: r.provider, model: r.model, promptVersion: r.promptVersion });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const saveAndExit = async () => {
    try {
      await flushSave();
      if (step === 'form' && formEditor.dirty) await formEditor.save({ silent: true });
      toast.success('Your changes are saved as a draft');
      router.push('/app/jobs');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your changes');
    }
  };

  // Posting a job means deciding what candidates must submit — the application
  // form step is mandatory, not optional, so "Publish job" only appears after it.
  const continueToForm = async () => {
    setContinuing(true);
    try {
      const id = await flushSave();
      if (!id) throw new Error('Add a job title first');
      setStep('form');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not continue');
    } finally {
      setContinuing(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const id = await flushSave();
      if (!id) throw new Error('Add a job title first');
      if (formEditor.dirty) await formEditor.save({ silent: true });
      await publishJob.mutateAsync(id);
      sessionStorage.removeItem(DRAFT_ID_KEY);
      router.push(`/app/jobs/${id}?published=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish job');
      setPublishing(false);
    }
  };

  const canContinue = title.trim().length > 0 && description.trim().length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <h1 className="sr-only">{jobId ? 'Edit job' : 'Create job'}</h1>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/app/jobs')}>
            <ArrowLeft className="size-4" />
          </Button>
          <SaveIndicator state={saveState} />
        </div>
        <StepIndicator step={step} />
      </div>

      {step === 'details' ? (
      <>
      <Card className="space-y-5 p-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled job — e.g. Senior Backend Engineer"
          autoFocus
          className="w-full border-none bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
        />

        <div className="flex flex-wrap gap-2">
          <PillSelect
            value={employmentType}
            onValueChange={(v) => setEmploymentType(v as EmploymentType)}
            options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: EMPLOYMENT_LABELS[t] }))}
          />
          <PillSelect
            value={workMode}
            onValueChange={(v) => setWorkMode(v as WorkMode)}
            options={WORK_MODES.map((t) => ({ value: t, label: WORK_MODE_LABELS[t] }))}
          />
          <PillInput value={location} onChange={setLocation} placeholder="Location" />
          <PillInput value={openings} onChange={setOpenings} placeholder="Openings" type="number" className="w-24" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Salary min"><Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="1800000" /></Field>
          <Field label="Salary max"><Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="3000000" /></Field>
          <Field label="Currency">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['INR', 'USD', 'EUR', 'GBP'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Experience min (years)"><Input type="number" value={expMin} onChange={(e) => setExpMin(e.target.value)} placeholder="3" /></Field>
          <Field label="Experience max (years)"><Input type="number" value={expMax} onChange={(e) => setExpMax(e.target.value)} placeholder="6" /></Field>
        </div>
        <Field label="Skills" hint="Used to match and score candidates.">
          <SkillsInput value={skills} onChange={setSkills} />
        </Field>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Description</h2>
        </div>
        <div className="flex gap-2">
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Tell the AI what you're hiring for, then generate a first draft…"
            disabled={!title.trim()}
          />
          <Button onClick={handleGenerate} loading={generating} variant="secondary" disabled={!title.trim()}>
            <Wand2 className="size-4" /> {description ? 'Regenerate' : 'Generate'}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={18}
            placeholder="Write the job description here, or generate a draft with AI above. The preview on the right updates as you type."
            className="font-mono text-xs"
          />
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            {description.trim() ? (
              <Markdown content={description} />
            ) : (
              <p className="text-sm text-muted-foreground">Candidates will see your description rendered here as you write it.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={saveAndExit} disabled={continuing}>Save & exit</Button>
        <Button onClick={continueToForm} loading={continuing} disabled={!canContinue}>
          Continue to application form
        </Button>
      </div>
      </>
      ) : (
      <>
      <Card className="space-y-4 p-6 sm:p-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Application form</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This is exactly what candidates will see and fill out when they apply. Defaults are ready to go — add
            questions of your own if you need more.
          </p>
        </div>
        {formEditor.isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <ApplicationFormFields editor={formEditor} />
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => setStep('details')} disabled={publishing}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={saveAndExit} disabled={publishing}>Save & exit</Button>
          <Button onClick={publish} loading={publishing} disabled={!canContinue}>Publish job</Button>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return <span className="text-xs text-muted-foreground">Start typing to create a draft</span>;
  if (state === 'saving') return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (state === 'error') return <span className="text-xs text-destructive">Couldn&apos;t save — check your connection</span>;
  return <span className="text-xs text-muted-foreground">Saved</span>;
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'details', label: '1. Job details' },
    { key: 'form', label: '2. Application form' },
  ];
  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      {steps.map((s) => (
        <span key={s.key} className={cn(s.key === step ? 'text-foreground' : 'text-muted-foreground/50')}>
          {s.label}
        </span>
      ))}
    </div>
  );
}

function PillSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-auto rounded-full border-dashed px-3 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function PillInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'h-8 rounded-full border border-dashed border-input bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    />
  );
}
