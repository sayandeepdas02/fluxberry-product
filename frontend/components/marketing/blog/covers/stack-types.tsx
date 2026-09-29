'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  ClipboardCheck,
  HeartHandshake,
  Mic,
  ScanSearch,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { EASE_OUT, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { BLUE, Bar, Card, CUE, FMark, Glass, IconTile, type Hue } from './kit';

/*
 * "Recruiting software by type": the article's eight types of tool, laid out
 * in hiring order on one board. A highlight walks through them stage by
 * stage, from sourcing to background checks, and starts again, the way a
 * candidate moves through a hiring stack. The ATS tile carries the Fluxberry
 * mark.
 */

const GLASS = { left: 100, top: 272, width: 1000, height: 400 };
const TYPES: { label: string; icon: LucideIcon | 'brand'; hue: Hue }[] = [
  { label: 'Sourcing', icon: Search, hue: 'blue' },
  { label: 'ATS', icon: 'brand', hue: 'blue' },
  { label: 'AI screening', icon: ScanSearch, hue: 'violet' },
  { label: 'CRM', icon: HeartHandshake, hue: 'teal' },
  { label: 'Scheduling', icon: CalendarDays, hue: 'teal' },
  { label: 'Assessments', icon: ClipboardCheck, hue: 'violet' },
  { label: 'Interview notes', icon: Mic, hue: 'orange' },
  { label: 'Checks & offers', icon: ShieldCheck, hue: 'orange' },
];
const COLS = 4;
const TILE = { width: 222, height: 160, gap: 16 };
const STEP_MS = 900;

export function StackTypesScene({ v }: { v: VisualState }) {
  const [active, setActive] = useState(-1);

  // Walk the highlight through the eight types while the cover is on screen.
  useEffect(() => {
    if (!v.looping) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % TYPES.length), active < 0 ? 1600 : STEP_MS);
    return () => clearTimeout(id);
  }, [v.looping, active]);

  return (
    <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
      <Glass style={GLASS} radius={34}>
        <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
          {TYPES.map((type, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const on = i === active;
            return (
              <motion.div
                key={type.label}
                className="absolute flex flex-col justify-between rounded-[18px] p-[18px]"
                style={{
                  left: 22 + col * (TILE.width + TILE.gap),
                  top: 22 + row * (TILE.height + TILE.gap),
                  width: TILE.width,
                  height: TILE.height,
                }}
                initial={v.reduced ? false : { opacity: 0, scale: 0.85 }}
                animate={{
                  opacity: v.started ? 1 : 0,
                  scale: v.started ? (on ? 1.04 : 1) : 0.85,
                  backgroundColor: on ? '#f3f8ff' : '#ffffff',
                  boxShadow: on ? `inset 0 0 0 2.5px ${BLUE}` : 'inset 0 0 0 1.5px #eceff4',
                }}
                transition={{ ...POP, opacity: { duration: 0.4, delay: CUE + 0.35 + i * 0.06 }, scale: { ...POP, delay: v.started && active < 0 ? CUE + 0.35 + i * 0.06 : 0 } }}
              >
                <div className="flex items-center justify-between">
                  {type.icon === 'brand' ? <FMark size={48} radius={14} /> : <IconTile icon={type.icon} hue={type.hue} size={48} />}
                  <span className="font-manrope text-[17px] font-semibold tabular-nums text-[#6b7390]">{i + 1}</span>
                </div>
                <div className="flex flex-col gap-[10px]">
                  <span className="font-manrope text-[22px] font-semibold leading-none text-[#0b0d17]">{type.label}</span>
                  <Bar width={110 + (i % 3) * 20} height={10} className="bg-[#f0f2f6]" />
                </div>
              </motion.div>
            );
          })}
        </Card>
      </Glass>
    </motion.div>
  );
}
