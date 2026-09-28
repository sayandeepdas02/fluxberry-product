'use client';

import { useEffect, useId, useState } from 'react';
import { animate, motion, transform, useMotionValue, useSpring, useTransform } from 'motion/react';
import { CountUp, EASE_IN_OUT, EASE_OUT, LEAD, POP, Stage, Surface, enter, useVisual } from '../stage';

/*
 * "Hiring Dashboard": an overview line chart. Coordinates inside the card are
 * the screenshot's pixels minus the card's origin (118, 78).
 */

const CARD = { left: 118, top: 78, width: 632, height: 504 };
const PLOT = { left: 86, right: 596, top: 104, bottom: 302 };
const GRID_Y = [104, 153.5, 203, 252.5, 302];
const Y_LABELS = ['14.0k', '10.5k', '7.0k', '3.5k', '0.0k'];
const X_LABELS = [
  ['Jan', 84],
  ['Feb', 187],
  ['Mar', 289.5],
  ['Apr', 392],
  ['May', 494.5],
  ['Jun', 591.5],
] as const;

// Traced from the screenshot's line; LINE is the same points smoothed (Catmull-Rom).
const POINTS = [
  [86, 185.2], [120, 179.4], [154, 174.9], [188, 173.4], [222, 174.6], [256, 177.4], [290, 178.6], [324, 174.6],
  [358, 166.0], [392, 157.5], [426, 149.4], [460, 141.6], [494, 135.0], [528, 131.1], [562, 128.5], [596, 127.0],
];
const LINE =
  'M86 185.2 C91.7 184.2 108.7 181.1 120 179.4 C131.3 177.7 142.7 175.9 154 174.9 C165.3 173.9 176.7 173.5 188 173.4 C199.3 173.3 210.7 173.9 222 174.6 C233.3 175.3 244.7 176.7 256 177.4 C267.3 178.1 278.7 179.1 290 178.6 C301.3 178.1 312.7 176.7 324 174.6 C335.3 172.5 346.7 168.8 358 166.0 C369.3 163.2 380.7 160.3 392 157.5 C403.3 154.7 414.7 152.1 426 149.4 C437.3 146.8 448.7 144.0 460 141.6 C471.3 139.2 482.7 136.8 494 135.0 C505.3 133.2 516.7 132.2 528 131.1 C539.3 130.0 550.7 129.2 562 128.5 C573.3 127.8 590.3 127.2 596 127.0';
const AREA = `${LINE} L${PLOT.right} ${PLOT.bottom} L${PLOT.left} ${PLOT.bottom} Z`;
const BLUE = '#338bdc';

/** The line's height at any x across the plot. */
const lineY = transform(
  POINTS.map((p) => p[0]),
  POINTS.map((p) => p[1]),
);
/** Chart value (thousands) at a height on the plot. */
const valueAt = (y: number) => ((PLOT.bottom - y) / (PLOT.bottom - PLOT.top)) * 14;

