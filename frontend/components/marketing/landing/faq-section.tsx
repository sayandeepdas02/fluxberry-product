'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './motion';
import { GRADIENT, SectionHeader, TYPE } from './primitives';
import { FAQ, type FaqItem } from './content';

/** The 26px gradient tile with a 12px plus (two 2px bars), as in the Framer design. */
function PlusTile() {
  return (
    <span aria-hidden className={cn('relative size-[26px] shrink-0 rounded-[7px]', GRADIENT)}>
      <span className="absolute left-1/2 top-[7px] h-3 w-0.5 -translate-x-1/2 bg-white" />
      <span className="absolute left-[7px] top-1/2 h-0.5 w-3 -translate-y-1/2 bg-white" />
    </span>
  );
}

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="rounded-[15px] bg-white p-[17px] shadow-[2px_2px_10px_rgba(0,0,0,0.04)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-answer`}
          id={`${id}-question`}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 rounded-[7px] text-left outline-none focus-visible:ring-2 focus-visible:ring-lp-blue-400 focus-visible:ring-offset-4"
        >
          <span className={cn('text-black', TYPE.label)}>{item.q}</span>
          <PlusTile />
        </button>
      </h3>
      {/* Height animates via grid rows 0fr → 1fr (Framer's spring, bounce 0.2, 0.4s). */}
      <div
        id={`${id}-answer`}
        role="region"
        aria-labelledby={`${id}-question`}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-[400ms] ease-[cubic-bezier(0.25,1.05,0.4,1)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-5 border-t border-lp-gray-300 pt-[17px]">
            <p className={cn('max-w-[310px] text-lp-gray-700', TYPE.body)}>{item.a}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FAQ: heading on the left, questions on the right (stacked and centred below
 * 1200px). On desktop Framer lays these out in a grid whose empty second row
 * adds its 60px gap under the questions, hence the 160px bottom padding.
 */
export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-5 bg-lp-gray-50 px-5 py-[70px] tablet:scroll-mt-0 tablet:px-[50px] tablet:py-[100px] desktop:px-[70px] desktop:pb-[160px]"
    >
      <div className="mx-auto flex max-w-[1300px] flex-col items-center gap-[30px] tablet:gap-[60px] desktop:flex-row desktop:items-start desktop:justify-center">
        <Reveal className="w-full desktop:w-[620px] desktop:shrink-0">
          <SectionHeader pill={FAQ.pill} title={FAQ.title} lead={FAQ.lead} align="left" />
        </Reveal>
        <Reveal className="flex w-full flex-col gap-2.5 pt-2.5 tablet:max-w-[560px] desktop:w-[620px] desktop:max-w-none desktop:shrink-0">
          {FAQ.items.map((item) => (
            <FaqRow key={item.q} item={item} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
