import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/login', '/signup', '/forgot-password', '/onboarding', '/interview', '/assessment'],
    },
    sitemap: `${publicConfig.appUrl}/sitemap.xml`,
  };
}
