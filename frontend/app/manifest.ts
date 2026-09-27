import type { MetadataRoute } from 'next';
import { publicConfig } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: publicConfig.appName,
    short_name: 'Fluxberry',
    description:
      'Fluxberry AI is the AI-native hiring platform for small teams — screen, interview, and hire faster without the bloat of a legacy ATS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0e2f7e',
    icons: [
      { src: '/logo-mark-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo-mark.png', sizes: '512x512', type: 'image/png' },
      // Full-bleed with the F centred, so the same file works as the maskable (adaptive) icon.
      { src: '/logo-mark.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
