import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { fetchSitemapEntries } from '@/lib/public-api';
import { LEGAL_LINKS } from '@/components/marketing/landing/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const blogUpdated = posts.reduce((latest, post) => (post.updated > latest ? post.updated : latest), '');
  const { careers, jobs } = await fetchSitemapEntries();

  return [
    { url: publicConfig.appUrl, changeFrequency: 'monthly', priority: 1 },
    {
      url: `${publicConfig.appUrl}/blog`,
      changeFrequency: 'weekly',
      priority: 0.8,
      lastModified: blogUpdated ? new Date(blogUpdated) : undefined,
    },
    { url: `${publicConfig.appUrl}/pricing`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${publicConfig.appUrl}/about`, changeFrequency: 'yearly', priority: 0.5 },
    ...LEGAL_LINKS.map((link) => ({
      url: `${publicConfig.appUrl}${link.href}`,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
    ...posts.map((post) => ({
      url: `${publicConfig.appUrl}/blog/${post.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      lastModified: post.updated ? new Date(post.updated) : undefined,
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
