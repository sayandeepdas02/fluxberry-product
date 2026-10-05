import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

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

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
