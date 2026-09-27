import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GRADIENT, TYPE } from '@/components/marketing/landing/primitives';

/*
 * Building blocks for the billing section on /app/pricing. It sits under the
 * landing page's plan cards, so it speaks their language: white cards with
 * the same soft shadow (plus a hairline, as the dashboard is near-white),
 * Manrope for headings and figures, landing blues for accents.
 */

/** A billing card. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-[20px] bg-white p-6 shadow-[2px_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04]', className)}
      {...props}
    />
  );
}

/** A card's heading: a tinted icon tile and the title, with an optional aside on the right. */
export function PanelHeader({ icon: Icon, title, aside }: { icon: LucideIcon; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-lp-blue-50 text-lp-blue-500">
          <Icon aria-hidden className="size-4" strokeWidth={2} />
        </span>
        <h3 className="whitespace-nowrap font-manrope text-[16px] font-semibold tracking-[-0.01em] text-black">{title}</h3>
      </div>
      {aside}
    </div>
  );
}

/** Quiet text for a card header's right-hand side. */
export function Aside({ children }: { children: React.ReactNode }) {
  return <span className="text-right font-inter text-[13px] text-lp-gray-500">{children}</span>;
}

/** Large figure (credit balance, pack size, price) in Manrope's tight display setting. */
export const FIGURE = 'font-manrope font-semibold leading-none tracking-[-0.03em] tabular-nums text-black';

/**
 * A thin bar of coloured segments, each a share (0–1) of the track, laid end
 * to end. Decorative: the numbers it shows are always written out beside it.
 */
export function Meter({ segments, className }: { segments: { value: number; className: string }[]; className?: string }) {
  return (
    <div aria-hidden className={cn('flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-lp-gray-100', className)}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <div
            key={i}
            className={cn('h-full rounded-full', s.className)}
            style={{ width: `${Math.min(1, s.value) * 100}%` }}
          />
        ))}
    </div>
  );
}

/** Small pill for a saving or a status, in the landing's tinted-pill style. */
export function Chip({
  tone = 'blue',
  dot = false,
  children,
}: {
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray';
  dot?: boolean;
  children: React.ReactNode;
}) {
  const tones = {
    blue: 'bg-lp-blue-50 text-lp-blue-600 [--dot:#0d6eff]',
    green: 'bg-emerald-50 text-emerald-700 [--dot:#10b981]',
    amber: 'bg-amber-50 text-amber-700 [--dot:#f59e0b]',
    red: 'bg-red-50 text-red-700 [--dot:#ef4444]',
    gray: 'bg-lp-gray-50 text-lp-gray-600 [--dot:#aaaaaa]',
  };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 font-manrope text-[12px] font-semibold leading-5',
        tones[tone],
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-[var(--dot)]" />}
      {children}
    </span>
  );
}

/** The plan cards' call-to-action: a full-width gradient block with the rolling label's metrics. */
export const CTA = cn(
  'group flex w-full items-center justify-center rounded-[15px] px-2.5 py-[15px] text-white outline-none',
  'focus-visible:ring-2 focus-visible:ring-lp-blue-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60',
  TYPE.button,
  GRADIENT,
);

/** "25 Sep 2027"-style date in the viewer's locale. */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString(undefined, opts);
}
