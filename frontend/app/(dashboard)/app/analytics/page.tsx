'use client';

import { BarChart3 } from 'lucide-react';
import { useAnalytics } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { STAGE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const m = data.metrics;
  const noData = m.totalApplicants === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Active jobs" value={m.activeJobs} />
        <MetricCard label="Applicants" value={m.totalApplicants} />
        <MetricCard label="Last 30 days" value={m.applicantsLast30Days} />
        <MetricCard label="Shortlisted" value={m.shortlisted} />
        <MetricCard label="Interviews" value={m.interviews} />
        <MetricCard label="Hired" value={m.hired} />
      </div>

      {noData ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No data yet"
          description="Analytics will populate as candidates apply to your jobs."
        />
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Hiring funnel</CardTitle></CardHeader>
            <CardContent>
              <BarList items={data.funnel.map((f) => ({ label: STAGE_LABELS[f.stage], value: f.count }))} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Candidates by location</CardTitle></CardHeader>
              <CardContent>
                {data.byLocation.length ? (
                  <BarList items={data.byLocation.map((l) => ({ label: l.label, value: l.count }))} />
                ) : (
                  <p className="text-sm text-muted-foreground">No location data.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expected salary</CardTitle></CardHeader>
              <CardContent>
                {data.salaryDistribution.length ? (
                  <BarList items={data.salaryDistribution.map((s) => ({ label: s.label, value: s.count }))} />
                ) : (
                  <p className="text-sm text-muted-foreground">No salary data.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
              <CardContent>
                <BarList items={data.sources.map((s) => ({ label: title(s.source), value: s.count }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Time to hire</CardTitle></CardHeader>
              <CardContent>
                {data.timeToHireDays != null ? (
                  <div>
                    <div className="text-3xl font-semibold tabular-nums">{data.timeToHireDays}</div>
                    <div className="text-sm text-muted-foreground">days on average</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hires yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-muted-foreground">{it.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full bg-primary')} style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right tabular-nums">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function title(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
