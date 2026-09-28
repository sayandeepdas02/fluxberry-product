'use client';

import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { CountUp, EASE_OUT, GLIDE, LEAD, POP, Stage, Surface, enter, useAfter, useVisual } from './stage';

/*
 * "Hiring Analytics": sessions per hour over a day. The bars grow in as a
 * wave, the "Peak" tooltip lands on the busiest hour, and hovering moves it
 * to the hour under the pointer. Coordinates inside the card are the
 * screenshot's pixels minus (129, 78).
 */

const CARD = { left: 129, top: 78, width: 611, height: 504 };
const PLOT = { left: 80, right: 580, top: 49, bottom: 274 };
const MAX = 90;
const TICKS = [90, 60, 30, 0];
const HOURS = [8, 6, 5, 4, 5, 7, 11, 16, 22, 27, 30, 32, 31, 29, 30, 33, 36, 40, 44, 47, 48, 43, 32, 18];
const PEAK = HOURS.indexOf(Math.max(...HOURS));
const SLOT = (PLOT.right - PLOT.left) / HOURS.length;
const BAR_WIDTH = 11;
const TIP = { width: 68, height: 79 };

const yOf = (value: number) => PLOT.bottom - (value / MAX) * (PLOT.bottom - PLOT.top);
const xOf = (hour: number) => PLOT.left + SLOT * (hour + 0.5);
/** Tooltip box position with its pointer resting just above the bar's top. */
const tipAt = (hour: number) => ({ x: xOf(hour) - TIP.width / 2, y: yOf(HOURS[hour]) - TIP.height - 18 });
const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export function AnalyticsVisual() {
  const v = useVisual();
  const ready = useAfter(v, LEAD + 1.4);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = ready && hovered !== null ? hovered : PEAK;

  // The tooltip's number counts up on entrance, then eases to each hovered hour.
  const value = useMotionValue(0);
  const shown = useTransform(value, (x) => Math.round(x));
  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) return value.set(HOURS[active]);
    const controls = ready
      ? animate(value, HOURS[active], { duration: 0.35, ease: EASE_OUT })
      : animate(value, HOURS[PEAK], { delay: LEAD + 1.15, duration: 0.9, ease: EASE_OUT });
    return () => controls.stop();
  }, [v.started, v.reduced, ready, active, value]);

  return (
    <Stage visual={v} width={866} height={660}>
      <Surface className="rounded-[23px]" style={CARD}>
        <svg className="absolute inset-0" width={CARD.width} height={CARD.height} viewBox={`0 0 ${CARD.width} ${CARD.height}`}>
          {TICKS.map((tick, i) => (
            <motion.line
              key={tick}
              x1={PLOT.left}
              x2={PLOT.right}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke="#e8e8ea"
              strokeWidth={1.5}
              {...enter(v, { pathLength: 0, opacity: 0 }, { pathLength: 1, opacity: 1 }, { delay: LEAD + i * 0.06, duration: 0.8, ease: EASE_OUT })}
            />
          ))}
          {TICKS.map((tick, i) => (
            <motion.text
              key={tick}
              x={67}
              y={yOf(tick)}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-[#9a98a0] font-inter text-[17px]"
              {...enter(v, { opacity: 0, x: -8 }, { opacity: 1, x: 0 }, { delay: LEAD + 0.1 + i * 0.05, duration: 0.5, ease: EASE_OUT })}
            >
              {tick}
            </motion.text>
          ))}
          {[0, 8, 16, 24].map((hour, i) => (
            <motion.text
              key={hour}
              x={hour === 24 ? PLOT.right + 3 : PLOT.left + SLOT * hour}
              y={294}
              // The last label ends at the plot's edge instead of hanging past it.
              textAnchor={hour === 24 ? 'end' : 'middle'}
              dominantBaseline="central"
              className="fill-[#a3a3a8] font-inter text-[17px]"
              {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.25 + i * 0.05, duration: 0.5, ease: EASE_OUT })}
            >
              {hourLabel(hour)}
            </motion.text>
          ))}
        </svg>

        {HOURS.map((count, hour) => (
          <motion.div
            key={hour}
            className="absolute rounded-t-[4px]"
            style={{
              left: xOf(hour) - BAR_WIDTH / 2,
              top: yOf(count),
              width: BAR_WIDTH,
              height: PLOT.bottom - yOf(count),
              originY: 1,
            }}
            initial={v.reduced ? false : { scaleY: 0, backgroundColor: '#dbe6fa' }}
            animate={{ scaleY: v.started ? 1 : 0, backgroundColor: hour === active ? '#3787ff' : '#dbe6fa' }}
            transition={{
              scaleY: { type: 'spring', stiffness: 170, damping: 19, delay: LEAD + 0.3 + hour * 0.025 },
              backgroundColor: { duration: 0.25 },
            }}
          />
        ))}

        {/* Hover target: the hour under the pointer. */}
        {ready ? (
          <div
            className="absolute"
            style={{ left: PLOT.left, top: PLOT.top - 10, width: PLOT.right - PLOT.left, height: PLOT.bottom - PLOT.top + 20 }}
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const f = (e.clientX - box.left) / box.width;
              setHovered(Math.min(HOURS.length - 1, Math.max(0, Math.floor(f * HOURS.length))));
            }}
            onPointerLeave={() => setHovered(null)}
          />
        ) : null}

        <motion.div
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: TIP.width, height: TIP.height, originY: 1 }}
          initial={v.reduced ? false : { opacity: 0, scale: 0.6, ...tipAt(PEAK) }}
          animate={{ opacity: v.started ? 1 : 0, scale: v.started ? 1 : 0.6, ...tipAt(active) }}
          transition={{
            ...GLIDE,
            opacity: { delay: v.started && !ready ? LEAD + 1.05 : 0, duration: 0.3 },
            scale: { ...POP, delay: v.started && !ready ? LEAD + 1.05 : 0 },
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6px] rounded-[12px] border-[1.5px] border-[#dbe7fb] bg-white shadow-[0_8px_22px_-8px_rgba(47,128,237,0.35)]">
            <span className="font-inter text-[16px] leading-[18px] text-[#6b7280]">{active === PEAK ? 'Peak' : hourLabel(active)}</span>
            <motion.span className="font-manrope text-[24px] font-semibold leading-[26px] text-[#4a7fd0] tabular-nums">{shown}</motion.span>
          </div>
          {/* Pointer: a rotated square, bordered on its two lower sides. */}
          <span className="absolute left-1/2 top-full size-[12px] -translate-x-1/2 -translate-y-[6.5px] rotate-45 border-b-[1.5px] border-r-[1.5px] border-[#dbe7fb] bg-white" />
        </motion.div>

        {[
          { label: 'Sessions', to: 24.6, decimals: 1, suffix: 'k', x: 31 },
          { label: 'Conversion', to: 3.8, decimals: 1, suffix: '%', x: 219 },
          { label: 'Retention', to: 68, decimals: 0, suffix: '%', x: 408 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="absolute top-[355px] h-[117px] w-[171px] rounded-[14px] bg-[#f4f4f5]"
            style={{ left: stat.x }}
            {...enter(v, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.5 + i * 0.1, duration: 0.7, ease: EASE_OUT })}
          >
            <p className="absolute left-[18px] top-[24px] font-inter text-[17px] leading-[20px] text-[#555a64]">{stat.label}</p>
            <p className="absolute left-[18px] top-[58px] font-inter text-[29px] leading-[36px] text-[#23232b]">
              <CountUp visual={v} to={stat.to} decimals={stat.decimals} suffix={stat.suffix} delay={LEAD + 0.6 + i * 0.1} />
            </p>
          </motion.div>
        ))}
        {[210, 399].map((x, i) => (
          <motion.span
            key={x}
            className="absolute top-[384px] h-[58px] w-[1.5px] bg-[#dcdce0]"
            style={{ left: x }}
            {...enter(v, { opacity: 0 }, { opacity: 1 }, { delay: LEAD + 0.8 + i * 0.1, duration: 0.5 })}
          />
        ))}
      </Surface>
    </Stage>
  );
}
