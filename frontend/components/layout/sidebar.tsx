'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Briefcase,
  Users,
  BarChart3,
  Megaphone,
  Settings,
  HelpCircle,
  Bell,
  Gift,
  Mail,
  Info,
  UserSearch,
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/referrals', label: 'Referrals', icon: Gift },
];

const LOCKED_NAV = [
  { label: 'Talent Sourcing', icon: UserSearch },
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

        {LOCKED_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground/60"
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Show ${item.label} launch information`}
                      className="ml-auto flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Info className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="end">
                    Launching in October 2026
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
        <HelpPopover />
      </div>
    </aside>
  );
}

function HelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground w-full">
          <HelpCircle className="size-4" />
          Help
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" className="w-72 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">We&apos;re here to help</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            We&apos;re a lean team building Fluxberry AI. For any questions or issues, reach out directly.
          </p>
        </div>
        <div className="space-y-2">
          <a
            href="mailto:sayandeep@fluxberry.in"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Mail className="size-4 shrink-0" />
            sayandeep@fluxberry.in
          </a>
          <a
            href="https://x.com/deepmaxxing"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <XIcon />
            X (Twitter)
          </a>
          <a
            href="https://www.linkedin.com/in/sayandeep02/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LinkedInIcon />
            LinkedIn
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function XIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.629 5.905-5.629Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
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
