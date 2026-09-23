import { cn } from '@/lib/utils';

/** Outer frame with the vertical rails drawn down the column edges. */
export function Frame({
  children,
  className,
  rails = true,
}: {
  children: React.ReactNode;
  className?: string;
  rails?: boolean;
}) {
  return (
    <div className={cn('mk-frame', className)}>
      {rails && <div className="mk-rails" aria-hidden />}
      <div className="relative">{children}</div>
    </div>
  );
}
