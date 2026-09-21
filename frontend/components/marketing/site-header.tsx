'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  X,
  Sparkles,
  BarChart3,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { MkButton } from './mk-button';
import { PixelChevronDown } from './pixel-icons';

type NavChild = { title: string; description: string; href: string; icon: LucideIcon };

const productMenu: NavChild[] = [
  {
    title: 'AI screening',
    description: 'Every applicant scored and summarised on arrival.',
    href: '/#screening',
    icon: Sparkles,
  },
  {
    title: 'Analytics',
    description: 'Funnel drop-off, source performance, time to hire.',
    href: '/#analytics',
    icon: BarChart3,
  },
  {
    title: 'Careers page',
    description: 'A hosted job board you can embed anywhere.',
    href: '/#careers',
    icon: Share2,
  },
];

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover menus need a grace period, or the gap between trigger and card closes them.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(false), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  useEffect(() => () => cancelClose(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-200 bg-white">
      <div className="relative mx-auto grid h-16 max-w-[1248px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 px-6">
        <Logo className="justify-self-start" />

        <nav className="flex items-center gap-0.5 justify-self-center max-[960px]:hidden">
          <div className="relative" onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
            <button
              type="button"
              aria-expanded={openMenu}
              onMouseEnter={() => {
                cancelClose();
                setOpenMenu(true);
              }}
              onClick={() => setOpenMenu((v) => !v)}
              className={cn(
                'mk-focus inline-flex items-center gap-1.5 rounded-[6px] px-[15px] py-[9px] text-mk-nav text-ink-600 transition-colors hover:bg-ink-100',
                openMenu && 'bg-ink-100',
              )}
            >
              Product
              <PixelChevronDown
                className={cn('size-4 transition-transform duration-200', openMenu && 'rotate-180')}
              />
            </button>

            {/* Bridge element: keeps the pointer "inside" the menu while crossing the gap. */}
            {openMenu && <span className="absolute inset-x-0 top-full h-[22px]" aria-hidden />}

            <div
              {...(!openMenu && { inert: true })}
              aria-hidden={!openMenu}
              className={cn(
                'absolute left-1/2 top-[calc(100%+6px)] z-[60] w-[min(640px,100vw-48px)] -translate-x-1/2',
                'origin-top rounded-[18px] border border-ink-200 bg-white p-6 shadow-[0_12px_32px_-12px_rgba(13,17,23,0.16)]',
                'transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                openMenu
                  ? 'pointer-events-auto opacity-100'
                  : 'pointer-events-none -translate-y-1.5 scale-[0.985] opacity-0',
              )}
            >
              <span className="block px-2 pb-2 text-xs leading-[18px] text-ink-500">Built for your team</span>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                {productMenu.map(({ title, description, href, icon: Icon }) => (
                  <Link
                    key={title}
                    href={href}
                    onClick={() => setOpenMenu(false)}
                    className="mk-focus flex items-start gap-2 rounded-[8px] p-2 transition-colors hover:bg-ink-50"
                  >
                    <Icon className="mt-0.5 size-5 shrink-0 text-berry-600" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-medium leading-5 text-ink">{title}</span>
                      <span className="text-xs leading-4 text-ink-500">{description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/pricing"
            className="mk-focus inline-flex items-center rounded-[6px] px-[15px] py-[9px] text-mk-nav text-ink-600 transition-colors hover:bg-ink-100"
          >
            Pricing
          </Link>

          <Link
            href="/blog"
            className="mk-focus inline-flex items-center rounded-[6px] px-[15px] py-[9px] text-mk-nav text-ink-600 transition-colors hover:bg-ink-100"
          >
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-2 justify-self-end max-[960px]:hidden">
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
          className="mk-focus -mr-2 hidden size-10 items-center justify-center justify-self-end text-ink max-[960px]:inline-flex"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Crosshairs where the header's bottom rule crosses the column rails. */}
        <span className="mk-cross mk-cross-bl max-[960px]:hidden" aria-hidden />
        <span className="mk-cross mk-cross-br max-[960px]:hidden" aria-hidden />
      </div>

      {mobileOpen && (
        <div className="flex flex-col gap-4 border-t border-ink-100 bg-ink-50 px-6 pb-5 pt-2 min-[961px]:hidden">
          <nav className="flex flex-col">
            <span className="border-b border-ink-100 py-3 text-[15px] font-medium leading-5 text-ink">Product</span>
            <div className="flex flex-col pl-3">
              {productMenu.map(({ title, href }) => (
                <Link
                  key={title}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="mk-focus border-b border-ink-100 py-2.5 text-[15px] font-medium leading-[18px] text-ink-500 hover:text-ink"
                >
                  {title}
                </Link>
              ))}
            </div>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="mk-focus border-b border-ink-100 py-3 text-[15px] font-medium leading-5 text-ink"
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileOpen(false)}
              className="mk-focus border-b border-ink-100 py-3 text-[15px] font-medium leading-5 text-ink"
            >
              Blog
            </Link>
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
