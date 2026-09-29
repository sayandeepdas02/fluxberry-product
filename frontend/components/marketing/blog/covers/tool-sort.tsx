'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AudioLines, ChevronDown, Layers, ScanSearch, SquareKanban, Video, type LucideIcon } from 'lucide-react';
import { EASE_OUT, enter, type VisualState } from '@/components/marketing/landing/stage';
import { Bar, Card, CUE, FMark, Glass, HUES, IconTile, SHADOW, SHADOW_SOFT, Tag, type Hue } from './kit';

/*
 * "The 9 best Metaview alternatives by tool type": nine tools arrive as a
 * jumbled pile, then sort themselves into the four lanes the article uses
 * (screening, interview AI, async video, ATS-native). They hold, shuffle
 * back into a pile, and sort again. Fluxberry is the first screening tile.
 */

const GLASS = { left: 120, top: 262, width: 960, height: 600 };
const LANES: { label: string; hue: Hue; icon: LucideIcon }[] = [
  { label: 'Screening', hue: 'blue', icon: ScanSearch },
  { label: 'Interview AI', hue: 'violet', icon: AudioLines },
  { label: 'Async video', hue: 'teal', icon: Video },
  { label: 'ATS-native', hue: 'orange', icon: SquareKanban },
];
const LANE_X = [24, 249, 474, 699];
const LANE_W = 211;
const TILE = { width: 187, height: 74 };
const BODY_Y = 70;

/** The nine tools, as (lane, place in lane), in the article's order. */
const TOOLS = [
  [0, 0],
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
  [2, 0],
  [3, 0], [3, 1],
] as const;
/** Where each tool lands in the jumbled 3×3 pile (a cell index), and its tilt there. */
const PILE = [4, 0, 7, 2, 8, 5, 1, 6, 3];
const TILT = [-4, 3, -2, 5, -3, 2, -5, 4, -1.5];
const PILE_X = [118, 374, 630];
const PILE_Y = [118, 214, 310];

const sorted = (i: number) => ({ x: LANE_X[TOOLS[i][0]] + 12, y: BODY_Y + 12 + TOOLS[i][1] * 86, rotate: 0 });
const piled = (i: number) => ({ x: PILE_X[PILE[i] % 3] + (i % 2 ? 10 : -8), y: PILE_Y[Math.floor(PILE[i] / 3)], rotate: TILT[i] });

/** Sorted (held), then piled, then sorted again. */
const HOLD_MS = { sorted: 4200, piled: 1300 };

export function ToolSortScene({ v }: { v: VisualState }) {
  const [isSorted, setSorted] = useState(false);
  const [entered, setEntered] = useState(false);

  // The first sort, once the board has landed (at once with reduced motion).
  useEffect(() => {
    if (!v.started || entered) return;
    const id = setTimeout(
      () => {
        setSorted(true);
        setEntered(true);
      },
      v.reduced ? 0 : (CUE + 1.1) * 1000,
    );
    return () => clearTimeout(id);
  }, [v.started, v.reduced, entered]);

  // Then pile and sort again, for as long as the cover is on screen.
  useEffect(() => {
    if (!entered || !v.looping) return;
    const id = setTimeout(() => setSorted((s) => !s), isSorted ? HOLD_MS.sorted : HOLD_MS.piled);
    return () => clearTimeout(id);
  }, [entered, v.looping, isSorted]);

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={GLASS} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            {LANES.map((lane, i) => {
              const count = TOOLS.filter(([l]) => l === i).length;
              return (
                <motion.div
                  key={lane.label}
                  className="absolute top-0 bottom-0"
                  style={{ left: LANE_X[i], width: LANE_W }}
                  initial={false}
                  animate={{ opacity: isSorted ? 1 : 0.45 }}
                  transition={{ duration: 0.5, delay: isSorted ? 0.25 + i * 0.05 : 0 }}
                >
                  <div className="absolute inset-x-[4px] top-[22px] flex items-center gap-[10px]">
                    <span className="size-[12px] rounded-full" style={{ backgroundColor: HUES[lane.hue].fg }} />
                    <span className="font-manrope text-[19px] font-semibold text-[#0b0d17]">{lane.label}</span>
                    <span className="ml-auto rounded-full bg-[#f1f3f7] px-[9px] py-[1px] font-manrope text-[15px] font-semibold text-[#6b7390]">{count}</span>
                  </div>
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-[16px]"
                    style={{ top: BODY_Y, backgroundColor: HUES[lane.hue].bg, opacity: 0.6 }}
                  />
                </motion.div>
              );
            })}

            {TOOLS.map(([lane], i) => (
              <motion.div
                key={i}
                className="absolute left-0 top-0 flex items-center gap-[12px] rounded-[14px] bg-white px-[14px]"
                style={{ width: TILE.width, height: TILE.height, zIndex: isSorted ? 1 : 2 + PILE[i] }}
                initial={v.reduced ? false : { ...piled(i), opacity: 0, scale: 0.8 }}
                animate={{
                  ...(isSorted ? sorted(i) : piled(i)),
                  opacity: v.started ? 1 : 0,
                  scale: 1,
                  boxShadow: isSorted ? '0 1px 3px rgba(15,23,42,0.08)' : SHADOW,
                }}
                transition={{
                  type: 'spring',
                  visualDuration: 0.7,
                  bounce: 0.22,
                  // Sorting deals the tiles out lane by lane; shuffling throws them in together.
                  delay: isSorted ? i * 0.06 : (8 - i) * 0.025,
                  opacity: { duration: 0.4, delay: CUE + 0.3 + PILE[i] * 0.04 },
                  scale: { type: 'spring', stiffness: 420, damping: 24, delay: CUE + 0.3 + PILE[i] * 0.04 },
                }}
              >
                {i === 0 ? <FMark size={42} radius={12} /> : <IconTile icon={LANES[lane].icon} hue={LANES[lane].hue} size={42} />}
                <span className="flex flex-col gap-[8px]">
                  {i === 0 ? (
                    <span className="font-manrope text-[17px] font-semibold leading-[18px] text-[#0b0d17]">Fluxberry</span>
                  ) : (
                    <Bar width={88 - (i % 3) * 12} height={11} />
                  )}
                  <Bar width={58 + (i % 2) * 14} height={9} className="bg-[#f0f2f6]" />
                </span>
              </motion.div>
            ))}
          </Card>
        </Glass>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 836, top: 232 }}
        {...enter(v, { opacity: 0, y: 12, scale: 0.94 }, { opacity: 1, y: 0, scale: 1 }, { type: 'spring', stiffness: 420, damping: 26, delay: CUE + 0.5 })}
      >
        <Tag className="relative" style={{ boxShadow: SHADOW_SOFT }}>
          <IconTile icon={Layers} size={34} />
          <span className="font-inter text-[18px] font-normal text-[#6b7390]">Group by</span>
          Tool type
          <ChevronDown size={18} strokeWidth={2.6} className="text-[#6b7390]" />
        </Tag>
      </motion.div>
    </>
  );
}
