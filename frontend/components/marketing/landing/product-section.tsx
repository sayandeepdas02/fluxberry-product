import { cn } from '@/lib/utils';
import { Reveal } from './motion';
import { GradientButton, IconTile, SectionHeader, TYPE } from './primitives';
import { PRODUCT } from './content';

/** "Product" (Framer: Why Us) — six icon cards, 3 × 2 on desktop. */
export function ProductSection() {
  return (
    <section id="why-us" className="scroll-mt-5 bg-white px-5 py-[70px] tablet:scroll-mt-0 tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
      <div className="mx-auto flex max-w-[1300px] flex-col items-center">
        <Reveal className="w-full">
          <SectionHeader
            pill={PRODUCT.pill}
            title={PRODUCT.title}
            lead={PRODUCT.lead}
            titleClassName="max-w-[350px] tablet:max-w-[600px] desktop:max-w-[500px]"
            leadClassName="max-w-[340px] tablet:max-w-[360px] desktop:max-w-[460px]"
          />
        </Reveal>

        <div className="mt-[60px] grid w-full gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
          {PRODUCT.cards.map(({ icon: Icon, title, body }) => (
            <Reveal
              key={title}
              className="flex flex-col rounded-[15px] bg-white px-5 pb-[26px] pt-5 shadow-[2px_2px_10px_rgba(0,0,0,0.03)]"
            >
              <IconTile>
                <Icon className="size-6" strokeWidth={2} />
              </IconTile>
              {/* Framer gives the text block a 100px floor, which only bites on phone. */}
              <div className="mt-[54px] flex min-h-[100px] flex-col gap-[13px]">
                <h3 className={cn('text-black', TYPE.title)}>{title}</h3>
                <p className={cn('max-w-[300px] text-lp-gray-600', TYPE.body)}>{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <GradientButton href="/sign-up" className="mt-[50px]">
          Get Started
        </GradientButton>
      </div>
    </section>
  );
}
