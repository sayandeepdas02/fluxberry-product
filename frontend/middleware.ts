import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/blog(.*)',
  '/pricing',
  '/about',
  // Legal pages, linked from the footer and the auth pages.
  '/privacy',
  '/terms',
  '/cookies',
  '/refund-policy',
  // Marketing pages in the nav's Resources menu (shown as "Coming soon" until each page exists).
  '/careers',
  '/comparisons(.*)',
  '/knowledge-base(.*)',
  '/integrations(.*)',
  '/apply/(.*)',
  '/(.*)/careers(.*)',
  '/r/(.*)',
  '/offer/(.*)',
  '/accept-invite/(.*)',
  '/api/v1/webhooks/(.*)',
  '/api/v1/public/(.*)',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/.well-known/(.*)',
  // Next's dynamic icon/manifest routes serve extensionless URLs (no literal
  // ".png" in the path), so the matcher's static-file exclusion below doesn't
  // skip them — without this they'd get Clerk's auth handshake instead of
  // rendering for anonymous visitors (crawlers, social-share scrapers, browsers).
  '/icon',
  '/apple-icon',
  '/opengraph-image',
  '/manifest.webmanifest',
  '/manifest-icon-192.png',
  '/manifest-icon-512.png',
]);

const authMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

/**
 * Pages and files that search engines and link previews must reach. Nothing on them
 * reads the session on the server (the header's signed-in state is client-side), so
 * they skip Clerk's middleware entirely.
 *
 * Why this matters: on a Clerk *development* instance (a `pk_test_` key), the middleware
 * answers every HTML request that lacks the `__clerk_db_jwt` cookie with a 307 to
 * `<instance>.clerk.accounts.dev`, which bounces back with a one-time token. A crawler
 * keeps no cookies, so it never gets past it: Googlebot followed the loop 50 times and saw
 * a redirect instead of the page. The pages that need a session (the dashboard, sign-in)
 * keep the middleware; once production runs a `pk_live_` instance the handshake no longer
 * fires for these routes either way.
 */
const isSearchableRoute = createRouteMatcher([
  '/',
  '/blog(.*)',
  '/pricing',
  '/about',
  '/privacy',
  '/terms',
  '/cookies',
  '/refund-policy',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/.well-known/(.*)',
  '/icon(.*)',
  '/apple-icon(.*)',
  '/opengraph-image(.*)',
  '/manifest.webmanifest',
]);

/** Crawlers, link-preview scrapers and Google's inspection tools. "bot" covers Googlebot, bingbot, Twitterbot, LinkedInBot, Slackbot, GPTBot, ClaudeBot and the like. */
const CRAWLER_USER_AGENT =
  /bot|crawl|spider|slurp|facebookexternalhit|embedly|whatsapp|pinterest|skypeuripreview|google-inspectiontool|lighthouse|duckduckgo|yandex|baidu/i;

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const crawler = CRAWLER_USER_AGENT.test(req.headers.get('user-agent') ?? '');
  // Crawlers also skip it on the other public pages (careers, job applications, sign-in),
  // so a shared job link previews and Google gets the noindex tag on the auth pages.
  if (isSearchableRoute(req) || (crawler && isPublicRoute(req))) {
    return NextResponse.next();
  }
  return authMiddleware(req, event);
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
