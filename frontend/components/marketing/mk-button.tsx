import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PixelArrowRight, PixelChevronRight } from './pixel-icons';

/**
 * The marketing button. Separate from `components/ui/button` on purpose: the
 * dashboard's button owns the app's radius and sizing, and this one owns the
 * marketing language — 7px corners, 13px text, and a chevron that crossfades
 * into an arrow on hover.
 */

const base =
  'mk-focus group inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-[7px] ' +
  'text-[13px] font-normal leading-5 transition-colors';

const variants = {
  cta: 'border border-berry-700 bg-berry-600 text-white hover:bg-berry-700',
  secondary: 'border border-ink-200 bg-white text-ink hover:bg-ink-50',
  quiet: 'border border-transparent bg-transparent text-ink-600 hover:bg-ink-100',
} as const;

const sizes = {
  sm: 'min-h-9 px-3 py-[7px]',
  md: 'min-h-[42px] px-4 py-[10px]',
} as const;

type MkButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  icon?: boolean;
  className?: string;
};

export function MkButton({
  href,
  children,
  variant = 'cta',
  size = 'md',
  icon = true,
  className,
}: MkButtonProps) {
  const external = href.startsWith('http');
  const content = (
    <>
      <span>{children}</span>
      {icon && <SwapIcon />}
    </>
  );
  const classes = cn(base, variants[variant], sizes[size], className);

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}

/** Chevron out, arrow in — both absolutely stacked so the button never reflows. */
function SwapIcon() {
  return (
    <span className="relative inline-flex size-4 shrink-0">
      <PixelChevronRight className="absolute inset-0 transition-[opacity,transform] duration-500 group-hover:translate-x-[3px] group-hover:opacity-0 motion-reduce:transition-none" />
      <PixelArrowRight className="absolute inset-0 -translate-x-[3px] opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none" />
    </span>
  );
}
