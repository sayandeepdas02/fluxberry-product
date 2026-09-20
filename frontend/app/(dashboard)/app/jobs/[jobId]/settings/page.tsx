'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  EMPLOYMENT_TYPES,
  WORK_MODES,
  type EmploymentType,
  type WorkMode,
  type UpdateJobInput,
  type WorkspaceMemberDto,
} from '@/lib/shared';
import { Linkedin } from 'lucide-react';
import { useJob, useUpdateJob, useUpdateJobAccess, useSetJobStatus, useSetLinkedInPosted } from '@/hooks/use-jobs';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { api } from '@/lib/api-client';
import { publicConfig } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { SkillsInput } from '@/components/jobs/skills-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { EMPLOYMENT_LABELS, WORK_MODE_LABELS } from '@/lib/labels';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, initials } from '@/lib/utils';
import type { JobDto } from '@/lib/shared';

const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));

export default function JobSettingsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading } = useJob(jobId);
  const updateJob = useUpdateJob(jobId);
  const setStatus = useSetJobStatus();

  const [form, setForm] = useState<null | {
    title: string;
    department: string;
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
        department: job.department ?? '',
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
      department: form.department.trim() || null,
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
      <h2 className="sr-only">Job settings</h2>
      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Job title">
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Department">
            <Input value={form.department} onChange={(e) => set({ department: e.target.value })} placeholder="e.g. Engineering, Design, Sales" />
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

      <JobAccessCard jobId={jobId} restrictedTo={job.restrictedTo} />

      <LinkedInShareCard job={job} />

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

function JobAccessCard({ jobId, restrictedTo }: { jobId: string; restrictedTo: string[] }) {
  const { currentWorkspace, user } = useWorkspace();
  const updateAccess = useUpdateJobAccess(jobId);
  const [selected, setSelected] = useState<string[]>(restrictedTo);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setSelected(restrictedTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictedTo]);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', currentWorkspace.id],
    queryFn: () => api.get<WorkspaceMemberDto[]>(`/api/v1/workspaces/${currentWorkspace.id}/members`),
  });

  const toggle = (userId: string) => {
    setDirty(true);
    setSelected((ids) => (ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]));
  };

  const save = async () => {
    try {
      await updateAccess.mutateAsync(selected);
      setDirty(false);
      toast.success(selected.length === 0 ? 'Job is visible to everyone again' : 'Access updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update access');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {selected.length === 0
            ? 'Visible to everyone in the workspace.'
            : `Visible only to the ${selected.length} member${selected.length === 1 ? '' : 's'} selected below.`}
        </p>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {members?.map((m) => {
              const active = selected.includes(m.userId);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.userId)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors',
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
                  )}
                >
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[10px]">{initials(m.user.name)}</AvatarFallback>
                  </Avatar>
                  {m.user.name}
                  {m.userId === user.id && <span className="text-muted-foreground">(You)</span>}
                </button>
              );
            })}
          </div>
        )}
        <div>
          <Button onClick={save} loading={updateAccess.isPending} disabled={!dirty}>
            Save access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const LINKEDIN_STATUS_LABEL: Record<JobDto['linkedIn']['status'], string> = {
  NOT_POSTED: 'Not posted',
  POSTED: 'Posted',
  CLOSED: 'Closed',
};
const LINKEDIN_STATUS_VARIANT: Record<JobDto['linkedIn']['status'], 'muted' | 'success' | 'default'> = {
  NOT_POSTED: 'muted',
  POSTED: 'success',
  CLOSED: 'default',
};

/**
 * There's no real LinkedIn job-posting API integration — that needs Talent
 * Solutions partnership access we don't have. This opens LinkedIn's public
 * share dialog pre-filled with the apply link, and lets the recruiter record
 * that they used it; status auto-shows "Closed" once the job itself closes.
 */
function LinkedInShareCard({ job }: { job: JobDto }) {
  const { currentWorkspace } = useWorkspace();
  const setPosted = useSetLinkedInPosted(job.id);
  const applyUrl = `${publicConfig.appUrl}/apply/${currentWorkspace.slug}/${job.slug}`;
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(applyUrl)}`;

  const togglePosted = (posted: boolean) => {
    setPosted.mutate(posted, {
      onSuccess: () => toast.success(posted ? 'Marked as posted on LinkedIn' : 'Marked as not posted'),
      onError: () => toast.error('Could not update LinkedIn status'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>LinkedIn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Fluxberry doesn&apos;t auto-post to LinkedIn — share the role with LinkedIn&apos;s pre-filled dialog, then mark it here so your team knows it&apos;s out there.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <a href={shareUrl} target="_blank" rel="noreferrer">
              <Linkedin className="size-4" /> Share to LinkedIn
            </a>
          </Button>
          <Badge variant={LINKEDIN_STATUS_VARIANT[job.linkedIn.status]}>{LINKEDIN_STATUS_LABEL[job.linkedIn.status]}</Badge>
          {job.linkedIn.status === 'NOT_POSTED' ? (
            <Button size="sm" variant="ghost" onClick={() => togglePosted(true)} loading={setPosted.isPending}>
              Mark as posted
            </Button>
          ) : job.linkedIn.status === 'POSTED' ? (
            <Button size="sm" variant="ghost" onClick={() => togglePosted(false)} loading={setPosted.isPending}>
              Undo
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
