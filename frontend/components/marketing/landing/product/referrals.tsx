'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import { EASE_OUT, enter, usePhases, type VisualState } from '@/components/marketing/landing/stage';
import { Avatar, BLUE, CUE, Card, GREEN, GREEN_BG, Glass, MUTED, SHADOW_SOFT, alongCurve } from '@/components/marketing/blog/covers/kit';

/*
 * "Candidate referrals": a referral link for an open role is copied, someone
 * applies through it, and the referral lands in the list with its reward
 * status: pending payout, then paid. Loops: ready, copied, applying, pending,
 * paid, short pause.
 */

const LEFT = { left: 70, top: 262, width: 470, height: 520 };
const RIGHT = { left: 590, top: 262, width: 540, height: 520 };
// Ready, copied, someone applies, referral pending, reward paid, short pause.
const RUN_MS = [1500, 1000, 1200, 2000, 2200, 800];
const ROW = { top: 96, height: 84, gap: 12 };
const OLDER = [
  { name: 'Rohan Mehta', by: 'Sneha', tone: 2, reward: 'Paid' },
  { name: 'Divya Nair', by: 'Arjun', tone: 3, reward: 'Pending payout' },
] as const;
/** The path of the "Priya applied" pill from the link card across to the list. */
const FLIGHT = alongCurve([0, 0], [70, -90], [170, -90], [250, 0]);

function Reward({ label }: { label: string }) {
  const paid = label === 'Paid';
  return (
    <span
      className="rounded-full px-[12px] py-[3px] font-inter text-[14px] font-medium"
      style={{ backgroundColor: paid ? GREEN_BG : '#fdf0e3', color: paid ? GREEN : '#c2660a' }}
    >
      {label}
    </span>
  );
}

export function ReferralsScene({ v }: { v: VisualState }) {
  const run = usePhases(v.looping, RUN_MS);
  const phase = v.reduced ? 4 : run;
  const copied = phase >= 1 && phase <= 2;
  const landed = phase >= 3 && phase <= 4;
  const paid = phase === 4;
  const rows = landed ? 3 : 2;

  return (
    <>
      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={LEFT} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            <p className="absolute left-[26px] top-[24px] font-manrope text-[22px] font-semibold text-[#0b0d17]">Referral link</p>
            <div className="absolute inset-x-[26px] top-[78px] flex h-[58px] items-center justify-between rounded-[14px] border-[1.5px] border-[#e1e6ef] px-[18px]">
              <span className="font-manrope text-[19px] font-semibold text-[#0b0d17]">Senior Designer</span>
              <ChevronDown size={20} strokeWidth={2.4} style={{ color: MUTED }} />
            </div>
            <div className="absolute inset-x-[26px] top-[154px] flex h-[64px] items-center gap-[12px] rounded-[14px] bg-[#f4f6fa] pl-[18px] pr-[8px]">
              <span className="font-inter text-[17px] text-[#3b4366]">fluxberry.in/r/a7m2q</span>
              <motion.span
                className="ml-auto flex h-[46px] items-center gap-[8px] rounded-[11px] px-[16px] font-manrope text-[16px] font-semibold text-white"
                initial={false}
                animate={{ backgroundColor: copied ? GREEN : BLUE, scale: phase === 1 ? [1, 0.94, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.4} />}
                {copied ? 'Copied' : 'Copy'}
              </motion.span>
            </div>
            <p className="absolute inset-x-[28px] top-[246px] font-inter text-[16px] leading-[24px]" style={{ color: MUTED }}>
              Share it anywhere. You get the credit for everyone who applies through it.
            </p>
          </Card>
        </Glass>
      </motion.div>

      <motion.div {...enter(v, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { delay: CUE + 0.12, duration: 0.9, ease: EASE_OUT })}>
        <Glass style={RIGHT} radius={34}>
          <Card className="relative h-full w-full" style={{ borderRadius: 22 }}>
            <div className="absolute inset-x-[26px] top-[24px] flex items-center">
              <span className="font-manrope text-[22px] font-semibold text-[#0b0d17]">Referrals</span>
              <span className="ml-auto rounded-full bg-[#e6f0ff] px-[12px] py-[2px] font-manrope text-[16px] font-semibold tabular-nums" style={{ color: BLUE }}>
                {rows}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {landed && (
                <motion.div
                  key="new"
                  className="absolute inset-x-[22px] flex items-center gap-[14px] rounded-[16px] bg-[#f3f8ff] px-[16px]"
                  style={{ top: ROW.top, height: ROW.height, boxShadow: `inset 0 0 0 2px ${BLUE}` }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.3 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  <Avatar initials="PS" tone={0} size={48} />
                  <span className="flex flex-col gap-[3px]">
                    <span className="font-manrope text-[20px] font-semibold leading-[24px] text-[#0b0d17]">Priya Sharma</span>
                    <span className="font-inter text-[14px]" style={{ color: MUTED }}>
                      Referred by Karan
                    </span>
                  </span>
                  <span className="ml-auto">
                    <Reward label={paid ? 'Paid' : 'Pending payout'} />
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {OLDER.map((row, i) => (
              <motion.div
                key={row.name}
                className="absolute inset-x-[22px] flex items-center gap-[14px] rounded-[16px] bg-[#f4f6fa] px-[16px]"
                style={{ height: ROW.height }}
                initial={v.reduced ? false : { opacity: 0, top: ROW.top + i * (ROW.height + ROW.gap) }}
                animate={{ opacity: v.started ? 1 : 0, top: ROW.top + (i + (landed ? 1 : 0)) * (ROW.height + ROW.gap) }}
                transition={{ type: 'spring', visualDuration: 0.6, bounce: 0.15, opacity: { duration: 0.5, delay: v.started ? CUE + 0.5 + i * 0.1 : 0 } }}
              >
                <Avatar initials={row.name.split(' ').map((n) => n[0]).join('')} tone={row.tone} size={48} />
                <span className="flex flex-col gap-[3px]">
                  <span className="font-manrope text-[20px] font-semibold leading-[24px] text-[#0b0d17]">{row.name}</span>
                  <span className="font-inter text-[14px]" style={{ color: MUTED }}>
                    Referred by {row.by}
                  </span>
                </span>
                <span className="ml-auto">
                  <Reward label={row.reward} />
                </span>
              </motion.div>
            ))}
          </Card>
        </Glass>
      </motion.div>

      {/* Someone applies through the link: a pill flies from the link card to the list. */}
      <AnimatePresence>
        {phase === 2 && (
          <motion.div
            key="flight"
            className="absolute flex items-center gap-[10px] whitespace-nowrap rounded-full bg-white py-[10px] pl-[12px] pr-[20px] font-manrope text-[20px] font-semibold text-[#0b0d17]"
            style={{ left: 330, top: 470, boxShadow: SHADOW_SOFT }}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: FLIGHT.x, y: FLIGHT.y, opacity: [0, 1, 1, 0] }}
            transition={{ x: { duration: 1.1, ease: 'easeInOut' }, y: { duration: 1.1, ease: 'easeInOut' }, opacity: { duration: 1.1, times: [0, 0.12, 0.85, 1] } }}
          >
            <Avatar initials="PS" tone={0} size={30} />
            Priya applied
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
