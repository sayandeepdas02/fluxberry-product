import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { fetchSitemapEntries } from '@/lib/public-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const { careers, jobs } = await fetchSitemapEntries();

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
    ...careers.map((page) => ({
      url: `${publicConfig.appUrl}/${page.slug}/careers`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      lastModified: new Date(page.updatedAt),
    })),
    ...jobs.map((job) => ({
      url: `${publicConfig.appUrl}/apply/${job.workspaceSlug}/${job.jobSlug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      lastModified: new Date(job.updatedAt),
    })),
  ];
}
