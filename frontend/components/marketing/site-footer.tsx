import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ComingSoon, Logo } from './site-header';
import { SummarizeWithAI } from './summarize-with-ai';
import { Reveal } from './landing/motion';
import { TYPE } from './landing/primitives';
import { CONTACT_EMAIL, FOOTER, type FooterItem } from './landing/content';
import { publicConfig } from '@/lib/config';

function FooterEntry({ item }: { item: FooterItem }) {
  if (item.comingSoon) {
    return (
      <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-lp-gray-500', TYPE.pill)}>
        {item.label}
        <ComingSoon label="Soon" />
      </span>
    );
  }
  const className = cn(
    'rounded-sm text-black outline-none hover:text-lp-blue-600 focus-visible:ring-2 focus-visible:ring-lp-blue-400',
    TYPE.pill,
  );
  if (/^https?:\/\//.test(item.href)) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {item.label}
      </a>
    );
  }
  return item.href.startsWith('mailto:') ? (
    <a href={item.href} className={className}>
      {item.label}
    </a>
  ) : (
    <Link href={item.href} className={className}>
      {item.label}
    </Link>
  );
}

/**
 * Width of the wordmark's box in em: "Fluxberry" set in Manrope 600 at
 * −0.04em measures 4.0937em in the browser, and Framer's fitted text box adds
 * 0.0409em to the word (its trailing tracking) and centres the word in it.
 * The font size is the container width divided by this, so the word spans the
 * full content width at every size. Re-measure if the word or its style changes.
 */
const WORDMARK_EM_WIDTH = 4.1345;

/**
 * Footer, converted from the Framer design: a blue panel inset 10px, then the
 * brand and a four-column link directory (Product, Resources, Company, Legal),
 * the copyright line, and a giant wordmark fitted to the full width underneath.
 */
export function SiteFooter() {
  return (
    <footer className="p-2.5">
      <div className="rounded-[15px] bg-lp-blue-100 desktop:px-2.5">
        <Reveal className="flex flex-col gap-[100px] px-5 py-[30px] tablet:px-10 tablet:py-[50px] desktop:gap-[130px] desktop:px-[60px]">
          <div className="flex flex-col gap-[60px] tablet:gap-[50px]">
            {/* The brand row (with the ask-an-AI buttons on its right from desktop), then the four link columns. */}
            <div className="grid grid-cols-2 gap-x-5 gap-y-[50px] tablet:grid-cols-4">
              <div className="col-span-full flex flex-col gap-[30px] desktop:flex-row desktop:items-start desktop:justify-between desktop:gap-10">
                <div className="flex flex-col items-start gap-2.5">
                  <Logo />
                  <p className={cn('text-pretty text-lp-gray-800', TYPE.body)}>{FOOTER.tagline}</p>
                </div>
                <SummarizeWithAI />
              </div>

              {FOOTER.columns.map((column) => (
                <nav key={column.title} aria-label={column.title} className="flex flex-col gap-5">
                  <p className={cn('text-lp-gray-600', TYPE.label)}>{column.title}</p>
                  {/* flex keeps each row at the link's own 18px line, not the body's 24px. */}
                  <ul className="flex flex-col gap-2.5">
                    {column.links.map((item) => (
                      <li key={item.label} className="flex">
                        <FooterEntry item={item} />
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            <div
              className={cn(
                'flex flex-col gap-2.5 border-t border-black/10 pt-5 text-lp-gray-700 tablet:flex-row tablet:justify-between',
                TYPE.pill,
              )}
            >
              <p>
                © {new Date().getFullYear()} {publicConfig.appName}. All rights reserved.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="self-start rounded-sm outline-none hover:text-lp-blue-600 focus-visible:ring-2 focus-visible:ring-lp-blue-400"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>

          <div className="[container-type:inline-size]" aria-hidden>
            <p
              className="whitespace-nowrap pb-[0.1427em] text-center font-manrope font-semibold leading-[0.9] tracking-[-0.04em] text-lp-blue-600"
              style={{ fontSize: `calc(100cqw / ${WORDMARK_EM_WIDTH})` }}
            >
              Fluxberry
            </p>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
