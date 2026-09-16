import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';

// Dynamic per-workspace careers/job URLs need a public "list published
// workspaces/jobs" endpoint that doesn't exist yet — ship the marketing URLs now
// rather than block this on new backend work.
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  return [
    { url: publicConfig.appUrl, changeFrequency: 'monthly', priority: 1 },
    {
      url: `${publicConfig.appUrl}/blog`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: posts[0]?.date ? new Date(posts[0].date) : undefined,
    },
    ...posts.map((post) => ({
      url: `${publicConfig.appUrl}/blog/${post.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      lastModified: post.date ? new Date(post.date) : undefined,
    })),
  ];
}
