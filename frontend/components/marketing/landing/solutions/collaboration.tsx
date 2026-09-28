'use client';

import { motion } from 'motion/react';
import { EASE_OUT, GLIDE, LEAD, POP, Stage, Surface, enter, useAfter, usePhases, useVisual } from './stage';

/*
 * "Team Collaboration": shared project notes. Collaborators take turns editing
 * a line; the highlight, its "Editing" chip and their cursor move to it.
 * Coordinates inside the card are the screenshot's pixels minus (256, 78).
 */

const CARD = { left: 256, top: 78, width: 742, height: 504 };
const PEOPLE = [
  { initials: 'JD', color: '#3b7ff5', halo: 'rgba(59, 127, 245, 0.28)', x: 460 },
  { initials: 'SM', color: '#8b5cf6', halo: 'rgba(139, 92, 246, 0.28)', x: 531 },
  { initials: 'AL', color: '#ec4899', halo: 'rgba(236, 72, 153, 0.28)', x: 601 },
  { initials: 'KW', color: '#22b07d', halo: null, x: 671 },
];
const AVATAR = { y: 70, size: 62 };
const LINES = [
  { y: 167, width: 663 },
  { y: 205, width: 563 },
  { y: 255, width: 609 },
  { y: 299, width: 497 },
  { y: 338, width: 597 },
];
const LINE_X = 39;
// Who edits which line, in turn. The first turn is the screenshot's own state.
const TURNS = [
  { line: 2, who: 0 },
  { line: 0, who: 1 },
  { line: 3, who: 2 },
  { line: 1, who: 0 },
  { line: 4, who: 1 },
];
const TURN_MS = [3400, 2400, 2400, 2400, 2400];

/** Where the highlight and the cursor sit for a given line. */
const highlightAt = (l: (typeof LINES)[number]) => ({ x: LINE_X - 11, y: l.y - 12, width: l.width + 22 });
const cursorAt = (l: (typeof LINES)[number]) => ({ x: LINE_X + l.width * 0.665, y: l.y + 14 });
const FIRST = LINES[TURNS[0].line];

