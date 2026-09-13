'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Briefcase } from 'lucide-react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useJobs } from '@/hooks/use-jobs';
import { useCandidates } from '@/hooks/use-candidates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { ScoreBadge } from '@/components/candidates/score-badge';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useWorkspace();
  const firstName = user.name.split(' ')[0];
  const { data: jobs, isLoading } = useJobs({ status: 'all' });
  const { data: recent } = useCandidates({ limit: 5, sort: 'appliedAt', order: 'desc' });

  const totals = (jobs ?? []).reduce(
    (acc, j) => {
      const c = j.counts;
      acc.applicants += c?.applicants ?? 0;
      acc.shortlisted += c?.shortlisted ?? 0;
      acc.interviews += c?.interview ?? 0;
      acc.hired += c?.hired ?? 0;
      return acc;
    },
    { applicants: 0, shortlisted: 0, interviews: 0, hired: 0 },
  );
  const activeJobs = (jobs ?? []).filter((j) => j.status === 'PUBLISHED' || j.status === 'PAUSED');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-page-title">{greeting()}, {firstName}</h1>
        <Button asChild>
          <Link href="/app/jobs/new"><Plus className="size-4" /> Create job</Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="Start hiring"
          description="Create your first job and let candidates apply directly. AI will screen every applicant for you."
          action={<Button asChild><Link href="/app/jobs/new">Create job</Link></Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Active jobs" value={activeJobs.length} />
            <MetricCard label="Applicants" value={totals.applicants} />
            <MetricCard label="Shortlisted" value={totals.shortlisted} />
            <MetricCard label="Interviews" value={totals.interviews} />
            <MetricCard label="Hired" value={totals.hired} />
          </div>

          <Card>
            <h2 className="sr-only">Active jobs</h2>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Active jobs</CardTitle>
              <Link href="/app/jobs" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>
            </CardHeader>
            <CardContent className="p-0">
              {activeJobs.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted-foreground">No active jobs. Publish a job to start receiving applications.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead className="w-28">Applicants</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeJobs.slice(0, 5).map((j) => (
                      <TableRow key={j.id} data-clickable="true" onClick={() => router.push(`/app/jobs/${j.id}`)}>
                        <TableCell className="font-medium">{j.title}</TableCell>
                        <TableCell className="text-muted-foreground">{j.counts?.applicants ?? 0}</TableCell>
                        <TableCell><JobStatusBadge status={j.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {!!recent?.items.length && (
            <Card>
              <h2 className="sr-only">Recent candidates</h2>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent candidates</CardTitle>
                <Link href="/app/candidates" className="text-sm text-muted-foreground hover:text-foreground">View all</Link>
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {recent.items.map((c) => (
                  <button
                    key={c.applicationId}
                    onClick={() => router.push(`/app/candidates/${c.candidateId}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.jobTitle}</div>
                    </div>
                    <ScoreBadge score={c.score} />
                    <span className="w-24 text-right text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.appliedAt), { addSuffix: true })}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
