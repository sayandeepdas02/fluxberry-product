import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

/**
 * Shell for the public marketing pages. Light-only by design — these pages use
 * the flat `ink`/`berry` scales rather than the dashboard's themed tokens.
 *
 * `overflow-x-clip` on <main> contains the full-bleed dividers, which are 100vw
 * wide and would otherwise add a horizontal scrollbar. It sits on <main> and not
 * on the wrapper so the sticky header keeps working.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-mk-body text-foreground">
      <SiteHeader />
      <main className="flex-1 overflow-x-clip">{children}</main>
      <SiteFooter />
    </div>
  );
}
