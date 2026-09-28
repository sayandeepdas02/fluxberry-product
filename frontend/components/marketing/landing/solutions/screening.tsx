'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { EASE_OUT, GLIDE, LEAD, POP, Stage, Surface, enter, useAfter, usePhases, useVisual, type VisualState } from './stage';

/*
 * "AI Screening": a three-step workflow that runs on a loop. Each step lights
 * up in turn, the highlight follows it, finished steps get a check, and a
 * focus ring picks out the matching setting on the right. Coordinates inside
 * the card are the screenshot's pixels minus (234, 78).
 */

const CARD = { left: 234, top: 78, width: 788, height: 504 };
const BLUE = '#3b82f6';
const GREY = '#d6dbe4';
const STEPS = [
  { title: 'Trigger', lines: ['When form is submitted'], y: 77, panel: { y: 34, height: 101 } },
  { title: 'Rule', lines: ['If status equals', 'approved'], y: 205, panel: { y: 162, height: 128 } },
  { title: 'Action', lines: ['Send notification'], y: 361, panel: { y: 318, height: 101 } },
];
/** Blue fills over the rail between circles (from one circle's bottom edge to the next one's top). */
const CONNECTORS = [
  { top: 99, height: 84 },
  { top: 227, height: 112 },
];
/** The setting each step picks out on the right: auto-execute, priority, delay. */
const FOCUS = [
  { x: 658, y: 55, width: 82, height: 50, borderRadius: 25 },
  { x: 410, y: 162, width: 329, height: 70, borderRadius: 16 },
  { x: 410, y: 292, width: 329, height: 76, borderRadius: 16 },
];

interface RunState {
  active: number;
  done: boolean[];
  filled: boolean[];
  sending: boolean;
  sent: boolean;
}

/** The screenshot's own state, shown until the first run starts. */
const STILL: RunState = { active: 1, done: [false, true, false], filled: [false, false], sending: false, sent: false };
// Trigger, trigger done, rule, rule done, action sending, action sent (hold), reset.
const RUN_MS = [900, 550, 1000, 550, 900, 2000, 700];
const runState = (p: number): RunState => ({
  active: p <= 1 ? 0 : p <= 3 ? 1 : p <= 5 ? 2 : 0,
  done: [p >= 1 && p <= 5, p >= 3 && p <= 5, p === 5],
  filled: [p >= 1 && p <= 5, p >= 3 && p <= 5],
  sending: p === 4,
  sent: p === 5,
});

