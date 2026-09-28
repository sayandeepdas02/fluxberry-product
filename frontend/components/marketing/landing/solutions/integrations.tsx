'use client';

import Image from 'next/image';
import { motion, useAnimationFrame, useMotionValue, useSpring, wrap, type MotionValue } from 'motion/react';
import { LEAD, POP, Stage, enter, useVisual, type VisualState } from '../stage';

/*
 * "Works With Your Tools": two rows of logo tiles drifting in opposite
 * directions, fading out at the frame's edges. Hovering the card eases the
 * drift almost to a stop; each tile lifts under the pointer. The rows sit on
 * the screenshot's rows (y 262 and 398 of 660) and span the frame's full width.
 */

const ROWS = [
  { y: 262, direction: -1, start: 0, logos: ['slack', 'notion', 'zapier', 'google-drive', 'webflow', 'google', 'figma'] },
  { y: 398, direction: 1, start: -392, logos: ['trello', 'dropbox', 'hubspot', 'framer', 'paypal', 'stripe', 'github'] },
];
const TILE = 80;
const PITCH = 112;
/** Width of one set of seven tiles: the distance after which a row repeats. */
const SET = PITCH * 7;
/** Enough copies of the set to cover the widest frame at any offset. */
const COPIES = 3;
/** Drift speed in design px per second (about 13 CSS px/s on desktop). */
const SPEED = 26;

export function IntegrationsVisual() {
  const v = useVisual();
  const pace = useSpring(1, { stiffness: 60, damping: 18 });

  return (
    <Stage visual={v} width={1254} height={660} fill onPointerEnter={() => pace.set(0.12)} onPointerLeave={() => pace.set(1)}>
      <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent,#000_14%,#000_86%,transparent)]">
        {ROWS.map((row, i) => (
          <Row key={row.y} v={v} row={row} index={i} pace={pace} />
        ))}
      </div>
    </Stage>
  );
}

function Row({ v, row, index, pace }: { v: VisualState; row: (typeof ROWS)[number]; index: number; pace: MotionValue<number> }) {
  const x = useMotionValue(row.start);
  useAnimationFrame((_, delta) => {
    if (!v.looping) return;
    x.set(wrap(-SET, 0, x.get() + row.direction * SPEED * pace.get() * (delta / 1000)));
  });

  return (
    <motion.div className="absolute left-0 flex" style={{ top: row.y - TILE / 2, gap: PITCH - TILE, x }}>
      {Array.from({ length: COPIES }, () => row.logos)
        .flat()
        .map((logo, i) => (
          <motion.div
            key={i}
            className="shrink-0"
            {...enter(
              v,
              { opacity: 0, scale: 0.6, y: 14 },
              { opacity: 1, scale: 1, y: 0 },
              { ...POP, delay: LEAD + index * 0.12 + (i % row.logos.length) * 0.05 },
            )}
          >
            <motion.div
              className="relative size-[80px] rounded-[24px] bg-white shadow-[0_10px_24px_-10px_rgba(8,38,99,0.4)]"
              whileHover={{ y: -8, scale: 1.08 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <Image
                src={`/landing/logos/${logo}.png`}
                alt=""
                width={60}
                height={60}
                unoptimized
                draggable={false}
                className="absolute left-[10px] top-[10px] size-[60px] rounded-[10px]"
              />
            </motion.div>
          </motion.div>
        ))}
    </motion.div>
  );
}
