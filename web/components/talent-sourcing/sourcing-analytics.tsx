'use client';

import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { useCampaigns } from '@/hooks/use-talent-sourcing';

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '—';
}

export function SourcingAnalytics() {
  const { data: campaigns, isLoading } = useCampaigns();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!campaigns || campaigns.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 />}
        title="No outreach yet"
        description="Send a campaign and your open, reply, and bounce rates will show up here."
      />
    );
  }

  const t = campaigns.reduce(
    (a, c) => ({
      recipients: a.recipients + c.stats.recipients,
      sent: a.sent + c.stats.sent,
      delivered: a.delivered + c.stats.delivered,
      opened: a.opened + c.stats.opened,
      replied: a.replied + c.stats.replied,
      bounced: a.bounced + c.stats.bounced,
    }),
    { recipients: 0, sent: 0, delivered: 0, opened: 0, replied: 0, bounced: 0 },
  );

  const funnel = [
    { stage: 'Sent', value: t.sent },
    { stage: 'Delivered', value: t.delivered },
    { stage: 'Opened', value: t.opened },
    { stage: 'Replied', value: t.replied },
  ];

  const perCampaign = campaigns
    .filter((c) => c.stats.sent > 0)
    .slice(0, 10)
    .map((c) => ({ name: c.name.length > 16 ? `${c.name.slice(0, 16)}…` : c.name, Opened: c.stats.opened, Replied: c.stats.replied }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Profiles contacted" value={t.sent} hint={`${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''}`} />
        <MetricCard label="Open rate" value={pct(t.opened, t.sent)} hint={`${t.opened} opens`} />
        <MetricCard label="Reply rate" value={pct(t.replied, t.sent)} hint={`${t.replied} replies`} />
        <MetricCard label="Bounce rate" value={pct(t.bounced, t.sent)} hint={`${t.bounced} bounced`} />
      </div>

      <Card className="p-4">
        <div className="mb-3 text-card-title text-foreground">Outreach funnel</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={32} />
              <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {perCampaign.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 text-card-title text-foreground">By campaign</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perCampaign} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Bar dataKey="Opened" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Replied" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
