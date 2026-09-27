'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Upload, Video } from 'lucide-react';
import { CANDIDATE_SOURCES, type FormQuestion, type CandidateSource } from '@/lib/shared';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';

/**
 * A real file input kept in the tab order (visually hidden, not display:none),
 * so keyboard and screen-reader users can pick a file. The wrapping label is the
 * visible, clickable drop zone and shows a focus ring while the input has focus.
 */
const FILE_INPUT_CLASS = 'sr-only';
const FILE_ZONE_CLASS =
  'flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-ring';

/** Autofill hints for the built-in fields (WCAG 1.3.5). */
const AUTOCOMPLETE: Record<string, string> = {
  fullName: 'name',
  email: 'email',
  phone: 'tel',
  currentLocation: 'address-level2',
  linkedinUrl: 'url',
};

const OTHER_LINK_PLACEHOLDERS: Record<string, string> = {
  TWITTER: 'x.com/username',
  INSTAGRAM: 'instagram.com/username',
  GITHUB: 'github.com/username',
  YOUTUBE: 'youtube.com/watch?v=…',
  ANY: 'https://…',
};

export function ApplyForm({
  workspaceSlug,
  jobSlug,
  companyName,
  questions,
}: {
  workspaceSlug: string;
  jobSlug: string;
  /** The hiring company, named in the privacy notice the applicant agrees to. */
  companyName: string;
  questions: FormQuestion[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [questionFiles, setQuestionFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);
  const consentId = useId();

  const defaults = questions.filter((q) => q.system && q.enabled);
  const custom = questions.filter((q) => !q.system && q.enabled);
  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));
  const setQuestionFile = (questionId: string, f: File | null) => {
    setQuestionFiles((s) => {
      const next = { ...s };
      if (f) next[questionId] = f;
      else delete next[questionId];
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resumeField = defaults.find((q) => q.key === 'resume');
    if (resumeField?.required && !resumeFile) {
      setError('Please attach your resume');
      return;
    }
    const missingFile = custom.find(
      (q) => (q.type === 'FILE_UPLOAD' || q.type === 'VIDEO_RECORDING') && q.required && !questionFiles[q.id],
    );
    if (missingFile) {
      setError(`Please provide "${missingFile.label}"`);
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

    const textQuestions = custom.filter((q) => q.type !== 'FILE_UPLOAD' && q.type !== 'VIDEO_RECORDING');
    const answerList = textQuestions
      .filter((q) => answers[q.id] != null && answers[q.id] !== '')
      .map((q) => ({ questionId: q.id, value: answers[q.id] }));
    fd.set('answers', JSON.stringify(answerList));

    const fileQuestionIds = Object.keys(questionFiles);
    const questionFileMeta = fileQuestionIds.map((questionId) => ({ questionId }));
    fd.set('questionFileMeta', JSON.stringify(questionFileMeta));
    for (const questionId of fileQuestionIds) {
      fd.append('questionFiles', questionFiles[questionId]);
    }

    if (resumeFile) fd.set('resume', resumeFile);
    fd.set('privacyConsent', consent ? 'true' : 'false');

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
        <h3 className="mt-4 text-card-title">Application submitted</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Thanks for applying. We&apos;ll be in touch if your profile is selected.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {defaults.map((q) => (
        <DefaultField
          key={q.id}
          q={q}
          value={values[q.key!] ?? ''}
          onChange={(v) => set(q.key!, v)}
          onFile={setResumeFile}
          fileName={resumeFile?.name}
        />
      ))}

      {custom.map((q) => (
        <CustomField
          key={q.id}
          q={q}
          value={answers[q.id]}
          onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
          file={questionFiles[q.id] ?? null}
          onFile={(f) => setQuestionFile(q.id, f)}
        />
      ))}

      <div className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 p-3">
        <input
          id={consentId}
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <label htmlFor={consentId} className="text-sm leading-relaxed text-muted-foreground">
          I agree that {companyName} can use the information in this application to consider me for this role. It is
          processed on {companyName}&apos;s behalf by Fluxberry, including AI-assisted screening of my résumé against
          the job. A person at {companyName} makes every hiring decision. See the{' '}
          <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </label>
      </div>

      {/* role="alert" so screen readers announce a failed submission. */}
      <p role="alert" className="text-sm text-destructive empty:hidden">
        {error}
      </p>

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
  const id = useId();
  if (q.key === 'resume') {
    return (
      <Field label={q.label} htmlFor={id} required={q.required}>
        <label className={FILE_ZONE_CLASS}>
          <Upload aria-hidden className="size-4" />
          <span className="truncate">{fileName ?? 'Upload PDF, DOC, or DOCX'}</span>
          <input
            id={id}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-required={q.required}
            className={FILE_INPUT_CLASS}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </Field>
    );
  }
  const type = q.type === 'NUMBER' ? 'number' : q.key === 'email' ? 'email' : q.key === 'linkedinUrl' ? 'url' : 'text';
  const autoComplete = AUTOCOMPLETE[q.key ?? ''];
  return (
    <Field label={q.label} htmlFor={id} required={q.required}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={q.required}
        autoComplete={autoComplete}
      />
    </Field>
  );
}

function CustomField({
  q,
  value,
  onChange,
  file,
  onFile,
}: {
  q: FormQuestion;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const hintId = q.description ? `${id}-hint` : undefined;
  const v = typeof value === 'string' ? value : '';
  const field = { label: q.label, required: q.required, hint: q.description, hintId };
  const control = { id, 'aria-describedby': hintId, required: q.required };

  if (q.type === 'LONG_TEXT') {
    return (
      <Field {...field} htmlFor={id}>
        <Textarea {...control} value={v} onChange={(e) => onChange(e.target.value)} rows={4} />
      </Field>
    );
  }
  // Radio and checkbox sets are named by the question through aria-labelledby.
  if (q.type === 'YES_NO') {
    return (
      <Field {...field} labelId={labelId}>
        <div role="radiogroup" aria-labelledby={labelId} aria-describedby={hintId} className="flex gap-4">
          {['Yes', 'No'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={q.id}
                required={q.required}
                checked={v === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (q.type === 'MULTIPLE_CHOICE') {
    const variant = q.variant ?? 'LIST';
    if (variant === 'DROPDOWN') {
      return (
        <Field {...field} htmlFor={id}>
          <select
            {...control}
            value={v}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Select an option
            </option>
            {q.options.map((opt) => (
              <option key={opt.id} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
      );
    }
    if (variant === 'MULTI_SELECT') {
      const selected = Array.isArray(value) ? value : [];
      const toggle = (label: string) =>
        onChange(selected.includes(label) ? selected.filter((s) => s !== label) : [...selected, label]);
      return (
        <Field {...field} labelId={labelId}>
          <div role="group" aria-labelledby={labelId} aria-describedby={hintId} className="space-y-1.5">
            {q.options.map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(opt.label)} onChange={() => toggle(opt.label)} />
                {opt.label}
              </label>
            ))}
          </div>
        </Field>
      );
    }
    return (
      <Field {...field} labelId={labelId}>
        <div role="radiogroup" aria-labelledby={labelId} aria-describedby={hintId} className="space-y-1.5">
          {q.options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={q.id}
                required={q.required}
                checked={v === opt.label}
                onChange={() => onChange(opt.label)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Field>
    );
  }
  if (q.type === 'PHONE') {
    return (
      <Field {...field} htmlFor={id}>
        <Input
          {...control}
          type="tel"
          autoComplete="tel"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder="+1 (555) 000-0000"
        />
      </Field>
    );
  }
  if (q.type === 'LINKEDIN') {
    return (
      <Field {...field} htmlFor={id}>
        <Input
          {...control}
          type="url"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder="linkedin.com/in/username"
        />
      </Field>
    );
  }
  if (q.type === 'OTHER_LINK') {
    return (
      <Field {...field} htmlFor={id}>
        <Input
          {...control}
          type="url"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder={OTHER_LINK_PLACEHOLDERS[q.linkPlatform ?? 'ANY']}
        />
      </Field>
    );
  }
  if (q.type === 'DATE') {
    return (
      <Field {...field} htmlFor={id}>
        <Input {...control} type="date" value={v} onChange={(e) => onChange(e.target.value)} />
      </Field>
    );
  }
  if (q.type === 'FILE_UPLOAD') {
    return (
      <Field {...field} htmlFor={id}>
        <label className={FILE_ZONE_CLASS}>
          <Upload aria-hidden className="size-4" />
          <span className="truncate">{file?.name ?? 'Upload a file'}</span>
          <input
            id={id}
            type="file"
            aria-required={q.required}
            aria-describedby={hintId}
            className={FILE_INPUT_CLASS}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </Field>
    );
  }
  if (q.type === 'VIDEO_RECORDING') {
    return (
      <Field {...field} labelId={labelId}>
        <VideoRecorderField labelId={labelId} file={file} onFile={onFile} />
      </Field>
    );
  }
  const type = q.type === 'NUMBER' ? 'number' : 'text';
  return (
    <Field {...field} htmlFor={id}>
      <Input {...control} type={type} value={v} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function VideoRecorderField({
  labelId,
  file,
  onFile,
}: {
  labelId: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        onFile(new File([blob], `video-answer-${Date.now()}.${ext}`, { type: blob.type }));
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Couldn't access your camera. You can upload a video file instead.");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const reset = () => {
    onFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  if (file) {
    return (
      <div className="space-y-2">
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            aria-label="Your recorded video answer"
            className="max-h-64 w-full rounded-md border border-border"
          />
        ) : (
          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2.5 text-sm">
            <span className="truncate">{file.name}</span>
          </div>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Remove and try again
        </Button>
      </div>
    );
  }

  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2">
      {recording ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            aria-label="Camera preview, recording"
            className="max-h-64 w-full rounded-md border border-border bg-black"
          />
          <Button type="button" variant="secondary" size="sm" onClick={stopRecording}>
            Stop recording
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={startRecording}>
            <Video aria-hidden className="size-4" /> Record a video
          </Button>
          <label className="cursor-pointer rounded-sm text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground focus-within:ring-2 focus-within:ring-ring">
            or upload a video file
            <input
              type="file"
              accept="video/*"
              className={FILE_INPUT_CLASS}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
