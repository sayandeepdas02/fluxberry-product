import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Appear } from './motion';
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

/*
 * The product shot hangs 40% of its height below the scene card. Grid items
 * resolve percentage margins and padding against their column's width, so the
 * overhang is expressed as a share of the shot's width (25% at 8:5).
 */
const OVERHANG = `${(40 * HERO.image.height) / HERO.image.width}%`;

/* Lifts the product shot off the scene and, where it hangs below the card, off the white page. */
const DASHBOARD_SHADOW = [
  '0 0 0 1px rgba(3,37,99,0.06)',
  '0 2px 6px rgba(3,37,99,0.06)',
  '0 18px 36px -12px rgba(3,37,99,0.18)',
  '0 44px 88px -28px rgba(3,37,99,0.32)',
].join(', ');

export function Hero() {
  return (
    <section
      id="hero"
      className={cn(
        'grid px-2 pb-[70px] pt-2 tablet:px-3 tablet:pb-[100px] tablet:pt-3',
        // Gutters from the card's edge to the dashboard, either side of the content column.
        'grid-cols-[12px_minmax(0,1fr)_12px] tablet:grid-cols-[38px_minmax(0,1fr)_38px]',
        'desktop:grid-cols-[minmax(58px,1fr)_minmax(0,1160px)_minmax(58px,1fr)]',
      )}
    >
      {/* The scene: a rounded card over rows 1–2, so it ends 60% of the way down the dashboard. */}
      <div
        aria-hidden
        className="relative col-span-full row-start-1 row-end-3 overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,#1084e5,#46aff9)] tablet:rounded-[27px]"
      >
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

      <Appear className="relative col-start-2 row-start-1 flex flex-col items-center gap-[30px] pb-11 pt-[132px] tablet:pb-14 tablet:pt-[188px] desktop:pb-16">
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

      {/* The negative margin takes the overhang out of row 2, where the card ends; the spacer in row 3 gives it back. */}
      <Appear delay={0.2} className="relative col-start-2 row-start-2" style={{ marginBottom: `-${OVERHANG}` }}>
        <Image
          src={HERO.image.src}
          alt={HERO.image.alt}
          width={HERO.image.width}
          height={HERO.image.height}
          priority
          sizes="(min-width: 1300px) 1160px, (min-width: 1200px) calc(100vw - 140px), (min-width: 810px) calc(100vw - 100px), calc(100vw - 40px)"
          className="h-auto w-full rounded-[8px] tablet:rounded-[12px] desktop:rounded-[15px]"
          style={{ boxShadow: DASHBOARD_SHADOW }}
        />
      </Appear>
      <div aria-hidden className="col-start-2 row-start-3" style={{ paddingTop: OVERHANG }} />
    </section>
  );
}
