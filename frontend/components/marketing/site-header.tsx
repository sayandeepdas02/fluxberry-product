'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { MkButton } from './mk-button';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Blog', href: '/blog' },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-200 bg-white">
      <div className="relative mx-auto grid h-16 max-w-[1248px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-6">
        <Logo className="justify-self-start" />

        <nav className="flex items-center gap-0.5 justify-self-center max-[860px]:hidden">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={cn(
                'mk-focus inline-flex items-center rounded-[6px] px-[15px] py-[9px] text-mk-nav text-ink-600 transition-colors hover:bg-ink-100',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 justify-self-end max-[860px]:hidden">
          <MkButton href="/sign-in" variant="secondary" size="sm">
            Log in
          </MkButton>
          <MkButton href="/sign-up" size="sm">
            Get started
          </MkButton>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          className="mk-focus -mr-2 hidden size-10 items-center justify-center justify-self-end text-ink min-[861px]:hidden max-[860px]:inline-flex"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <span className="mk-cross mk-cross-bl max-[860px]:hidden" aria-hidden />
        <span className="mk-cross mk-cross-br max-[860px]:hidden" aria-hidden />
      </div>

      {mobileOpen && (
        <div className="flex flex-col gap-4 border-t border-ink-100 bg-ink-50 px-6 pb-5 pt-2 min-[861px]:hidden">
          <nav className="flex flex-col">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="mk-focus border-b border-ink-100 py-3 text-[15px] font-medium leading-5 text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col items-start gap-3 pt-1">
            <MkButton href="/sign-in" variant="secondary" size="sm" className="w-full">
              Log in
            </MkButton>
            <MkButton href="/sign-up" size="sm" className="w-full">
              Get started
            </MkButton>
          </div>
        </div>
      )}
    </header>
  );
}
