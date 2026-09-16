import { cn } from '@/lib/utils';

/**
 * Horizontal rules that escape their column and run the full width of the
 * viewport, pinned by crosshairs exactly where they cross the rails. `band`
 * adds a 33px gap between two rules, with hatched gutters outside the column.
 */
export function Divider({
  variant = 'line',
  className,
}: {
  variant?: 'line' | 'band';
  className?: string;
}) {
  if (variant === 'line') {
    return (
      <div className={cn('mk-divider h-0', className)} aria-hidden>
        <span className="mk-line mk-line-top" />
        <span className="mk-cross mk-cross-tl" />
        <span className="mk-cross mk-cross-tr" />
      </div>
    );
  }

  return (
    <div className={cn('mk-divider h-[33px]', className)} aria-hidden>
      <span className="mk-hatch absolute inset-y-0 left-0 w-[max(24px,-600px+50vw)]" />
      <span className="mk-hatch absolute inset-y-0 right-0 w-[max(24px,-600px+50vw)]" />
      <span className="mk-line mk-line-top" />
      <span className="mk-line mk-line-bottom" />
      <span className="mk-rail mk-rail-left" />
      <span className="mk-rail mk-rail-right" />
      <span className="mk-cross mk-cross-tl" />
      <span className="mk-cross mk-cross-tr" />
      <span className="mk-cross mk-cross-bl" />
      <span className="mk-cross mk-cross-br" />
    </div>
  );
}
