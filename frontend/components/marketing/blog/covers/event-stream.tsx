'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ClipboardCheck, MessageSquare, ShieldCheck, Users, Video, Webhook, Zap, type LucideIcon } from 'lucide-react';
import { EASE_OUT, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { Card, Count, CUE, FMark, GREEN, GREEN_BG, Glass, IconTile, type Hue } from './kit';

/*
 * "10 tools that integrate with Ashby": the article's angle is Ashby's
 * API-first design, so the cover is its event stream. Webhooks arrive at the
 * top of a live feed, each routed to a tool in the stack (Fluxberry for new
 * candidates), and the synced count ticks up with every one. The event names
 * are illustrative, not Ashby's exact API.
 */

const GLASS = { left: 250, top: 262, width: 700, height: 620 };
const HEAD = 74;
const ROW = 72;
const EVENTS: { name: string; to: string; icon: LucideIcon | 'brand'; hue: Hue; ms: number }[] = [
  { name: 'candidate.created', to: 'Fluxberry', icon: 'brand', hue: 'blue', ms: 84 },
  { name: 'stage.changed', to: 'Assessment', icon: ClipboardCheck, hue: 'violet', ms: 62 },
  { name: 'interview.booked', to: 'Video call', icon: Video, hue: 'teal', ms: 91 },
  { name: 'check.completed', to: 'Background', icon: ShieldCheck, hue: 'orange', ms: 77 },
  { name: 'offer.accepted', to: 'HRIS', icon: Users, hue: 'blue', ms: 58 },
  { name: 'candidate.hired', to: 'Team chat', icon: MessageSquare, hue: 'violet', ms: 69 },
];
/** Rows kept in the feed: enough to run past the frame's foot at any aspect. */
const KEEP = 8;
const EVERY_MS = 1500;
const START = 1280;

type Row = { id: number; event: number };
/** The feed as it first appears: newest first. */
const INITIAL: Row[] = Array.from({ length: 6 }, (_, k) => ({ id: 5 - k, event: (5 - k) % EVENTS.length }));

export function EventStreamScene({ v }: { v: VisualState }) {
  const [rows, setRows] = useState(INITIAL);
  const [synced, setSynced] = useState(START);

  useEffect(() => {
    if (!v.looping) return;
    const id = setTimeout(() => {
      setRows((r) => [{ id: r[0].id + 1, event: (r[0].id + 1) % EVENTS.length }, ...r].slice(0, KEEP));
      setSynced((n) => n + 1);
    }, EVERY_MS);
    return () => clearTimeout(id);
  }, [v.looping, rows]);

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={GLASS} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            <div className="absolute inset-x-[22px] top-0 flex items-center gap-[12px]" style={{ height: HEAD }}>
              <IconTile icon={Webhook} size={40} />
              <span className="font-manrope text-[22px] font-semibold text-[#0b0d17]">Webhooks</span>
              <span className="font-inter text-[17px] text-[#6b7390]">Ashby API</span>
              <span
                className="ml-auto flex items-center gap-[8px] rounded-full px-[12px] py-[4px] font-manrope text-[16px] font-semibold"
                style={{ color: GREEN, backgroundColor: GREEN_BG }}
              >
                <span className="relative size-[10px]">
                  <motion.span
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: GREEN }}
                    initial={false}
                    animate={v.looping ? { scale: [1, 2.2], opacity: [0.6, 0] } : { scale: 1, opacity: 0 }}
                    transition={v.looping ? { duration: 1.5, ease: 'easeOut', repeat: Infinity } : { duration: 0.2 }}
                  />
                  <span className="absolute inset-0 rounded-full" style={{ backgroundColor: GREEN }} />
                </span>
                Live
              </span>
            </div>
            <div className="absolute inset-x-0 h-px bg-[#eef0f4]" style={{ top: HEAD }} />

            {/* New events slide out from under the header. */}
            <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: HEAD + 1 }}>
              <AnimatePresence initial={false}>
                {rows.map((row, k) => (
                  <FeedRow key={row.id} v={v} row={row} index={k} />
                ))}
              </AnimatePresence>
            </div>
          </Card>
        </Glass>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 36, top: 430 }}
        {...enter(v, { opacity: 0, x: -24, scale: 0.94 }, { opacity: 1, x: 0, scale: 1 }, { ...POP, delay: CUE + 0.6 })}
      >
        <Card className="relative flex w-[244px] flex-col gap-[12px] rounded-[22px] px-[18px] pb-[18px] pt-[16px]">
          <span className="flex items-center gap-[10px] font-inter text-[17px] text-[#6b7390]">
            <IconTile icon={Zap} size={38} />
            Events synced
          </span>
          <span className="flex items-end gap-[10px] leading-none">
            <span className="font-manrope text-[34px] font-semibold tracking-[-0.03em] text-[#0b0d17]">
              {synced === START ? <Count v={v} from={0} to={START} delay={CUE + 0.7} duration={1.6} /> : synced.toLocaleString('en-US')}
            </span>
            <span className="mb-[5px] rounded-full px-[9px] py-[2px] font-manrope text-[15px] font-semibold" style={{ color: GREEN, backgroundColor: GREEN_BG }}>
              Today
            </span>
          </span>
        </Card>
      </motion.div>
    </>
  );
}

function FeedRow({ v, row, index }: { v: VisualState; row: Row; index: number }) {
  const event = EVENTS[row.event];
  const isNew = row.id > INITIAL[0].id;
  return (
    <motion.div
      className="absolute inset-x-0 left-0 top-0 flex items-center border-b border-[#eef0f4] px-[22px]"
      style={{ height: ROW }}
      initial={isNew ? { opacity: 0, y: -ROW, backgroundColor: '#eaf2ff' } : v.reduced ? false : { opacity: 0, y: index * ROW + 12 }}
      animate={{ opacity: v.started ? 1 : 0, y: index * ROW, backgroundColor: '#ffffff' }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'spring',
        visualDuration: 0.55,
        bounce: 0.15,
        opacity: { duration: 0.35, delay: isNew ? 0 : CUE + 0.35 + index * 0.07 },
        backgroundColor: { duration: 1.4, ease: 'easeOut', delay: 0.3 },
      }}
    >
      <span className="w-[210px] font-mono text-[18px] text-[#0b0d17]">{event.name}</span>
      <ArrowRight size={18} strokeWidth={2.4} className="text-[#aab1c2]" />
      <span className="ml-[16px] flex items-center gap-[10px]">
        {event.icon === 'brand' ? <FMark size={32} radius={9} /> : <IconTile icon={event.icon} hue={event.hue} size={32} />}
        <span className="font-manrope text-[17px] font-semibold text-[#0b0d17]">{event.to}</span>
      </span>
      <span className="ml-auto flex items-center gap-[12px]">
        <span className="rounded-full px-[9px] py-[2px] font-mono text-[15px] font-medium" style={{ color: GREEN, backgroundColor: GREEN_BG }}>
          200
        </span>
        <span className="w-[54px] text-right font-inter text-[15px] text-[#98a0b3]">{event.ms} ms</span>
      </span>
    </motion.div>
  );
}
