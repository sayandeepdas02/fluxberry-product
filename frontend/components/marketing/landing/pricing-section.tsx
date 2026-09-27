'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PLAN_FEATURES, PLAN_LABELS, PLAN_PRICING, PLAN_TAGLINE, maxAnnualDiscount } from '@/lib/pricing';
import { Reveal } from './motion';
import { GRADIENT, RollText, SectionHeader, TYPE } from './primitives';
import { PRICING_COPY } from './content';

type Plan = 'PRO' | 'MAX';

/** The Framer design's tick (15 × 11). */
function Tick() {
  return (
    <svg viewBox="0 0 14.583 11.175" width={15} height={11} aria-hidden className="shrink-0 fill-black">
      <path d="M14.583 1.175 4.583 11.175 0 6.592 1.175 5.417 4.583 8.817 13.408 0Z" />
    </svg>
  );
}

function PlanCard({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const max = plan === 'MAX';
  const price = yearly ? PLAN_PRICING[plan].annual : PLAN_PRICING[plan].monthly;

  return (
    <Reveal
      className={cn(
        'flex w-full flex-col gap-2.5 rounded-[27px] bg-white shadow-[2px_2px_10px_rgba(0,0,0,0.04)]',
        'tablet:w-[55%] desktop:w-full',
      )}
    >
      {/* Top: price panel, tagline and CTA on a raised block. */}
      <div className="flex flex-col gap-[23px] rounded-[27px] p-[18px] shadow-[2px_2px_10px_rgba(0,0,0,0.04)]">
        <div
          className={cn(
            'flex flex-col gap-[55px] rounded-[19px] p-[18px]',
            max ? cn(GRADIENT, 'text-white') : 'bg-lp-gray-100 text-black',
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn('rounded-[20px] bg-white px-3 py-[3px] text-black', TYPE.pill)}>{PLAN_LABELS[plan]}</span>
            {max && <span className={cn('text-white', TYPE.pill)}>Most Popular</span>}
          </div>
          <p className="flex items-baseline">
            <span className={TYPE.h2}>${price}</span>
            <span className={TYPE.per}>/{yearly ? 'yearly' : 'month'}</span>
          </p>
        </div>

        <p className={cn('px-3 pb-[17px] text-black', TYPE.label)}>{PLAN_TAGLINE[plan]}</p>

        <Link
          href="/sign-up"
          className={cn(
            'group flex items-center justify-center rounded-[15px] px-2.5 py-[15px] outline-none',
            'focus-visible:ring-2 focus-visible:ring-lp-blue-400 focus-visible:ring-offset-2',
            TYPE.button,
            max ? cn(GRADIENT, 'text-white') : 'bg-[linear-gradient(180deg,#f6f6f6_0%,#eeeeee_100%)] text-black',
          )}
        >
          <RollText className="h-[1.3em]">Get Started</RollText>
        </Link>
      </div>

      {/* Bottom: what the plan includes. Framer clips its cards to 648px, which
          leaves 35px under the longer list; the padding reproduces that. */}
      <ul className="flex flex-col gap-2.5 px-[18px] pb-[35px] pt-[37px]">
        {PLAN_FEATURES[plan].map((f) => (
          <li key={f} className={cn('flex items-center gap-2.5 pl-3 text-black', TYPE.label)}>
            <Tick />
            {f}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

/** Pricing: Monthly/Yearly switch over the Pro and Max cards. Prices come from lib/pricing. */
export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  const label = (active: boolean) => cn('transition-colors', TYPE.label, active ? 'text-black' : 'text-lp-gray-500');

  return (
    <section id="pricing" className="scroll-mt-5 bg-white px-5 py-[70px] tablet:scroll-mt-0 tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
      <div className="mx-auto flex max-w-[1300px] flex-col items-center">
        <Reveal className="w-full">
          {/* Framer fixes this heading group at 106px; the two-line H2 on
              tablet and phone overflows it rather than pushing the lead down. */}
          <SectionHeader
            pill={PRICING_COPY.pill}
            title={PRICING_COPY.title}
            headingClassName="h-[106px]"
            titleClassName="max-w-[65%]"
            lead={
              <>
                {PRICING_COPY.lead[0]}
                <br />
                {PRICING_COPY.lead[1]}
              </>
            }
          />
        </Reveal>

        <div className="mt-10 flex items-center gap-[15px]">
          <button type="button" onClick={() => setYearly(false)} className={label(!yearly)}>
            Monthly
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Bill yearly"
            onClick={() => setYearly((v) => !v)}
            className={cn(
              'relative h-[21px] w-[45px] shrink-0 rounded-[30px] p-[3px] outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400 focus-visible:ring-offset-2',
              GRADIENT,
            )}
          >
            <span
              className={cn(
                'block size-[15px] rounded-full bg-white transition-transform duration-[400ms] ease-[cubic-bezier(0.25,1.05,0.4,1)] motion-reduce:transition-none',
                'shadow-[0.12px_0.6px_0.61px_-1.25px_rgba(0,0,0,0.18),0.46px_2.29px_2.33px_-2.5px_rgba(0,0,0,0.16),2px_10px_10.2px_-3.75px_rgba(0,0,0,0.06)]',
                yearly && 'translate-x-6',
              )}
            />
          </button>
          <button type="button" onClick={() => setYearly(true)} className={label(yearly)}>
            Yearly (Save up to {maxAnnualDiscount()}%)
          </button>
        </div>

        <div className="mt-10 flex w-full flex-col items-center gap-5 desktop:grid desktop:grid-cols-2 desktop:items-stretch">
          <PlanCard plan="PRO" yearly={yearly} />
          <PlanCard plan="MAX" yearly={yearly} />
        </div>
      </div>
    </section>
  );
}