export function ScreeningVisual() {
  const v = useVisual();
  const toggled = useAfter(v, LEAD + 1.0);
  const ready = useAfter(v, LEAD + 1.8);
  const running = v.looping && ready;
  const phase = usePhases(running, RUN_MS);
  const [hasRun, setHasRun] = useState(false);
  useEffect(() => {
    if (running) setHasRun(true);
  }, [running]);
  const state = hasRun ? runState(phase) : STILL;

  return (
    <Stage visual={v} width={1254} height={660}>
      <Surface className="rounded-[22px]" style={CARD}>
        <motion.div
          className="absolute left-[33px] w-[321px] rounded-[16px] bg-[#edf3fd]"
          initial={v.reduced ? false : { opacity: 0, ...STEPS[1].panel }}
          animate={{ opacity: v.started ? 1 : 0, ...STEPS[state.active].panel }}
          transition={{ ...GLIDE, opacity: { delay: v.started && !hasRun ? LEAD + 0.5 : 0, duration: 0.5 } }}
        />

        {/* Rail, then the blue progress over it. */}
        <motion.div
          className="absolute left-[75.5px] top-[99px] h-[323px] w-[3px] origin-top rounded-full"
          style={{ backgroundColor: GREY }}
          {...enter(v, { scaleY: 0 }, { scaleY: 1 }, { delay: LEAD, duration: 1, ease: EASE_OUT })}
        />
        {CONNECTORS.map((c, i) => (
          <motion.div
            key={c.top}
            className="absolute left-[75.5px] w-[3px] origin-top rounded-full"
            style={{ top: c.top, height: c.height, backgroundColor: BLUE }}
            initial={false}
            animate={{ scaleY: state.filled[i] ? 1 : 0 }}
            transition={{ duration: state.filled[i] ? 0.45 : 0.3, ease: EASE_OUT }}
          />
        ))}

        {STEPS.map((step, i) => (
          <StepCircle key={step.title} v={v} index={i} state={state} live={hasRun} />
        ))}

        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            className="absolute left-[119px]"
            style={{ top: step.y - 18 }}
            {...enter(v, { opacity: 0, x: -10 }, { opacity: 1, x: 0 }, { delay: LEAD + 0.15 + i * 0.15, duration: 0.6, ease: EASE_OUT })}
          >
            <p className="font-manrope text-[23px] font-semibold leading-[28px] text-[#1f2937]">{step.title}</p>
            {i === 2 ? (
              <div className="relative mt-[8px] h-[27px] w-[230px]">
                <AnimatePresence initial={false} mode="wait">
                  <motion.p
                    key={state.sent ? 'sent' : 'send'}
                    className="absolute inset-0 font-inter text-[19px] leading-[27px]"
                    style={{ color: state.sent ? '#15935b' : '#6b7280' }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                  >
                    {state.sent ? 'Notification sent' : 'Send notification'}
                  </motion.p>
                </AnimatePresence>
              </div>
            ) : (
              <div className="mt-[8px] font-inter text-[19px] leading-[27px] text-[#6b7280]">
                {step.lines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {/* Settings panel. */}
        <motion.div
          className="absolute left-[388px] top-[33px] h-[437px] w-[374px] rounded-[20px] bg-[#f4f4f6]"
          {...enter(v, { opacity: 0, x: 16 }, { opacity: 1, x: 0 }, { delay: LEAD + 0.2, duration: 0.8, ease: EASE_OUT })}
        />
        <motion.div
          className="absolute left-[414px] top-[60px] flex h-[40px] w-[321px] items-center justify-between"
          {...enter(v, { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.35, duration: 0.6, ease: EASE_OUT })}
        >
          <span className="font-inter text-[19px] text-[#4b5563]">Auto-execute</span>
          <motion.span
            className="relative h-[40px] w-[72px] rounded-full"
            initial={false}
            animate={{ backgroundColor: toggled ? '#2f80ed' : '#cfd4dc' }}
            transition={{ duration: 0.3 }}
          >
            <motion.span
              className="absolute left-0 top-[4px] size-[32px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.2)]"
              initial={false}
              animate={{ x: toggled ? 36 : 4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 32 }}
            />
          </motion.span>
        </motion.div>
        {[
          { label: 'Priority', value: 'High', y: 138, height: 60, chevron: true },
          { label: 'Delay (seconds)', value: '0', y: 267, height: 66, chevron: false },
        ].map((field, i) => (
          <motion.div
            key={field.label}
            className="absolute left-[414px] w-[320px]"
            style={{ top: field.y }}
            {...enter(v, { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.43 + i * 0.08, duration: 0.6, ease: EASE_OUT })}
          >
            <p className="font-inter text-[19px] leading-[24px] text-[#374151]">{field.label}</p>
            <div
              className="mt-[5px] flex items-center justify-between rounded-[12px] border-[1.5px] border-[#e3e3e6] bg-white pl-[21px] pr-[24px] font-inter text-[22px] text-[#1f2937]"
              style={{ height: field.height }}
            >
              {field.value}
              {field.chevron ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              ) : null}
            </div>
          </motion.div>
        ))}
        {[239, 159].map((width, i) => (
          <motion.div
            key={width}
            className="absolute left-[415px] h-[12px] origin-left rounded-full bg-[#e5e5e7]"
            style={{ top: 405 + i * 27, width }}
            {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: LEAD + 0.6 + i * 0.08, duration: 0.7, ease: EASE_OUT })}
          />
        ))}

        <motion.div
          className="pointer-events-none absolute left-0 top-0 border-2 shadow-[0_0_0_5px_rgba(59,130,246,0.14)]"
          style={{ borderColor: BLUE }}
          initial={{ opacity: 0, ...FOCUS[STILL.active] }}
          animate={{ opacity: hasRun ? 1 : 0, ...FOCUS[state.active] }}
          // Less bounce than GLIDE: the ring changes shape as it travels, and overshoot reads as wobble.
          transition={{ type: 'spring', visualDuration: 0.55, bounce: 0.08, opacity: { duration: 0.3 } }}
        />
      </Surface>
    </Stage>
  );
}

function StepCircle({ v, index, state, live }: { v: VisualState; index: number; state: RunState; live: boolean }) {
  const done = state.done[index];
  const active = live && state.active === index && !done;
  const sending = index === 2 && state.sending;
  const lit = done || active;

  return (
    <motion.div
      className="absolute size-[44px]"
      style={{ left: 54, top: STEPS[index].y - 22 }}
      {...enter(v, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }, { ...POP, delay: LEAD + 0.1 + index * 0.15 })}
    >
      {/* Active glow. */}
      <motion.span
        className="absolute -inset-[7px] rounded-full bg-[rgba(59,130,246,0.18)]"
        initial={false}
        animate={active && v.looping ? { scale: [0.8, 1.15], opacity: [1, 0] } : { scale: 0.8, opacity: 0 }}
        transition={active && v.looping ? { duration: 1.2, ease: 'easeOut', repeat: Infinity } : { duration: 0.2 }}
      />
      <motion.span
        className="absolute inset-0 rounded-full border-[3px]"
        initial={false}
        animate={{
          borderColor: lit ? BLUE : GREY,
          backgroundColor: done ? BLUE : '#ffffff',
        }}
        transition={{ duration: 0.3 }}
      />
      <motion.span
        className="absolute inset-0 flex items-center justify-center font-inter text-[20px]"
        initial={false}
        animate={{ opacity: done ? 0 : 1, scale: done ? 0.6 : 1, color: active ? BLUE : '#4b5563' }}
        transition={{ duration: 0.25 }}
      >
        {index + 1}
      </motion.span>
      <svg className="absolute inset-0 overflow-visible" width="44" height="44" viewBox="0 0 44 44" fill="none">
        <motion.path
          d="M14 22.5 L19.5 28 L30 16.5"
          stroke="#fff"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: done ? 0.4 : 0.15, ease: EASE_OUT, delay: done ? 0.1 : 0 }}
        />
        {sending ? (
          <motion.circle
            cx="22"
            cy="22"
            r="27"
            stroke={BLUE}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="40 130"
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 360, opacity: 1 }}
            transition={{ rotate: { duration: 0.9, ease: 'linear', repeat: Infinity }, opacity: { duration: 0.2 } }}
          />
        ) : null}
      </svg>
    </motion.div>
  );
}
