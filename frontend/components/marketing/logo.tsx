import Link from 'next/link';
import { cn } from '@/lib/utils';
import { publicConfig } from '@/lib/config';

/**
 * Paper-plane brand mark.
 *
 * variant="default" — navy plane on white (light backgrounds: header, cards)
 * variant="light"   — white plane on navy (dark backgrounds: footer)
 */
export function LogoMark({ className, variant = 'default' }: { className?: string; variant?: 'default' | 'light' }) {
  const src = variant === 'light' ? '/logo-mark-white.png' : '/logo-mark.png';
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={src} alt="" width={24} height={24} aria-hidden className={cn('shrink-0', className)} />;
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('mk-focus inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-ink">{publicConfig.appName}</span>
    </Link>
  );
}
