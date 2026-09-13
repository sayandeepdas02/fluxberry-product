'use client';

import { useState } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAnalytics, useCohortComparison, useLeaderboard, type CohortRange } from '@/hooks/use-analytics';
import { useFeature } from '@/hooks/use-features';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { getPlanUpgradeFlag } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PlanUpgradeModal } from '@/components/billing/plan-upgrade-modal';
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

      <AdvancedAnalyticsSection />
    </div>
  );
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function AdvancedAnalyticsSection() {
  // Hooks must run unconditionally (rules of hooks) — the feature-flag check
  // only gates what's *rendered*, not which hooks fire; useCohortComparison/
  // useLeaderboard already no-op via `enabled` when the flag is off.
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');

  const today = new Date();
  const thirtyAgo = new Date(today.getTime() - 30 * 86_400_000);
  const twentyNineAgo = new Date(today.getTime() - 29 * 86_400_000);
  const sixtyAgo = new Date(today.getTime() - 60 * 86_400_000);

  // Disjoint by default (days 60-30 vs. 29-0) — sharing a boundary day would
  // double-count that day's applicants in both cohorts.
  const [rangeA, setRangeA] = useState<CohortRange>({ start: isoDateOnly(sixtyAgo), end: isoDateOnly(thirtyAgo) });
  const [rangeB, setRangeB] = useState<CohortRange>({ start: isoDateOnly(twentyNineAgo), end: isoDateOnly(today) });
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const cohort = useCohortComparison(rangeA, rangeB);
  const leaderboard = useLeaderboard();

  if (!advancedAnalytics) return null;

  const upgradeFlag = getPlanUpgradeFlag(cohort.error) ?? getPlanUpgradeFlag(leaderboard.error);

  return (
    <div className="space-y-6 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-section-title">Advanced</h2>
      </div>

      {upgradeFlag ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              Cohort comparison and the recruiter leaderboard are available on the Pro plan.
            </p>
            <PlanUpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} flag={upgradeFlag} />
            <button className="text-sm font-medium text-primary underline" onClick={() => setUpgradeOpen(true)}>
              View plans
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Cohort comparison</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Range A</span>
                  <Input type="date" value={rangeA.start} onChange={(e) => setRangeA((r) => ({ ...r, start: e.target.value }))} className="w-36" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="date" value={rangeA.end} onChange={(e) => setRangeA((r) => ({ ...r, end: e.target.value }))} className="w-36" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Range B</span>
                  <Input type="date" value={rangeB.start} onChange={(e) => setRangeB((r) => ({ ...r, start: e.target.value }))} className="w-36" />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="date" value={rangeB.end} onChange={(e) => setRangeB((r) => ({ ...r, end: e.target.value }))} className="w-36" />
                </div>
              </div>

              {cohort.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : cohort.data ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <DeltaMetric label="Applicants" a={cohort.data.rangeA.metrics.totalApplicants} b={cohort.data.rangeB.metrics.totalApplicants} delta={cohort.data.deltas.totalApplicants} />
                  <DeltaMetric label="Shortlisted" a={cohort.data.rangeA.metrics.shortlisted} b={cohort.data.rangeB.metrics.shortlisted} delta={cohort.data.deltas.shortlisted} />
                  <DeltaMetric label="Hired" a={cohort.data.rangeA.metrics.hired} b={cohort.data.rangeB.metrics.hired} delta={cohort.data.deltas.hired} />
                  <DeltaMetric
                    label="Time to hire (days)"
                    a={cohort.data.rangeA.metrics.timeToHireDays ?? '—'}
                    b={cohort.data.rangeB.metrics.timeToHireDays ?? '—'}
                    delta={cohort.data.deltas.timeToHireDays}
                    lowerIsBetter
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {leaderboard.data && (
            <Card>
              <CardHeader>
                <CardTitle>Recruiter activity</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Approximate — attributed by who created each job, since there&apos;s no per-application assignment yet.
                </p>
              </CardHeader>
              <CardContent>
                {leaderboard.data.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No jobs created yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recruiter</TableHead>
                        <TableHead>Jobs created</TableHead>
                        <TableHead>Applicants</TableHead>
                        <TableHead>Hired</TableHead>
                        <TableHead>Avg. time to hire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.data.rows.map((r) => (
                        <TableRow key={r.userId}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>{r.jobsCreated}</TableCell>
                          <TableCell>{r.totalApplicants}</TableCell>
                          <TableCell>{r.hired}</TableCell>
                          <TableCell>{r.avgTimeToHireDays != null ? `${r.avgTimeToHireDays}d` : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function DeltaMetric({
  label,
  a,
  b,
  delta,
  lowerIsBetter = false,
}: {
  label: string;
  a: number | string;
  b: number | string;
  delta: number | null;
  /** For metrics like time-to-hire where a lower number is the improvement, not a higher one. */
  lowerIsBetter?: boolean;
}) {
  const positive = delta != null && (lowerIsBetter ? delta < 0 : delta > 0);
  const negative = delta != null && (lowerIsBetter ? delta > 0 : delta < 0);
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{b}</span>
        <span className="text-xs text-muted-foreground">vs {a}</span>
      </div>
      {delta != null && (
        <div className={`text-xs font-medium ${positive ? 'text-success' : negative ? 'text-destructive' : 'text-muted-foreground'}`}>
          {positive ? '+' : ''}{delta}
        </div>
      )}
    </div>
  );
}
