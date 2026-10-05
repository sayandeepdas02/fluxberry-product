'use client';

import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  usePageInView,
  useReducedMotion,
  useTransform,
  type TargetAndTransition,
  type Transition,
} from 'motion/react';
import { cn } from '@/lib/utils';

/*
 * Shared pieces for the landing page's animated mockups (the hero dashboard
 * and the Product cards' and blog covers' scenes), animated with Motion.
 *
 * Each visual is drawn on a fixed design canvas, the screenshot's own pixel
 * grid (e.g. 866×660, or 1960×1208 for the hero), and scaled to fit its frame
 * the way `object-contain` fitted the images. So every coordinate in a visual
 * is a screenshot pixel, and the mockups keep their proportions at every width.
 */

/** Fast out, long soft landing: for things that draw or settle. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Symmetric ease for a line being drawn across a chart. */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
/** Lightly damped spring for things that pop in. */
export const POP: Transition = { type: 'spring', stiffness: 520, damping: 28 };
/** Spring for things that travel between positions. */
export const GLIDE: Transition = { type: 'spring', visualDuration: 0.6, bounce: 0.18 };
/** When a visual's choreography starts: once the card's own 1s fade-up has mostly landed. */
export const LEAD = 0.55;

export interface VisualState {
  ref: React.RefObject<HTMLDivElement | null>;
  /** The entrance has been triggered (with reduced motion: render the end state). */
  started: boolean;
  /** Idle loops may run: on screen, tab visible, motion allowed. */
  looping: boolean;
  reduced: boolean;
}

/**
 * Scroll, visibility and motion-preference state for one visual. Attach `ref` via <Stage>.
 * By default the entrance waits until the visual is half in view (the same trigger as the
 * landing cards' Reveal); `onMount` starts it as soon as the page is interactive, for
 * content that's already on screen when the page loads.
 */
export function useVisual({ onMount = false }: { onMount?: boolean } = {}): VisualState {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const entered = onMount ? mounted : inView;
  const onScreen = useInView(ref, { amount: 0.15 });
  const pageVisible = usePageInView();
  return { ref, reduced, started: entered || reduced, looping: entered && onScreen && pageVisible && !reduced };
}

/** Motion props that play `from` → `to` once the visual starts; reduced motion renders `to` directly. */
export function enter(v: VisualState, from: TargetAndTransition, to: TargetAndTransition, transition?: Transition) {
  return { initial: v.reduced ? false : from, animate: v.started ? to : from, transition } as const;
}

/** Steps through one phase per entry of `durations` (ms) while `active`, holding its place while paused. */
export function usePhases(active: boolean, durations: readonly number[]) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setPhase((p) => (p + 1) % durations.length), durations[phase]);
    return () => clearTimeout(id);
  }, [active, phase, durations]);
  return phase;
}

/** True `delay` seconds after the visual starts (immediately with reduced motion). */
export function useAfter(v: VisualState, delay: number) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) return setDone(true);
    const id = setTimeout(() => setDone(true), delay * 1000);
    return () => clearTimeout(id);
  }, [v.started, v.reduced, delay]);
  return done;
}

interface StageProps extends HTMLAttributes<HTMLDivElement> {
  visual: VisualState;
  width: number;
  height: number;
  /** Stretch the canvas to the frame's full width (for content that should run edge to edge). */
  fill?: boolean;
}

/** The design canvas, scaled to fit the frame (contain). Renders once the frame has been measured. */
export function Stage({ visual, width, height, fill = false, className, children, ...rest }: StageProps) {
  const [fit, setFit] = useState<{ scale: number; frameWidth: number } | null>(null);

  useLayoutEffect(() => {
    const el = visual.ref.current;
    if (!el) return;
    // clientWidth/Height are layout sizes, so the card's Reveal transform doesn't skew them.
    const measure = () =>
      setFit({ scale: Math.min(el.clientWidth / width, el.clientHeight / height), frameWidth: el.clientWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visual.ref, width, height]);

  return (
    <div ref={visual.ref} aria-hidden className={cn('absolute inset-0 select-none', className)} {...rest}>
      {fit ? (
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: fill ? fit.frameWidth / fit.scale : width,
            height,
            transform: `translate(-50%, -50%) scale(${fit.scale})`,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** A number that counts up from zero once the visual starts. */
export function CountUp({
  visual,
  to,
  decimals = 0,
  suffix = '',
  delay = 0,
  duration = 1.6,
}: {
  visual: VisualState;
  to: number;
  decimals?: number;
  suffix?: string;
  delay?: number;
  duration?: number;
}) {
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => `${v.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (!visual.started) return;
    if (visual.reduced) return value.set(to);
    const controls = animate(value, to, { delay, duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [visual.started, visual.reduced, to, delay, duration, value]);

  return <motion.span className="tabular-nums">{text}</motion.span>;
}
