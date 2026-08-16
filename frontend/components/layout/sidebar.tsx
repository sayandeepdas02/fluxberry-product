'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  Users,
  ClipboardCheck,
  Library,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from './workspace-switcher';

const NAV = [
  { href: '/app', label: 'Home', icon: Home, exact: true },
  { href: '/app/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/app/candidates', label: 'Candidates', icon: Users },
  { href: '/app/assessments', label: 'Assessments', icon: ClipboardCheck },
  { href: '/app/questions', label: 'Question Bank', icon: Library },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-background px-3 py-4">
      <WorkspaceSwitcher />

      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        <Link
          href="/app/careers"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
            isActive('/app/careers')
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Megaphone className="size-4" />
          Careers page
        </Link>
        <Link
          href="/app/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
            isActive('/app/settings')
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Settings className="size-4" />
          Settings
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <HelpCircle className="size-4" />
          Help
        </a>
      </div>
    </aside>
  );
}
