import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended'];

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/app', '/onboarding'];
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /sign-in and /sign-up carry an explicit noindex meta tag instead of a
        // crawl disallow — Google needs to crawl a URL to see its noindex tag, and
        // disallow+noindex together can leave a linked URL indexed with no snippet.
        disallow,
      },
      // AI search and answer engines are welcome on purpose: being cited is how buyers find us.
      // A crawler with its own group ignores the `*` group, so each repeats the disallow list.
      { userAgent: AI_CRAWLERS, allow: '/', disallow },
    ],
    sitemap: `${publicConfig.appUrl}/sitemap.xml`,
  };
}
