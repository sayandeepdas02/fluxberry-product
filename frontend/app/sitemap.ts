import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';
import { getAllPosts } from '@/lib/blog';
import { fetchSitemapEntries } from '@/lib/public-api';
import { LEGAL_LINKS } from '@/components/marketing/landing/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();
  const blogUpdated = posts.reduce((latest, post) => (post.updated > latest ? post.updated : latest), '');
  const { careers, jobs } = await fetchSitemapEntries();

  // No priority or changefreq: Google ignores both. lastModified is set only where a real date exists.
  return [
    { url: publicConfig.appUrl },
    {
      url: `${publicConfig.appUrl}/blog`,
      lastModified: blogUpdated ? new Date(blogUpdated) : undefined,
    },
    { url: `${publicConfig.appUrl}/pricing` },
    { url: `${publicConfig.appUrl}/about` },
    ...LEGAL_LINKS.map((link) => ({ url: `${publicConfig.appUrl}${link.href}` })),
    ...posts.map((post) => ({
      url: `${publicConfig.appUrl}/blog/${post.slug}`,
      lastModified: post.updated ? new Date(post.updated) : undefined,
    })),
    ...careers.map((page) => ({
      url: `${publicConfig.appUrl}/${page.slug}/careers`,
      lastModified: new Date(page.updatedAt),
    })),
    ...jobs.map((job) => ({
      url: `${publicConfig.appUrl}/apply/${job.workspaceSlug}/${job.jobSlug}`,
      lastModified: new Date(job.updatedAt),
    })),
  ];
}
