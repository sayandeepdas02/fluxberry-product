'use client';

import { useEffect } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { Search } from 'lucide-react';
import { EASE_OUT, enter, usePhases, type VisualState } from '@/components/marketing/landing/stage';
import { Avatar, BLUE, CUE, CheckDot, Card, Count, Glass, HUES, MUTED } from '@/components/marketing/blog/covers/kit';

/*
 * "Talent sourcing (TalentGPT)": a plain-English search is typed, three
 * matching people appear with a match score each, and the top one is reached
 * out to. Loops: typing, results, outreach sent, short pause.
 */

const GLASS = { left: 100, top: 250, width: 1000, height: 560 };
const QUERY = 'Senior React engineer in Bengaluru, 5+ years';
const CHIPS = [
  { label: 'React', hue: 'blue' },
  { label: 'Bengaluru', hue: 'violet' },
  { label: '5+ years', hue: 'teal' },
] as const;
const PEOPLE = [
  { name: 'Ananya Rao', role: 'Senior Frontend Engineer', score: 94, tone: 0 },
  { name: 'Karthik Iyer', role: 'Staff Engineer, React', score: 89, tone: 1 },
  { name: 'Meera Nair', role: 'Frontend Lead', score: 85, tone: 2 },
] as const;
// Typing, results, outreach sent, short pause.
const RUN_MS = [2200, 3600, 2600, 700];
const ROW = { top: 170, height: 86, gap: 12 };

/** The query, typed out while the first phase runs and held after. */
function Typed({ typing, reset, reduced }: { typing: boolean; reset: boolean; reduced: boolean }) {
  const count = useMotionValue(reduced ? QUERY.length : 0);
  const text = useTransform(count, (n) => QUERY.slice(0, Math.round(n)));
  useEffect(() => {
    if (reduced) return;
    if (typing) {
      const controls = animate(count, QUERY.length, { duration: 1.7, ease: 'linear' });
      return () => controls.stop();
    }
    if (reset) count.set(0);
  }, [typing, reset, reduced, count]);
  return <motion.span>{text}</motion.span>;
}

export function SourcingScene({ v }: { v: VisualState }) {
  const run = usePhases(v.looping, RUN_MS);
  const phase = v.reduced ? 2 : run;
  const showResults = phase === 1 || phase === 2;
  const sent = phase === 2;

  return (
    <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
      <Glass style={GLASS} radius={34}>
        <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
          <div className="absolute inset-x-[28px] top-[26px] flex h-[68px] items-center gap-[14px] rounded-[18px] border-[1.5px] border-[#e1e6ef] bg-white px-[20px]">
            <Search size={24} strokeWidth={2.4} style={{ color: BLUE }} />
            <span className="font-inter text-[24px] text-[#0b0d17]">
              <Typed typing={phase === 0} reset={phase === 3} reduced={v.reduced} />
              <motion.span
                className="ml-[2px] inline-block h-[26px] w-[2px] translate-y-[5px] bg-[#0b0d17]"
                animate={v.looping ? { opacity: [1, 0, 1] } : { opacity: 0 }}
                transition={v.looping ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
              />
            </span>
            <span className="ml-auto rounded-[12px] px-[18px] py-[8px] font-manrope text-[17px] font-semibold text-white" style={{ backgroundColor: BLUE }}>
              Search
            </span>
          </div>

          <div className="absolute left-[28px] top-[116px] flex h-[36px] items-center gap-[10px]">
            <span className="font-inter text-[15px]" style={{ color: MUTED }}>
              Understood
            </span>
            <AnimatePresence>
              {showResults &&
                CHIPS.map((chip, i) => (
                  <motion.span
                    key={chip.label}
                    className="rounded-full px-[14px] py-[4px] font-manrope text-[16px] font-semibold"
                    style={{ backgroundColor: HUES[chip.hue].bg, color: HUES[chip.hue].fg }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ type: 'spring', stiffness: 460, damping: 26, delay: i * 0.08 }}
                  >
                    {chip.label}
                  </motion.span>
                ))}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showResults &&
              PEOPLE.map((person, i) => (
                <motion.div
                  key={person.name}
                  className="absolute inset-x-[28px] flex items-center gap-[16px] rounded-[16px] bg-[#f4f6fa] px-[18px]"
                  style={{ top: ROW.top + i * (ROW.height + ROW.gap), height: ROW.height }}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.25 + i * 0.12 }}
                >
                  <Avatar initials={person.name.split(' ').map((n) => n[0]).join('')} tone={person.tone} size={50} />
                  <span className="flex flex-col gap-[3px]">
                    <span className="font-manrope text-[21px] font-semibold leading-[26px] text-[#0b0d17]">{person.name}</span>
                    <span className="font-inter text-[15px]" style={{ color: MUTED }}>
                      {person.role} · Bengaluru
                    </span>
                  </span>
                  <span className="ml-auto flex flex-col items-end gap-[5px]">
                    <span className="font-manrope text-[20px] font-semibold tabular-nums" style={{ color: BLUE }}>
                      <Count v={v} from={0} to={person.score} delay={0.5 + i * 0.12} duration={0.9} />% match
                    </span>
                    <span className="h-[8px] w-[120px] overflow-hidden rounded-full bg-[#e3e7ef]">
                      <motion.span
                        className="block h-full rounded-full"
                        style={{ backgroundColor: BLUE }}
                        initial={{ width: 0 }}
                        animate={{ width: `${person.score}%` }}
                        transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.5 + i * 0.12 }}
                      />
                    </span>
                  </span>
                  <span className="relative ml-[10px] h-[44px] w-[132px]">
                    {i === 0 && sent ? (
                      <motion.span
                        className="absolute inset-0 flex items-center justify-center gap-[8px] rounded-[12px] bg-[#e3f5eb] font-manrope text-[17px] font-semibold text-[#15935b]"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                      >
                        <CheckDot size={22} />
                        Sent
                      </motion.span>
                    ) : (
                      <span
                        className="absolute inset-0 flex items-center justify-center rounded-[12px] border-[1.5px] bg-white font-manrope text-[17px] font-semibold"
                        style={{ borderColor: BLUE, color: BLUE }}
                      >
                        Reach out
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
          </AnimatePresence>
        </Card>
      </Glass>
    </motion.div>
  );
}
