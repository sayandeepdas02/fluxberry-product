'use client';

import { motion } from 'motion/react';
import { Blocks, ClipboardCheck, Database, FileText, Search, ShieldCheck, type LucideIcon } from 'lucide-react';
import { EASE_OUT, POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { Bar, Card, CheckDot, Count, CUE, FMark, GREEN, GREEN_BG, Glass, IconTile, SHADOW_SOFT, type Hue } from './kit';

/*
 * "12 top tools that integrate with SAP SuccessFactors": the enterprise
 * picture. SuccessFactors stays the system of record along the bottom; the
 * twelve tools sit above it in the article's groups (sourcing takes four,
 * then assessment, background checks, adjacent modules and documents take
 * two each) and connect one by one. While on screen, data rises up each
 * column's wire and the column's tools blink as it arrives.
 */

const BASE = { left: 150, top: 606, width: 900, height: 172 };
const TILE = { width: 116, height: 96 };
const ROW_Y = [262, 374];
/** Column left edges: 130px apart inside a group, 140px between groups. */
const COL_X = [192, 322, 472, 612, 752, 892];
const COLUMNS: { icon: LucideIcon; hue: Hue }[] = [
  { icon: Search, hue: 'blue' },
  { icon: Search, hue: 'blue' },
  { icon: ClipboardCheck, hue: 'violet' },
  { icon: ShieldCheck, hue: 'orange' },
  { icon: Blocks, hue: 'teal' },
  { icon: FileText, hue: 'blue' },
];
const TILES = COL_X.flatMap((_, col) => ROW_Y.map((_, row) => ({ col, row })));
/** Tiles connect in reading order down each column. */
const connectAt = (i: number) => CUE + 1.0 + i * 0.08;
const WIRE_TOP = ROW_Y[1] + TILE.height;
/** One pulse per column per cycle; columns are staggered along it. */
const CYCLE = 3.6;
const pulseDelay = (col: number) => 1.6 + col * 0.35;

export function SystemOfRecordScene({ v }: { v: VisualState }) {
  return (
    <>
      {/* Wires from each column down into the base, and the data rising up them. */}
      {COL_X.map((x, col) => {
        const cx = x + TILE.width / 2;
        return (
          <div key={x}>
            <motion.span
              className="absolute w-[3px] origin-bottom rounded-full bg-white/70"
              style={{ left: cx - 1.5, top: WIRE_TOP, height: BASE.top - WIRE_TOP }}
              {...enter(v, { scaleY: 0 }, { scaleY: 1 }, { delay: CUE + 0.5 + col * 0.05, duration: 0.6, ease: EASE_OUT })}
            />
            <motion.span
              className="absolute left-0 top-0 size-[16px] rounded-full bg-white"
              style={{ marginLeft: cx - 8, marginTop: -8, boxShadow: '0 0 0 5px rgba(45,129,255,0.25), 0 0 16px 4px rgba(255,255,255,0.8), inset 0 0 0 4px #2d81ff' }}
              initial={{ opacity: 0, y: BASE.top }}
              animate={v.looping ? { y: [BASE.top, WIRE_TOP, WIRE_TOP], opacity: [0, 1, 1, 0, 0] } : { opacity: 0 }}
              transition={
                v.looping
                  ? {
                      y: { duration: CYCLE, times: [0, 0.24, 1], ease: 'easeInOut', repeat: Infinity, delay: pulseDelay(col) },
                      opacity: { duration: CYCLE, times: [0, 0.03, 0.22, 0.27, 1], repeat: Infinity, delay: pulseDelay(col) },
                    }
                  : { duration: 0.2 }
              }
            />
          </div>
        );
      })}

      {TILES.map(({ col, row }, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: COL_X[col], top: ROW_Y[row], width: TILE.width, height: TILE.height }}
          {...enter(v, { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1 }, { ...POP, delay: CUE + 0.15 + col * 0.06 + row * 0.05 })}
        >
          <Card className="relative h-full w-full rounded-[18px]" style={{ boxShadow: SHADOW_SOFT }}>
            {/* Blinks as the column's data arrives: the lower tile first, then the one above. */}
            <motion.span
              className="absolute inset-0 rounded-[18px] bg-[#eaf2ff] ring-2 ring-inset ring-[#2d81ff]"
              initial={{ opacity: 0 }}
              animate={v.looping ? { opacity: [0, 0, 1, 0, 0] } : { opacity: 0 }}
              transition={
                v.looping
                  ? { duration: CYCLE, times: row ? [0, 0.23, 0.28, 0.46, 1] : [0, 0.28, 0.33, 0.51, 1], repeat: Infinity, delay: pulseDelay(col) }
                  : { duration: 0.2 }
              }
            />
            <span className="absolute left-[14px] top-[14px]">
              {i === 0 ? <FMark size={40} radius={11} /> : <IconTile icon={COLUMNS[col].icon} hue={COLUMNS[col].hue} size={40} />}
            </span>
            <span className="absolute bottom-[16px] left-[14px] flex flex-col gap-[7px]">
              <Bar width={64 + ((i * 7) % 3) * 8} height={9} />
              <Bar width={40} height={8} className="bg-[#f0f2f6]" />
            </span>
          </Card>
          <motion.span
            className="absolute -right-[7px] -top-[7px]"
            {...enter(v, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1 }, { ...POP, delay: connectAt(i) })}
          >
            <CheckDot size={24} />
          </motion.span>
        </motion.div>
      ))}

      <motion.div {...enter(v, { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={BASE} radius={34}>
          <Card className="relative flex h-[122px] w-full items-center gap-[18px] px-[26px]" style={{ borderRadius: 24 }}>
            <IconTile icon={Database} size={60} />
            <span className="flex flex-col gap-[8px]">
              <span className="font-manrope text-[29px] font-semibold leading-none tracking-[-0.02em] text-[#0b0d17]">SAP SuccessFactors</span>
              <span className="font-inter text-[17px] leading-none text-[#6b7390]">System of record</span>
            </span>
            <span
              className="ml-auto flex items-center gap-[10px] rounded-full py-[7px] pl-[8px] pr-[16px] font-manrope text-[17px] font-semibold"
              style={{ color: GREEN, backgroundColor: GREEN_BG }}
            >
              <CheckDot size={24} />
              <span>
                <Count v={v} from={0} to={12} delay={connectAt(0)} duration={12 * 0.08 + 0.3} /> connected
              </span>
            </span>
          </Card>
        </Glass>
      </motion.div>
    </>
  );
}
