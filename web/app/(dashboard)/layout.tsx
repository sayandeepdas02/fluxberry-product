import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const metadata: Metadata = noIndexMetadata;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
