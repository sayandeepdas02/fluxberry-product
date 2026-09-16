import Link from 'next/link';
import { Logo } from './logo';
import { CrossMark } from './pixel-icons';

/**
 * Auth pages sit inside the marketing design language rather than floating on a
 * neutral background: the same rails, the same faded 68px grid, and a square
 * panel with crosshairs on its corners.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50 text-[15px] leading-6 text-ink">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1248px] items-center justify-between px-6">
          <Logo />
          <Link
            href="/"
            className="mk-focus text-mk-nav text-ink-600 transition-colors hover:text-ink"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 overflow-x-clip">
        <span className="mk-grid-bg" aria-hidden />
        <div className="mk-frame flex w-full flex-1 items-center justify-center">
          <div className="mk-rails" aria-hidden />
          <div className="relative my-16 w-full max-w-[420px] border border-ink-200 bg-white p-8 shadow-[0_1px_2px_rgba(13,17,23,0.03)]">
            <CrossMark className="pointer-events-none absolute -left-px -top-px -translate-x-1/2 -translate-y-1/2 text-ink-300" />
            <CrossMark className="pointer-events-none absolute -right-px -top-px -translate-y-1/2 translate-x-1/2 text-ink-300" />
            <CrossMark className="pointer-events-none absolute -bottom-px -left-px -translate-x-1/2 translate-y-1/2 text-ink-300" />
            <CrossMark className="pointer-events-none absolute -bottom-px -right-px translate-x-1/2 translate-y-1/2 text-ink-300" />
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1248px] items-center justify-between px-6 text-mk-meta text-ink-500">
          <span>© {new Date().getFullYear()} Fluxberry</span>
          <Link href="/blog" className="mk-focus transition-colors hover:text-ink">
            Blog
          </Link>
        </div>
      </footer>
    </div>
  );
}

/** Shared heading block so the three auth pages stay identical in rhythm. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <>
      <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-ink">{title}</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-500">{subtitle}</p>
    </>
  );
}

/** Input and submit-button classes shared by every auth form. */
export const authInputClass =
  'h-10 rounded-[7px] border-ink-200 bg-white text-[14px] text-ink shadow-none placeholder:text-ink-400 focus-visible:ring-berry-600';

export const authButtonClass =
  'h-[42px] w-full rounded-[7px] border border-berry-700 bg-berry-600 text-[13px] font-medium text-white hover:bg-berry-700';
