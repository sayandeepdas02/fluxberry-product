import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/sign-in', '/sign-up', '/onboarding'],
    },
    sitemap: `${publicConfig.appUrl}/sitemap.xml`,
  };
}
