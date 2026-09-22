import Link from 'next/link';
import { publicConfig } from '@/lib/config';
import { LogoMark } from './logo';
import { CrossMark } from './pixel-icons';

const columns = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
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
    <footer className="bg-[#061240] tracking-[-0.16px]">
      <div className="mk-frame">
        <div className="relative grid grid-cols-1 gap-px border-x border-white/10 bg-white/5 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="flex flex-col bg-[#061240] px-6 pb-10 pt-12 sm:col-span-2 lg:col-span-1 lg:pl-12 lg:pr-6">
            <Link href="/" className="mk-focus inline-flex items-center gap-2">
              <LogoMark variant="light" />
              <span className="text-[17px] font-semibold tracking-tight text-white">{publicConfig.appName}</span>
            </Link>
            <p className="mt-[18px] max-w-[240px] text-mk-meta text-white/50">
              AI-native applicant tracking for teams that would rather be hiring than sifting.
            </p>
          </div>

          {columns.map(({ heading, links }) => (
            <nav key={heading} className="relative bg-[#061240] px-6 pb-16 pt-12">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-white/40">{heading}</p>
              <ul className="flex list-none flex-col gap-2 p-0">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="mk-focus text-[15px] leading-6 text-white/60 transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <CrossMark className="pointer-events-none absolute -left-[0.5px] -top-[0.5px] -translate-x-1/2 -translate-y-1/2 text-berry-400" />
          <CrossMark className="pointer-events-none absolute -right-[0.5px] -top-[0.5px] translate-x-1/2 -translate-y-1/2 text-berry-400" />
        </div>

        <div className="grid min-h-16 grid-cols-1 items-center gap-4 border-x border-t border-white/10 px-6 py-5 sm:grid-cols-[1fr_auto] sm:py-0 lg:px-11">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-white/40">
            Fluxberry AI | All Rights Reserved
          </span>
          <ul className="flex list-none items-center gap-5 p-0 sm:justify-self-end">
            <li>
              <Link href="/terms" className="mk-focus font-mono text-[11px] uppercase tracking-[0.08em] text-white/40 transition-colors hover:text-white">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="mk-focus font-mono text-[11px] uppercase tracking-[0.08em] text-white/40 transition-colors hover:text-white">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
