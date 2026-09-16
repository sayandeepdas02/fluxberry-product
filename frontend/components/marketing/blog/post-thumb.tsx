import { cn } from '@/lib/utils';

/**
 * Post artwork, generated rather than uploaded: a soft brand wash with an
 * oversized mark bleeding off the corner. Keeps the blog image-free until there
 * are real cover images to ship.
 */
export function PostThumb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-ink-200 retina:border-[0.5px]',
        'bg-[radial-gradient(80%_95%_at_14%_16%,#fdf2f8_0%,transparent_62%),linear-gradient(180deg,#fdfdfc_0%,#f2f2f2_100%)]',
        className,
      )}
      aria-hidden
    >
      {/* Inset hairline so the artwork keeps a crisp edge over its own gradient. */}
      <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(13,17,23,0.04)]" />
      <svg
        viewBox="0 0 20 20"
        className="absolute -bottom-[12%] -right-[4%] w-[38%] max-w-[180px] text-berry-500"
        fill="none"
      >
        <rect x="0" y="0" width="9" height="9" fill="currentColor" opacity="0.32" />
        <rect x="11" y="0" width="9" height="9" fill="currentColor" opacity="0.14" />
        <rect x="0" y="11" width="9" height="9" fill="currentColor" opacity="0.14" />
        <rect x="11" y="11" width="9" height="9" fill="currentColor" opacity="0.24" />
      </svg>
    </div>
  );
}
