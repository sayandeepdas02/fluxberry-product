'use client';

import { motion } from 'motion/react';
import { EASE_IN_OUT, EASE_OUT, POP, enter, usePhases, type VisualState } from '@/components/marketing/landing/stage';
import { BLUE, CUE, Card, Count, GREEN, GREEN_BG, Glass, MUTED, SLATE } from '@/components/marketing/blog/covers/kit';

/*
 * "Analytics": three headline numbers, the pipeline's conversion funnel and
 * a weekly applicants line. The funnel highlights one stage at a time. The
 * numbers are illustrative, drawn to show what the dashboard tracks.
 */

const GLASS = { left: 100, top: 250, width: 1000, height: 560 };
const KPIS = [
  { label: 'Applicants', to: 248, suffix: '', delta: '+18%' },
  { label: 'Time to hire', to: 18, suffix: ' days', delta: '-4 days' },
  { label: 'Offer rate', to: 12, suffix: '%', delta: '+3 pts' },
] as const;
const FUNNEL = [
  { label: 'Applied', pct: 1 },
  { label: 'Screened', pct: 0.62 },
  { label: 'Interview', pct: 0.31 },
  { label: 'Offer', pct: 0.12 },
] as const;
const FUNNEL_W = 290;
const HIGHLIGHT_MS = [1700, 1700, 1700, 1700];

/** Weekly applicants, drawn on a 400 × 190 chart. */
const POINTS: readonly (readonly [number, number])[] = [
  [0, 150],
  [66, 128],
  [132, 138],
  [198, 96],
  [264, 82],
  [330, 52],
  [400, 24],
];
const LINE = POINTS.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
const AREA = `${LINE} L400 190 L0 190 Z`;
const END = POINTS[POINTS.length - 1];

export function AnalyticsScene({ v }: { v: VisualState }) {
  const active = usePhases(v.looping, HIGHLIGHT_MS);

  return (
    <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
      <Glass style={GLASS} radius={34}>
        <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
          {KPIS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              className="absolute top-[24px] h-[104px] w-[296px] rounded-[16px] bg-[#f4f6fa] px-[20px] py-[14px]"
              style={{ left: 28 + i * 310 }}
              {...enter(v, { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { delay: CUE + 0.2 + i * 0.1, duration: 0.7, ease: EASE_OUT })}
            >
              <span className="font-inter text-[16px]" style={{ color: MUTED }}>
                {kpi.label}
              </span>
              <span className="mt-[2px] flex items-baseline gap-[10px]">
                <span className="font-manrope text-[38px] font-semibold leading-[46px] text-[#0b0d17]">
                  <Count v={v} from={0} to={kpi.to} delay={CUE + 0.5 + i * 0.1} duration={1.3} />
                  {kpi.suffix}
                </span>
                <span className="rounded-full px-[9px] py-[1px] font-inter text-[14px] font-medium" style={{ backgroundColor: GREEN_BG, color: GREEN }}>
                  {kpi.delta}
                </span>
              </span>
            </motion.div>
          ))}

          {/* Pipeline conversion. */}
          <motion.div
            className="absolute left-[28px] top-[150px]"
            {...enter(v, { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { delay: CUE + 0.5, duration: 0.7, ease: EASE_OUT })}
          >
            <span className="font-manrope text-[19px] font-semibold text-[#0b0d17]">Pipeline conversion</span>
            <div className="mt-[18px] flex flex-col gap-[18px]">
              {FUNNEL.map((row, i) => {
                const on = v.looping ? active === i : i === 0;
                return (
                  <div key={row.label} className="flex items-center gap-[14px]">
                    <span className="w-[86px] font-inter text-[16px]" style={{ color: SLATE }}>
                      {row.label}
                    </span>
                    <span className="relative h-[26px] overflow-hidden rounded-full bg-[#eef1f6]" style={{ width: FUNNEL_W }}>
                      <motion.span
                        className="absolute inset-y-0 left-0 rounded-full"
                        initial={v.reduced ? false : { width: 0 }}
                        animate={{ width: v.started ? FUNNEL_W * row.pct : 0, backgroundColor: on ? BLUE : '#b9c6de' }}
                        transition={{ width: { duration: 0.9, ease: EASE_OUT, delay: CUE + 0.7 + i * 0.1 }, backgroundColor: { duration: 0.35 } }}
                      />
                    </span>
                    <span className="w-[52px] font-manrope text-[16px] font-semibold tabular-nums" style={{ color: on ? BLUE : MUTED }}>
                      {Math.round(row.pct * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Applicants per week. */}
          <motion.div
            className="absolute left-[540px] top-[150px]"
            {...enter(v, { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { delay: CUE + 0.6, duration: 0.7, ease: EASE_OUT })}
          >
            <span className="font-manrope text-[19px] font-semibold text-[#0b0d17]">Applicants per week</span>
            <svg className="mt-[10px] overflow-visible" width={400} height={190} viewBox="0 0 400 190" fill="none">
              <defs>
                <linearGradient id="analytics-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={BLUE} stopOpacity={0.22} />
                  <stop offset="1" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              {[40, 100, 160].map((y) => (
                <line key={y} x1={0} x2={400} y1={y} y2={y} stroke="#eceff4" strokeWidth={1.5} />
              ))}
              <motion.path d={AREA} fill="url(#analytics-area)" {...enter(v, { opacity: 0 }, { opacity: 1 }, { delay: CUE + 1.5, duration: 0.8 })} />
              <motion.path
                d={LINE}
                stroke={BLUE}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                {...enter(v, { pathLength: 0 }, { pathLength: 1 }, { delay: CUE + 0.8, duration: 1.3, ease: EASE_IN_OUT })}
              />
              <motion.g {...enter(v, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1 }, { ...POP, delay: CUE + 2.0 })} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                <circle cx={END[0]} cy={END[1]} r={16} fill={BLUE} opacity={0.18} />
                <circle cx={END[0]} cy={END[1]} r={8} fill="#fff" stroke={BLUE} strokeWidth={4} />
              </motion.g>
            </svg>
          </motion.div>
        </Card>
      </Glass>
    </motion.div>
  );
}
