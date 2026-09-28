'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { HERO } from '@/components/marketing/landing/content';
import { EASE_OUT, Stage, enter, useVisual } from '@/components/marketing/landing/stage';
import { COVERS, fallbackCover, type Sky } from './registry';
import { H, W } from './kit';

/*
 * A post's cover: the hero's painted sky (each post frames its own part of
 * the painting), a deep-blue wash behind a two-line cover line, and the
 * post's live scene. Decorative: the post's title and description are always
 * next to it, so the whole cover is hidden from assistive tech.
 *
 * The sky fills the frame; the text and scene are drawn on a 1200×750 canvas
 * scaled to fit it, so the same cover works as a 16:10 card, the wide
 * featured slot and the article banner. Scenes may run past the canvas's foot
 * (the frame cuts them off, like the hero's dashboard).
 */

export function PostCover({ slug, title, sizes, className }: { slug: string; title: string; sizes: string; className?: string }) {
  const cover = COVERS[slug] ?? fallbackCover(title);
  const { Scene } = cover;
  const v = useVisual();

  return (
    <div aria-hidden className={cn('relative isolate overflow-hidden bg-[#1084e5]', className)}>
      <SkyLayer sky={cover.sky} sizes={sizes} />
      {/* Deepens the top of the sky behind the cover line (blue, not black, so it stays saturated). */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,37,99,0.22),transparent_48%)]" />

      <Stage visual={v} width={W} height={H}>
        <div
          className="absolute left-[-160px] top-[-150px] h-[520px] w-[1520px]"
          style={{ background: 'radial-gradient(closest-side, rgba(3,37,99,0.42), rgba(3,37,99,0.22) 55%, transparent)' }}
        />
        <div
          className="absolute inset-x-0 top-[62px] flex flex-col items-center font-manrope font-semibold leading-[1.08] tracking-[-0.035em] text-white [text-shadow:0_2px_28px_rgba(3,37,99,0.35)]"
          style={{ fontSize: cover.size ?? 66 }}
        >
          {cover.lines.map((line, i) => (
            <motion.span
              key={line}
              className="block whitespace-nowrap"
              {...enter(v, { opacity: 0, y: 18 }, { opacity: 1, y: 0 }, { delay: 0.05 + i * 0.08, duration: 0.8, ease: EASE_OUT })}
            >
              {line}
            </motion.span>
          ))}
        </div>

        {/* Hovering the card lifts the scene a touch while the sky drifts closer. */}
        <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:-translate-y-[10px]">
          <Scene v={v} />
        </div>
      </Stage>
    </div>
  );
}

function SkyLayer({ sky, sizes }: { sky: Sky; sizes: string }) {
  const origin = `${sky.x}% ${sky.y}%`;
  return (
    <div className="absolute inset-0 transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]">
      <div className="absolute inset-0" style={{ transform: `scale(${sky.zoom})`, transformOrigin: origin }}>
        <Image
          src={HERO.backdrop}
          alt=""
          fill
          sizes={sizes}
          className={cn('object-cover', sky.flip && '-scale-x-100')}
          style={{ objectPosition: origin }}
        />
      </div>
    </div>
  );
}
