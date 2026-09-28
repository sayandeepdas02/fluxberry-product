'use client';

import { motion } from 'motion/react';
import { Building2, ClipboardCheck, PenLine, Plus, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';
import { POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { Card, CheckDot, CUE, FMark, GREEN, Glass, IconTile, SHADOW_SOFT, type Hue } from './kit';

/*
 * "10 useful tools that integrate with BambooHR": BambooHR is the base (core
 * HR), and the article's five categories drop onto it one by one until the
 * hiring stack is complete. While on screen, a sync pulse runs up the stack
 * from the base to sourcing, Fluxberry, on top.
 */

const BASE = { left: 280, top: 632, width: 640, height: 128 };
const LAYERS: { label: string; icon: LucideIcon | 'brand'; hue: Hue }[] = [
  { label: 'Payroll & benefits', icon: Wallet, hue: 'teal' },
  { label: 'Offers & comms', icon: PenLine, hue: 'violet' },
  { label: 'Background checks', icon: ShieldCheck, hue: 'orange' },
  { label: 'Assessment', icon: ClipboardCheck, hue: 'violet' },
  { label: 'Sourcing', icon: 'brand', hue: 'blue' },
];
const LAYER_H = 62;
const GAP = 10;
const layerTop = (i: number) => BASE.top - GAP - LAYER_H - i * (LAYER_H + GAP);
const layerWidth = (i: number) => 600 - i * 20;
/** When each layer lands, bottom to top. */
const landAt = (i: number) => CUE + 0.45 + i * 0.14;

export function StackScene({ v }: { v: VisualState }) {
  return (
    <>
      {LAYERS.map((layer, i) => (
        <motion.div
          key={layer.label}
          className="absolute"
          style={{ left: 600 - layerWidth(i) / 2, top: layerTop(i), width: layerWidth(i), height: LAYER_H }}
          {...enter(v, { opacity: 0, y: -140 }, { opacity: 1, y: 0 }, { type: 'spring', stiffness: 380, damping: 24, mass: 0.9, delay: landAt(i), opacity: { duration: 0.2, delay: landAt(i) } })}
        >
          <Card className="relative flex h-full w-full items-center gap-[14px] rounded-[18px] pl-[14px] pr-[18px]" style={{ boxShadow: SHADOW_SOFT }}>
            {/* The sync pulse, passing up the stack. */}
            <motion.span
              className="absolute inset-0 rounded-[18px] bg-[#eaf2ff] ring-2 ring-inset ring-[#2d81ff]"
              initial={{ opacity: 0 }}
              animate={v.looping ? { opacity: [0, 1, 0] } : { opacity: 0 }}
              transition={
                v.looping
                  ? { duration: 0.8, times: [0, 0.35, 1], ease: 'easeOut', repeat: Infinity, repeatDelay: 2.8, delay: 1.2 + i * 0.16 }
                  : { duration: 0.2 }
              }
            />
            <span className="relative flex items-center gap-[14px]">
              {layer.icon === 'brand' ? <FMark size={38} radius={11} /> : <IconTile icon={layer.icon} hue={layer.hue} size={38} />}
              <span className="font-manrope text-[20px] font-semibold text-[#0b0d17]">{layer.label}</span>
            </span>
            <span className="relative ml-auto flex items-center gap-[8px] font-manrope text-[15px] font-semibold" style={{ color: GREEN }}>
              <motion.span {...enter(v, { opacity: 0, x: 6 }, { opacity: 1, x: 0 }, { duration: 0.3, delay: landAt(i) + 0.35 })}>
                {i === LAYERS.length - 1 ? 'Fluxberry' : 'Connected'}
              </motion.span>
              <CheckOnLand v={v} delay={landAt(i) + 0.3} />
            </span>
          </Card>
        </motion.div>
      ))}

      <motion.div {...enter(v, { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { ...POP, delay: CUE })}>
        <Glass style={BASE} radius={32} pad={10}>
          <Card className="relative flex h-[108px] w-full items-center gap-[16px] px-[22px]" style={{ borderRadius: 22 }}>
            <IconTile icon={Building2} hue="teal" size={58} />
            <span className="flex flex-col gap-[7px]">
              <span className="font-manrope text-[29px] font-semibold leading-none tracking-[-0.02em] text-[#0b0d17]">BambooHR</span>
              <span className="font-inter text-[17px] leading-none text-[#6b7390]">Core HR</span>
            </span>
            <span className="ml-auto flex items-center gap-[6px] rounded-full bg-[#e6f0ff] px-[12px] py-[6px] font-manrope text-[16px] font-semibold text-[#2d81ff]">
              <Plus size={16} strokeWidth={3} />
              10 tools
            </span>
          </Card>
        </Glass>
      </motion.div>
    </>
  );
}

/** A check that pops once its layer has landed (at once with reduced motion). */
function CheckOnLand({ v, delay }: { v: VisualState; delay: number }) {
  return (
    <motion.span {...enter(v, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1 }, { ...POP, delay })}>
      <CheckDot size={22} />
    </motion.span>
  );
}