export function CollaborationVisual() {
  const v = useVisual();
  const ready = useAfter(v, LEAD + 1.2);
  const turn = TURNS[usePhases(v.looping && ready, TURN_MS)];
  const line = LINES[turn.line];
  const editor = PEOPLE[turn.who];

  return (
    <Stage visual={v} width={1254} height={660}>
      <Surface className="rounded-[20px]" style={CARD}>
        <motion.p
          className="absolute left-[38px] top-[56px] font-inter text-[28px] leading-[34px] text-[#5a6072]"
          {...enter(v, { opacity: 0, y: 6 }, { opacity: 1, y: 0 }, { delay: LEAD, duration: 0.6, ease: EASE_OUT })}
        >
          Project Notes
        </motion.p>

        {PEOPLE.map((person, i) => {
          const editing = person === editor && ready;
          return (
            <motion.div
              key={person.initials}
              className="absolute"
              style={{ left: person.x - AVATAR.size / 2, top: AVATAR.y - AVATAR.size / 2, width: AVATAR.size, height: AVATAR.size }}
              {...enter(v, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1 }, { ...POP, delay: LEAD + 0.1 + i * 0.08 })}
            >
              {person.halo ? (
                <motion.span
                  className="absolute -inset-[5px] rounded-full"
                  style={{ backgroundColor: person.halo }}
                  initial={false}
                  animate={editing ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                />
              ) : null}
              <span
                className="relative flex size-full items-center justify-center rounded-full font-manrope text-[23px] font-bold tracking-[-0.02em] text-white"
                style={{ backgroundColor: person.color }}
              >
                {person.initials}
              </span>
              {person.halo ? (
                <motion.span
                  className="absolute bottom-[-4px] right-[-4px] size-[17px] rounded-full border-[3px] border-white bg-[#34c38f]"
                  {...enter(v, { scale: 0 }, { scale: 1 }, { ...POP, delay: LEAD + 0.45 + i * 0.08 })}
                />
              ) : null}
            </motion.div>
          );
        })}

        <motion.div
          className="absolute left-[38px] top-[132px] h-[2px] w-[665px] origin-left bg-[#e5e5e7]"
          {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: LEAD + 0.1, duration: 0.8, ease: EASE_OUT })}
        />

        {LINES.map((l, i) => (
          <motion.div
            key={l.y}
            className="absolute h-[22px] origin-left rounded-full bg-[#f2f2f3]"
            style={{ left: LINE_X, top: l.y, width: l.width }}
            {...enter(v, { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1 }, { delay: LEAD + 0.2 + i * 0.07, duration: 0.8, ease: EASE_OUT })}
          />
        ))}

        {/* The line being edited: outline, a soft sheen across it, and the editor's chip. */}
        <motion.div
          className="absolute left-0 top-0 h-[46px]"
          initial={v.reduced ? false : { opacity: 0, scale: 0.96, ...highlightAt(FIRST) }}
          animate={{ opacity: v.started ? 1 : 0, scale: v.started ? 1 : 0.96, ...highlightAt(line) }}
          transition={{ ...GLIDE, opacity: { delay: v.started && !ready ? LEAD + 0.9 : 0, duration: 0.4 }, scale: { ...POP, delay: LEAD + 0.9 } }}
        >
          <motion.div
            className="absolute inset-0 rounded-[23px] border-[3px]"
            initial={false}
            animate={{ borderColor: `${editor.color}66` }}
            transition={{ duration: 0.4 }}
          />
          <div className="absolute inset-x-[11px] top-[12px] h-[22px] overflow-hidden rounded-full">
            {v.looping && ready ? (
              <motion.div
                key={turn.line}
                className="absolute inset-y-0 w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${editor.color}26, transparent)` }}
                initial={{ x: '-100%' }}
                animate={{ x: '320%' }}
                transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.3 }}
              />
            ) : null}
          </div>
          <motion.div
            className="absolute left-[11px] top-[-35px] flex h-[47px] w-[118px] items-center gap-[11px] rounded-[6px] pl-[16px] font-manrope text-[21px] font-medium text-white"
            initial={false}
            animate={{ backgroundColor: editor.color }}
            transition={{ duration: 0.4 }}
          >
            <span className="size-[10px] rounded-full bg-white" />
            Editing
          </motion.div>
        </motion.div>

        {/* The editor's cursor, on a softer spring than the highlight so it trails it naturally. */}
        <motion.svg
          className="absolute left-0 top-0"
          width={28}
          height={30}
          viewBox="0 0 20 22"
          initial={v.reduced ? false : { opacity: 0, ...cursorAt(FIRST) }}
          animate={{ opacity: v.started ? 1 : 0, ...cursorAt(line) }}
          transition={{
            x: { type: 'spring', stiffness: 70, damping: 15, mass: 0.9 },
            y: { type: 'spring', stiffness: 110, damping: 17, mass: 0.9 },
            opacity: { delay: v.started && !ready ? LEAD + 1.1 : 0, duration: 0.3 },
          }}
        >
          <motion.path
            d="M1.5 1.5 L18 9.2 L10.4 11.2 L7.2 19.5 Z"
            strokeLinejoin="round"
            strokeWidth={1.5}
            stroke="#fff"
            initial={false}
            animate={{ fill: editor.color }}
            transition={{ duration: 0.4 }}
          />
        </motion.svg>

        <motion.div
          className="absolute left-[38px] top-[392px] h-[2px] w-[665px] origin-left bg-[#e5e5e7]"
          {...enter(v, { scaleX: 0 }, { scaleX: 1 }, { delay: LEAD + 0.55, duration: 0.8, ease: EASE_OUT })}
        />
        <motion.div
          className="absolute inset-x-[38px] top-[432px] flex items-center justify-between"
          {...enter(v, { opacity: 0, y: 8 }, { opacity: 1, y: 0 }, { delay: LEAD + 0.65, duration: 0.6, ease: EASE_OUT })}
        >
          <span className="font-inter text-[26px] leading-[32px] text-[#5a6072]">Sprint Plan</span>
          <span className="flex items-center gap-[10px] font-inter text-[21px] text-[#5a6072]">
            <span className="relative size-[12px]">
              <motion.span
                className="absolute inset-0 rounded-full bg-[#34c38f]"
                animate={v.looping ? { scale: [1, 2.6], opacity: [0.5, 0] } : { scale: 1, opacity: 0 }}
                transition={v.looping ? { duration: 1.8, ease: 'easeOut', repeat: Infinity } : { duration: 0.2 }}
              />
              <span className="absolute inset-0 rounded-full bg-[#34c38f]" />
            </span>
            3 active
          </span>
        </motion.div>
      </Surface>
    </Stage>
  );
}
