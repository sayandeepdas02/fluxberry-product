'use client';

import { motion } from 'motion/react';
import { Briefcase, CalendarDays, ClipboardCheck, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { EASE_OUT, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { BLUE, Card, CUE, FMark, Glass, IconTile, SHADOW, alongCurve, curvePath, type Hue } from './kit';

/*
 * "Top tools that integrate with Greenhouse": Greenhouse as the hub, with the
 * article's five categories on an arc above it. Each is wired in, and data
 * keeps arriving along the wires while the cover is on screen. Sourcing
 * carries the Fluxberry mark (the article's first sourcing pick).
 */

type Pt = readonly [number, number];

const HUB = { left: 420, top: 548, width: 360, height: 150 };
const NODES: { label: string; icon: LucideIcon | 'brand'; hue: Hue; at: Pt; curve: readonly [Pt, Pt, Pt, Pt] }[] = [
  { label: 'Sourcing', icon: 'brand', hue: 'blue', at: [150, 452], curve: [[150, 488], [150, 623], [300, 623], [420, 623]] },
  { label: 'Scheduling', icon: CalendarDays, hue: 'teal', at: [350, 344], curve: [[350, 380], [350, 470], [530, 462], [530, 548]] },
  { label: 'Assessment', icon: ClipboardCheck, hue: 'violet', at: [600, 305], curve: [[600, 341], [600, 420], [600, 470], [600, 548]] },
  // Its label is the longest, so it sits further out than Scheduling does.
  { label: 'Background checks', icon: ShieldCheck, hue: 'orange', at: [872, 344], curve: [[872, 380], [872, 470], [670, 462], [670, 548]] },
  { label: 'HRIS', icon: Users, hue: 'blue', at: [1062, 452], curve: [[1062, 488], [1062, 623], [900, 623], [780, 623]] },
];
/** Entrance order: from the middle of the arc outwards. */
const ORDER = [3, 1, 0, 2, 4];
const PACKET = 16;

export function HubScene({ v }: { v: VisualState }) {
  return (
    <>
      <svg className="absolute inset-0 overflow-visible" width={1200} height={750} fill="none">
        {NODES.map((node, i) => (
          <motion.path
            key={node.label}
            d={curvePath(...node.curve)}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={3}
            strokeLinecap="round"
            {...enter(v, { pathLength: 0, opacity: 0 }, { pathLength: 1, opacity: 1 }, { delay: CUE + 0.35 + ORDER[i] * 0.07, duration: 0.8, ease: EASE_OUT })}
          />
        ))}
      </svg>

      {/* Data on its way in. */}
      {NODES.map((node, i) => {
        const path = alongCurve(...node.curve);
        return (
          <motion.span
            key={node.label}
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
                    duration: 1.5,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 1.6 + (i % 2) * 0.5,
                    delay: 1.2 + ORDER[i] * 0.45,
                    opacity: { duration: 1.5, times: [0, 0.12, 0.85, 1], repeat: Infinity, repeatDelay: 1.6 + (i % 2) * 0.5, delay: 1.2 + ORDER[i] * 0.45 },
                  }
                : { duration: 0.2 }
            }
          />
        );
      })}

      {NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute"
          style={{ left: node.at[0], top: node.at[1], x: '-50%', y: '-50%' }}
          {...enter(v, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { ...POP, delay: CUE + 0.55 + ORDER[i] * 0.08 })}
        >
          <Card
            className="relative flex h-[72px] items-center gap-[14px] whitespace-nowrap rounded-full pl-[14px] pr-[26px]"
            style={{ boxShadow: SHADOW }}
          >
            {node.icon === 'brand' ? <FMark size={44} radius={13} /> : <IconTile icon={node.icon} hue={node.hue} size={44} />}
            <span className="font-manrope text-[21px] font-semibold text-[#0b0d17]">{node.label}</span>
          </Card>
        </motion.div>
      ))}

      <motion.div {...enter(v, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1 }, { ...POP, delay: CUE + 0.1 })}>
        <Glass style={HUB} radius={38}>
          {/* A slow halo, so the hub reads as live. */}
          <motion.span
            className="absolute -inset-[2px] rounded-[40px] ring-2 ring-white/70"
            initial={false}
            animate={v.looping ? { scale: [1, 1.08], opacity: [0.8, 0] } : { opacity: 0 }}
            transition={v.looping ? { duration: 2, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 } : { duration: 0.2 }}
          />
          <Card className="relative flex h-full w-full items-center gap-[18px] px-[24px]" style={{ borderRadius: 26 }}>
            <IconTile icon={Briefcase} size={66} />
            <span className="flex flex-col gap-[6px]">
              <span className="font-manrope text-[33px] font-semibold leading-none tracking-[-0.02em] text-[#0b0d17]">Greenhouse</span>
              <span className="font-inter text-[17px] leading-none text-[#6b7390]">ATS · 400+ integrations</span>
            </span>
          </Card>
        </Glass>
      </motion.div>
    </>
  );
}
