import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { AuthShell } from '@/components/marketing/auth-shell';
import { AcceptInvite } from '@/components/invites/accept-invite';

export const metadata: Metadata = noIndexMetadata;

export default function AcceptInvitePage() {
  return (
    <AuthShell>
      <AcceptInvite />
    </AuthShell>
  );
}
