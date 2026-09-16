import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PixelChevronRight } from './pixel-icons';

/** Brand label above a section heading. */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-[5px] bg-berry-50 px-2 py-[3px] text-mk-label text-berry-700',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Outlined pill used as a page eyebrow (blog index, article category). */
export function EyebrowPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center rounded-[13px] border border-ink-200 bg-white px-3 py-[5px]',
        'text-[13px] font-medium leading-4 text-ink shadow-[0_1px_2px_rgba(13,17,23,0.03)]',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Quiet inline link with a corner arrow. */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'mk-focus inline-flex items-center gap-2.5 text-mk-label text-ink hover:underline hover:underline-offset-[5px]',
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-4 shrink-0" />
    </Link>
  );
}

/** The hero announcement: a tag, a line of news, and a chevron. */
export function AnnouncementPill({ href, tag, children }: { href: string; tag: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mk-focus mb-3.5 inline-flex max-w-[calc(100%-32px)] items-center gap-2.5 rounded-[20px] border border-ink-200 bg-white py-[5px] pl-1.5 pr-2.5 text-[13px] leading-5 text-ink-600 transition-colors hover:border-ink-400"
    >
      <span className="shrink-0 rounded-[14px] border border-berry-200 bg-berry-50 px-[7px] py-px text-[11px] text-berry-700">
        {tag}
      </span>
      <span className="min-w-0 truncate">{children}</span>
      <PixelChevronRight className="size-3.5 shrink-0" />
    </Link>
  );
}

/** Uppercase micro-link, used under logos and on cards. */
export function MicroLink({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-[7px] text-mk-micro uppercase text-berry-700', className)}>
      {children}
    </span>
  );
}
