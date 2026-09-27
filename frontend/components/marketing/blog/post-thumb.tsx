import { cn } from '@/lib/utils';

/**
 * Post artwork, generated rather than uploaded: the landing's grey image panel
 * with a soft blue wash and an oversized brand mark bleeding off the corner.
 * Keeps the blog image-free until there are real cover images to ship.
 */
export function PostThumb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-[7px] bg-lp-gray-50',
        'bg-[radial-gradient(80%_95%_at_14%_16%,#e8f2ff_0%,transparent_62%)]',
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        className="absolute -bottom-[12%] -right-[4%] w-[38%] max-w-[180px] text-lp-blue-400"
        fill="none"
      >
        <rect x="0" y="0" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.32" />
        <rect x="11" y="0" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.14" />
        <rect x="0" y="11" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.14" />
        <rect x="11" y="11" width="9" height="9" rx="1.5" fill="currentColor" opacity="0.24" />
      </svg>
    </div>
  );
}
