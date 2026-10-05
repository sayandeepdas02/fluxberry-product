'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { FileText, Link2, Video } from 'lucide-react';
import { EASE_OUT, POP, enter, usePhases, type VisualState } from '@/components/marketing/landing/stage';
import { BLUE, Bar, CUE, CheckDot, Card, GREEN, GREEN_BG, Glass, IconTile, MUTED } from '@/components/marketing/blog/covers/kit';

/*
 * "Video application forms": an application form whose third question asks for
 * a recorded video answer. The candidate hits record, the timer runs, the
 * waveform moves, and the answer is saved; the resume above it is already
 * uploaded. Loops: idle, recording, recorded.
 */

const GLASS = { left: 110, top: 250, width: 980, height: 560 };
const VIDEO = { left: 28, top: 126, width: 536, height: 304 };
const RECORD_SECONDS = 42;
const RED = '#e5484d';
// Idle, recording (the timer runs for 4s), recorded, short pause.
const RUN_MS = [1600, 4200, 2600, 700];
const WAVE = [0.4, 0.75, 0.55, 1, 0.65, 0.9, 0.45, 0.8, 0.6, 0.95, 0.5, 0.7, 0.85, 0.4, 0.75, 0.55];

/** The recording timer: runs 0:00 to 0:42 while recording, holds 0:42 once saved. */
function Timer({ phase, reduced }: { phase: number; reduced: boolean }) {
  const seconds = useMotionValue(reduced ? RECORD_SECONDS : 0);
  const text = useTransform(seconds, (s) => `0:${String(Math.round(s)).padStart(2, '0')}`);
  useEffect(() => {
    if (reduced) return;
    if (phase === 1) {
      const controls = animate(seconds, RECORD_SECONDS, { duration: 4, ease: 'linear' });
      return () => controls.stop();
    }
    seconds.set(phase === 2 ? RECORD_SECONDS : 0);
  }, [phase, reduced, seconds]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

export function VideoFormsScene({ v }: { v: VisualState }) {
  const run = usePhases(v.looping, RUN_MS);
  const phase = v.reduced ? 2 : run;
  const recording = phase === 1;
  const saved = phase === 2;

  return (
    <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
      <Glass style={GLASS} radius={34}>
        <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
          <div className="absolute inset-x-[28px] top-[24px] flex items-center gap-[12px]">
            <IconTile icon={Video} size={38} />
            <span className="font-manrope text-[19px] font-semibold text-[#0b0d17]">Question 3</span>
            <span className="rounded-full bg-[#e6f0ff] px-[11px] py-[2px] font-inter text-[15px] font-medium" style={{ color: BLUE }}>
              Video answer
            </span>
          </div>
          <p className="absolute left-[28px] top-[78px] font-manrope text-[26px] font-semibold leading-[34px] text-[#0b0d17]">
            Tell us about a project you’re proud of.
          </p>

          {/* The recorder. */}
          <div className="absolute overflow-hidden rounded-[18px]" style={{ ...VIDEO, background: 'linear-gradient(160deg,#27406d 0%,#0f1b36 100%)' }}>
            <span className="absolute left-1/2 top-[62px] size-[96px] -translate-x-1/2 rounded-full bg-[#c9d6ee]" />
            <span className="absolute left-1/2 top-[168px] h-[220px] w-[250px] -translate-x-1/2 rounded-[125px] bg-[#8aa3d6]" />

            <div className="absolute left-[16px] top-[16px] flex items-center gap-[9px] rounded-full bg-black/45 px-[13px] py-[6px] font-inter text-[16px] font-medium text-white">
              <motion.span
                className="size-[10px] rounded-full"
                style={{ backgroundColor: recording ? RED : '#8b93a8' }}
                animate={recording ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={recording ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
              />
              {recording ? 'REC' : saved ? 'Saved' : 'Ready'}
              <Timer phase={phase} reduced={v.reduced} />
            </div>

            <div className="absolute inset-x-[18px] bottom-[16px] flex h-[56px] items-center gap-[3px]">
              {WAVE.map((level, i) => (
                <motion.span
                  key={i}
                  className="w-[5px] rounded-full bg-white/80"
                  initial={false}
                  animate={recording ? { height: [10, 10 + level * 34, 12 + (1 - level) * 20, 10 + level * 34] } : { height: 8 }}
                  transition={recording ? { duration: 0.9, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' } : { duration: 0.3 }}
                />
              ))}
              <motion.span
                className="ml-auto flex size-[52px] items-center justify-center rounded-full ring-[4px] ring-white"
                initial={false}
                animate={{ scale: recording ? 1.06 : 1 }}
                transition={POP}
              >
                <motion.span
                  className="block"
                  initial={false}
                  animate={{ width: recording ? 20 : 38, height: recording ? 20 : 38, borderRadius: recording ? 5 : 19, backgroundColor: saved ? GREEN : RED }}
                  transition={{ duration: 0.25 }}
                />
              </motion.span>
            </div>
          </div>

          {/* The rest of the form. */}
          <div className="absolute left-[600px] top-[126px] flex w-[348px] flex-col gap-[16px]">
            <div className="flex h-[84px] items-center gap-[14px] rounded-[16px] bg-[#f4f6fa] px-[16px]">
              <IconTile icon={FileText} size={44} />
              <span className="flex flex-col gap-[8px]">
                <span className="font-manrope text-[18px] font-semibold leading-[20px] text-[#0b0d17]">Resume.pdf</span>
                <span className="font-inter text-[14px]" style={{ color: MUTED }}>
                  Uploaded
                </span>
              </span>
              <span className="ml-auto">
                <CheckDot size={28} />
              </span>
            </div>
            <div className="flex h-[84px] items-center gap-[14px] rounded-[16px] bg-[#f4f6fa] px-[16px]">
              <IconTile icon={Link2} hue="violet" size={44} />
              <span className="flex flex-col gap-[10px]">
                <span className="font-manrope text-[18px] font-semibold leading-[20px] text-[#0b0d17]">Portfolio link</span>
                <Bar width={150} height={9} className="bg-[#e3e7ef]" />
              </span>
            </div>
            <motion.div
              className="flex h-[84px] items-center justify-center gap-[10px] rounded-[16px] font-manrope text-[19px] font-semibold"
              initial={false}
              animate={{ backgroundColor: saved ? GREEN_BG : '#eef1f6', color: saved ? GREEN : '#8a92a8' }}
              transition={{ duration: 0.3 }}
            >
              {saved ? (
                <>
                  <CheckDot size={26} />
                  Video answer saved
                </>
              ) : (
                'Submit application'
              )}
            </motion.div>
          </div>
        </Card>
      </Glass>
    </motion.div>
  );
}
