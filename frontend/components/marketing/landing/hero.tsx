import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Appear } from './motion';
import { GradientButton, Pill, TYPE } from './primitives';
import { HERO } from './content';

/** Bootstrap's "people-fill", the glyph the Framer design uses in its hero badge (16×12). */
function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 12" width={16} height={12} aria-hidden className="shrink-0 fill-lp-blue-400">
      <path d="M7 12s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 11c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 7c-4 0-5 3-5 4s1 1 1 1zM4.5 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" />
    </svg>
  );
}

/*
 * Framer's hero image carries a 4-layer shadow (its "realistic" preset);
 * copied verbatim so the frame edge reads the same.
 */
const HERO_IMAGE_SHADOW =
  '0.159px 0.518px 0.541px -0.8125px rgba(0,0,0,0.16), 0.483px 1.569px 1.642px -1.625px rgba(0,0,0,0.15), 1.277px 4.149px 4.341px -2.4375px rgba(0,0,0,0.14), 4px 13px 13.6px -3.25px rgba(0,0,0,0.09)';

export function Hero() {
  return (
    <section id="hero" className="relative px-5 pb-[70px] pt-[140px] tablet:px-[50px] tablet:pb-[100px] tablet:pt-[200px] desktop:px-[70px]">
      {/* Grid backdrop: a full-width image that fades to white at its foot. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 aspect-[3963/2793] w-full">
        <Image src="/landing/grid-bg.png" alt="" fill sizes="100vw" loading="eager" className="object-cover" />
      </div>

      <div className="relative mx-auto flex max-w-[1300px] flex-col items-center">
        <Appear className="flex w-full flex-col items-center gap-[30px]">
          <div className="flex w-full flex-col items-center gap-5">
            <div className="flex w-full flex-col items-center gap-2.5">
              <Pill>
                <PeopleIcon />
                {HERO.badge}
              </Pill>
              <h1 className={cn('max-w-[600px] text-center text-black desktop:max-w-[850px]', TYPE.h1)}>
                {HERO.title}
              </h1>
            </div>
            <p className={cn('max-w-[340px] text-center text-lp-gray-700 tablet:max-w-[360px] desktop:max-w-[540px]', TYPE.body)}>
              {HERO.lead[0]}
              <br />
              {HERO.lead[1]}
            </p>
          </div>
          <GradientButton href={HERO.cta.href}>{HERO.cta.label}</GradientButton>
        </Appear>

        <Appear delay={0.2} className="mt-[30px] w-full">
          <div className="rounded-[18px] bg-lp-blue-50 p-[9px]">
            <Image
              src={HERO.image.src}
              alt={HERO.image.alt}
              width={2400}
              height={1620}
              priority
              sizes="(min-width: 1440px) 1282px, calc(100vw - 58px)"
              className="aspect-[2400/1620] h-auto w-full rounded-[12px] object-cover"
              style={{ boxShadow: HERO_IMAGE_SHADOW }}
            />
          </div>
        </Appear>
      </div>
    </section>
  );
}
