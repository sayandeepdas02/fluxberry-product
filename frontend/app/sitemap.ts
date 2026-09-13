import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

// Dynamic per-workspace careers/job URLs need a public "list published
// workspaces/jobs" endpoint that doesn't exist yet — ship the root URL now
// rather than block this on new backend work.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: publicConfig.appUrl, changeFrequency: 'monthly', priority: 1 }];
}
