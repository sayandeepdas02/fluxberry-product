'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/app/talent-sourcing', label: 'Search', exact: true },
  { href: '/app/talent-sourcing/lists', label: 'Lists' },
  { href: '/app/talent-sourcing/contacts', label: 'Contacts' },
  { href: '/app/talent-sourcing/campaigns', label: 'Campaigns' },
  { href: '/app/talent-sourcing/analytics', label: 'Analytics' },
];

export function SourcingNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-1">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
