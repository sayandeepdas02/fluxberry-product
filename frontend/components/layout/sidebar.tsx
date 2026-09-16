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
  Bell,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatures } from '@/hooks/use-features';
import { WorkspaceSwitcher } from './workspace-switcher';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';

const NAV = [
  { href: '/app', label: 'Home', icon: Home, exact: true },
  { href: '/app/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/app/candidates', label: 'Candidates', icon: Users },
  { href: '/app/assessments', label: 'Assessments', icon: ClipboardCheck, flag: 'ASSESSMENTS' as const },
  { href: '/app/questions', label: 'Question Bank', icon: Library, flag: 'QUESTION_BANK' as const },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/referrals', label: 'Referrals', icon: Gift },
];

export function Sidebar() {
  const pathname = usePathname();
  const features = useFeatures();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-background px-3 py-4">
      <WorkspaceSwitcher />

      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {NAV.filter((item) => !item.flag || features[item.flag]).map((item) => {
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
        <NotificationBell />

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

function NotificationBell() {
  const { data } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground w-full">
          <Bell className="size-4 shrink-0" />
          Notifications
          {unread > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-80 max-h-[480px] overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn('flex flex-col items-start gap-0.5 px-3 py-2.5', !n.read && 'bg-accent/40')}
              onSelect={() => { if (!n.read) markRead.mutate(n.id); }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug">{n.title}</span>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
              {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
