'use client';

import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { EASE_OUT, GLIDE, enter, usePhases, type VisualState } from '@/components/marketing/landing/stage';
import { Avatar, BLUE, Bar, CUE, Card, Count, GREEN, GREEN_BG, Glass, MUTED, SLATE } from '@/components/marketing/blog/covers/kit';

/*
 * "Applicant tracking and job board": a job that is live on the board, and
 * its pipeline. A new applicant lands in Applied with an AI match score, then
 * moves stage by stage to Offer, and the loop starts again. Every column keeps
 * its first slot free for that applicant; the other candidates stay put.
 */

const GLASS = { left: 100, top: 250, width: 1000, height: 560 };
const STAGES = ['Applied', 'Screening', 'Interview', 'Offer'] as const;
const COL = { x0: 22, width: 224, gap: 12, top: 124 };
const CARD = { height: 96, gap: 12, top: 134 };
/** Candidates already in the pipeline: [column, slot, initials, tone, score]. */
const OTHERS = [
  [0, 1, 'AK', 1, 84],
  [0, 2, 'RM', 2, 71],
  [1, 1, 'SN', 3, 88],
  [2, 1, 'DV', 4, 79],
] as const;
// Applied, Screening, Interview, Offer (held), then a short fade before the loop restarts.
const RUN_MS = [1500, 1500, 1500, 2400, 700];

const colX = (col: number) => COL.x0 + col * (COL.width + COL.gap);

function CandidateCard({ initials, tone, score, name }: { initials: string; tone: number; score: number; name?: string }) {
  return (
    <>
      <Avatar initials={initials} tone={tone} size={42} className="absolute left-[14px] top-[14px]" />
      <span className="absolute left-[68px] top-[16px] flex flex-col gap-[9px]">
        {name ? (
          <span className="font-manrope text-[19px] font-semibold leading-[22px] text-[#0b0d17]">{name}</span>
        ) : (
          <Bar width={92} height={12} />
        )}
        <Bar width={name ? 108 : 64} height={9} className="bg-[#f0f2f6]" />
      </span>
      <span
        className="absolute bottom-[12px] right-[14px] flex items-center gap-[6px] rounded-full px-[10px] py-[3px] font-manrope text-[16px] font-semibold"
        style={{ backgroundColor: GREEN_BG, color: GREEN }}
      >
        <Sparkles size={13} strokeWidth={2.6} />
        {score}
      </span>
    </>
  );
}

export function TrackingScene({ v }: { v: VisualState }) {
  const run = usePhases(v.looping, RUN_MS);
  const stage = Math.min(run, 3);
  const fading = run === 4;
  const restarting = run === 0;
  const counts = STAGES.map((_, col) => OTHERS.filter(([c]) => c === col).length + (stage === col ? 1 : 0));

  return (
    <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
      <Glass style={GLASS} radius={34}>
        <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
          <div className="absolute inset-x-[28px] top-[22px] flex items-center gap-[14px]">
            <span className="font-manrope text-[24px] font-semibold text-[#0b0d17]">Senior Designer</span>
            <span
              className="flex items-center gap-[8px] rounded-full px-[12px] py-[4px] font-inter text-[16px] font-medium"
              style={{ backgroundColor: GREEN_BG, color: GREEN }}
            >
              <motion.span
                className="size-[9px] rounded-full"
                style={{ backgroundColor: GREEN }}
                animate={v.looping ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
                transition={v.looping ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              />
              Live on job board
            </span>
            <span className="ml-auto font-inter text-[17px] text-[#6b7390]">
              <Count v={v} from={0} to={12} delay={CUE + 0.6} duration={1.1} /> applicants
            </span>
          </div>

          {STAGES.map((label, col) => (
            <motion.div
              key={label}
              className="absolute"
              style={{ left: colX(col), top: 84, width: COL.width }}
              {...enter(v, { opacity: 0, y: 18 }, { opacity: 1, y: 0 }, { delay: CUE + 0.2 + col * 0.08, duration: 0.7, ease: EASE_OUT })}
            >
              <div className="flex items-center justify-between px-[8px]">
                <span className="font-manrope text-[17px] font-semibold" style={{ color: SLATE }}>
                  {label}
                </span>
                <span className="rounded-full bg-[#eef1f6] px-[9px] py-[1px] font-inter text-[14px] font-medium tabular-nums" style={{ color: MUTED }}>
                  {counts[col]}
                </span>
              </div>
              <span className="absolute left-0 rounded-[16px] bg-[#f4f6fa]" style={{ top: 40, width: COL.width, height: 420 }} />
            </motion.div>
          ))}

          {OTHERS.map(([col, slot, initials, tone, score], i) => (
            <motion.div
              key={initials}
              className="absolute overflow-hidden rounded-[13px] bg-white shadow-[0_6px_14px_-8px_rgba(8,38,99,0.3)]"
              style={{
                left: colX(col) + 10,
                top: CARD.top + slot * (CARD.height + CARD.gap),
                width: COL.width - 20,
                height: CARD.height,
              }}
              {...enter(v, { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { delay: CUE + 0.55 + i * 0.1, duration: 0.6, ease: EASE_OUT })}
            >
              <CandidateCard initials={initials} tone={tone} score={score} />
            </motion.div>
          ))}

          {/* The applicant who moves through the pipeline. */}
          <motion.div
            className="absolute overflow-hidden rounded-[13px] bg-white"
            style={{ width: COL.width - 20, height: CARD.height, boxShadow: `inset 0 0 0 2px ${BLUE}, 0 14px 26px -12px rgba(45,129,255,0.55)` }}
            initial={v.reduced ? false : { opacity: 0, left: colX(0) + 10, top: CARD.top - 20 }}
            animate={{ opacity: v.started && !fading ? 1 : 0, left: colX(stage) + 10, top: CARD.top }}
            transition={
              restarting
                ? { left: { duration: 0 }, top: { duration: 0.5, ease: EASE_OUT }, opacity: { duration: 0.4 } }
                : fading
                  ? { opacity: { duration: 0.4 } }
                  : { ...GLIDE, opacity: { duration: 0.5, delay: v.started ? CUE + 0.9 : 0 } }
            }
          >
            <CandidateCard initials="PS" tone={0} score={92} name="Priya Sharma" />
          </motion.div>
        </Card>
      </Glass>
    </motion.div>
  );
}
