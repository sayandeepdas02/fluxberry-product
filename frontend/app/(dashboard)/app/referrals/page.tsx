'use client';

import { useState } from 'react';
import { Gift, Copy } from 'lucide-react';
import { ROLE_RANK } from '@fluxberry/shared';
import type { ReferralDto } from '@fluxberry/shared';
import { useJobs } from '@/hooks/use-jobs';
import { useMyReferrals, useCreateReferral, useWorkspaceReferrals, useUpdateReferralReward } from '@/hooks/use-referrals';
import { useWorkspace } from '@/components/providers/workspace-provider';
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

      <MyReferrals />

      {isAdmin && <RewardManagement />}
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
        <CardTitle>Your links</CardTitle>
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
  const updateReward = useUpdateReferralReward();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const setReward = (r: ReferralDto, rewardStatus: 'NONE' | 'PENDING' | 'PAID') => {
    updateReward.mutate(
      { referralId: r.id, input: { rewardStatus, rewardNote: notes[r.id] ?? r.rewardNote ?? undefined } },
      {
        onSuccess: () => toast.success('Reward status updated'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update reward status'),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage rewards</CardTitle>
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
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.referrerName}</div>
                    <div className="text-xs text-muted-foreground">{r.referrerEmail}</div>
                  </TableCell>
                  <TableCell>{r.jobTitle}</TableCell>
                  <TableCell>{r.applicationCount}</TableCell>
                  <TableCell>{r.hiredCount}</TableCell>
                  <TableCell>
                    <Select value={r.rewardStatus} onValueChange={(v) => setReward(r, v as 'NONE' | 'PENDING' | 'PAID')}>
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
                      defaultValue={r.rewardNote ?? ''}
                      placeholder="Optional note"
                      className="h-8 w-40 text-xs"
                      onChange={(e) => setNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                      onBlur={() => notes[r.id] !== undefined && setReward(r, r.rewardStatus as 'NONE' | 'PENDING' | 'PAID')}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
