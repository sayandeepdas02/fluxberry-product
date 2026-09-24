'use client';

import { useEffect, useState } from 'react';
import { Gift, Copy } from 'lucide-react';
import { ROLE_RANK } from '@/lib/shared';
import type { ReferralDto } from '@/lib/shared';
import { useJobs } from '@/hooks/use-jobs';
import { useMyReferrals, useCreateReferral, useWorkspaceReferrals, useUpdateReferralReward } from '@/hooks/use-referrals';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { FeatureGate } from '@/components/billing/feature-gate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';

const REWARD_LABELS: Record<string, string> = { NONE: 'No reward yet', PENDING: 'Pending payout', PAID: 'Paid' };
const REWARD_VARIANT: Record<string, 'muted' | 'warning' | 'success'> = { NONE: 'muted', PENDING: 'warning', PAID: 'success' };

export default function ReferralsPage() {
  const { currentWorkspace } = useWorkspace();
  const isAdmin = ROLE_RANK[currentWorkspace.role] >= ROLE_RANK.admin;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title">Referrals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a shareable link for an open role — you&apos;ll get credit for anyone who applies through it.
        </p>
      </div>

      <FeatureGate feature="REFERRALS">
        <MyReferrals />
        {isAdmin && <RewardManagement />}
      </FeatureGate>
    </div>
  );
}

function MyReferrals() {
  const { data: openJobs, isLoading: jobsLoading } = useJobs({ status: 'active' });
  const { data: referrals, isLoading } = useMyReferrals();
  const createReferral = useCreateReferral();
  const [selectedJobId, setSelectedJobId] = useState<string>('');

  const generate = () => {
    if (!selectedJobId) return;
    createReferral.mutate(
      { jobId: selectedJobId },
      {
        onSuccess: () => toast.success('Referral link ready'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not create referral link'),
      },
    );
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Your links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobsLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : !openJobs?.length ? (
          <p className="text-sm text-muted-foreground">No open roles to refer someone to right now.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Choose a role" /></SelectTrigger>
              <SelectContent>
                {openJobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generate} loading={createReferral.isPending} disabled={!selectedJobId}>
              Get link
            </Button>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !referrals?.length ? (
          <EmptyState
            icon={<Gift />}
            title="No referral links yet"
            description="Pick a role above to generate your first shareable link."
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {referrals.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{r.jobTitle}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{r.shareUrl}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {r.applicationCount} applicant{r.applicationCount === 1 ? '' : 's'}
                    {r.hiredCount > 0 && ` · ${r.hiredCount} hired`}
                  </span>
                  <Badge variant={REWARD_VARIANT[r.rewardStatus]}>{REWARD_LABELS[r.rewardStatus]}</Badge>
                  <Button size="sm" variant="outline" onClick={() => copy(r.shareUrl)}>
                    <Copy className="size-3.5" /> Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RewardManagement() {
  const { data: referrals, isLoading } = useWorkspaceReferrals();

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Manage rewards</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Rewards are tracked manually — mark a referral as paid once you&apos;ve settled it outside Fluxberry.
        </p>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !referrals?.length ? (
          <p className="text-sm text-muted-foreground">No referral links have been created yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Hired</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((r) => (
                <ReferralRewardRow key={r.id} referral={r} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type RewardStatus = 'NONE' | 'PENDING' | 'PAID';

/**
 * Status and note are edited independently (a dropdown, a text field) but
 * always submitted together from local state — never a stale prop value.
 * That's what actually prevents the race a naive onBlur-submits-old-status
 * approach has: if the note is edited then the status changed quickly after,
 * both requests carry the *current* pair, so whichever lands last still
 * reflects the latest intent. Controls are also disabled while a save for
 * this row is in flight, so two edits can't overlap into competing requests
 * in the first place.
 */
function ReferralRewardRow({ referral }: { referral: ReferralDto }) {
  const updateReward = useUpdateReferralReward();
  const [status, setStatus] = useState<RewardStatus>(referral.rewardStatus as RewardStatus);
  const [note, setNote] = useState(referral.rewardNote ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setStatus(referral.rewardStatus as RewardStatus);
      setNote(referral.rewardNote ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referral.rewardStatus, referral.rewardNote]);

  const save = (nextStatus: RewardStatus, nextNote: string) => {
    setDirty(true);
    updateReward.mutate(
      { referralId: referral.id, input: { rewardStatus: nextStatus, rewardNote: nextNote || undefined } },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success('Reward status updated');
        },
        onError: (err) => {
          setDirty(false);
          toast.error(err instanceof Error ? err.message : 'Could not update reward status');
        },
      },
    );
  };

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{referral.referrerName}</div>
        <div className="text-xs text-muted-foreground">{referral.referrerEmail}</div>
      </TableCell>
      <TableCell>{referral.jobTitle}</TableCell>
      <TableCell>{referral.applicationCount}</TableCell>
      <TableCell>{referral.hiredCount}</TableCell>
      <TableCell>
        <Select
          value={status}
          disabled={updateReward.isPending}
          onValueChange={(v) => {
            const next = v as RewardStatus;
            setStatus(next);
            save(next, note);
          }}
        >
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">None</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          value={note}
          placeholder="Optional note"
          maxLength={500}
          className="h-8 w-40 text-xs"
          disabled={updateReward.isPending}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== (referral.rewardNote ?? '')) save(status, note);
          }}
        />
      </TableCell>
    </TableRow>
  );
}
