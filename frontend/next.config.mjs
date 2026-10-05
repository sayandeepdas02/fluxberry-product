import { withSentryConfig } from '@sentry/nextjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the monorepo root .env so a single env file drives web + api (NEXT_PUBLIC_* only need to exist in process.env before Next inlines them).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) {
  for (const line of fs.readFileSync(rootEnv, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

/** Files lib/og-image.tsx reads at runtime. */
const OG_ASSETS = ['./assets/og-fonts/*.woff', './public/og/sky.jpg', './public/logo-mark.png'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @fluxberry/shared ships compiled CommonJS in dist/. Keep webpack from following the
  // workspace symlink to its real path (outside node_modules), which would otherwise
  // apply the React-Refresh loader and inject import.meta into a CJS module.
  eslint: { ignoreDuringBuilds: true },
  // The share images rendered per request (careers pages, job apply pages) read their
  // fonts and artwork from disk (lib/og-image.tsx). File tracing can't follow those
  // computed paths, so without this they're missing from the serverless function and the
  // image 500s. The static share images are rendered at build time and don't need it.
  outputFileTracingIncludes: {
    // The sitemap is rendered per request (it fetches careers pages and jobs), and reads the
    // blog's markdown from disk. Without this the files aren't in the function and it lists no posts.
    '/sitemap.xml': ['./content/blog/**/*'],
    '/[careersSlug]/careers/opengraph-image': OG_ASSETS,
    '/apply/[workspaceSlug]/[jobSlug]/opengraph-image': OG_ASSETS,
  },
  // fluxberry.in (apex) is canonical — both hosts resolve at the DNS/CORS layer today,
  // which risks duplicate-content indexing. Redirect www to apex at the app level so it
  // works regardless of hosting provider.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.fluxberry.in' }],
        destination: 'https://fluxberry.in/:path*',
        permanent: true,
      },
      // Billing moved onto the pricing page. Keeps old links, bookmarks and in-flight
      // checkout returns working (the query string, e.g. ?checkout=success, carries over).
      { source: '/app/settings/billing', destination: '/app/pricing', permanent: false },
    ];
  },
  webpack: (config, { dev }) => {
    // Dev only: keep webpack from following the workspace symlink so React-Refresh
    // isn't applied to @fluxberry/shared's CJS dist. In prod there's no Refresh, and
    // symlinks:false would break server vendor-chunk resolution.
    if (dev) config.resolve.symlinks = false;
    return config;
  },
};

const finalConfig = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;

export default finalConfig;
