/** Public (browser-safe) configuration derived from NEXT_PUBLIC_* env vars. */
export const publicConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Fluxberry',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  allowTestTokens: (process.env.NEXT_PUBLIC_AUTH_ALLOW_TEST_TOKENS ?? 'true') === 'true',
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  hasClerk: Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
};

/** Whether real Supabase auth is configured; otherwise the dev test-token path is used. */
export const hasSupabase = Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);
