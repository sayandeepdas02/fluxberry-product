import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Start the app first (`npm run dev` from the repo root), then run
 * `npm run test:e2e`. Uses the dev test-token auth path (no Supabase needed).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
