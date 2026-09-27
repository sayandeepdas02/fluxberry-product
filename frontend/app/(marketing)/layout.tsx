import { Inter, Manrope } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { MotionProvider } from '@/components/marketing/landing/motion-provider';

/*
 * The landing design (converted from Framer) sets headings and UI in Manrope
 * and body copy in Inter. They're scoped to the marketing pages; the dashboard
 * keeps Geist.
 */
const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-manrope', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400'], variable: '--font-inter', display: 'swap' });

/**
 * Shell for the public marketing pages. Light-only by design.
 *
 * The header is a fixed floating pill, so it takes no space in the flow: the
 * landing hero clears it with its own top padding, and /blog adds an offset in
 * its layout. `overflow-x-clip` on <main> contains anything full-bleed.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(manrope.variable, inter.variable, 'flex min-h-screen flex-col bg-white text-mk-body text-foreground')}>
      <MotionProvider>
        <SiteHeader />
        <main className="flex-1 overflow-x-clip">{children}</main>
        <SiteFooter />
      </MotionProvider>
    </div>
  );
}
