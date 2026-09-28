import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: publicConfig.appName,
    short_name: 'Fluxberry',
    description:
      'Fluxberry is the AI native hiring platform for founders and hiring managers. Screen applicants with AI, run your pipeline and careers page, and hire faster without the bloat of a legacy ATS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2d81ff',
    icons: [
      { src: '/logo-mark-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo-mark.png', sizes: '512x512', type: 'image/png' },
      // Full-bleed with the F centred, so the same file works as the maskable (adaptive) icon.
      { src: '/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
