'use client';

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT, type VisualState } from '@/components/marketing/landing/stage';

/*
 * Shared pieces for the blog covers. A cover is the landing hero in
 * miniature: the painted sky, a short white cover line, and one small live
 * scene built from the hero's parts (a frosted-glass frame, white cards with
 * soft navy shadows). Every coordinate is a pixel on the cover's 1200×750
 * design canvas, which is scaled to fit whatever frame the cover sits in.
 */

export const W = 1200;
export const H = 750;

export const INK = '#0b0d17';
export const SLATE = '#3b4366';
export const MUTED = '#6b7390';
export const LINE = '#e6e9f0';
export const SOFT = '#f4f6fa';
export const BLUE = '#2d81ff';
export const GREEN = '#15935b';
export const GREEN_BG = '#e3f5eb';

/** Category hues for scenes that sort or group tools; tuned to sit on the sky without fighting the brand blue. */
export const HUES = {
  blue: { fg: BLUE, bg: '#e6f0ff' },
  violet: { fg: '#7457f5', bg: '#efebff' },
  teal: { fg: '#0c9c9a', bg: '#e0f5f4' },
  orange: { fg: '#ea7a18', bg: '#fdf0e3' },
} as const;
export type Hue = keyof typeof HUES;

/** When a cover's choreography starts. The blog cards don't fade in, so this is shorter than the landing's LEAD. */
export const CUE = 0.25;

export const SHADOW = '0 22px 44px -20px rgba(8, 38, 99, 0.55)';
export const SHADOW_SOFT = '0 10px 24px -12px rgba(8, 38, 99, 0.35)';
/** For things being carried across a board: higher, softer, further. */
export const SHADOW_LIFTED = '0 36px 60px -22px rgba(8, 38, 99, 0.6)';

/** The hero's frosted-glass frame. Radius and padding are in canvas px; the content's radius is the frame's less the padding. */
export function Glass({
  style,
  className,
  radius = 32,
  pad = 12,
  children,
}: {
  style: CSSProperties;
  className?: string;
  radius?: number;
  pad?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn('absolute bg-white/25 ring-1 ring-inset ring-white/50 backdrop-blur-md', className)}
      style={{ borderRadius: radius, padding: pad, boxShadow: '0 30px 70px -28px rgba(3, 37, 99, 0.45)', ...style }}
    >
      {children}
    </div>
  );
}

/** A white UI card with the scenes' soft navy shadow. */
export function Card({ style, className, children }: { style?: CSSProperties; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('absolute overflow-hidden bg-white', className)} style={{ boxShadow: SHADOW, ...style }}>
      {children}
    </div>
  );
}

/** The Fluxberry mark: a white F on the brand-blue square (the path from public/logo-mark.svg). */
export function FMark({ size, radius = size * 0.26, className }: { size: number; radius?: number; className?: string }) {
  return (
    <svg viewBox="0 0 2000 2000" width={size} height={size} className={cn('shrink-0', className)} style={{ borderRadius: radius }}>
      <rect width="2000" height="2000" fill={BLUE} />
      <path fill="#fff" d="M616.3 335.5H1452.5V526H853V888.9H1337.6V1075.2H853V1630.5H616.3Z" />
    </svg>
  );
}

/** A tinted square holding an icon, as the dashboard draws them. */
export function IconTile({ icon: Icon, hue = 'blue', size = 44, className }: { icon: LucideIcon; hue?: Hue; size?: number; className?: string }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: HUES[hue].bg, color: HUES[hue].fg }}
    >
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}

const AVATAR_TONES = ['#dbe8ff', '#e9e3ff', '#dcf3f1', '#fde9d6', '#e6eaf2'];
const AVATAR_INK = ['#1f5fd6', '#5a3fd8', '#0b7e7c', '#b85f10', '#3b4366'];

/** Initials in a tinted circle. */
export function Avatar({ initials, tone = 0, size = 40, className }: { initials: string; tone?: number; size?: number; className?: string }) {
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full font-manrope font-semibold', className)}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: AVATAR_TONES[tone % 5], color: AVATAR_INK[tone % 5] }}
    >
      {initials}
    </span>
  );
}

/** A grey placeholder line standing in for text a cover doesn't need to spell out. */
export function Bar({ width, height = 12, className, style }: { width: number; height?: number; className?: string; style?: CSSProperties }) {
  return <span className={cn('block rounded-full bg-[#e8ebf1]', className)} style={{ width, height, ...style }} />;
}

/** A small white label with an icon, floating over the sky. */
export function Tag({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn('absolute flex items-center gap-[12px] whitespace-nowrap rounded-full bg-white py-[12px] pl-[14px] pr-[22px] font-manrope text-[22px] font-semibold text-[#0b0d17]', className)}
      style={{ boxShadow: SHADOW, ...style }}
    >
      {children}
    </div>
  );
}

/** A check in a green circle. */
export function CheckDot({ size = 26, on = true }: { size?: number; on?: boolean }) {
  return (
    <motion.span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: GREEN }}
      initial={false}
      animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5 10 17.5 19 7.5" />
      </svg>
    </motion.span>
  );
}

/** A number that runs from `from` to `to` once the cover starts (CountUp, but it can count down). */
export function Count({
  v,
  from,
  to,
  delay = 0,
  duration = 1.4,
  format = (n: number) => Math.round(n).toLocaleString('en-US'),
}: {
  v: VisualState;
  from: number;
  to: number;
  delay?: number;
  duration?: number;
  format?: (n: number) => string;
}) {
  // With reduced motion, start on the final number: a set() before the text is bound doesn't reach the DOM until a re-render.
  const value = useMotionValue(v.reduced ? to : from);
  const text = useTransform(value, format);

  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) return value.set(to);
    const controls = animate(value, to, { delay, duration, ease: EASE_OUT });
    return () => controls.stop();
  }, [v.started, v.reduced, to, delay, duration, value]);

  return <motion.span className="tabular-nums">{text}</motion.span>;
}

type Point = readonly [number, number];

/**
 * Samples a cubic Bézier into x/y keyframes, so a dot can travel a curve with
 * plain transforms (no offset-path, no DOM measuring, and it survives the
 * canvas's scale). Returns positions relative to the dot's own origin.
 */
export function alongCurve(p0: Point, p1: Point, p2: Point, p3: Point, steps = 28) {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    x.push(u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]);
    y.push(u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]);
  }
  return { x, y };
}

/** The SVG path for the same curve. */
export function curvePath(p0: Point, p1: Point, p2: Point, p3: Point) {
  return `M${p0[0]} ${p0[1]}C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`;
}
