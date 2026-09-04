'use client';

import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { STAGE_LABELS } from '@/lib/labels';

const CHART_COLOR = 'hsl(var(--primary))';

function caseTitle(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function SimpleBarChart({ items }: { items: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, items.length * 36)}>
      <BarChart data={items} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={96} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(var(--border))' }}
          formatter={(v: number) => [v, 'Count']}
        />
        <Bar dataKey="value" fill={CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

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
              <SimpleBarChart items={data.funnel.map((f) => ({ label: STAGE_LABELS[f.stage], value: f.count }))} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Candidates by location</CardTitle></CardHeader>
              <CardContent>
                {data.byLocation.length ? (
                  <SimpleBarChart items={data.byLocation.map((l) => ({ label: l.label, value: l.count }))} />
                ) : (
                  <p className="text-sm text-muted-foreground">No location data.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expected salary</CardTitle></CardHeader>
              <CardContent>
                {data.salaryDistribution.length ? (
                  <SimpleBarChart items={data.salaryDistribution.map((s) => ({ label: s.label, value: s.count }))} />
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
                <SimpleBarChart items={data.sources.map((s) => ({ label: caseTitle(s.source), value: s.count }))} />
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
