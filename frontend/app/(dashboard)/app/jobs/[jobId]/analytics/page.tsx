'use client';

import { useParams } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { useJobAnalytics } from '@/hooks/use-analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { STAGE_LABELS } from '@/lib/labels';

const PRIMARY = 'hsl(var(--primary))';

function HBarChart({ items }: { items: { label: string; value: number }[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(100, items.length * 36)}>
      <BarChart data={items} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(var(--border))' }}
          formatter={(v: number) => [v, 'Count']}
        />
        <Bar dataKey="value" fill={PRIMARY} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function JobAnalyticsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isLoading } = useJobAnalytics(jobId);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return null;

  const a = data.assessments;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Assessments sent" value={a.totalSent} />
        <MetricCard label="Completed" value={a.completed} />
        <MetricCard label="Avg score" value={a.avgScore != null ? `${a.avgScore}` : '—'} />
        <MetricCard label="Completion rate" value={a.completionRate != null ? `${a.completionRate}%` : '—'} />
      </div>

      <Card>
        <CardHeader><CardTitle>Applicants over last 30 days</CardTitle></CardHeader>
        <CardContent>
          {data.applicantsOverTime.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.applicantsOverTime} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid hsl(var(--border))' }}
                  formatter={(v: number) => [v, 'Applicants']}
                />
                <Line type="monotone" dataKey="count" stroke={PRIMARY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No applications in the last 30 days.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hiring funnel</CardTitle></CardHeader>
        <CardContent>
          <HBarChart items={data.funnel.map((f) => ({ label: STAGE_LABELS[f.stage], value: f.count }))} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Screening score distribution</CardTitle></CardHeader>
          <CardContent>
            <HBarChart items={data.screeningScoreDistribution} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Top locations</CardTitle></CardHeader>
          <CardContent>
            <HBarChart items={data.topLocations.map((l) => ({ label: l.label, value: l.count }))} />
          </CardContent>
        </Card>
      </div>

      {data.sources.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
          <CardContent>
            <HBarChart items={data.sources.map((s) => ({ label: s.source, value: s.count }))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
