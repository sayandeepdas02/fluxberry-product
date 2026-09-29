'use client';

import { motion } from 'motion/react';
import { Briefcase, type LucideIcon } from 'lucide-react';
import { EASE_OUT, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { BLUE, Card, CheckDot, CUE, FMark, Glass, HUES, IconTile, MUTED, SHADOW_SOFT, Tag, alongCurve, curvePath, type Hue } from './kit';

/*
 * The "X alternatives" posts: the ATS you're leaving on the left, faded, and
 * the article's shortlist on the right, each pick with its "best for" tag.
 * A wire runs from one to the other and candidates keep moving across it
 * while the cover is on screen. Fluxberry heads the list, checked.
 */

export interface SwitchPick {
  name: string;
  tag: string;
  hue: Hue;
  icon: LucideIcon;
}

type Pt = readonly [number, number];

const FROM = { left: 80, top: 352, width: 390, height: 150 };
const LIST = { left: 610, top: 262, width: 510, height: 560 };
const ROW = { top: 84, height: 82, gap: 14 };
const WIRE: readonly [Pt, Pt, Pt, Pt] = [[470, 427], [540, 427], [560, 380], [622, 380]];
const PACKET = 16;

export function SwitchScene({ v, from, note, picks }: { v: VisualState; from: string; note: string; picks: readonly SwitchPick[] }) {
  const path = alongCurve(...WIRE);

  return (
    <>
      <svg className="absolute inset-0 overflow-visible" width={1200} height={750} fill="none">
        <motion.path
          d={curvePath(...WIRE)}
          stroke="rgba(255,255,255,0.75)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="2 10"
          {...enter(v, { pathLength: 0, opacity: 0 }, { pathLength: 1, opacity: 1 }, { delay: CUE + 0.45, duration: 0.7, ease: EASE_OUT })}
        />
      </svg>

      {/* Candidates on their way to the new tool. */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute left-0 top-0 rounded-full bg-white"
          style={{
            width: PACKET,
            height: PACKET,
            marginLeft: -PACKET / 2,
            marginTop: -PACKET / 2,
            boxShadow: `0 0 0 5px rgba(45,129,255,0.25), 0 0 18px 4px rgba(255,255,255,0.8), inset 0 0 0 4px ${BLUE}`,
          }}
          initial={{ opacity: 0, x: path.x[0], y: path.y[0] }}
          animate={v.looping ? { x: path.x, y: path.y, opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={
            v.looping
              ? {
                  duration: 1.3,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 1.9,
                  delay: 1.3 + i * 1.6,
                  opacity: { duration: 1.3, times: [0, 0.15, 0.85, 1], repeat: Infinity, repeatDelay: 1.9, delay: 1.3 + i * 1.6 },
                }
              : { duration: 0.2 }
          }
        />
      ))}

      {/* The ATS being left behind. */}
      <motion.div
        className="absolute"
        style={{ left: FROM.left, top: FROM.top - 78 }}
        {...enter(v, { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, { ...POP, delay: CUE + 0.2 })}
      >
        <Tag className="relative" style={{ boxShadow: SHADOW_SOFT }}>
          <span className="font-inter text-[18px] font-normal text-[#6b7390]">Switching from</span>
          {from}
        </Tag>
      </motion.div>
      <motion.div {...enter(v, { opacity: 0, x: -24 }, { opacity: 1, x: 0 }, { duration: 0.8, ease: EASE_OUT, delay: CUE + 0.1 })}>
        <Glass style={FROM} radius={36}>
          <Card className="relative flex h-full w-full items-center gap-[18px] px-[24px]" style={{ borderRadius: 24 }}>
            <IconTile icon={Briefcase} size={62} className="grayscale" />
            <span className="flex flex-col gap-[8px]">
              <span className="font-manrope text-[32px] font-semibold leading-none tracking-[-0.02em] text-[#0b0d17]">{from}</span>
              <span className="font-inter text-[17px] leading-none" style={{ color: MUTED }}>
                {note}
              </span>
            </span>
          </Card>
        </Glass>
      </motion.div>

      {/* The shortlist. */}
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={LIST} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            <div className="absolute inset-x-[26px] top-[26px] flex items-center gap-[10px]">
              <span className="font-manrope text-[22px] font-semibold text-[#0b0d17]">Alternatives</span>
              <span className="rounded-full bg-[#f1f3f7] px-[10px] py-[2px] font-manrope text-[15px] font-semibold text-[#6b7390]">
                {picks.length}
              </span>
            </div>

            {picks.map((pick, i) => (
              <motion.div
                key={pick.name}
                className="absolute inset-x-[18px] flex items-center gap-[14px] rounded-[16px] px-[14px]"
                style={{
                  top: ROW.top + i * (ROW.height + ROW.gap),
                  height: ROW.height,
                  backgroundColor: i === 0 ? '#f3f8ff' : '#ffffff',
                  boxShadow: i === 0 ? `inset 0 0 0 2px ${BLUE}` : 'inset 0 0 0 1.5px #eceff4',
                }}
                {...enter(v, { opacity: 0, x: 28 }, { opacity: 1, x: 0 }, { ...POP, delay: CUE + 0.55 + i * 0.1 })}
              >
                {i === 0 ? <FMark size={46} radius={13} /> : <IconTile icon={pick.icon} hue={pick.hue} size={46} />}
                <span className="font-manrope text-[22px] font-semibold text-[#0b0d17]">{pick.name}</span>
                <span
                  className="ml-auto whitespace-nowrap rounded-full px-[12px] py-[5px] font-manrope text-[15px] font-semibold"
                  style={{ backgroundColor: HUES[pick.hue].bg, color: HUES[pick.hue].fg }}
                >
                  {pick.tag}
                </span>
                {i === 0 && (
                  <motion.span
                    initial={false}
                    animate={v.looping ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={v.looping ? { duration: 0.5, repeat: Infinity, repeatDelay: 2.7, delay: 2.5 } : { duration: 0.2 }}
                  >
                    <CheckDot size={28} on={v.started} />
                  </motion.span>
                )}
              </motion.div>
            ))}
          </Card>
        </Glass>
      </motion.div>
    </>
  );
}
