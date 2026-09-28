'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT, LEAD, POP, Stage, Surface, enter, useVisual } from '../stage';

/*
 * "Secure by Default": protections verify one by one ("Checking" → "Enabled"),
 * then the shield gains its check. While on screen, a soft sheen passes over
 * the panel now and then. Coordinates inside the card are the screenshot's
 * pixels minus (192, 78).
 */

const CARD = { left: 192, top: 78, width: 484, height: 503 };
const SLATE = '#4a6fa5';
const PROTECTIONS = ['Encryption', 'Access Control', 'Activity Logs'];
const ROLES = [
  ['Admin', 'Full'],
  ['Editor', 'Limited'],
  ['Viewer', 'Read'],
];
/** When each protection finishes verifying, after the visual starts (s). */
const VERIFIED_AT = PROTECTIONS.map((_, i) => LEAD + 1.0 + i * 0.4);
const SHIELD = 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z';

export function SecurityVisual() {
  const v = useVisual();
  const [verified, setVerified] = useState(0);
  useEffect(() => {
    if (!v.started) return;
    if (v.reduced) return setVerified(PROTECTIONS.length);
    const timers = VERIFIED_AT.map((t, i) => setTimeout(() => setVerified(i + 1), t * 1000));
    return () => timers.forEach(clearTimeout);
  }, [v.started, v.reduced]);
  const secured = verified === PROTECTIONS.length;

  return (
    <Stage visual={v} width={866} height={660}>
      <Surface className="rounded-[19px]" style={CARD}>
        <motion.div
          className="absolute left-[21px] top-[21px] h-[242px] w-[442px] overflow-hidden rounded-[18px] bg-[#f4f4f6]"
          {...enter(v, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1 }, { delay: LEAD, duration: 0.7, ease: EASE_OUT })}
        >
          {/* The sheen: a soft diagonal highlight that crosses the panel every few seconds. */}
          <motion.div
            className="absolute inset-y-0 left-0 w-[160px] -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
            initial={{ x: -220 }}
            animate={secured && v.looping ? { x: [-220, 620] } : { x: -220 }}
            transition={secured && v.looping ? { duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 4.5, delay: 0.6 } : { duration: 0 }}
          />
        </motion.div>

        <motion.div
          className="absolute left-[39px] top-[39px] flex size-[43px] items-center justify-center rounded-[10px] bg-white"
          {...enter(v, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { ...POP, delay: LEAD + 0.1 })}
        >
          {/* A ring pulses out once the shield is secured. */}
          <motion.span
            className="absolute inset-0 rounded-[10px] border-2"
            style={{ borderColor: SLATE }}
            initial={{ opacity: 0, scale: 1 }}
            animate={secured && !v.reduced ? { opacity: [0.6, 0], scale: [1, 1.5] } : { opacity: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.35 }}
          />
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7a86a8" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <motion.path d={SHIELD} {...enter(v, { pathLength: 0 }, { pathLength: 1 }, { delay: LEAD + 0.2, duration: 0.9, ease: EASE_OUT })} />
            <motion.path
              d="m9 12 2 2 4-4"
              stroke={SLATE}
              initial={false}
              animate={{ pathLength: secured ? 1 : 0, opacity: secured ? 1 : 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.15 }}
            />
          </svg>
        </motion.div>
        <motion.div
          className="absolute left-[95px] top-[40px]"
          {...enter(v, { opacity: 0, x: -8 }, { opacity: 1, x: 0 }, { delay: LEAD + 0.15, duration: 0.6, ease: EASE_OUT })}
        >
          <p className="font-manrope text-[16px] font-semibold leading-[22px] text-[#2c2c33]">Security Protection</p>
          <p className="mt-[3px] font-inter text-[13px] leading-[18px] text-[#6b6b73]">Always active by default</p>
        </motion.div>

        {PROTECTIONS.map((name, i) => {
          const done = verified > i;
          return (
            <motion.div
              key={name}
              className="absolute left-[39px] flex h-[42px] w-[406px] items-center justify-between rounded-[10px] bg-white pl-[13px] pr-[22px]"
              style={{ top: 100 + i * 52 }}
              {...enter(v, { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.3 + i * 0.1, duration: 0.6, ease: EASE_OUT })}
            >
              <span className="font-inter text-[16px] text-[#3a3a42]">{name}</span>
              <span className="relative flex h-full w-[90px] items-center justify-end">
                <AnimatePresence initial={false} mode="popLayout">
                  {done ? (
                    <motion.span
                      key="enabled"
                      className="flex items-center gap-[7px] font-inter text-[13px] text-[#6b6b73]"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE_OUT }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SLATE} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                        <motion.path
                          d="M20 6 9 17l-5-5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.05 }}
                        />
                      </svg>
                      Enabled
                    </motion.span>
                  ) : (
                    <motion.span
                      key="checking"
                      className="flex items-center gap-[7px] font-inter text-[13px] text-[#a1a1aa]"
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#a1a1aa"
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        animate={v.started && !v.reduced ? { rotate: 360 } : { rotate: 0 }}
                        transition={{ duration: 0.8, ease: 'linear', repeat: Infinity }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
                      </motion.svg>
                      Checking
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.div>
          );
        })}

        <motion.p
          className="absolute left-[21px] top-[285px] font-manrope text-[13px] font-semibold leading-[18px] text-[#33333a]"
          {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.5, duration: 0.5, ease: EASE_OUT })}
        >
          Permissions &amp; Access
        </motion.p>
        <motion.div
          className="absolute left-[21px] top-[324px] flex w-[442px] font-inter text-[13px] leading-[18px] text-[#4b4b53]"
          {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.55, duration: 0.5, ease: EASE_OUT })}
        >
          <span className="w-[220px]">Role</span>
          <span>Access</span>
        </motion.div>
        {ROLES.map(([role, access], i) => (
          <div key={role}>
            <motion.span
              className="absolute left-[21px] h-[1.5px] w-[442px] origin-left bg-[#e6e6e8]"
              style={{ top: 350 + i * 44 }}
              {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: LEAD + 0.6 + i * 0.07, duration: 0.7, ease: EASE_OUT })}
            />
            <motion.div
              className="absolute left-[21px] flex w-[442px] font-inter text-[16px] leading-[20px]"
              style={{ top: 362 + i * 44 }}
              {...enter(v, { opacity: 0, x: -8 }, { opacity: 1, x: 0 }, { delay: LEAD + 0.65 + i * 0.07, duration: 0.5, ease: EASE_OUT })}
            >
              <span className="w-[220px] text-[#33333a]">{role}</span>
              <span className="text-[#6b6b73]">{access}</span>
            </motion.div>
          </div>
        ))}
      </Surface>
    </Stage>
  );
}
