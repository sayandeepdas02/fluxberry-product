'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Link2, MoreHorizontal } from 'lucide-react';
import { useJob, usePublishJob, useSetJobStatus } from '@/hooks/use-jobs';
import { useFeature } from '@/hooks/use-features';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';
import { publicConfig } from '@/lib/config';
import { EMPLOYMENT_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;
  const pathname = usePathname();
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { data: job, isLoading } = useJob(jobId);
  const publishJob = usePublishJob();
  const setStatus = useSetJobStatus();
  const aiInterview = useFeature('AI_INTERVIEW');

  const base = `/app/jobs/${jobId}`;
  const tabs = [
    { href: base, label: 'Overview', exact: true },
    { href: `${base}/candidates`, label: 'Candidates' },
    { href: `${base}/form`, label: 'Application form' },
    { href: `${base}/assessments`, label: 'Assessments' },
    ...(aiInterview ? [{ href: `${base}/interview`, label: 'AI Interview' }] : []),
    { href: `${base}/workflow`, label: 'Workflow' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  const copyLink = async () => {
    if (!job) return;
    const url = `${publicConfig.appUrl}/apply/${currentWorkspace.slug}/${job.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success('Application link copied');
  };

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {job.status !== 'PUBLISHED' && (
                  <DropdownMenuItem onSelect={() => publishJob.mutate(job.id, { onSuccess: () => toast.success('Job published') })}>
                    Publish
                  </DropdownMenuItem>
                )}
                {job.status === 'PUBLISHED' && (
                  <DropdownMenuItem onSelect={() => setStatus.mutate({ jobId: job.id, status: 'PAUSED' })}>
                    Pause
                  </DropdownMenuItem>
                )}
                {job.status === 'PAUSED' && (
                  <DropdownMenuItem onSelect={() => setStatus.mutate({ jobId: job.id, status: 'PUBLISHED' })}>
                    Resume
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setStatus.mutate({ jobId: job.id, status: 'CLOSED' }, { onSuccess: () => toast.success('Job closed') } as any)}>
                  Close job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

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
