'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Sparkles, Timer } from 'lucide-react';
import { CountUp, EASE_OUT, GLIDE, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { Avatar, BLUE, Bar, Card, Count, CUE, GREEN, GREEN_BG, Glass, IconTile, SHADOW, SHADOW_LIFTED, SOFT } from './kit';

/*
 * "How to improve your hiring process": speed and quality on one board.
 * A candidate is carried across the pipeline, Applied → Screened → Interview
 * → Offer, picking up a match score on the way and ending on "Offer sent".
 * Then the next one. Two stats flank the board: time to hire (speed) and the
 * shortlist's average match (the bar kept).
 */

const GLASS = { left: 230, top: 262, width: 740, height: 620 };
const STAGES = [
  { label: 'Applied', count: 140, bar: 1, ghosts: 4 },
  { label: 'Screened', count: 38, bar: 0.62, ghosts: 3 },
  { label: 'Interview', count: 12, bar: 0.36, ghosts: 2 },
  { label: 'Offer', count: 3, bar: 0.16, ghosts: 1 },
];
const COL_X = [24, 194, 364, 534];
const COL_W = 158;
const BODY_Y = 122;
const slotY = (k: number) => BODY_Y + 10 + k * 78;

const CANDIDATES = [
  { name: 'Maya Chen', initials: 'MC', tone: 0, score: 94 },
  { name: 'Leo Park', initials: 'LP', tone: 1, score: 91 },
  { name: 'Ana Silva', initials: 'AS', tone: 2, score: 96 },
];
// Applied, Screened (scored), Interview, Offer (sent, held), then out.
const STEP_MS = [1000, 1300, 1100, 2000, 450];
/** What the board shows before the loop starts, and with reduced motion. */
const STILL = 2;

export function HiringProcessScene({ v }: { v: VisualState }) {
  const [{ step, cycle }, setRun] = useState({ step: STILL, cycle: 0 });
  const running = v.looping;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(
      () => setRun(({ step: s, cycle: c }) => (s === STEP_MS.length - 1 ? { step: 0, cycle: c + 1 } : { step: s + 1, cycle: c })),
      step === STILL && cycle === 0 ? 1600 : STEP_MS[step],
    );
    return () => clearTimeout(id);
  }, [running, step, cycle]);

  const leaving = step === 4;
  const column = Math.min(step, 3);
  const candidate = CANDIDATES[cycle % CANDIDATES.length];

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={GLASS} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            {STAGES.map((stage, i) => (
              <div key={stage.label} className="absolute" style={{ left: COL_X[i], width: COL_W, top: 0, bottom: 0 }}>
                <p className="absolute left-[2px] top-[24px] font-inter text-[16px] text-[#6b7390]">{stage.label}</p>
                <p className="absolute left-[2px] top-[46px] font-manrope text-[32px] font-semibold tracking-[-0.02em] text-[#0b0d17]">
                  <CountUp visual={v} to={stage.count} delay={CUE + 0.3 + i * 0.08} duration={1.3} />
                </p>
                <motion.span
                  className="absolute left-0 top-[98px] h-[8px] origin-left rounded-full"
                  style={{ width: COL_W * stage.bar, backgroundColor: BLUE, opacity: 1 - i * 0.2 }}
                  {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: CUE + 0.35 + i * 0.1, duration: 0.8, ease: EASE_OUT })}
                />
                <div className="absolute inset-x-0 bottom-0 rounded-[16px]" style={{ top: BODY_Y, backgroundColor: SOFT }} />
                {Array.from({ length: stage.ghosts }, (_, k) => (
                  <motion.div
                    key={k}
                    className="absolute left-[10px] flex h-[66px] w-[138px] items-center gap-[10px] rounded-[12px] bg-white px-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                    initial={v.reduced ? false : { opacity: 0, y: slotY(k) + 10 }}
                    animate={{
                      opacity: v.started ? 1 : 0,
                      // The column makes room at the top while the candidate is in it.
                      y: slotY(k + (column === i && !leaving ? 1 : 0)),
                    }}
                    transition={{ ...GLIDE, opacity: { delay: v.started ? CUE + 0.5 + i * 0.06 + k * 0.05 : 0, duration: 0.4 } }}
                    style={{ top: 0 }}
                  >
                    <Avatar initials="" tone={4} size={30} />
                    <span className="flex flex-col gap-[7px]">
                      <Bar width={64} height={9} />
                      <Bar width={40} height={8} className="bg-[#f0f2f6]" />
                    </span>
                  </motion.div>
                ))}
              </div>
            ))}

            {/* The candidate being carried across the board. */}
            <AnimatePresence initial={false}>
              {!leaving && v.started ? (
                <motion.div
                  key={cycle}
                  className="absolute left-0 top-0 z-10"
                  initial={v.reduced ? false : { opacity: 0, x: COL_X[column] + 10, y: slotY(0) - 12, scale: 0.94 }}
                  animate={{ opacity: 1, x: COL_X[column] + 10, y: slotY(0), scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}
                  transition={{ ...GLIDE, opacity: { duration: 0.35, delay: cycle === 0 && step === STILL ? CUE + 0.8 : 0 } }}
                >
                  {/* Picked up, carried, set down: each move starts lifted and settles as it lands. */}
                  <motion.div
                    key={column}
                    className="flex h-[66px] w-[138px] items-center gap-[10px] rounded-[12px] bg-white px-[11px] ring-2 ring-[#2d81ff]"
                    initial={v.reduced || (step === STILL && cycle === 0) ? false : { scale: 1.07, rotate: -2.5, boxShadow: SHADOW_LIFTED }}
                    animate={{ scale: 1, rotate: 0, boxShadow: SHADOW }}
                    transition={{ type: 'spring', visualDuration: 0.55, bounce: 0.2, delay: 0.15 }}
                  >
                    <Avatar initials={candidate.initials} tone={candidate.tone} size={32} />
                    <span className="flex min-w-0 flex-col gap-[5px]">
                      <span className="whitespace-nowrap font-manrope text-[15px] font-semibold leading-[18px] text-[#0b0d17]">{candidate.name}</span>
                      <Status column={column} score={candidate.score} />
                    </span>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Card>
        </Glass>
      </motion.div>

      <StatChip
        v={v}
        style={{ left: 30, top: 408 }}
        from={-24}
        icon={<IconTile icon={Timer} size={38} />}
        label="Time to hire"
        delay={CUE + 0.55}
      >
        <span className="font-manrope text-[34px] font-semibold tracking-[-0.03em] text-[#0b0d17]">
          <Count v={v} from={42} to={18} delay={CUE + 0.7} duration={1.6} /> days
        </span>
        <span className="mb-[6px] rounded-full px-[9px] py-[2px] font-manrope text-[15px] font-semibold" style={{ color: GREEN, backgroundColor: GREEN_BG }}>
          −57%
        </span>
      </StatChip>

      <StatChip
        v={v}
        style={{ left: 940, top: 500 }}
        from={24}
        icon={<IconTile icon={Sparkles} size={38} />}
        label="Avg. match"
        delay={CUE + 0.7}
        meter
      >
        <span className="font-manrope text-[34px] font-semibold tracking-[-0.03em] text-[#0b0d17]">
          <CountUp visual={v} to={92} delay={CUE + 0.85} duration={1.4} suffix="%" />
        </span>
      </StatChip>
    </>
  );
}

/** The candidate card's second line: waiting, then scored, then the offer. */
function Status({ column, score }: { column: number; score: number }) {
  const state = column === 0 ? 'new' : column === 3 ? 'offer' : 'scored';
  return (
    <span className="relative block h-[20px] w-[80px]">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={state}
          className="absolute left-0 top-0"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ ...POP, delay: state === 'new' ? 0 : 0.3 }}
          style={{ transformOrigin: 'left center' }}
        >
          {state === 'new' ? (
            <Bar width={58} height={9} className="mt-[5px]" />
          ) : state === 'scored' ? (
            <span className="flex h-[20px] items-center gap-[4px] whitespace-nowrap rounded-full bg-[#e6f0ff] px-[7px] font-manrope text-[12px] font-semibold text-[#2d81ff]">
              <Sparkles size={11} strokeWidth={2.6} />
              {score}% match
            </span>
          ) : (
            <span
              className="flex h-[20px] items-center gap-[4px] whitespace-nowrap rounded-full px-[7px] font-manrope text-[12px] font-semibold"
              style={{ color: GREEN, backgroundColor: GREEN_BG }}
            >
              <Check size={11} strokeWidth={3} />
              Offer sent
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function StatChip({
  v,
  style,
  from,
  icon,
  label,
  delay,
  meter = false,
  children,
}: {
  v: VisualState;
  style: { left: number; top: number };
  from: number;
  icon: React.ReactNode;
  label: string;
  delay: number;
  meter?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="absolute"
      style={style}
      {...enter(v, { opacity: 0, x: from, scale: 0.94 }, { opacity: 1, x: 0, scale: 1 }, { ...POP, delay })}
    >
      <Card className="relative flex w-[232px] flex-col gap-[10px] rounded-[22px] px-[18px] pb-[18px] pt-[16px]">
        <span className="flex items-center gap-[10px] font-inter text-[17px] text-[#6b7390]">
          {icon}
          {label}
        </span>
        <span className="flex items-end gap-[10px] leading-none">{children}</span>
        {meter ? (
          <span className="block h-[8px] w-full overflow-hidden rounded-full bg-[#eef1f6]">
            <motion.span
              className="block h-full origin-left rounded-full"
              style={{ width: '92%', backgroundColor: BLUE }}
              {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: delay + 0.2, duration: 1.3, ease: EASE_OUT })}
            />
          </span>
        ) : null}
      </Card>
    </motion.div>
  );
}
