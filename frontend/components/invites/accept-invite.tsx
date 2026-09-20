'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PublicInviteDto, AcceptInviteResultDto } from '@/lib/shared';
import { api, setWorkspaceId } from '@/lib/api-client';
import { useSession } from '@/hooks/use-session';
import { signOut } from '@/lib/auth-actions';
import { AuthHeading, authButtonClass } from '@/components/marketing/auth-shell';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);

  const {
    data: invite,
    isLoading: inviteLoading,
    error: inviteError,
  } = useQuery<PublicInviteDto>({
    queryKey: ['invite', token],
    queryFn: () => api.get<PublicInviteDto>(`/api/v1/public/invites/${token}`, { public: true }),
    retry: false,
  });

  const { data: session, isLoading: sessionLoading } = useSession();

  const accept = useMutation({
    mutationFn: () => api.post<AcceptInviteResultDto>(`/api/v1/invites/${token}/accept`),
    onSuccess: async (result) => {
      setWorkspaceId(result.workspace.id);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      toast.success(`Joined ${result.workspace.name}`);
      router.replace('/app');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not accept invite'),
  });

  if (inviteLoading || sessionLoading) return <PageSpinner label="Loading invite…" />;

  if (inviteError || !invite) {
    return <AuthHeading title="Invite not found" subtitle="This invite link is invalid." />;
  }

  if (invite.status === 'REVOKED') {
    return (
      <AuthHeading
        title="Invite revoked"
        subtitle="This invite has been revoked. Ask a workspace admin to send you a new one."
      />
    );
  }

  if (invite.status === 'EXPIRED') {
    return (
      <AuthHeading
        title="Invite expired"
        subtitle="This invite has expired. Ask a workspace admin to resend it."
      />
    );
  }

  if (invite.status === 'ACCEPTED') {
    return (
      <>
        <AuthHeading title="Already accepted" subtitle="This invite has already been accepted." />
        <Button className={`${authButtonClass} mt-6`} onClick={() => router.push(session ? '/app' : '/login')}>
          {session ? 'Go to workspace' : 'Log in'}
        </Button>
      </>
    );
  }

  const nextParam = `?next=${encodeURIComponent(`/accept-invite/${token}`)}&email=${encodeURIComponent(invite.email)}`;
  const emailMismatch = Boolean(session) && session!.user.email.toLowerCase() !== invite.email;

  return (
    <>
      <AuthHeading
        title={`Join ${invite.workspaceName}`}
        subtitle={
          <>
            <strong className="text-ink">{invite.inviterName}</strong> invited you to join{' '}
            <strong className="text-ink">{invite.workspaceName}</strong> as a{' '}
            <strong className="text-ink">{capitalize(invite.role)}</strong>.
          </>
        }
      />

      {!session ? (
        <div className="mt-7 space-y-3">
          <Button className={authButtonClass} onClick={() => router.push(`/signup${nextParam}`)}>
            Create account
          </Button>
          <Button variant="outline" className="h-[42px] w-full rounded-[7px]" onClick={() => router.push(`/login${nextParam}`)}>
            Log in
          </Button>
        </div>
      ) : emailMismatch ? (
        <div className="mt-7 space-y-3">
          <p className="text-sm text-ink-500">
            This invite is for <strong className="text-ink">{invite.email}</strong>. You&apos;re logged in as{' '}
            <strong className="text-ink">{session.user.email}</strong>.
          </p>
          <Button
            className={authButtonClass}
            loading={switching}
            onClick={async () => {
              setSwitching(true);
              await signOut();
              await queryClient.invalidateQueries({ queryKey: ['session'] });
              router.push(`/login${nextParam}`);
            }}
          >
            Log out and switch accounts
          </Button>
        </div>
      ) : (
        <Button className={`${authButtonClass} mt-7`} loading={accept.isPending} onClick={() => accept.mutate()}>
          Accept invite
        </Button>
      )}
    </>
  );
}
