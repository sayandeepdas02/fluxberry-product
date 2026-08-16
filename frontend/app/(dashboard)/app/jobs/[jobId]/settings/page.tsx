'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  type EmploymentType,
  type WorkMode,
  type UpdateJobInput,
} from '@fluxberry/shared';
import { useJob, useUpdateJob, useSetJobStatus } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SkillsInput } from '@/components/jobs/skills-input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';

const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function JobSettingsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading } = useJob(jobId);
  const updateJob = useUpdateJob(jobId);
  const setStatus = useSetJobStatus();

  const [form, setForm] = useState<null | {
    title: string;
    employmentType: EmploymentType;
    workMode: WorkMode;
    location: string;
    openings: string;
    salaryMin: string;
    salaryMax: string;
    currency: string;
    expMin: string;
    expMax: string;
    skills: string[];
    description: string;
  }>(null);

  useEffect(() => {
    if (job && !form) {
      setForm({
        title: job.title,
        employmentType: job.employmentType,
        workMode: job.workMode,
        location: job.location ?? '',
        openings: String(job.openings),
        salaryMin: job.salary?.min != null ? String(job.salary.min) : '',
        salaryMax: job.salary?.max != null ? String(job.salary.max) : '',
        currency: job.salary?.currency ?? 'INR',
        expMin: job.experience?.min != null ? String(job.experience.min) : '',
        expMax: job.experience?.max != null ? String(job.experience.max) : '',
        skills: job.skills.map((s) => s.name),
        description: job.description,
      });
    }
  }, [job, form]);

  if (isLoading || !job || !form) return <Skeleton className="h-96 w-full" />;

  const save = async () => {
    const input: UpdateJobInput = {
      title: form.title.trim(),
      employmentType: form.employmentType,
      workMode: form.workMode,
      location: form.location || undefined,
      openings: Number(form.openings) || 1,
      salary: { min: numOrUndef(form.salaryMin), max: numOrUndef(form.salaryMax), currency: form.currency },
      experience: { min: numOrUndef(form.expMin), max: numOrUndef(form.expMax) },
      skills: form.skills.map((name) => ({ name, required: true, weight: 1 })),
      description: form.description,
    };
    try {
      await updateJob.mutateAsync(input);
      toast.success('Job saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    }
  };

  const set = (patch: Partial<NonNullable<typeof form>>) => setForm((f) => (f ? { ...f, ...patch } : f));

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Job title">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employment type">
              <Select value={form.employmentType} onValueChange={(v) => set({ employmentType: v as EmploymentType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{EMPLOYMENT_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Work mode">
              <Select value={form.workMode} onValueChange={(v) => set({ workMode: v as WorkMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((t) => <SelectItem key={t} value={t}>{WORK_MODE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Location"><Input value={form.location} onChange={(e) => set({ location: e.target.value })} /></Field>
            <Field label="Openings"><Input type="number" value={form.openings} onChange={(e) => set({ openings: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Salary min"><Input type="number" value={form.salaryMin} onChange={(e) => set({ salaryMin: e.target.value })} /></Field>
            <Field label="Salary max"><Input type="number" value={form.salaryMax} onChange={(e) => set({ salaryMax: e.target.value })} /></Field>
          </div>
          <Field label="Skills">
            <SkillsInput value={form.skills} onChange={(skills) => set({ skills })} />
          </Field>
          <Field label="Description">
            <Textarea rows={10} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <div>
            <Button onClick={save} loading={updateJob.isPending}>Save changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setStatus.mutate({ jobId, status: 'CLOSED' }, { onSuccess: () => toast.success('Job closed') })}
          >
            Close job
          </Button>
          <Button
            variant="outline"
            onClick={() => setStatus.mutate({ jobId, status: 'ARCHIVED' }, { onSuccess: () => toast.success('Job archived') })}
          >
            Archive
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
