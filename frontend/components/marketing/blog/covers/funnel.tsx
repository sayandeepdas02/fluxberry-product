'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, CalendarDays, ClipboardCheck, Search, Send, type LucideIcon } from 'lucide-react';
import { EASE_OUT, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { Avatar, BLUE, Bar, Card, CheckDot, CUE, FMark, GREEN, Glass, HUES, IconTile, type Hue } from './kit';

/*
 * "9 Lever integrations across the hiring stack": the funnel as a rail, one
 * stop per category in the article (sourcing, outreach, scheduling,
 * assessment, analytics). A candidate travels it; each stop lights as they
 * pass and the tool plugged in below it syncs. Then the next candidate.
 */

const RAIL = { left: 80, top: 318, width: 1040, height: 128 };
const RAIL_Y = RAIL.top + RAIL.height / 2;
const STOPS: { label: string; icon: LucideIcon; hue: Hue; brand?: boolean }[] = [
  { label: 'Sourcing', icon: Search, hue: 'blue', brand: true },
  { label: 'Outreach', icon: Send, hue: 'violet' },
  { label: 'Scheduling', icon: CalendarDays, hue: 'teal' },
  { label: 'Assessment', icon: ClipboardCheck, hue: 'orange' },
  { label: 'Analytics', icon: BarChart3, hue: 'blue' },
];
const STOP_X = [190, 395, 600, 805, 1010];
const NODE = 88;
const PIN = 60;
const CANDIDATES = [
  { initials: 'MC', tone: 0 },
  { initials: 'LP', tone: 1 },
  { initials: 'AS', tone: 2 },
];
const CARD = { top: 500, width: 186, height: 172 };

// One hop per stop, a hold once the candidate reaches the end, then a reset.
const HOP_MS = 950;
const END_MS = 1800;
const RESET_MS = 500;
/** Before the loop starts (and with reduced motion, all five). */
const STILL = 2;

export function FunnelScene({ v }: { v: VisualState }) {
  const [{ at, cycle }, setRun] = useState({ at: v.reduced ? 4 : STILL, cycle: 0 });
  const resetting = at === 5;

  useEffect(() => {
    if (v.reduced) setRun({ at: 4, cycle: 0 });
  }, [v.reduced]);

  useEffect(() => {
    if (!v.looping) return;
    const wait = at === 4 ? END_MS : at === 5 ? RESET_MS : at === STILL && cycle === 0 ? 1500 : HOP_MS;
    const id = setTimeout(() => setRun(({ at: a, cycle: c }) => (a === 5 ? { at: 0, cycle: c + 1 } : { at: a + 1, cycle: c })), wait);
    return () => clearTimeout(id);
  }, [v.looping, at, cycle]);

  const lit = (i: number) => !resetting && i <= at;

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={RAIL} radius={64} />
      </motion.div>

      {/* Track, then the progress over it. */}
      <motion.span
        className="absolute h-[6px] origin-left rounded-full bg-white/60"
        style={{ left: STOP_X[0], top: RAIL_Y - 3, width: STOP_X[4] - STOP_X[0] }}
        {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: CUE + 0.3, duration: 0.9, ease: EASE_OUT })}
      />
      <motion.span
        className="absolute h-[6px] origin-left rounded-full"
        style={{ left: STOP_X[0], top: RAIL_Y - 3, width: STOP_X[4] - STOP_X[0], backgroundColor: BLUE }}
        initial={false}
        animate={{ scaleX: v.started && !resetting ? Math.min(at, 4) / 4 : 0 }}
        transition={{ type: 'spring', visualDuration: 0.7, bounce: 0.1 }}
      />

      {STOPS.map((stop, i) => (
        <div key={stop.label}>
          {/* The stop on the rail. */}
          <motion.div
            className="absolute"
            style={{ left: STOP_X[i] - NODE / 2, top: RAIL_Y - NODE / 2, width: NODE, height: NODE }}
            {...enter(v, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }, { ...POP, delay: CUE + 0.35 + i * 0.08 })}
          >
            <motion.span
              className="absolute inset-0 rounded-full"
              initial={false}
              animate={{ backgroundColor: lit(i) ? BLUE : '#ffffff', boxShadow: lit(i) ? '0 12px 30px -10px rgba(13,110,255,0.7)' : '0 10px 24px -12px rgba(8,38,99,0.4)' }}
              transition={{ duration: 0.35 }}
            />
            <motion.span
              className="absolute inset-0 flex items-center justify-center"
              initial={false}
              animate={{ color: lit(i) ? '#ffffff' : HUES[stop.hue].fg }}
              transition={{ duration: 0.35 }}
            >
              <stop.icon size={36} strokeWidth={2.2} />
            </motion.span>
            {/* A ring goes out as the candidate arrives. */}
            <AnimatePresence>
              {at === i && v.looping ? (
                <motion.span
                  key={`${cycle}-${i}`}
                  className="absolute inset-0 rounded-full border-[3px] border-white"
                  initial={{ scale: 1, opacity: 0.9 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                />
              ) : null}
            </AnimatePresence>
          </motion.div>

          {/* The tool plugged in at this stop. */}
          <motion.span
            className="absolute w-[3px] origin-top rounded-full bg-white/70"
            style={{ left: STOP_X[i] - 1.5, top: RAIL.top + RAIL.height, height: CARD.top - RAIL.top - RAIL.height }}
            {...enter(v, { scaleY: 0 }, { scaleY: 1 }, { delay: CUE + 0.55 + i * 0.08, duration: 0.4, ease: EASE_OUT })}
          />
          <motion.div
            className="absolute"
            style={{ left: STOP_X[i] - CARD.width / 2, top: CARD.top }}
            {...enter(v, { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, { type: 'spring', visualDuration: 0.6, bounce: 0.2, delay: CUE + 0.6 + i * 0.08 })}
          >
            <Card
              className="relative flex flex-col rounded-[20px] px-[18px] pt-[16px]"
              style={{ width: CARD.width, height: CARD.height }}
            >
              <span className="font-inter text-[16px] text-[#6b7390]">{stop.label}</span>
              <span className="mt-[12px] flex items-center gap-[10px]">
                {stop.brand ? <FMark size={38} radius={11} /> : <IconTile icon={stop.icon} hue={stop.hue} size={38} />}
                {stop.brand ? (
                  <span className="font-manrope text-[17px] font-semibold text-[#0b0d17]">Fluxberry</span>
                ) : (
                  <span className="flex flex-col gap-[7px]">
                    <Bar width={78 - (i % 2) * 14} height={10} />
                    <Bar width={50} height={8} className="bg-[#f0f2f6]" />
                  </span>
                )}
              </span>
              <span className="mt-auto flex h-[52px] items-center gap-[8px] border-t border-[#eef0f4]">
                <span className="relative size-[22px]">
                  <span className="absolute inset-[6px] rounded-full bg-[#d6dbe4]" />
                  <span className="absolute inset-0">
                    <CheckDot size={22} on={lit(i) && v.started} />
                  </span>
                </span>
                <span className="relative h-[20px] w-[90px]">
                  <AnimatePresence initial={false} mode="wait">
                    <motion.span
                      key={lit(i) ? 'on' : 'off'}
                      className="absolute left-0 top-0 font-manrope text-[15px] font-semibold leading-[20px]"
                      style={{ color: lit(i) ? GREEN : '#98a0b3' }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                    >
                      {lit(i) ? 'Synced' : 'Waiting'}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </Card>
          </motion.div>
        </div>
      ))}

      {/* The candidate: a pin that rides the top of the rail from stop to stop. */}
      <AnimatePresence>
        {v.started && !resetting ? (
          <motion.div
            key={cycle}
            className="absolute left-0 top-0"
            style={{ marginLeft: -PIN / 2, marginTop: RAIL.top - PIN + 4 }}
            initial={v.reduced ? false : { opacity: 0, x: STOP_X[at], y: -12 }}
            animate={{ opacity: 1, x: STOP_X[Math.min(at, 4)], y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.18, opacity: { duration: 0.3, delay: cycle === 0 ? CUE + 0.9 : 0 } }}
          >
            <span
              className="flex items-center justify-center rounded-full bg-white ring-[3px] ring-[#2d81ff]"
              style={{ width: PIN, height: PIN, boxShadow: '0 14px 30px -10px rgba(8,38,99,0.55)' }}
            >
              <Avatar {...CANDIDATES[cycle % CANDIDATES.length]} size={PIN - 14} />
            </span>
            <span className="absolute left-1/2 top-[calc(100%-2px)] -translate-x-1/2 border-x-[9px] border-t-[11px] border-x-transparent border-t-[#2d81ff]" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
