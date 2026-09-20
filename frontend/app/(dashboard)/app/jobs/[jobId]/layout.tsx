'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Briefcase, Link2, Pause, Play, XCircle, Copy } from 'lucide-react';
import { useJob, usePublishJob, useSetJobStatus, useCloneJob } from '@/hooks/use-jobs';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { RecordMenu, type RecordMenuAction } from '@/components/ui/record-menu';
import { PublishConfirmationDialog } from '@/components/jobs/publish-confirmation-dialog';
import { toast } from '@/components/ui/sonner';
import { publicConfig } from '@/lib/config';
import { EMPLOYMENT_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { data: job, isLoading, isError } = useJob(jobId);
  const publishJob = usePublishJob();
  const setStatus = useSetJobStatus();
  const cloneJob = useCloneJob();
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  // The job-creation flow redirects here with ?published=1 after a first publish
  // (spec item 4.3) — show the same confirmation moment the overflow menu's
  // Publish action shows, then strip the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams.get('published') === '1') {
      setPublishConfirmOpen(true);
      router.replace(pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // A job that's been deleted, or restricted to other members, 404s rather
  // than 403s (see requireJobAccess) — show one clean "not found" state here
  // instead of every child tab hitting the same error and hanging on its own
  // loading skeleton forever.
  if (isError) {
    return (
      <div className="space-y-6">
        <Link href="/app/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Jobs
        </Link>
        <EmptyState
          as="h1"
          icon={<Briefcase />}
          title="Job not found"
          description="This job may have been removed, or you may not have access to it."
          action={<Button onClick={() => router.push('/app/jobs')}>Back to jobs</Button>}
        />
      </div>
    );
  }

  const base = `/app/jobs/${jobId}`;
  const tabs = [
    { href: base, label: 'Overview', exact: true },
    { href: `${base}/candidates`, label: 'Candidates' },
    { href: `${base}/form`, label: 'Application form' },
    { href: `${base}/stages`, label: 'Pipeline' },
    { href: `${base}/workflow`, label: 'Workflow' },
    { href: `${base}/analytics`, label: 'Analytics' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  const applyUrl = job ? `${publicConfig.appUrl}/apply/${currentWorkspace.slug}/${job.slug}` : '';

  const copyLink = async () => {
    if (!job) return;
    await navigator.clipboard.writeText(applyUrl);
    toast.success('Application link copied');
  };

  const doPublish = () => {
    if (!job) return;
    const isFirstPublish = !job.publishedAt;
    publishJob.mutate(job.id, {
      onSuccess: () => {
        if (isFirstPublish) setPublishConfirmOpen(true);
        else toast.success('Your job is live and accepting applications');
      },
      onError: () => toast.error('Could not publish job'),
    });
  };

  const menuActions: RecordMenuAction[] = job
    ? [
        { label: 'Publish', icon: <Play className="size-4" />, hidden: job.status === 'PUBLISHED', onSelect: doPublish },
        {
          label: 'Pause',
          icon: <Pause className="size-4" />,
          hidden: job.status !== 'PUBLISHED',
          onSelect: () => setStatus.mutate(
            { jobId: job.id, status: 'PAUSED' },
            { onSuccess: () => toast.success('Job paused — no longer accepting applications'), onError: () => toast.error('Could not pause job') },
          ),
        },
        {
          label: 'Resume',
          icon: <Play className="size-4" />,
          hidden: job.status !== 'PAUSED',
          onSelect: () => setStatus.mutate(
            { jobId: job.id, status: 'PUBLISHED' },
            { onSuccess: () => toast.success('Job resumed and accepting applications again'), onError: () => toast.error('Could not resume job') },
          ),
        },
        {
          label: 'Close job',
          icon: <XCircle className="size-4" />,
          hidden: job.status === 'CLOSED' || job.status === 'ARCHIVED',
          onSelect: () => setStatus.mutate(
            { jobId: job.id, status: 'CLOSED' },
            { onSuccess: () => toast.success('Job closed and no longer accepting applications'), onError: () => toast.error('Could not close job') },
          ),
        },
        {
          label: 'Duplicate job',
          icon: <Copy className="size-4" />,
          separated: true,
          onSelect: () =>
            cloneJob.mutate(job.id, {
              onSuccess: (cloned) => { toast.success('Job duplicated'); router.push(`/app/jobs/${cloned.id}`); },
              onError: () => toast.error('Could not duplicate job'),
            }),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Link href="/app/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Jobs
      </Link>

      {isLoading || !job ? (
        <Skeleton className="h-10 w-64" />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-page-title">{job.title}</h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[job.location, EMPLOYMENT_LABELS[job.employmentType]].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={copyLink}>
              <Link2 className="size-4" /> Copy application link
            </Button>
            <RecordMenu
              actions={menuActions}
              className="h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            />
          </div>
        </div>
      )}

      <PublishConfirmationDialog
        open={publishConfirmOpen && Boolean(job)}
        onOpenChange={setPublishConfirmOpen}
        applyUrl={applyUrl}
      />

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}
