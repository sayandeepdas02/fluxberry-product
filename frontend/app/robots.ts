import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /sign-in and /sign-up carry an explicit noindex meta tag instead of a
      // crawl disallow — Google needs to crawl a URL to see its noindex tag, and
      // disallow+noindex together can leave a linked URL indexed with no snippet.
      disallow: ['/app', '/onboarding'],
    },
    sitemap: `${publicConfig.appUrl}/sitemap.xml`,
  };
}
