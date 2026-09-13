'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Briefcase, Pencil, Copy, XCircle, Archive } from 'lucide-react';
import { useJobs, useCloneJob, useSetJobStatus } from '@/hooks/use-jobs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { RecordMenu, type RecordMenuAction } from '@/components/ui/record-menu';
import { toast } from '@/components/ui/sonner';
import { WORK_MODE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'draft', label: 'Draft' },
  { key: 'closed', label: 'Closed' },
] as const;

export default function JobsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const { data: jobs, isLoading } = useJobs({ status: tab });
  const cloneJob = useCloneJob();
  const setStatus = useSetJobStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">Jobs</h1>
        <Button asChild>
          <Link href="/app/jobs/new">
            <Plus className="size-4" /> Create job
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card className="p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </Card>
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="No jobs yet"
          description="Create your first job and start receiving applications."
          action={
            <Button asChild>
              <Link href="/app/jobs/new">Create job</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead className="w-28">Applicants</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const actions: RecordMenuAction[] = [
                  { label: 'Edit', icon: <Pencil className="size-4" />, onSelect: () => router.push(`/app/jobs/${job.id}/settings`) },
                  {
                    label: 'Duplicate',
                    icon: <Copy className="size-4" />,
                    onSelect: () =>
                      cloneJob.mutate(job.id, {
                        onSuccess: (cloned) => { toast.success('Job duplicated'); router.push(`/app/jobs/${cloned.id}`); },
                        onError: () => toast.error('Could not duplicate job'),
                      }),
                  },
                  {
                    label: 'Close job',
                    icon: <XCircle className="size-4" />,
                    hidden: job.status === 'CLOSED' || job.status === 'ARCHIVED',
                    onSelect: () => setStatus.mutate({ jobId: job.id, status: 'CLOSED' }, { onSuccess: () => toast.success('Job closed and no longer accepting applications') }),
                  },
                  {
                    label: 'Archive',
                    icon: <Archive className="size-4" />,
                    variant: 'destructive',
                    separated: true,
                    hidden: job.status === 'ARCHIVED',
                    onSelect: () => setStatus.mutate({ jobId: job.id, status: 'ARCHIVED' }, { onSuccess: () => toast.success('Job archived') }),
                  },
                ];
                return (
                  <TableRow
                    key={job.id}
                    data-clickable="true"
                    onClick={() => router.push(`/app/jobs/${job.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{job.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {[job.location, WORK_MODE_LABELS[job.workMode]].filter(Boolean).join(' · ')}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{job.counts?.applicants ?? 0}</TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <RecordMenu actions={actions} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
