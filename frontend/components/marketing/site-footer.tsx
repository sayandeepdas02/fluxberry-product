import Link from 'next/link';
import { publicConfig } from '@/lib/config';
import { LogoMark } from './logo';

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

const aiLinks = [
  { label: 'ChatGPT', href: 'https://chatgpt.com' },
  { label: 'Claude', href: 'https://claude.ai' },
  { label: 'Perplexity', href: 'https://perplexity.ai' },
  { label: 'Gemini', href: 'https://gemini.google.com' },
];

export function SiteFooter() {
  return (
    <footer className="bg-white text-foreground">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="flex flex-col px-0 pb-10 pt-12 sm:col-span-2 lg:col-span-1 lg:pr-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <LogoMark />
              <span className="text-[17px] font-semibold tracking-tight text-foreground">{publicConfig.appName}</span>
            </Link>
            <p className="mt-[18px] max-w-[240px] text-sm text-muted-foreground">
              AI-native applicant tracking for teams that would rather be hiring than sifting.
            </p>
          </div>

          {columns.map(({ heading, links }) => (
            <nav key={heading} className="px-0 pb-16 pt-12">
              <p className="mb-4 text-sm font-semibold text-foreground">{heading}</p>
              <ul className="flex list-none flex-col gap-2.5 p-0">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* AI summary links */}
        <div className="border-t border-border py-6">
          <p className="text-sm font-medium text-foreground">
            Summarize what Fluxberry AI does with AI:
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {aiLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Copyright bar */}
        <div className="grid min-h-14 grid-cols-1 items-center gap-4 border-t border-border py-5 sm:grid-cols-[1fr_auto] sm:py-0">
          <span className="text-sm text-muted-foreground">
            &copy; 2026 Fluxberry AI, All rights reserved
          </span>
          <ul className="flex list-none items-center gap-6 p-0 sm:justify-self-end">
            <li>
              <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Terms and Conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
