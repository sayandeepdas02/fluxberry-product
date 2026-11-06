'use client';

import * as React from 'react';
import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';

function formatNumber(n: number, decimalPlaces: number) {
  return Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(n.toFixed(decimalPlaces)));
}

interface NumberTickerProps extends React.ComponentPropsWithoutRef<'span'> {
  value: number;
  /** Where the first count starts. Pass `value` to show the number as-is and only animate later changes. */
  startValue?: number;
  direction?: 'up' | 'down';
  /** Seconds to wait before counting. */
  delay?: number;
  decimalPlaces?: number;
}

/**
 * A number that springs to `value`: once when it first scrolls into view, and
 * from the old number to the new one whenever `value` changes. Adapted from
 * Magic UI's NumberTicker: imports motion/react (the app's animation library),
 * renders the starting number on the server, jumps instead of counting under
 * reduced motion, and sets `data-counting` while the number is moving.
 */
export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  decimalPlaces = 0,
  className,
  ...props
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const from = direction === 'down' ? value : startValue;
  const motionValue = useMotionValue(from);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const reduceMotion = useReducedMotion();
  // React renders the starting number once; after that the spring writes the text directly.
  const [initialText] = React.useState(() => formatNumber(from, decimalPlaces));

  React.useEffect(() => {
    if (!isInView) return;
    const target = direction === 'down' ? startValue : value;
    const timer = setTimeout(() => {
      if (reduceMotion) {
        motionValue.jump(target);
        springValue.jump(target);
      } else {
        motionValue.set(target);
      }
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, springValue, isInView, delay, value, direction, startValue, reduceMotion]);

  React.useEffect(
    () =>
      springValue.on('change', (latest) => {
        const el = ref.current;
        if (!el) return;
        el.textContent = formatNumber(latest, decimalPlaces);
        // Counting until the shown number rounds to the target.
        el.toggleAttribute('data-counting', Math.abs(latest - motionValue.get()) >= 0.5 * 10 ** -decimalPlaces);
      }),
    [springValue, motionValue, decimalPlaces],
  );

  return (
    <span
      ref={ref}
      className={cn('inline-block tabular-nums tracking-wider text-black dark:text-white', className)}
      {...props}
    >
      {initialText}
    </span>
  );
}
