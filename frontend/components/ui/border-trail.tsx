'use client';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

type BorderTrailProps = {
  className?: string;
  size?: number;
  style?: CSSProperties;
};

export function BorderTrail({ className, size = 60, style }: BorderTrailProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <div
        className={cn('absolute aspect-square bg-zinc-500', className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          animation: 'border-trail-move 5s linear infinite',
          ...style,
        }}
      />
    </div>
  );
}
