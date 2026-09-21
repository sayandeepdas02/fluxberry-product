import Link from 'next/link';
import { cn } from '@/lib/utils';
import { publicConfig } from '@/lib/config';

/**
 * Wordmark plus a four-square brand mark. Deliberately isolated in one file: swap
 * the SVG here when a real logo exists and every surface picks it up.
 *
 * variant="default" — navy squares for light backgrounds (header, cards)
 * variant="light"   — light blue squares for dark backgrounds (footer)
 */
export function LogoMark({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'light' }) {
  const c =
    variant === 'light'
      ? { tl: '#dde6ff', tr: '#b8ccff', bl: '#b8ccff', br: '#4f78d8' }
      : { tl: '#0e2f7e', tr: '#b8ccff', bl: '#b8ccff', br: '#0a2462' };
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={cn('shrink-0', className)}>
      <rect x="0" y="0" width="9" height="9" fill={c.tl} />
      <rect x="11" y="0" width="9" height="9" fill={c.tr} />
      <rect x="0" y="11" width="9" height="9" fill={c.bl} />
      <rect x="11" y="11" width="9" height="9" fill={c.br} />
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
