import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appear } from '@/components/marketing/landing/motion';
import { GradientButton, GridBackdrop, Pill, TYPE } from '@/components/marketing/landing/primitives';
import { fill } from './fill';

/** Hero of a comparison page: the pill names the pair, the H1 makes the case, two CTAs and three quick points. */
export function CompareHero({
  name,
  headline,
  lead,
  glance,
}: {
  name: string;
  headline: string;
  lead: string;
  glance: readonly string[];
}) {
  return (
    <section className="relative px-5 pb-[70px] pt-[140px] tablet:px-[50px] tablet:pb-[100px] tablet:pt-[200px] desktop:px-[70px]">
      <GridBackdrop />
      <Appear className="relative mx-auto flex max-w-[1300px] flex-col items-center gap-[30px] text-center">
        <div className="flex flex-col items-center gap-5">
          <Pill>{`Zliptal vs ${name}`}</Pill>
          <h1 className={cn('max-w-[820px] text-balance text-black', TYPE.h1)}>{headline}</h1>
          <p className={cn('max-w-[640px] text-pretty text-lp-gray-700', TYPE.body)}>{fill(lead)}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <GradientButton href="/sign-up">Get Started</GradientButton>
          <Link
            href="/pricing"
            className={cn(
              'rounded-sm text-black outline-none hover:text-lp-blue-600 focus-visible:ring-2 focus-visible:ring-lp-blue-400 focus-visible:ring-offset-2',
              TYPE.button,
            )}
          >
            See pricing
          </Link>
        </div>
        <ul className="flex flex-col items-center gap-2.5 tablet:flex-row tablet:flex-wrap tablet:justify-center tablet:gap-x-6">
          {glance.map((point) => (
            <li key={point} className={cn('flex items-center gap-2 text-lp-gray-800', TYPE.label)}>
              <Check aria-hidden className="size-4 shrink-0 text-lp-blue-500" strokeWidth={2.5} />
              {fill(point)}
            </li>
          ))}
        </ul>
      </Appear>
    </section>
  );
}
