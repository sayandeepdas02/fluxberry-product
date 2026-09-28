'use client';

import { motion } from 'motion/react';
import { POP, enter, type VisualState } from '@/components/marketing/landing/stage';
import { CUE, FMark, Glass } from './kit';

/*
 * The cover for a post that doesn't have its own yet: the brand mark in the
 * hero's glass, floating gently under the title. Give a new post a real
 * cover in ./registry.
 */

export function FallbackScene({ v }: { v: VisualState }) {
  return (
    <motion.div
      className="absolute left-[480px] top-[330px]"
      {...enter(v, { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1 }, { ...POP, delay: CUE })}
    >
      <motion.div
        initial={false}
        animate={v.looping ? { y: [0, -12, 0] } : { y: 0 }}
        transition={v.looping ? { duration: 4, ease: 'easeInOut', repeat: Infinity } : { duration: 0.4 }}
      >
        <Glass style={{ position: 'relative', width: 240, height: 240 }} radius={60} pad={16}>
          <FMark size={208} radius={44} className="shadow-[0_24px_48px_-20px_rgba(8,38,99,0.6)]" />
        </Glass>
      </motion.div>
    </motion.div>
  );
}