export function DashboardVisual() {
  const v = useVisual();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // The line draws left to right; a dot rides its tip, then rests on the last point.
  const progress = useMotionValue(0);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) {
      progress.set(1);
      return setDrawn(true);
    }
    const controls = animate(progress, 1, {
      delay: LEAD + 0.45,
      duration: 1.5,
      ease: EASE_IN_OUT,
      onComplete: () => setDrawn(true),
    });
    return () => controls.stop();
  }, [v.started, v.reduced, progress]);
  const tipX = useTransform(progress, [0, 1], [PLOT.left, PLOT.right]);
  const tipY = useTransform(tipX, lineY);
  const clipWidth = useTransform(tipX, (x) => x - PLOT.left + 8);

  // Hover scrubbing: a guide, a dot and a readout follow the pointer along the line.
  const [scrubbing, setScrubbing] = useState(false);
  const pointerX = useMotionValue(PLOT.right);
  const scrubX = useSpring(pointerX, { stiffness: 700, damping: 50 });
  const scrubY = useTransform(scrubX, lineY);
  const readout = useTransform(scrubY, (y) => `${valueAt(y).toFixed(1)}k`);
  const readoutX = useTransform(scrubX, (x) => x - 40);
  const readoutY = useTransform(scrubY, (y) => y - 62);
  const plotX = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const f = Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1);
    return PLOT.left + f * (PLOT.right - PLOT.left);
  };

  return (
    <Stage visual={v} width={866} height={660}>
      <Surface className="rounded-[22px]" style={CARD}>
        <motion.p
          className="absolute left-[28px] top-[31px] font-inter text-[19px] leading-[22px] text-[#454a5c]"
          {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: LEAD, duration: 0.6, ease: EASE_OUT })}
        >
          Overview
        </motion.p>
        <div className="absolute left-[567px] top-[38px] flex gap-[6px]">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-[8px] rounded-full bg-[#e4e4e7]"
              {...enter(v, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1 }, { ...POP, delay: LEAD + 0.1 + i * 0.05 })}
            />
          ))}
        </div>
        <motion.div
          className="absolute left-[28px] top-[73px] h-[1.5px] w-[576px] origin-left bg-[#e8e8ea]"
          {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: LEAD + 0.05, duration: 0.8, ease: EASE_OUT })}
        />

        <svg className="absolute inset-0" width={CARD.width} height={CARD.height} viewBox={`0 0 ${CARD.width} ${CARD.height}`}>
          <defs>
            <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BLUE} stopOpacity="0.2" />
              <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${uid}-clip`}>
              <motion.rect x={PLOT.left - 8} y={0} height={CARD.height} width={clipWidth} />
            </clipPath>
          </defs>

          {GRID_Y.map((y, i) => (
            <motion.line
              key={y}
              x1={PLOT.left - 2}
              x2={PLOT.right + 1}
              y1={y}
              y2={y}
              stroke="#e8e8ea"
              strokeWidth={1.5}
              {...enter(v, { pathLength: 0, opacity: 0 }, { pathLength: 1, opacity: 1 }, { delay: LEAD + 0.1 + i * 0.06, duration: 0.8, ease: EASE_OUT })}
            />
          ))}
          {Y_LABELS.map((label, i) => (
            <motion.text
              key={label}
              x={72}
              y={GRID_Y[i]}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-[#9a98a0] font-inter text-[16px]"
              {...enter(v, { opacity: 0, x: -8 }, { opacity: 1, x: 0 }, { delay: LEAD + 0.2 + i * 0.05, duration: 0.5, ease: EASE_OUT })}
            >
              {label}
            </motion.text>
          ))}
          {X_LABELS.map(([label, x], i) => (
            <motion.text
              key={label}
              x={x}
              y={319}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-[#a3a3a8] font-inter text-[16px]"
              {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.35 + i * 0.04, duration: 0.5, ease: EASE_OUT })}
            >
              {label}
            </motion.text>
          ))}

          <g clipPath={`url(#${uid}-clip)`}>
            <path d={AREA} fill={`url(#${uid}-area)`} />
            <path d={LINE} fill="none" stroke={BLUE} strokeWidth={4} strokeLinecap="round" />
          </g>

          {/* The resting point breathes while the chart is on screen. */}
          <motion.circle
            cx={PLOT.right}
            cy={127}
            r={7}
            fill={BLUE}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ opacity: 0, scale: 1 }}
            animate={
              drawn && v.looping ? { opacity: [0.4, 0], scale: [1, 2.8] } : { opacity: 0, scale: 1 }
            }
            transition={drawn && v.looping ? { duration: 1.8, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.5 } : { duration: 0.2 }}
          />
          <motion.circle
            cx={tipX}
            cy={tipY}
            r={6.5}
            fill="#fff"
            stroke={BLUE}
            strokeWidth={3.5}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            {...enter(v, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1 }, { ...POP, delay: LEAD + 0.4 })}
          />

          {/* Scrub guide and dot. */}
          <motion.g initial={false} animate={{ opacity: scrubbing ? 1 : 0 }} transition={{ duration: 0.2 }}>
            <motion.line x1={scrubX} x2={scrubX} y1={PLOT.top} y2={PLOT.bottom} stroke="#bcd3f1" strokeWidth={1.5} strokeDasharray="4 4" />
            <motion.circle cx={scrubX} cy={scrubY} r={6.5} fill="#fff" stroke={BLUE} strokeWidth={3.5} />
          </motion.g>
          {drawn ? (
            <rect
              x={PLOT.left}
              y={PLOT.top - 20}
              width={PLOT.right - PLOT.left}
              height={PLOT.bottom - PLOT.top + 40}
              fill="transparent"
              onPointerEnter={(e) => {
                const x = plotX(e);
                pointerX.jump(x);
                scrubX.jump(x);
                setScrubbing(true);
              }}
              onPointerMove={(e) => pointerX.set(plotX(e))}
              onPointerLeave={() => setScrubbing(false)}
            />
          ) : null}
        </svg>

        <motion.div
          className="pointer-events-none absolute left-0 top-0 flex h-[38px] w-[80px] items-center justify-center rounded-[10px] bg-[#1f2533] font-inter text-[16px] text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)]"
          style={{ x: readoutX, y: readoutY }}
          initial={false}
          animate={{ opacity: scrubbing ? 1 : 0, scale: scrubbing ? 1 : 0.85 }}
          transition={{ duration: 0.18 }}
        >
          <motion.span className="tabular-nums">{readout}</motion.span>
        </motion.div>

        {[
          { label: 'Users', to: 12.4, x: 28 },
          { label: 'Sessions', to: 8.9, x: 325 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="absolute top-[374px] h-[101px] w-[279px] rounded-[14px] bg-[#f5f5f6]"
            style={{ left: stat.x }}
            {...enter(v, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.55 + i * 0.1, duration: 0.7, ease: EASE_OUT })}
          >
            <p className="absolute left-[18px] top-[17px] font-inter text-[16px] leading-[20px] text-[#82838b]">{stat.label}</p>
            <p className="absolute left-[18px] top-[46px] font-inter text-[28px] leading-[34px] text-[#2b2b35]">
              <CountUp visual={v} to={stat.to} decimals={1} suffix="k" delay={LEAD + 0.65 + i * 0.1} />
            </p>
          </motion.div>
        ))}
      </Surface>
    </Stage>
  );
}
