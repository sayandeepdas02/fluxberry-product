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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @fluxberry/shared ships compiled CommonJS in dist/. Keep webpack from following the
  // workspace symlink to its real path (outside node_modules), which would otherwise
  // apply the React-Refresh loader and inject import.meta into a CJS module.
  eslint: { ignoreDuringBuilds: true },
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
