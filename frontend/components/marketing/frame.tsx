import { cn } from '@/lib/utils';

/**
 * The ruled-paper layout. Every marketing page is a 1200px column inside a 1248px
 * frame, with 1px rails down both edges; sections stack inside it and carry their
 * own hairlines, so the page reads as one continuous drawing rather than a stack
 * of cards.
 */

/** Outer frame with the vertical rails drawn down the column edges. */
export function Frame({
  children,
  className,
  rails = true,
}: {
  children: React.ReactNode;
  className?: string;
  rails?: boolean;
}) {
  return (
    <div className={cn('mk-frame', className)}>
      {rails && <div className="mk-rails" aria-hidden />}
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * A self-framing section: it *is* the column, so it needs no Frame around it.
 * Borders on three sides continue the rails and close the section off below.
 */
export function Section({
  children,
  className,
  id,
  tabIndex,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tabIndex?: number;
}) {
  return (
    <section
      id={id}
      tabIndex={tabIndex}
      className={cn(
        'mx-auto w-[calc(100%-48px)] max-w-[1200px] scroll-mt-20 border-x border-b border-berry-200 bg-white',
        className,
      )}
    >
      {children}
    </section>
  );
}

/** Kicker + split heading + optional lede and link, the standard section opener. */
export function SectionIntro({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('px-6 pb-14 pt-[72px] sm:px-8 lg:px-14', className)}>{children}</div>;
}

/**
 * Decimal's signature heading: the first line in full ink, the second dropped to
 * a muted grey so the sentence reads as statement then consequence.
 */
export function H2Split({
  lead,
  muted,
  className,
  as: Tag = 'h2',
}: {
  lead: string;
  muted: string;
  className?: string;
  as?: 'h1' | 'h2';
}) {
  return (
    <Tag className={cn('mt-6 text-mk-h2 text-ink', className)}>
      {lead}
      <br />
      <span className="text-ink-muted">{muted}</span>
    </Tag>
  );
}

/**
 * Count superscript beside a heading — "Capabilities (9)". Straight from
 * chanhdai.com's PanelTitleSup: it labels a grid with its own size, which is
 * what makes the layout read as a spec sheet rather than decoration.
 */
export function Sup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <sup className={cn('top-[-0.75em] ml-1 font-mono text-xs font-medium tracking-normal text-ink-400', className)}>
      {children}
    </sup>
  );
}

/**
 * Small label row that sits above a grid and is closed off by a hairline —
 * chanhdai's PanelHeader, at the scale we use it.
 */
export function PanelHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 border-b border-ink-line pb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-400',
        className,
      )}
    >
      {children}
    </div>
  );
}
