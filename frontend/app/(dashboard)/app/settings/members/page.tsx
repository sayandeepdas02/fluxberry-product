'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Mail, RefreshCw, ShieldCheck, UserMinus, XCircle } from 'lucide-react';
import type { WorkspaceMemberDto, WorkspaceInviteDto, Role, InviteMemberInput } from '@/lib/shared';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { RecordMenu, type RecordMenuAction } from '@/components/ui/record-menu';
import { toast } from '@/components/ui/sonner';
import { initials } from '@/lib/utils';

const ROLE_OPTIONS: Role[] = ['owner', 'admin', 'recruiter', 'viewer'];
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function MembersSettingsPage() {
  const { currentWorkspace, user } = useWorkspace();
  const wsId = currentWorkspace.id;
  const canManage = currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin';
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => api.get<WorkspaceMemberDto[]>(`/api/v1/workspaces/${wsId}/members`),
  });

  const { data: invites } = useQuery({
    queryKey: ['invites', wsId],
    queryFn: () => api.get<WorkspaceInviteDto[]>(`/api/v1/workspaces/${wsId}/invites`),
  });
  const pendingInvites = invites?.filter((i) => i.status === 'PENDING' || i.status === 'EXPIRED') ?? [];

  const resendInvite = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/workspaces/${wsId}/invites/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', wsId] });
      toast.success('Invite resent');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not resend invite'),
  });

  const revokeInvite = useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/workspaces/${wsId}/invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', wsId] });
      toast.success('Invite revoked');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not revoke invite'),
  });

  const updateRole = useMutation({
    mutationFn: (v: { id: string; role: Role }) =>
      api.patch(`/api/v1/workspaces/${wsId}/members/${v.id}`, { role: v.role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members', wsId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not update role'),
  });

  const removeMember = useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/workspaces/${wsId}/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', wsId] });
      toast.success('Member removed and their access revoked');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not remove'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">People with access to {currentWorkspace.name}.</p>
        {canManage && <Button onClick={() => setInviteOpen(true)}>Invite member</Button>}
      </div>

      <Card className="divide-y divide-border">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}

        {members?.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar>
              <AvatarFallback>{initials(m.user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {m.user.name}
                {m.userId === user.id && <span className="ml-2 text-xs text-muted-foreground">You</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
            </div>
            {canManage ? (
              <RecordMenu
                actions={[
                  ...ROLE_OPTIONS.map<RecordMenuAction>((r) => ({
                    label: r === m.role ? `${capitalize(r)} (current)` : `Make ${r}`,
                    icon: r === m.role ? <Check className="size-4" /> : <ShieldCheck className="size-4" />,
                    disabled: r === m.role,
                    onSelect: () => updateRole.mutate({ id: m.id, role: r }),
                  })),
                  {
                    label: 'Remove from workspace',
                    icon: <UserMinus className="size-4" />,
                    variant: 'destructive',
                    separated: true,
                    hidden: m.userId === user.id,
                    onSelect: () => removeMember.mutate(m.id),
                  },
                ]}
              />
            ) : (
              <span className="text-sm capitalize text-muted-foreground">{m.role}</span>
            )}
          </div>
        ))}
      </Card>

      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Pending invites</p>
          <Card className="divide-y divide-border">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarFallback>
                    <Mail className="size-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{inv.email}</div>
                  <div className="truncate text-xs text-muted-foreground capitalize">
                    {inv.role} · {inv.status === 'EXPIRED' ? 'Expired' : 'Invited'} by {inv.invitedBy.name}
                  </div>
                </div>
                {canManage ? (
                  <RecordMenu
                    actions={[
                      {
                        label: 'Resend invite',
                        icon: <RefreshCw className="size-4" />,
                        onSelect: () => resendInvite.mutate(inv.id),
                      },
                      {
                        label: 'Revoke invite',
                        icon: <XCircle className="size-4" />,
                        variant: 'destructive',
                        separated: true,
                        hidden: inv.status === 'EXPIRED',
                        onSelect: () => revokeInvite.mutate(inv.id),
                      },
                    ]}
                  />
                ) : (
                  <span className="text-sm capitalize text-muted-foreground">{inv.status.toLowerCase()}</span>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} workspaceId={wsId} />
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteMemberInput['role']>('recruiter');

  const invite = useMutation({
    mutationFn: () => api.post(`/api/v1/workspaces/${workspaceId}/invites`, { email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', workspaceId] });
      toast.success("Invite sent — they'll get access once they accept");
      setEmail('');
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not invite'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
          </Field>
          <Field label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as InviteMemberInput['role'])}>
              <SelectTrigger className="capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['admin', 'recruiter', 'viewer'] as const).map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => invite.mutate()} loading={invite.isPending} disabled={!email.trim()}>
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
