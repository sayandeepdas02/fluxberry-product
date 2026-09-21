import Link from 'next/link';
import { publicConfig } from '@/lib/config';
import { LogoMark } from './logo';
import { CrossMark } from './pixel-icons';

/**
 * Footer as a technical title block: a full-width rule, a five-column grid inside
 * the rails with brand crosshairs at its top corners, then a bottom bar.
 * Every link points at a route that exists — no placeholder nav.
 */

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Demo', href: '/#demo' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Log in', href: '/sign-in' },
      { label: 'Create account', href: '/sign-up' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-white tracking-[-0.16px]">
      <div className="border-t border-ink-200" />
      <div className="mk-frame">
        {/*
          * `gap-px` over an `ink-line` background: the gutters are the parent
          * showing through, so every rule between columns is exactly one pixel
          * and no cell has to decide which edges it owns. (chanhdai.com's
          * title-block footer works the same way.)
          */}
        <div className="relative grid grid-cols-1 gap-px border-x border-ink-200 bg-ink-line sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="flex flex-col bg-white px-6 pb-10 pt-12 sm:col-span-2 lg:col-span-1 lg:pl-12 lg:pr-6">
            <Link href="/" className="mk-focus inline-flex items-center gap-2">
              <LogoMark />
              <span className="text-[17px] font-semibold tracking-tight text-ink">{publicConfig.appName}</span>
            </Link>
            <p className="mt-[18px] max-w-[240px] text-mk-meta text-ink-500">
              AI-native applicant tracking for teams that would rather be hiring than sifting.
            </p>
            <p className="mt-auto pt-10 text-mk-meta text-ink-500">Built for small hiring teams.</p>
          </div>

          {columns.map(({ heading, links }) => (
            <nav key={heading} className="relative bg-white px-6 pb-16 pt-12">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">{heading}</p>
              <ul className="flex list-none flex-col gap-2 p-0">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="mk-focus text-[15px] leading-6 text-ink-500 transition-colors hover:text-ink"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Brand-coloured crosshairs: the one place the grid marks itself in colour. */}
          <CrossMark className="pointer-events-none absolute -left-[0.5px] -top-[0.5px] -translate-x-1/2 -translate-y-1/2 text-berry-500" />
          <CrossMark className="pointer-events-none absolute -right-[0.5px] -top-[0.5px] translate-x-1/2 -translate-y-1/2 text-berry-500" />
        </div>

        <div className="grid min-h-16 grid-cols-1 items-center gap-4 border-x border-t border-ink-200 px-6 py-5 sm:grid-cols-[1fr_auto_1fr] sm:py-0 lg:px-11">
          <span className="justify-self-start bg-ink-50 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400">
            Applicant tracking, minus the bloat
          </span>
          <span className="font-mono text-[11px] tabular-nums text-ink-400 sm:justify-self-center">
            © {new Date().getFullYear()} {publicConfig.appName}. All rights reserved.
          </span>
          <ul className="flex list-none items-center gap-5 p-0 sm:justify-self-end">
            <li>
              <Link href="/blog" className="mk-focus font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400 transition-colors hover:text-ink">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/sign-up" className="mk-focus font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400 transition-colors hover:text-ink">
                Get started
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-200" />
    </footer>
  );
}
