'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { GradientButton, RollText, TYPE } from '@/components/marketing/landing/primitives';
import { NAV_LINKS } from '@/components/marketing/landing/content';

/*
 * Floating pill navigation, converted from the Framer design: fixed 26px from
 * the top, 770px wide on desktop, 650px on tablet, full width (19.5px gutters)
 * on phone, where it collapses to a hamburger that expands the pill in place.
 */

const MENU_EASE = [0.27, 0, 0.51, 1] as const;

/** Text wordmark matching the Framer logo's glyphs: Manrope 700 at 18px, −0.03em. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Fluxberry home"
      className={cn(
        'inline-flex h-[23px] items-center font-manrope text-[18px] font-bold leading-none tracking-[-0.03em] text-black',
        'rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400',
        className,
      )}
    >
      Fluxberry
    </Link>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn('group rounded-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400', TYPE.nav)}
    >
      {/* The text roll is a desktop hover effect in a 19px clip (Framer's); tablet shows the plain label. */}
      <RollText className="hidden h-[19px] desktop:block">{label}</RollText>
      <span className="desktop:hidden">{label}</span>
    </Link>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes the phone menu and returns focus to its toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-[26px] z-50 flex justify-center px-[19.5px]">
      <nav
        aria-label="Main"
        className={cn(
          'pointer-events-auto w-full rounded-[15px] bg-white px-5 pt-3 shadow-[2px_3px_15px_rgba(0,0,0,0.03)]',
          'tablet:w-[650px] desktop:w-[770px]',
          open ? 'pb-[30px]' : 'pb-3',
        )}
      >
        <div className="flex h-[30px] items-center justify-between tablet:h-[37px]">
          <Logo />

          <div className="hidden items-center gap-[30px] tablet:flex">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
          </div>

          <div className="hidden items-center gap-5 tablet:flex">
            <NavLink href="/sign-in" label="Log in" />
            <GradientButton href="/sign-up">Get Started</GradientButton>
          </div>

          <button
            ref={toggleRef}
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="relative size-[30px] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400 tablet:hidden"
          >
            <span
              className={cn(
                'absolute left-1.5 top-1/2 h-0.5 w-[18px] bg-black transition-transform duration-200 ease-[cubic-bezier(0.27,0,0.51,1)]',
                open ? 'translate-y-[-1px] rotate-45' : 'translate-y-[-4px]',
              )}
            />
            <span
              className={cn(
                'absolute left-1.5 top-1/2 h-0.5 w-[18px] bg-black transition-transform duration-200 ease-[cubic-bezier(0.27,0,0.51,1)]',
                open ? 'translate-y-[-1px] -rotate-45' : 'translate-y-[2px]',
              )}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={menuId}
              key="menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: MENU_EASE }}
              className="overflow-hidden tablet:hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: MENU_EASE, delay: 0.2 }}
                className="flex flex-col items-center pt-[33px]"
              >
                <ul className="flex flex-col items-center gap-[15px]">
                  {[...NAV_LINKS, { label: 'Log in', href: '/sign-in' }].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        className="block rounded-sm font-manrope text-lp-nav-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <GradientButton href="/sign-up" className="mt-10">
                  Get Started
                </GradientButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
