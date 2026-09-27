import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { SignIn } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { publicConfig } from '@/lib/config';
import { Logo } from './site-header';
import { landingFonts } from './landing/fonts';
import { PeopleIcon } from './landing/hero';
import { GRADIENT, Pill, TYPE } from './landing/primitives';
import { HERO } from './landing/content';

/**
 * Frame for the auth pages (Clerk's sign-in and sign-up, and invite
 * acceptance) in the landing page's language: the form on white with the
 * landing fonts and, on desktop, a blue panel beside it that repeats the hero
 * (badge, headline, product shot) in the footer's tint.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(landingFonts, 'flex min-h-screen bg-white p-2.5 text-black')}>
      <div className="flex min-w-0 flex-1 flex-col px-2.5 py-3 tablet:px-[30px] tablet:py-5">
        <header className="flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-sm text-lp-gray-600 outline-none transition-colors hover:text-black',
              'focus-visible:ring-2 focus-visible:ring-lp-blue-400',
              TYPE.nav,
            )}
          >
            <ArrowLeft aria-hidden className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Back to site
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>

        <footer className="flex items-center justify-between font-inter text-[14px] leading-5 text-lp-gray-500">
          <span>
            © {new Date().getFullYear()} {publicConfig.appName}
          </span>
          <Link
            href="/blog"
            className="rounded-sm outline-none transition-colors hover:text-black focus-visible:ring-2 focus-visible:ring-lp-blue-400"
          >
            Blog
          </Link>
        </footer>
      </div>

      <aside className="relative hidden w-[46%] max-w-[760px] shrink-0 flex-col overflow-hidden rounded-[15px] bg-lp-blue-100 desktop:flex">
        <div className="flex flex-col items-start gap-5 px-[60px] pt-[70px]">
          <Pill className="bg-white">
            <PeopleIcon />
            {HERO.badge}
          </Pill>
          <p className={cn('max-w-[520px] text-black', TYPE.h2)}>{HERO.title}</p>
          <p className={cn('text-pretty text-lp-gray-700', TYPE.body)}>{HERO.lead.join(' ')}</p>
        </div>
        {/* The hero's product shot in its tinted frame, bleeding off the panel's corner. */}
        <div className="relative -mb-[100px] mt-auto pl-[60px] pt-[50px]">
          <div className="w-[880px] rounded-[18px] bg-lp-blue-50 p-[9px]">
            <Image
              src={HERO.image.src}
              alt=""
              width={HERO.image.width}
              height={HERO.image.height}
              sizes="880px"
              className="h-auto w-full rounded-[12px]"
            />
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Title and subtitle for auth pages that don't use Clerk's own header (invite acceptance). */
export function AuthHeading({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <>
      <h1 className="font-manrope text-lp-h2-p text-black">{title}</h1>
      <p className={cn('mt-2.5 text-lp-gray-700', TYPE.body)}>{subtitle}</p>
    </>
  );
}

/** The pricing cards' full-width gradient button, for the invite page's actions. */
export const authButtonClass = cn(
  'h-[47px] w-full rounded-[15px] border-0 font-manrope text-lp-button font-semibold text-white shadow-none transition-opacity hover:opacity-90',
  GRADIENT,
);

/** The grey counterpart (the Pro card's button), for a secondary action beside it. */
export const authSecondaryButtonClass =
  'h-[47px] w-full rounded-[15px] border-0 bg-[linear-gradient(180deg,#f6f6f6_0%,#eeeeee_100%)] font-manrope text-lp-button font-semibold text-black shadow-none transition-opacity hover:opacity-90';

/**
 * Clerk's sign-in and sign-up forms themed through Clerk's own appearance
 * options (Clerk still runs every flow): Manrope, the landing's blue and
 * greys, the pricing cards' radius and soft shadow, and the gradient button.
 * Clerk's styles out-rank plain utilities, hence the `!` on element classes.
 */
export const clerkAppearance = {
  layout: { logoPlacement: 'none', socialButtonsVariant: 'blockButton' },
  variables: {
    colorPrimary: '#0d6eff',
    colorPrimaryForeground: '#ffffff',
    colorForeground: '#000000',
    colorMutedForeground: '#666666',
    colorBackground: '#ffffff',
    colorInput: '#ffffff',
    colorInputForeground: '#000000',
    colorBorder: '#dbdbdb',
    colorRing: '#3787ff',
    fontFamily: 'var(--font-manrope), ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons: 'var(--font-manrope), ui-sans-serif, system-ui, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: '!w-full !max-w-none !rounded-[27px] !border-0 !shadow-[2px_2px_10px_rgba(0,0,0,0.04)]',
    headerTitle: '!font-manrope !text-[24px] !font-semibold !tracking-[-0.028em] !text-black',
    headerSubtitle: '!font-inter !text-[15px] !text-lp-gray-700',
    formButtonPrimary: cn(
      '!border-0 !bg-[linear-gradient(180deg,#3787ff_0%,#0d6eff_100%)] !text-[13px] !font-semibold !normal-case !shadow-none',
      'transition-opacity hover:!opacity-90',
    ),
    footerActionLink: '!font-semibold !text-lp-blue-500 hover:!text-lp-blue-600',
  },
} satisfies React.ComponentProps<typeof SignIn>['appearance'];
