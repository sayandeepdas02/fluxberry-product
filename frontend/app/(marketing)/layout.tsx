import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { MotionProvider } from '@/components/marketing/landing/motion-provider';
import { landingFonts } from '@/components/marketing/landing/fonts';
import { BRAND } from '@/components/marketing/landing/content';

/** Marketing pages are titled with the brand ("Blog · Fluxberry"); the app's own pages keep the configured name. */
export const metadata: Metadata = {
  applicationName: BRAND,
  title: { template: `%s · ${BRAND}`, default: `${BRAND} - AI Native Hiring Platform` },
};

/**
 * Shell for the public marketing pages. Light-only by design.
 *
 * The header is a fixed floating pill, so it takes no space in the flow: each
 * page's first section clears it with its own top padding (landing hero and
 * blog headers alike). `overflow-x-clip` on <main> contains anything full-bleed.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(landingFonts, 'flex min-h-screen flex-col bg-white text-mk-body text-foreground')}>
      <MotionProvider>
        <SiteHeader />
        <main className="flex-1 overflow-x-clip">{children}</main>
        <SiteFooter />
      </MotionProvider>
    </div>
  );
}
