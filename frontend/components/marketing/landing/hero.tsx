import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Appear } from './motion';
import { HeroDashboard } from './hero-dashboard';
import { GradientButton, Pill, TYPE } from './primitives';
import { HERO } from './content';

/** Bootstrap's "people-fill", the glyph the Framer design uses in its hero badge (16×12). Takes the text colour. */
export function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 12" width={16} height={12} aria-hidden className="shrink-0 fill-current">
      <path d="M7 12s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 11c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 7c-4 0-5 3-5 4s1 1 1 1zM4.5 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" />
    </svg>
  );
}

/*
 * The painted sky pales from #1084e5 at the top to #46aff9 near the horizon,
 * where white text only reaches 2.4:1. This deep-blue wash (blue, not black,
 * so the sky stays saturated) sits behind the copy and fades out before the
 * clouds and the valley. The copy is a fixed distance from the top while the
 * card's height varies, so the wash is placed in pixels, per breakpoint
 * (--scrim-shape, set where it's used).
 */
const SCRIM = [
  'radial-gradient(var(--scrim-shape), rgba(3,37,99,0.4), rgba(3,37,99,0.32) 35%, rgba(3,37,99,0.12) 70%, transparent)',
  'linear-gradient(180deg, rgba(3,37,99,0.2), transparent 480px)',
].join(', ');

/** Share of the dashboard's height that shows above the card's foot. */
const SHOT_VISIBLE = 0.6;

/*
 * The card cuts the framed shot SHOT_VISIBLE of the way down the dashboard:
 * a negative margin pulls the rest out of the flow and the card clips it.
 * That's (1 - SHOT_VISIBLE) of the image's height plus the frame's foot
 * padding (--frame). The image spans the column less the padding each side,
 * and margin percentages resolve against the column's width.
 */
const RATIO = HERO.image.height / HERO.image.width;
const HIDDEN = 1 - SHOT_VISIBLE;
const SHOT_CUT = `calc(${(-HIDDEN * RATIO * 100).toFixed(4)}% - ${(1 - 2 * HIDDEN * RATIO).toFixed(4)} * var(--frame))`;

export function Hero() {
  return (
    <section id="hero" className="px-2 pt-2 tablet:px-3 tablet:pt-3">
      {/* The scene card: the copy, then the framed dashboard, which the card's foot cuts off partway down. */}
      <div className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#1084e5,#46aff9)] px-3 tablet:rounded-[27px] tablet:px-[38px] desktop:px-[58px]">
        <div aria-hidden className="absolute inset-0">
          {/*
           * Smaller screens stack the copy lower in a shorter card, so they zoom in
           * from the top to keep it on the deeper upper sky, clear of the clouds.
           */}
          <div className="absolute inset-x-0 top-0 h-[150%] tablet:h-[120%] desktop:h-full">
            {/* Cover-scaled, the scene is drawn about as wide as its 1672px source or wider at every size. */}
            <Image src={HERO.backdrop} alt="" fill priority sizes="1672px" className="object-cover" />
          </div>
          <div
            className="absolute inset-0 [--scrim-shape:ellipse_100%_250px_at_50%_280px] tablet:[--scrim-shape:ellipse_62%_280px_at_50%_350px] desktop:[--scrim-shape:ellipse_50%_240px_at_50%_320px]"
            style={{ backgroundImage: SCRIM }}
          />
        </div>

        <Appear className="relative flex flex-col items-center gap-[30px] pb-11 pt-[132px] tablet:pb-14 tablet:pt-[188px] desktop:pb-16">
          <div className="flex w-full flex-col items-center gap-5 [text-shadow:0_1px_16px_rgba(3,37,99,0.28)]">
            <div className="flex w-full flex-col items-center gap-2.5">
              <Pill className="bg-white/5 text-white ring-1 ring-inset ring-white/30 backdrop-blur-md">
                <PeopleIcon />
                {HERO.badge}
              </Pill>
              <h1 className={cn('max-w-[600px] text-balance text-center text-white desktop:max-w-[850px]', TYPE.h1)}>{HERO.title}</h1>
            </div>
            <p className={cn('max-w-[340px] text-pretty text-center text-white tablet:max-w-[360px] desktop:max-w-[540px]', TYPE.body)}>
              {HERO.lead[0]}
              <br />
              {HERO.lead[1]}
            </p>
          </div>
          <GradientButton href={HERO.cta.href} tone="light">
            {HERO.cta.label}
          </GradientButton>
        </Appear>

        {/* The shot's column: SHOT_CUT's percentage resolves against its width. */}
        <div className="relative mx-auto max-w-[1160px]">
          {/* A frosted-glass frame; its radii are the shot's plus the padding, so the corners stay concentric. */}
          <Appear
            delay={0.2}
            className={cn(
              'rounded-[16px] bg-white/25 p-[var(--frame)] ring-1 ring-inset ring-white/50 backdrop-blur-md [--frame:6px]',
              'shadow-[0_24px_60px_-20px_rgba(3,37,99,0.35)] tablet:rounded-[20px] tablet:[--frame:8px] desktop:rounded-[24px] desktop:[--frame:10px]',
            )}
            style={{ marginBottom: SHOT_CUT }}
          >
            {/* The dashboard, live: drawn on the mockup's pixel grid at the mockup's proportions. */}
            <div
              role="img"
              aria-label={HERO.image.alt}
              className="relative w-full overflow-hidden rounded-[10px] bg-[#fcfcfd] shadow-[0_0_0_1px_rgba(3,37,99,0.06),0_8px_24px_-10px_rgba(3,37,99,0.3)] tablet:rounded-[12px] desktop:rounded-[14px]"
              style={{ aspectRatio: `${HERO.image.width} / ${HERO.image.height}` }}
            >
              <HeroDashboard />
            </div>
          </Appear>
        </div>
      </div>
    </section>
  );
}
