import { cn } from '@/lib/utils';
import { Reveal } from './motion';
import { Pill, SectionHeader, TYPE } from './primitives';
import { PRODUCT } from './content';
import { ProductCover } from './product';

/**
 * "Product": the six things Fluxberry is made of, two cards per row. Each card has the blog's
 * cover treatment (painted sky, cover line, a live scene), bigger than the old icon tiles, with
 * the title and description under it. The section's id is the nav's "Product" anchor (/#product).
 */
export function ProductSection() {
  return (
    <section id="product" className="scroll-mt-5 bg-white px-5 py-[70px] tablet:scroll-mt-0 tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
      <div className="mx-auto flex max-w-[1300px] flex-col items-center">
        <Reveal className="w-full">
          <SectionHeader
            pill={PRODUCT.pill}
            title={PRODUCT.title}
            lead={PRODUCT.lead}
            titleClassName="max-w-[350px] tablet:max-w-[600px] desktop:max-w-[560px]"
            leadClassName="max-w-[340px] tablet:max-w-[520px] desktop:max-w-[560px]"
          />
        </Reveal>

        <div className="mt-[60px] grid w-full gap-5 desktop:grid-cols-2">
          {PRODUCT.cards.map((card) => (
            <Reveal
              key={card.title}
              className="group flex flex-col rounded-[15px] bg-white p-[15px] shadow-[2px_2px_10px_rgba(0,0,0,0.03)]"
            >
              <ProductCover kind={card.visual} className="aspect-[16/10] w-full rounded-[7px]" />
              <div className="mt-2.5 flex flex-1 flex-col gap-[15px] px-[5px] py-2.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
                  <h3 className={cn('text-black', TYPE.title)}>{card.title}</h3>
                  {card.plan && <Pill className="px-2.5 py-[3px]">{card.plan} plan</Pill>}
                </div>
                <p className={cn('text-pretty text-lp-gray-600', TYPE.body)}>{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
