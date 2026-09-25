'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Plus } from 'lucide-react';
import type { SourcingCampaignDto } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCampaigns } from '@/hooks/use-talent-sourcing';

const STATUS_VARIANT: Record<string, 'muted' | 'primary' | 'warning' | 'success' | 'destructive'> = {
  DRAFT: 'muted', SCHEDULED: 'primary', SENDING: 'warning', SENT: 'success', PAUSED: 'muted', FAILED: 'destructive',
};

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '—';
}

export function CampaignsView() {
  const router = useRouter();
  const { data: campaigns, isLoading } = useCampaigns();

  const agg = (campaigns ?? []).reduce(
    (a, c) => ({
      sent: a.sent + c.stats.sent,
      opened: a.opened + c.stats.opened,
      replied: a.replied + c.stats.replied,
    }),
    { sent: 0, opened: 0, replied: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Reach out to a talent pool with a personalized email.</p>
        <Button asChild><Link href="/app/talent-sourcing/campaigns/new"><Plus className="size-4" /> New campaign</Link></Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (campaigns ?? []).length === 0 ? (
        <EmptyState
          icon={<Send />}
          title="No campaigns yet"
          description="Build a list, then send a personalized outreach campaign to reach candidates who haven't applied."
          action={<Button asChild><Link href="/app/talent-sourcing/campaigns/new"><Plus className="size-4" /> New campaign</Link></Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Campaigns" value={campaigns!.length} />
            <MetricCard label="Emails sent" value={agg.sent} />
            <MetricCard label="Open rate" value={pct(agg.opened, agg.sent)} />
            <MetricCard label="Reply rate" value={pct(agg.replied, agg.sent)} />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Recipients</TableHead>
                  <TableHead className="w-20">Sent</TableHead>
                  <TableHead className="w-20">Opened</TableHead>
                  <TableHead className="w-20">Replied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns!.map((c: SourcingCampaignDto) => (
                  <TableRow key={c.id} data-clickable="true" onClick={() => router.push(`/app/talent-sourcing/campaigns/${c.id}`)}>
                    <TableCell>
                      <div className="font-medium text-foreground">{c.name}</div>
                      {c.listName && <div className="text-xs text-muted-foreground">{c.listName}</div>}
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[c.status] ?? 'muted'}>{c.status.toLowerCase()}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{c.stats.recipients}</TableCell>
                    <TableCell className="text-muted-foreground">{c.stats.sent}</TableCell>
                    <TableCell className="text-muted-foreground">{c.stats.opened}</TableCell>
                    <TableCell className="text-muted-foreground">{c.stats.replied}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
