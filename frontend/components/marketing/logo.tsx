import Link from 'next/link';
import { cn } from '@/lib/utils';
import { publicConfig } from '@/lib/config';

/**
 * Wordmark plus a four-square brand mark. Deliberately isolated in one file: swap
 * the SVG here when a real logo exists and every surface picks it up.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={cn('shrink-0', className)}>
      <rect x="0" y="0" width="9" height="9" fill="#ec4899" />
      <rect x="11" y="0" width="9" height="9" fill="#fbcfe8" />
      <rect x="0" y="11" width="9" height="9" fill="#fbcfe8" />
      <rect x="11" y="11" width="9" height="9" fill="#be185d" />
    </svg>
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('mk-focus inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-ink">{publicConfig.appName}</span>
    </Link>
  );
}
