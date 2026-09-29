'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown, Filter, MessagesSquare, Palette, Rocket, SquareKanban, type LucideIcon } from 'lucide-react';
import { EASE_OUT, enter, type VisualState } from '@/components/marketing/landing/stage';
import { BLUE, Bar, Card, CUE, FMark, Glass, IconTile, SHADOW_SOFT, Tag, type Hue } from './kit';

/*
 * "The best applicant tracking systems for small businesses": a comparison
 * board filtered to small teams. Five ATS rows arrive out of order, then rank
 * themselves by fit; Fluxberry rises to the top. They shuffle and rank again
 * while the cover is on screen. The other rows stay unnamed, so the cover
 * makes no claim about any real product.
 */

const GLASS = { left: 170, top: 262, width: 860, height: 560 };
const ROW = { top: 84, height: 80, gap: 14 };
/** Each row's fit, as a share of the bar; row 0 is Fluxberry. */
const ROWS: { fit: number; icon: LucideIcon | 'brand'; hue: Hue }[] = [
  { fit: 0.92, icon: 'brand', hue: 'blue' },
  { fit: 0.78, icon: SquareKanban, hue: 'violet' },
  { fit: 0.66, icon: MessagesSquare, hue: 'teal' },
  { fit: 0.54, icon: Palette, hue: 'orange' },
  { fit: 0.42, icon: Rocket, hue: 'violet' },
];
/** The order before ranking (a row index per slot). */
const SHUFFLED = [3, 1, 4, 0, 2];
const RANKED = [0, 1, 2, 3, 4];
const HOLD_MS = { ranked: 4200, shuffled: 1400 };
const FIT_W = 250;

export function ShortlistScene({ v }: { v: VisualState }) {
  const [ranked, setRanked] = useState(false);
  const [entered, setEntered] = useState(false);

  // The first ranking, once the board has landed (at once with reduced motion).
  useEffect(() => {
    if (!v.started || entered) return;
    const id = setTimeout(
      () => {
        setRanked(true);
        setEntered(true);
      },
      v.reduced ? 0 : (CUE + 1.2) * 1000,
    );
    return () => clearTimeout(id);
  }, [v.started, v.reduced, entered]);

  // Then shuffle and rank again, for as long as the cover is on screen.
  useEffect(() => {
    if (!entered || !v.looping) return;
    const id = setTimeout(() => setRanked((r) => !r), ranked ? HOLD_MS.ranked : HOLD_MS.shuffled);
    return () => clearTimeout(id);
  }, [entered, v.looping, ranked]);

  const order = ranked ? RANKED : SHUFFLED;

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={GLASS} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            <div className="absolute inset-x-[28px] top-[28px] flex items-center">
              <span className="font-manrope text-[22px] font-semibold text-[#0b0d17]">ATS shortlist</span>
              <span className="ml-auto font-inter text-[16px] text-[#6b7390]">Fit for your team</span>
            </div>

            {ROWS.map((row, i) => {
              const slot = order.indexOf(i);
              const top = ROW.top + slot * (ROW.height + ROW.gap);
              const isTop = ranked && i === 0;
              return (
                <motion.div
                  key={i}
                  className="absolute inset-x-[20px] flex items-center gap-[16px] rounded-[16px] px-[16px]"
                  style={{ height: ROW.height }}
                  initial={v.reduced ? false : { top, opacity: 0 }}
                  animate={{
                    top,
                    opacity: v.started ? 1 : 0,
                    backgroundColor: isTop ? '#f3f8ff' : '#ffffff',
                    boxShadow: isTop ? `inset 0 0 0 2px ${BLUE}` : 'inset 0 0 0 1.5px #eceff4',
                  }}
                  transition={{
                    type: 'spring',
                    visualDuration: 0.7,
                    bounce: 0.2,
                    delay: ranked ? slot * 0.05 : 0,
                    opacity: { duration: 0.4, delay: CUE + 0.35 + i * 0.06 },
                  }}
                >
                  <span className="w-[26px] font-manrope text-[20px] font-semibold tabular-nums text-[#6b7390]">{slot + 1}</span>
                  {row.icon === 'brand' ? <FMark size={46} radius={13} /> : <IconTile icon={row.icon} hue={row.hue} size={46} />}
                  <span className="flex w-[190px] flex-col gap-[9px]">
                    {row.icon === 'brand' ? (
                      <span className="font-manrope text-[21px] font-semibold leading-[22px] text-[#0b0d17]">Fluxberry</span>
                    ) : (
                      <Bar width={120 - (i % 3) * 18} height={12} />
                    )}
                    <Bar width={80 + (i % 2) * 22} height={9} className="bg-[#f0f2f6]" />
                  </span>
                  <span className="relative ml-auto h-[12px] overflow-hidden rounded-full bg-[#eef1f6]" style={{ width: FIT_W }}>
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: i === 0 ? BLUE : '#b9c6de' }}
                      initial={v.reduced ? false : { width: 0 }}
                      animate={{ width: v.started ? FIT_W * row.fit : 0 }}
                      transition={{ duration: 0.9, ease: EASE_OUT, delay: CUE + 0.6 + i * 0.08 }}
                    />
                  </span>
                </motion.div>
              );
            })}
          </Card>
        </Glass>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 752, top: 232 }}
        {...enter(v, { opacity: 0, y: 12, scale: 0.94 }, { opacity: 1, y: 0, scale: 1 }, { type: 'spring', stiffness: 420, damping: 26, delay: CUE + 0.5 })}
      >
        <Tag className="relative" style={{ boxShadow: SHADOW_SOFT }}>
          <IconTile icon={Filter} size={34} />
          <span className="font-inter text-[18px] font-normal text-[#6b7390]">Team size</span>
          1 to 50
          <ChevronDown size={18} strokeWidth={2.6} className="text-[#6b7390]" />
        </Tag>
      </motion.div>
    </>
  );
}
