'use client';

import { useState } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  useAnalytics,
  useCohortComparison,
  useLeaderboard,
  usePipelineHealth,
  useStageDwellTimes,
  useOfferMetrics,
  useSourceQuality,
  useInterviewScoreAnalytics,
  useRejectionDistribution,
  useJobFillRates,
  type CohortRange,
} from '@/hooks/use-analytics';
import { useFeature } from '@/hooks/use-features';
import { getPlanUpgradeFlag } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PlanUpgradeModal } from '@/components/billing/plan-upgrade-modal';
import { REASON_LABELS } from '@/components/candidates/reject-dialog';
import { STAGE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { PIPELINE_STAGES, type InterviewFeedbackRating } from '@/lib/shared';

const CHART_COLOR = 'hsl(var(--primary))';

/** Ashby-inspired stage palette — reused across the "time in process" chart and its legend. */
const STAGE_COLORS: Record<string, string> = {
  APPLIED: 'hsl(330, 81%, 60%)', // primary/pink
  SCREENING: 'hsl(220, 70%, 50%)', // blue
  ASSESSMENT: 'hsl(270, 60%, 55%)', // purple
  INTERVIEW: 'hsl(40, 80%, 55%)', // amber
  OFFER: 'hsl(150, 60%, 45%)', // green
};

const FEEDBACK_RATING_LABELS: Record<InterviewFeedbackRating, string> = {
  STRONG_NO: 'Strong No',
  NO: 'No',
  YES: 'Yes',
  STRONG_YES: 'Strong Yes',
};

function caseTitle(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/** >= 50% reads healthy, 25-49% is a caution, below that is a real drop-off. */
function rateColorClass(rate: number | null): string {
  if (rate == null) return 'text-muted-foreground';
  if (rate >= 50) return 'text-success';
  if (rate >= 25) return 'text-[hsl(var(--warning))]';
  return 'text-destructive';
}

function formatRate(rate: number | null): string {
  return rate == null ? '—' : `${Math.round(rate)}%`;
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
  const pipelineHealth = usePipelineHealth();
  const stageDwell = useStageDwellTimes();
  const offerMetrics = useOfferMetrics();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const m = data.metrics;
  const noData = m.totalApplicants === 0;

  return (
    <div className="space-y-6">
      <h1 className="text-page-title">Analytics</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active jobs" value={m.activeJobs} />
        <MetricCard label="Applicants" value={m.totalApplicants} />
        <MetricCard label="Last 30 days" value={m.applicantsLast30Days} />
        <MetricCard label="In offer stage" value={m.inOfferStage} />
        <MetricCard label="Upcoming interviews" value={m.upcomingInterviews} />
        <MetricCard label="Shortlisted" value={m.shortlisted} />
        <MetricCard label="Hired" value={m.hired} />
        <MetricCard
          label="Offer acceptance rate"
          value={offerMetrics.isLoading ? <Skeleton className="h-7 w-14" /> : formatRate(offerMetrics.data?.acceptanceRate ?? null)}
        />
      </div>

      {noData ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No data yet"
          description="Analytics will populate as candidates apply to your jobs."
        />
      ) : (
        <>
          <h2 className="sr-only">Overview</h2>
          <Card>
            <CardHeader><CardTitle>Hiring funnel</CardTitle></CardHeader>
            <CardContent>
              <SimpleBarChart items={data.funnel.map((f) => ({ label: STAGE_LABELS[f.stage], value: f.count }))} />
            </CardContent>
          </Card>

          <PipelineHealthCard isLoading={pipelineHealth.isLoading} data={pipelineHealth.data} />

          <TimeInProcessCard isLoading={stageDwell.isLoading} data={stageDwell.data} />

          <OffersCard isLoading={offerMetrics.isLoading} data={offerMetrics.data} />

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
      <AdvancedAnalyticsV2Section />
    </div>
  );
}

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function PipelineHealthCard({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof usePipelineHealth>['data'];
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Pipeline health</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Passthrough rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PIPELINE_STAGES.map((stage) => {
                const row = data.stages.find((s) => s.stage === stage);
                return (
                  <TableRow key={stage}>
                    <TableCell className="font-medium">{STAGE_LABELS[stage]}</TableCell>
                    <TableCell className="font-mono tabular-nums">{row?.active ?? 0}</TableCell>
                    <TableCell className="font-mono tabular-nums">{row?.completed ?? 0}</TableCell>
                    <TableCell className={cn('font-mono tabular-nums font-medium', rateColorClass(row?.passthroughRate ?? null))}>
                      {formatRate(row?.passthroughRate ?? null)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No pipeline data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TimeInProcessCard({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof useStageDwellTimes>['data'];
}) {
  const stagesToShow = PIPELINE_STAGES.filter((s) => s !== 'HIRED');
  const findPoint = (stage: string) => data?.stages.find((s) => s.stage === stage);

  const chartData: Record<string, string | number> = { name: 'All' };
  for (const stage of stagesToShow) {
    chartData[stage] = findPoint(stage)?.medianDays ?? 0;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time in process</CardTitle>
        <p className="text-sm text-muted-foreground">Median days per stage (last 90 days)</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : data ? (
          <>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart layout="vertical" data={[chartData]}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip />
                {stagesToShow.map((stage) => (
                  <Bar key={stage} dataKey={stage} stackId="a" fill={STAGE_COLORS[stage]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {stagesToShow.map((stage) => {
                const point = findPoint(stage);
                return (
                  <div key={stage} className="flex items-center gap-1.5 text-xs">
                    <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} />
                    <span className="text-muted-foreground">{STAGE_LABELS[stage]}</span>
                    <span className="font-mono tabular-nums font-medium">
                      {point?.medianDays != null ? `${point.medianDays}d` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Based on applications that progressed through each stage</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No stage timing data yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function OffersCard({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data: ReturnType<typeof useOfferMetrics>['data'];
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Offers</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !data || data.totalSent === 0 ? (
          <EmptyState
            icon={<BarChart3 />}
            title="No offers yet"
            description="Offer metrics will populate once you send your first offer."
          />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Offers sent</div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{data.totalSent}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Acceptance rate</div>
                <div className={cn('mt-1 font-mono text-xl font-semibold tabular-nums', rateColorClass(data.acceptanceRate))}>
                  {formatRate(data.acceptanceRate)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Avg. response time</div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums">
                  {data.avgResponseDays != null ? `${data.avgResponseDays}d` : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Pending</div>
                <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{data.pending}</div>
              </div>
            </div>

            <div>
              <ResponsiveContainer width="100%" height={40}>
                <BarChart
                  layout="vertical"
                  data={[
                    { name: 'Offers', Accepted: data.accepted, Declined: data.declined, Expired: data.expired, Rescinded: data.rescinded },
                  ]}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip />
                  <Bar dataKey="Accepted" stackId="a" fill="hsl(var(--success))" />
                  <Bar dataKey="Declined" stackId="a" fill="hsl(var(--destructive))" />
                  <Bar dataKey="Expired" stackId="a" fill="hsl(var(--muted-foreground))" fillOpacity={0.5} />
                  <Bar dataKey="Rescinded" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" />Accepted ({data.accepted})</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-destructive" />Declined ({data.declined})</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/50" />Expired ({data.expired})</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground" />Rescinded ({data.rescinded})</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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

function AdvancedAnalyticsV2Section() {
  // Same rules-of-hooks caveat as AdvancedAnalyticsSection above — these hooks
  // already no-op via `enabled` when the ADVANCED_ANALYTICS flag is off.
  const advancedAnalytics = useFeature('ADVANCED_ANALYTICS');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const sourceQuality = useSourceQuality();
  const interviewScores = useInterviewScoreAnalytics();
  const rejectionDistribution = useRejectionDistribution();
  const jobFillRates = useJobFillRates();

  if (!advancedAnalytics) return null;

  const upgradeFlag =
    getPlanUpgradeFlag(sourceQuality.error) ??
    getPlanUpgradeFlag(interviewScores.error) ??
    getPlanUpgradeFlag(rejectionDistribution.error) ??
    getPlanUpgradeFlag(jobFillRates.error);

  return (
    <div className="space-y-6 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-section-title">Advanced insights</h2>
      </div>

      {upgradeFlag ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="size-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              Source quality, interview insights, rejection reasons, and job fill rates are available on the Pro plan.
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
            <CardHeader><CardTitle>Source quality</CardTitle></CardHeader>
            <CardContent>
              {sourceQuality.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : sourceQuality.data && sourceQuality.data.sources.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Applications</TableHead>
                      <TableHead>Shortlisted</TableHead>
                      <TableHead>Hired</TableHead>
                      <TableHead>Hire rate</TableHead>
                      <TableHead>Avg. score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceQuality.data.sources.map((s) => (
                      <TableRow key={s.source}>
                        <TableCell className="font-medium">{caseTitle(s.source)}</TableCell>
                        <TableCell className="font-mono tabular-nums">{s.total}</TableCell>
                        <TableCell className="font-mono tabular-nums">{s.shortlisted}</TableCell>
                        <TableCell className="font-mono tabular-nums">{s.hired}</TableCell>
                        <TableCell className={cn('font-mono tabular-nums font-medium', rateColorClass(s.hireRate))}>
                          {formatRate(s.hireRate)}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">{s.avgScreeningScore ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No source data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Interview insights</CardTitle></CardHeader>
            <CardContent>
              {interviewScores.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : interviewScores.data ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h4 className="text-subtle-title mb-3">AI interview scores</h4>
                    {interviewScores.data.aiScores.distribution.length ? (
                      <SimpleBarChart
                        items={interviewScores.data.aiScores.distribution.map((d) => ({ label: d.label, value: d.count }))}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">No completed AI interviews yet.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-subtle-title mb-3">Interviewer feedback</h4>
                    {interviewScores.data.feedbackRatings.distribution.length ? (
                      <SimpleBarChart
                        items={interviewScores.data.feedbackRatings.distribution.map((d) => ({
                          label: FEEDBACK_RATING_LABELS[d.rating],
                          value: d.count,
                        }))}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">No feedback submitted yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No interview data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rejection reasons</CardTitle></CardHeader>
            <CardContent>
              {rejectionDistribution.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : rejectionDistribution.data && rejectionDistribution.data.reasons.length ? (
                <SimpleBarChart
                  items={rejectionDistribution.data.reasons.map((r) => ({ label: REASON_LABELS[r.reason], value: r.count }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No rejections recorded yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Job fill rates</CardTitle></CardHeader>
            <CardContent>
              {jobFillRates.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : jobFillRates.data && jobFillRates.data.jobs.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Openings</TableHead>
                      <TableHead>Hired</TableHead>
                      <TableHead>Fill rate</TableHead>
                      <TableHead>Time to fill</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobFillRates.data.jobs.map((j) => (
                      <TableRow key={j.jobId}>
                        <TableCell className="font-medium">{j.title}</TableCell>
                        <TableCell className="font-mono tabular-nums">{j.openings}</TableCell>
                        <TableCell className="font-mono tabular-nums">{j.hired}</TableCell>
                        <TableCell className={cn('font-mono tabular-nums font-medium', rateColorClass(j.fillRate))}>
                          {formatRate(j.fillRate)}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {j.timeToFillDays != null ? `${j.timeToFillDays}d` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No jobs to report on yet.</p>
              )}
            </CardContent>
          </Card>
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
