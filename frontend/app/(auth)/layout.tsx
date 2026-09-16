import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { AuthShell } from '@/components/marketing/auth-shell';

export const metadata: Metadata = noIndexMetadata;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
