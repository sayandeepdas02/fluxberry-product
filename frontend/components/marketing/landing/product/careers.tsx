'use client';

import { motion } from 'motion/react';
import { Palette } from 'lucide-react';
import { EASE_OUT, enter, usePhases, type VisualState } from '@/components/marketing/landing/stage';
import { CUE, Card, Glass, MUTED, SHADOW_SOFT, Tag } from '@/components/marketing/blog/covers/kit';

/*
 * "Careers website": a company's careers page in a browser frame. The accent
 * color changes in turn (the same "Brand color" setting the dashboard has)
 * and the logo, eyebrow and Apply buttons follow it.
 */

const GLASS = { left: 100, top: 262, width: 1000, height: 540 };
const ACCENTS = ['#2d81ff', '#7457f5', '#0c9c9a', '#ea7a18'] as const;
const ACCENT_MS = [2000, 2000, 2000, 2000];
const ROLES = [
  { title: 'Senior Designer', meta: 'Bengaluru · Full-time' },
  { title: 'Frontend Engineer', meta: 'Remote · Full-time' },
  { title: 'Customer Success Lead', meta: 'Mumbai · Full-time' },
] as const;

export function CareersScene({ v }: { v: VisualState }) {
  const run = usePhases(v.looping, ACCENT_MS);
  const accent = ACCENTS[run];
  const tint = { backgroundColor: accent };
  const transition = { duration: 0.5 };

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={GLASS} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            {/* Browser chrome. */}
            <div className="absolute inset-x-0 top-0 flex h-[54px] items-center gap-[8px] border-b border-[#eceff4] bg-[#f7f8fb] px-[20px]">
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <span key={c} className="size-[12px] rounded-full" style={{ backgroundColor: c }} />
              ))}
              <span className="mx-auto rounded-full bg-white px-[22px] py-[5px] font-inter text-[15px] ring-1 ring-[#e3e7ef]" style={{ color: MUTED }}>
                fluxberry.in/acme/careers
              </span>
              <span className="w-[52px]" />
            </div>

            <div className="absolute left-[40px] top-[78px] flex items-center gap-[12px]">
              <motion.span
                className="flex size-[40px] items-center justify-center rounded-[11px] font-manrope text-[22px] font-semibold text-white"
                initial={false}
                animate={tint}
                transition={transition}
              >
                A
              </motion.span>
              <span className="font-manrope text-[21px] font-semibold text-[#0b0d17]">Acme</span>
            </div>

            <motion.div
              className="absolute left-[40px] top-[148px]"
              {...enter(v, { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { delay: CUE + 0.35, duration: 0.7, ease: EASE_OUT })}
            >
              <motion.p className="font-manrope text-[17px] font-semibold uppercase tracking-[0.08em]" initial={false} animate={{ color: accent }} transition={transition}>
                Careers
              </motion.p>
              <p className="mt-[6px] font-manrope text-[46px] font-semibold leading-[52px] tracking-[-0.02em] text-[#0b0d17]">Build what’s next with us</p>
            </motion.div>

            <div className="absolute inset-x-[40px] top-[290px] flex flex-col gap-[12px]">
              {ROLES.map((role, i) => (
                <motion.div
                  key={role.title}
                  className="flex h-[78px] items-center gap-[14px] rounded-[16px] border-[1.5px] border-[#eceff4] bg-white px-[22px]"
                  {...enter(v, { opacity: 0, y: 18 }, { opacity: 1, y: 0 }, { delay: CUE + 0.6 + i * 0.1, duration: 0.6, ease: EASE_OUT })}
                >
                  <span className="flex flex-col gap-[4px]">
                    <span className="font-manrope text-[21px] font-semibold leading-[26px] text-[#0b0d17]">{role.title}</span>
                    <span className="font-inter text-[15px]" style={{ color: MUTED }}>
                      {role.meta}
                    </span>
                  </span>
                  <motion.span
                    className="ml-auto rounded-[11px] px-[22px] py-[9px] font-manrope text-[17px] font-semibold text-white"
                    initial={false}
                    animate={tint}
                    transition={transition}
                  >
                    Apply
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </Card>
        </Glass>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 700, top: 226 }}
        {...enter(v, { opacity: 0, y: 12, scale: 0.94 }, { opacity: 1, y: 0, scale: 1 }, { type: 'spring', stiffness: 420, damping: 26, delay: CUE + 0.5 })}
      >
        <Tag className="relative" style={{ boxShadow: SHADOW_SOFT }}>
          <Palette size={24} strokeWidth={2.2} style={{ color: accent }} />
          <span className="font-inter text-[18px] font-normal text-[#6b7390]">Brand color</span>
          <motion.span className="size-[22px] rounded-full" initial={false} animate={tint} transition={transition} />
          <span className="font-inter text-[18px] font-medium uppercase tabular-nums">{accent}</span>
        </Tag>
      </motion.div>
    </>
  );
}
