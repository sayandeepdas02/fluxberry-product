import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { publicConfig } from '@/lib/config';
import { jsonLdScript, publicPageMetadata } from '@/lib/seo';
import { BRAND } from '@/components/marketing/landing/content';
import { Appear, Reveal } from '@/components/marketing/landing/motion';
import { GridBackdrop, IconTile, SectionHeader, TYPE } from '@/components/marketing/landing/primitives';
import { COMPETITORS, comparePath } from '@/components/marketing/compare/data';
import { fill } from '@/components/marketing/compare/fill';
import { CompareCta } from '@/components/marketing/compare/compare-cta';

export const metadata: Metadata = publicPageMetadata({
  title: 'Zliptal compared with other ATS and recruiting tools',
  description:
    'See how Zliptal compares with Greenhouse, Ashby, Lever, Workable, Gem and other applicant tracking, sourcing and recruiting tools on price, AI scoring and setup.',
  path: '/comparisons',
  siteName: BRAND,
});

const jsonLd = {
  '@type': 'ItemList',
  name: 'Zliptal comparisons',
  itemListElement: COMPETITORS.map((c, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: `Zliptal vs ${c.name}`,
    url: `${publicConfig.appUrl}${comparePath(c.slug)}`,
  })),
};

/** Hub of every comparison page. */
export default function ComparisonsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
      <section className="relative px-5 pb-[70px] pt-[140px] tablet:px-[50px] tablet:pb-[100px] tablet:pt-[200px] desktop:px-[70px]">
        <GridBackdrop />
        <Appear className="relative mx-auto max-w-[1300px]">
          <SectionHeader
            pill="Comparisons"
            title="See how Zliptal compares"
            lead="Zliptal is the cheaper, simpler way for small, fast-hiring teams to track applicants, score them with AI and source talent. Pick a tool to see the differences."
            titleAs="h1"
            titleClassName="max-w-none text-balance"
            leadClassName="max-w-[620px] text-balance"
          />
        </Appear>
      </section>

      <section className="bg-lp-gray-50 px-5 py-[70px] tablet:px-[50px] tablet:py-[100px] desktop:px-[70px]">
        <div className="mx-auto grid max-w-[1300px] gap-5 tablet:grid-cols-2 desktop:grid-cols-3">
          {COMPETITORS.map((c) => (
            <Reveal key={c.slug} className="flex">
              <Link
                href={comparePath(c.slug)}
                className={cn(
                  'group flex w-full flex-col gap-[15px] rounded-[15px] bg-white p-[25px] shadow-[2px_2px_10px_rgba(0,0,0,0.03)] outline-none',
                  'transition-shadow duration-300 hover:shadow-[2px_6px_20px_rgba(0,0,0,0.07)] focus-visible:ring-2 focus-visible:ring-lp-blue-400',
                )}
              >
                <div className="flex items-center justify-between">
                  <IconTile>
                    <span className={cn('font-manrope text-[16px] font-semibold leading-none')}>{c.name[0]}</span>
                  </IconTile>
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 text-lp-gray-400 transition-colors group-hover:text-lp-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-2.5">
                  <h2 className={cn('text-black', TYPE.title)}>{`Zliptal vs ${c.name}`}</h2>
                  <p className={cn('text-lp-gray-500', TYPE.pill)}>{c.category}</p>
                  <p className={cn('text-pretty text-lp-gray-600', TYPE.body)}>{fill(c.blurb)}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <CompareCta name="your current tool" />
    </>
  );
}
