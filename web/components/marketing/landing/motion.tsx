'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

/*
 * The landing page's two entrance animations, copied from the Framer design:
 * fade up 64px over 1s. Kept apart from ./primitives because they need the
 * client; the primitives and TYPE tokens must stay importable from server
 * components (a 'use client' module hands them client references instead).
 */

const EASE = [0.45, 0, 0, 1] as const;
const HIDDEN = { opacity: 0, y: 64 };
const SHOWN = { opacity: 1, y: 0 };

/** Fades its content up once, the first time it's half in view (Framer "scroll appear"). */
export function Reveal({ className, children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      initial={HIDDEN}
      whileInView={SHOWN}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 1, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Fades its content up on page load (Framer "appear"); `delay` staggers siblings. */
export function Appear({ className, children, delay = 0, ...rest }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={HIDDEN}
      animate={SHOWN}
      transition={{ duration: 1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
