import { cn } from '@/lib/utils';

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
