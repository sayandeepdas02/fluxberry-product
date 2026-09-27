import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/*
 * Building blocks for the landing page, measured from the Framer design it
 * was converted from. Values that look arbitrary (54px, 19.5px line height,
 * radius 7/15/27) are copies of that design, not rounding errors.
 *
 * No 'use client' here: server components read TYPE and GRADIENT directly.
 * The animated wrappers live in ./motion.
 */

/**
 * Responsive text styles. Framer steps each style down per breakpoint
 * (desktop ≥1200 / tablet ≥810 / phone) instead of scaling fluidly.
 */
export const TYPE = {
  h1: 'font-manrope text-lp-h1-p tablet:text-lp-h1-t desktop:text-lp-h1',
  h2: 'font-manrope text-lp-h2-p tablet:text-lp-h2-t desktop:text-lp-h2',
  title: 'font-manrope text-lp-title-p tablet:text-lp-title-t desktop:text-lp-title',
  body: 'font-inter text-lp-body-p tablet:text-lp-body-t desktop:text-lp-body',
  label: 'font-manrope text-lp-label-sm desktop:text-lp-label',
  pill: 'font-manrope text-lp-pill-sm desktop:text-lp-pill',
  button: 'font-manrope text-lp-button-sm desktop:text-lp-button',
  nav: 'font-manrope text-lp-nav-sm desktop:text-lp-nav',
  per: 'font-manrope text-lp-per-p tablet:text-lp-per-t desktop:text-lp-per',
} as const;

/**
 * The landing hero's grid backdrop, for a `relative` parent. The artwork is
 * always full width at its own proportions, so the grid cells match the hero
 * everywhere. `section` also clips it to a shorter header and fades it out
 * at the header's foot instead of stopping on a hard edge.
 */
export function GridBackdrop({ variant = 'image' }: { variant?: 'image' | 'section' }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0',
        variant === 'section' && 'bottom-0 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]',
      )}
    >
      <div className="relative aspect-[3963/2793] w-full">
        <Image src="/landing/grid-bg.png" alt="" fill sizes="100vw" loading="eager" className="object-cover" />
      </div>
    </div>
  );
}

/**
 * Text that rolls upward on hover: two stacked copies inside a clipped line,
 * the stack shifting one line up (Framer's spring, bounce 0.2, 0.4s).
 * Needs a `group` ancestor; the second copy is hidden from assistive tech.
 */
export function RollText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn('relative block overflow-hidden', className)}>
      <span className="block transition-transform duration-[400ms] ease-[cubic-bezier(0.25,1.05,0.4,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none">
        <span className="block">{children}</span>
        <span className="absolute left-0 top-full block w-full" aria-hidden>
          {children}
        </span>
      </span>
    </span>
  );
}

/** Blue-tint pill used above every section heading ("Product", "Pricing"…). */
export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[13px] rounded-[30px] bg-lp-blue-50 px-[13px] py-[6px] text-lp-blue-400',
        TYPE.pill,
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Pill + H2 + lead, centred (default) or left-aligned on desktop (FAQ).
 * Each section caps its heading and lead at its own widths (Framer sets them
 * per section and per breakpoint), so pass those in as classes.
 * `headingClassName` styles the pill + H2 group (Pricing fixes its height);
 * `titleAs="h1"` makes the heading the page title (blog index).
 */
export function SectionHeader({
  pill,
  title,
  lead,
  align = 'center',
  titleAs: Title = 'h2',
  className,
  headingClassName,
  titleClassName = 'max-w-[500px]',
  leadClassName = 'max-w-[460px]',
}: {
  pill: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  align?: 'center' | 'left';
  titleAs?: 'h1' | 'h2';
  className?: string;
  headingClassName?: string;
  titleClassName?: string;
  leadClassName?: string;
}) {
  const alignItems = align === 'center' ? 'items-center text-center' : 'items-center text-center desktop:items-start desktop:text-left';
  return (
    <div className={cn('flex flex-col gap-5', alignItems, className)}>
      <div className={cn('flex w-full flex-col gap-2.5', alignItems, headingClassName)}>
        <Pill>{pill}</Pill>
        <Title className={cn('text-black', TYPE.h2, titleClassName)}>{title}</Title>
      </div>
      <p className={cn('text-lp-gray-700', TYPE.body, leadClassName)}>{lead}</p>
    </div>
  );
}

const GRADIENT = 'bg-[linear-gradient(180deg,#3787ff_0%,#0d6eff_100%)]';

/** The pill-shaped gradient CTA ("Get Started"), with the rolling label. */
export function GradientButton({
  href,
  children,
  className,
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center justify-center rounded-[40px] px-[18px] py-[10px] text-white',
        TYPE.button,
        'outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400 focus-visible:ring-offset-2',
        GRADIENT,
        className,
      )}
    >
      {/* Framer clips the label to a fixed 17px box, so the button is 37px tall at every size. */}
      <RollText className="h-[17px]">{children}</RollText>
    </Link>
  );
}

/** 40px gradient tile holding a white 24px icon (Product cards). */
export function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-[7px] p-2 text-white', GRADIENT)} aria-hidden>
      {children}
    </span>
  );
}

export { GRADIENT };
