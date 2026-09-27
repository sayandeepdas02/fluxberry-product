'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientButton, RollText, TYPE } from '@/components/marketing/landing/primitives';
import { NAV_LINKS, type NavGroup } from '@/components/marketing/landing/content';

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

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      aria-hidden
      strokeWidth={2.25}
      className={cn('size-3.5 shrink-0 transition-transform duration-200', open && 'rotate-180')}
    />
  );
}

/** How long the pointer can be off the trigger and panel (crossing the gap between them) before it closes. */
const HOVER_CLOSE_DELAY = 150;

/**
 * A nav group as a dropdown under the pill: a button that shows a list of
 * links (the disclosure pattern). A mouse opens it on hover; a click or tap
 * toggles it. Escape, a click outside or focus leaving it closes it.
 */
function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  // Set when hovering opened it, so the click that usually follows doesn't shut it again.
  const openedByHover = useRef(false);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) {
      openedByHover.current = false;
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        window.clearTimeout(closeTimer.current);
        if (!open) openedByHover.current = true;
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (openedByHover.current) openedByHover.current = false;
          else setOpen((v) => !v);
        }}
        className={cn(
          'group flex items-center gap-1 rounded-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400',
          TYPE.nav,
        )}
      >
        <RollText className="hidden h-[19px] desktop:block">{group.label}</RollText>
        <span className="desktop:hidden">{group.label}</span>
        <Chevron open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            initial={{ opacity: 0, x: '-50%', y: -6 }}
            animate={{ opacity: 1, x: '-50%', y: 0 }}
            exit={{ opacity: 0, x: '-50%', y: -6 }}
            transition={{ duration: 0.18, ease: MENU_EASE }}
            // The top padding bridges the pill's lower half, so the panel starts 10px below the pill.
            className="absolute left-1/2 top-full pt-[31px]"
          >
            <ul className="w-[236px] rounded-[15px] bg-white p-2 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.16),0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]">
              {group.items.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-[10px] p-1.5 text-black outline-none transition-colors',
                      'hover:bg-lp-gray-50 focus-visible:bg-lp-gray-50 focus-visible:ring-2 focus-visible:ring-lp-blue-400',
                      TYPE.nav,
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-lp-blue-50 text-lp-blue-500">
                      <Icon aria-hidden className="size-4" strokeWidth={2} />
                    </span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A nav group in the phone menu: its label expands the links in place, beneath it. */
function MobileNavGroup({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-sm font-manrope text-lp-nav-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400"
      >
        {group.label}
        <Chevron open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={listId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: MENU_EASE }}
            // Padding keeps the links' focus rings inside the clip.
            className="flex flex-col items-center gap-2.5 overflow-hidden px-1 pb-1 pt-3"
          >
            {group.items.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className="block rounded-sm font-manrope text-lp-nav-sm text-lp-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400"
                >
                  {label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
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
            {NAV_LINKS.map((l) => ('items' in l ? <NavDropdown key={l.label} group={l} /> : <NavLink key={l.href} {...l} />))}
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
                  {[...NAV_LINKS, { label: 'Log in', href: '/sign-in' }].map((l) =>
                    'items' in l ? (
                      <li key={l.label}>
                        <MobileNavGroup group={l} onNavigate={() => setOpen(false)} />
                      </li>
                    ) : (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-sm font-manrope text-lp-nav-sm text-black outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ),
                  )}
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
