import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Reveal } from './motion';
import { SectionHeader, TYPE } from './primitives';
import { SOLUTIONS, type SolutionCard } from './content';

/** Pairs the cards into bento rows (two per row). */
function rows(cards: SolutionCard[]): SolutionCard[][] {
  const out: SolutionCard[][] = [];
  for (let i = 0; i < cards.length; i += 2) out.push(cards.slice(i, i + 2));
  return out;
}

/**
 * "Solutions" (Framer: Features) — a bento of six image cards. On desktop the
 * rows alternate narrow/wide (530 + 750 of a 1300px row); below 1200px they stack.
 */
export function SolutionsSection() {
  return (
    <section id="features" className="scroll-mt-5 bg-lp-gray-50 px-5 py-[70px] tablet:scroll-mt-0 tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
      <div className="mx-auto flex max-w-[1300px] flex-col items-center">
        <Reveal className="w-full">
          <SectionHeader
            pill={SOLUTIONS.pill}
            title={SOLUTIONS.title}
            lead={SOLUTIONS.lead}
            titleClassName="max-w-[350px] tablet:max-w-[600px] desktop:max-w-[500px]"
            leadClassName="max-w-[340px] tablet:max-w-[360px] desktop:max-w-[460px]"
          />
        </Reveal>

        <div className="mt-[60px] flex w-full flex-col gap-5">
          {rows(SOLUTIONS.cards).map((row) => (
            <div
              key={row[0].title}
              className={cn(
                'grid grid-cols-1 gap-5',
                // Each row pairs a narrow and a wide card, in the content's order.
                row[0].wide ? 'desktop:grid-cols-[750fr_530fr]' : 'desktop:grid-cols-[530fr_750fr]',
              )}
            >
              {row.map((card) => (
                <Reveal
                  key={card.title}
                  className="flex flex-col rounded-[15px] bg-white p-[15px] shadow-[2px_2px_10px_rgba(0,0,0,0.03)]"
                >
                  <div className="relative h-[300px] overflow-hidden rounded-[7px] bg-lp-gray-50 tablet:h-[360px] desktop:h-[330px]">
                    <Image
                      src={card.image}
                      alt=""
                      fill
                      sizes={card.wide ? '(min-width: 1200px) 720px, calc(100vw - 70px)' : '(min-width: 1200px) 500px, calc(100vw - 70px)'}
                      className="object-contain"
                    />
                  </div>
                  <div className="mt-2.5 flex flex-col gap-[15px] px-[5px] py-2.5">
                    <h3 className={cn('text-black', TYPE.title)}>{card.title}</h3>
                    <p className={cn('max-w-[280px] text-lp-gray-600', TYPE.body)}>{card.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
