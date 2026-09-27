import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from './site-header';
import { Reveal } from './landing/motion';
import { TYPE } from './landing/primitives';
import { CONTACT_EMAIL, FOOTER } from './landing/content';
import { publicConfig } from '@/lib/config';

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-sm text-black outline-none hover:text-lp-blue-600 focus-visible:ring-2 focus-visible:ring-lp-blue-400',
        TYPE.pill,
      )}
    >
      {children}
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
 * Footer, converted from the Framer design: a blue panel inset 10px, logo and
 * tagline on the left, a two-column link list on the right, and a giant
 * wordmark fitted to the full width underneath.
 */
export function SiteFooter() {
  return (
    <footer className="p-2.5">
      <div className="rounded-[15px] bg-lp-blue-100 desktop:px-2.5">
        <Reveal className="flex flex-col gap-[100px] px-5 py-[30px] tablet:px-10 tablet:py-[50px] desktop:gap-[130px] desktop:px-[60px]">
          <div className="flex flex-col gap-[60px] tablet:gap-[50px]">
            <div className="flex flex-col gap-[60px] tablet:flex-row tablet:justify-between tablet:gap-0">
              <div className="flex flex-col items-start gap-2.5">
                <Logo />
                <p className={cn('text-pretty text-lp-gray-800 tablet:max-w-[240px]', TYPE.body)}>{FOOTER.tagline}</p>
              </div>

              <div className="flex flex-col gap-10 tablet:flex-row tablet:gap-[50px]">
                <nav aria-label="Footer" className="flex w-[250px] shrink-0 flex-col gap-5">
                  <p className={cn('text-lp-gray-600', TYPE.label)}>Links</p>
                  <ul className="grid grid-cols-[100px_100px] gap-x-[50px] gap-y-2.5">
                    {/* flex keeps each row at the link's own 18px line, not the body's 24px. */}
                    {FOOTER.links.map((l) => (
                      <li key={l.label} className="flex">
                        <FooterLink href={l.href}>{l.label}</FooterLink>
                      </li>
                    ))}
                  </ul>
                </nav>

                <nav aria-label="Legal" className="flex shrink-0 flex-col gap-5">
                  <p className={cn('text-lp-gray-600', TYPE.label)}>Legal</p>
                  <ul className="flex flex-col gap-2.5">
                    {FOOTER.legal.map((l) => (
                      <li key={l.href} className="flex">
                        <FooterLink href={l.href}>{l.label}</FooterLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
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
