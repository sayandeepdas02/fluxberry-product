'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowLeft, Wand2 } from 'lucide-react';
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  type EmploymentType,
  type WorkMode,
  type StructuredRequirements,
  type CreateJobInput,
} from '@fluxberry/shared';
import { useCreateJob, usePublishJob, generateJd } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { Markdown } from '@/components/ui/markdown';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SkillsInput } from '@/components/jobs/skills-input';
import { toast } from '@/components/ui/sonner';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { formatSalary, cn } from '@/lib/utils';

const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function NewJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const publishJob = usePublishJob();

  const [step, setStep] = useState(0);

  // Basics
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

  // Description
  const [descMode, setDescMode] = useState<'ai' | 'manual'>('ai');
  const [aiPrompt, setAiPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [structuredRequirements, setSR] = useState<StructuredRequirements | null>(null);
  const [aiMeta, setAiMeta] = useState<{ provider: string; model: string; promptVersion: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const salary = { min: numOrUndef(salaryMin), max: numOrUndef(salaryMax), currency };
  const experience = { min: numOrUndef(expMin), max: numOrUndef(expMax) };

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
        salary,
        experience,
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

  const save = async (publish: boolean) => {
    setSaving(true);
    try {
      const input: CreateJobInput = {
        title: title.trim(),
        employmentType,
        workMode,
        location: location || undefined,
        openings: Number(openings) || 1,
        salary,
        experience,
        skills: skills.map((name) => ({ name, required: true, weight: 1 })),
        description,
        structuredRequirements: structuredRequirements ?? undefined,
        rawGenerationPrompt: aiMeta ? aiPrompt : undefined,
        aiMeta: aiMeta ?? undefined,
      };
      const job = await createJob.mutateAsync(input);
      if (publish) await publishJob.mutateAsync(job.id);
      toast.success(publish ? 'Job published' : 'Draft saved');
      router.push(`/app/jobs/${job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save job');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/jobs')}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-page-title">Create job</h1>
      </div>

      <Stepper step={step} labels={['Basics', 'Description', 'Review']} />

      {step === 0 && (
        <Card className="space-y-4 p-6">
          <Field label="Job title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employment type">
              <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{EMPLOYMENT_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Work mode">
              <Select value={workMode} onValueChange={(v) => setWorkMode(v as WorkMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((t) => (
                    <SelectItem key={t} value={t}>{WORK_MODE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bangalore" /></Field>
            <Field label="Openings"><Input type="number" min="1" value={openings} onChange={(e) => setOpenings(e.target.value)} /></Field>
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
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(1)} disabled={!title.trim()}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-4 p-6">
          <div className="flex gap-2">
            <ModeButton active={descMode === 'ai'} onClick={() => setDescMode('ai')} icon={<Sparkles className="size-4" />}>Generate with AI</ModeButton>
            <ModeButton active={descMode === 'manual'} onClick={() => setDescMode('manual')}>Write manually</ModeButton>
          </div>

          {descMode === 'ai' && (
            <div className="space-y-3">
              <Field label="Tell us what you're hiring for">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Looking for a backend engineer with 3+ years in Node.js, PostgreSQL and AWS. Should own systems end to end."
                />
              </Field>
              <Button onClick={handleGenerate} loading={generating} variant="secondary">
                <Wand2 className="size-4" /> {description ? 'Regenerate' : 'Generate description'}
              </Button>
            </div>
          )}

          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={14} placeholder="Write the job description, or generate it with AI above." />
          </Field>

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={() => setStep(2)} disabled={!description.trim()}>Continue</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-5 p-6">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[location, EMPLOYMENT_LABELS[employmentType], WORK_MODE_LABELS[workMode]].filter(Boolean).join(' · ')}
            </p>
            {formatSalary(salary) && <p className="mt-1 text-sm font-medium">{formatSalary(salary)}</p>}
          </div>
          <div className="border-t border-border pt-4">
            <Markdown content={description} />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save(false)} loading={saving && !publishJob.isPending}>Save draft</Button>
              <Button onClick={() => save(true)} loading={saving}>Publish job</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-medium',
              i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {i + 1}
          </span>
          <span className={cn(i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>{label}</span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
