'use client';

import { useState } from 'react';
import { CheckCircle2, Upload } from 'lucide-react';
import { CANDIDATE_SOURCES, type FormQuestion, type CandidateSource } from '@fluxberry/shared';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export function ApplyForm({
  workspaceSlug,
  jobSlug,
  questions,
}: {
  workspaceSlug: string;
  jobSlug: string;
  questions: FormQuestion[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const defaults = questions.filter((q) => q.system && q.enabled);
  const custom = questions.filter((q) => !q.system && q.enabled);
  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resumeField = defaults.find((q) => q.key === 'resume');
    if (resumeField?.required && !resumeFile) {
      setError('Please attach your resume');
      return;
    }

    const fd = new FormData();
    fd.set('name', values.fullName ?? '');
    fd.set('email', values.email ?? '');
    if (values.phone) fd.set('phone', values.phone);
    if (values.currentLocation) fd.set('location', values.currentLocation);
    if (values.currentSalary) fd.set('currentSalary', values.currentSalary);
    if (values.expectedSalary) fd.set('expectedSalary', values.expectedSalary);
    if (values.linkedinUrl) fd.set('linkedinUrl', values.linkedinUrl);

    const query = new URLSearchParams(window.location.search);
    const srcParam = query.get('source')?.toUpperCase();
    const source: CandidateSource =
      srcParam && (CANDIDATE_SOURCES as readonly string[]).includes(srcParam)
        ? (srcParam as CandidateSource)
        : 'DIRECT';
    fd.set('source', source);
    // Re-validated server-side against the actual Referral doc — `source` alone is never trusted for reward eligibility.
    const refParam = query.get('ref');
    if (refParam) fd.set('referralCode', refParam);

    const answerList = custom
      .filter((q) => answers[q.id] != null && answers[q.id] !== '')
      .map((q) => ({ questionId: q.id, value: answers[q.id] }));
    fd.set('answers', JSON.stringify(answerList));

    if (resumeFile) fd.set('resume', resumeFile);

    setSubmitting(true);
    try {
      await api.post(`/api/v1/public/jobs/${workspaceSlug}/${jobSlug}/apply`, fd, { public: true });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("You've already applied to this role.");
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-border bg-card px-6 py-12 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h3 className="mt-4 text-lg font-semibold">Application submitted</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Thanks for applying. We&apos;ll be in touch if your profile is selected.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {defaults.map((q) => (
        <DefaultField key={q.id} q={q} value={values[q.key!] ?? ''} onChange={(v) => set(q.key!, v)} onFile={setResumeFile} fileName={resumeFile?.name} />
      ))}

      {custom.map((q) => (
        <CustomField key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))} />
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" loading={submitting} size="lg">
        Submit application
      </Button>
    </form>
  );
}

function DefaultField({
  q,
  value,
  onChange,
  onFile,
  fileName,
}: {
  q: FormQuestion;
  value: string;
  onChange: (v: string) => void;
  onFile: (f: File | null) => void;
  fileName?: string;
}) {
  if (q.key === 'resume') {
    return (
      <Field label={q.label} required={q.required}>
        <label className={cn('flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground')}>
          <Upload className="size-4" />
          <span className="truncate">{fileName ?? 'Upload PDF, DOC, or DOCX'}</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </Field>
    );
  }
  const type = q.type === 'NUMBER' ? 'number' : q.key === 'email' ? 'email' : q.key === 'linkedinUrl' ? 'url' : 'text';
  return (
    <Field label={q.label} required={q.required}>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={q.required} />
    </Field>
  );
}

function CustomField({
  q,
  value,
  onChange,
}: {
  q: FormQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const v = typeof value === 'string' ? value : '';
  if (q.type === 'LONG_TEXT') {
    return (
      <Field label={q.label} required={q.required} hint={q.description}>
        <Textarea value={v} onChange={(e) => onChange(e.target.value)} rows={4} required={q.required} />
      </Field>
    );
  }
  if (q.type === 'YES_NO') {
    return (
      <Field label={q.label} required={q.required} hint={q.description}>
        <div className="flex gap-4">
          {['Yes', 'No'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input type="radio" name={q.id} checked={v === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (q.type === 'MULTIPLE_CHOICE') {
    return (
      <Field label={q.label} required={q.required} hint={q.description}>
        <div className="space-y-1.5">
          {q.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm">
              <input type="radio" name={q.id} checked={v === opt.label} onChange={() => onChange(opt.label)} />
              {opt.label}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  const type = q.type === 'NUMBER' ? 'number' : 'text';
  return (
    <Field label={q.label} required={q.required} hint={q.description}>
      <Input type={type} value={v} onChange={(e) => onChange(e.target.value)} required={q.required} />
    </Field>
  );
}
