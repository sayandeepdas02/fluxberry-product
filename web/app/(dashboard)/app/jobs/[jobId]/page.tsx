'use client';

import { useParams } from 'next/navigation';
import { useJob } from '@/hooks/use-jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Markdown } from '@/components/ui/markdown';
import { Skeleton } from '@/components/ui/skeleton';

export default function JobOverviewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading } = useJob(jobId);

  if (isLoading || !job) {
    return <Skeleton className="h-64 w-full" />;
  }

  const c = job.counts;
  return (
    <div className="space-y-6">
      <h2 className="sr-only">Job overview</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Applicants" value={c?.applicants ?? 0} />
        <MetricCard label="Shortlisted" value={c?.shortlisted ?? 0} />
        <MetricCard label="Hired" value={c?.hired ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          {job.description ? (
            <Markdown content={job.description} />
          ) : (
            <p className="text-sm text-muted-foreground">No description yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
