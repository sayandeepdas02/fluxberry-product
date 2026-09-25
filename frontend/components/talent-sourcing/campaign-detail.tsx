'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { SourcingCampaignRecipientDto } from '@/lib/shared';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MetricCard } from '@/components/ui/metric-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCampaign, useCampaignRecipients } from '@/hooks/use-talent-sourcing';
import { CampaignComposer } from './campaign-composer';

const STATUS_VARIANT: Record<string, 'muted' | 'primary' | 'warning' | 'success' | 'destructive'> = {
  DRAFT: 'muted', SCHEDULED: 'primary', SENDING: 'warning', SENT: 'success', PAUSED: 'muted', FAILED: 'destructive',
};
const RECIP_VARIANT: Record<string, 'muted' | 'primary' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'muted', SENT: 'primary', DELIVERED: 'primary', OPENED: 'primary',
  REPLIED: 'success', BOUNCED: 'destructive', FAILED: 'destructive', UNSUBSCRIBED: 'warning', SKIPPED: 'muted',
};

function pct(n: number, d: number) {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : '—';
}

export function CampaignPage({ campaignId }: { campaignId: string }) {
  const { data: campaign, isLoading } = useCampaign(campaignId);

  if (isLoading || !campaign) return <Skeleton className="h-96 w-full" />;
  // A draft is still editable — reuse the composer.
  if (campaign.status === 'DRAFT') return <CampaignComposer campaignId={campaignId} />;

  return <CampaignDetail campaignId={campaignId} />;
}

function CampaignDetail({ campaignId }: { campaignId: string }) {
  const { data: campaign } = useCampaign(campaignId);
  const { data: recipients, isLoading } = useCampaignRecipients(campaignId);
  if (!campaign) return null;
  const s = campaign.stats;

  return (
    <div className="space-y-4">
      <Link href="/app/talent-sourcing/campaigns" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All campaigns
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-section-title text-foreground">{campaign.name}</h2>
            <Badge variant={STATUS_VARIANT[campaign.status] ?? 'muted'}>{campaign.status.toLowerCase()}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {campaign.listName ? `To ${campaign.listName} · ` : ''}{campaign.subject}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Recipients" value={s.recipients} />
        <MetricCard label="Sent" value={s.sent} />
        <MetricCard label="Opened" value={s.opened} hint={pct(s.opened, s.sent)} />
        <MetricCard label="Replied" value={s.replied} hint={pct(s.replied, s.sent)} />
        <MetricCard label="Bounced" value={s.bounced} />
        <MetricCard label="Unsub." value={s.unsubscribed} />
      </div>

      <Card>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-40">Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recipients ?? []).map((r: SourcingCampaignRecipientDto) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{r.fullName}</div>
                    {r.company && <div className="text-xs text-muted-foreground">{r.title ? `${r.title} · ` : ''}{r.company}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                  <TableCell>
                    <Badge variant={RECIP_VARIANT[r.status] ?? 'muted'}>{r.status.toLowerCase()}</Badge>
                    {r.error && <div className="mt-0.5 text-xs text-destructive">{r.error}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.sentAt ? new Date(r.sentAt).toLocaleString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
