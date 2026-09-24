import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { DEFAULT_FEATURE_FLAGS } from '../shared';
import type { FeatureFlagState } from '../shared';

/**
 * Loads .env from the repo root (and backend/.env if present), then validates.
 * Nothing else in the codebase should read process.env directly (spec §88).
 */
function loadDotenv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(__dirname, '..', '..', '..', '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: false });
  }
}
loadDotenv();

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === '' ? def : v === 'true' || v === '1'));

const envSchema = z.object({
  APP_NAME: z.string().default('Fluxberry AI'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  /** Absolute public base URL of THIS API (used to build mock download links). */
  PUBLIC_API_URL: z.string().optional().default(''),
  /** Public base URL of the web app (for building candidate-facing links in emails). */
  PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/fluxberry'),

  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_JWT_SECRET: z.string().optional().default(''),
  AUTH_ALLOW_TEST_TOKENS: bool(true),
  AUTH_TEST_TOKEN_SECRET: z.string().default('dev-only-insecure-test-secret'),
  /**
   * Local/dev-only escape hatch that restores the old fixed-dev-user, no-RBAC
   * behavior. Never a supported production mode — must be false in production.
   */
  AUTH_BYPASS_ENABLED: bool(false),

  MOCK_EXTERNAL_SERVICES: bool(false),

  AI_PROVIDER: z.enum(['anthropic', 'openai', 'mock']).default('anthropic'),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().optional().default(''),

  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Fluxberry <noreply@example.com>'),
  /**
   * Domain used for the Reply-To convention on ad-hoc candidate messages
   * (application+<id>@this-domain). Inbound parsing itself is provider-agnostic
   * — see message.service.ts's receiveInbound — configure whichever inbound
   * email vendor you choose to POST at the /webhooks/inbound-email/:secret route.
   */
  INBOUND_EMAIL_DOMAIN: z.string().optional().default(''),
  INBOUND_EMAIL_SECRET: z.string().optional().default(''),

  DODO_API_KEY: z.string().optional().default(''),
  DODO_WEBHOOK_SECRET: z.string().optional().default(''),
  /** Which Dodo host to hit: `test_mode` -> test.dodopayments.com, `live_mode` -> live.dodopayments.com. */
  DODO_ENVIRONMENT: z.enum(['test_mode', 'live_mode']).default('test_mode'),
  /** Dodo product/price id billed for the PRO plan, monthly cycle ($40/mo). */
  DODO_PRO_PRODUCT_ID: z.string().optional().default(''),
  /** Dodo product/price id billed for the PRO plan, annual cycle ($200/yr). */
  DODO_PRO_PRODUCT_ID_ANNUAL: z.string().optional().default(''),

  STORAGE_ENDPOINT: z.string().optional().default(''),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_BUCKET: z.string().default('fluxberry-uploads'),
  STORAGE_ACCESS_KEY: z.string().optional().default(''),
  STORAGE_SECRET_KEY: z.string().optional().default(''),
  STORAGE_PUBLIC_URL: z.string().optional().default(''),

  /**
   * Google Calendar OAuth (for the "Schedule interview" feature). Blank ->
   * a realistic mock calendar adapter activates: interviews are recorded
   * internally with a fake meet link, no real Google account is ever touched.
   */
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  /** Must exactly match an authorized redirect URI on the Google OAuth client. */
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().optional().default(''),

  /**
   * People Data Labs (Talent Sourcing). Blank -> a realistic mock provider
   * activates, so the whole sourcing flow (NL search -> ranked profiles ->
   * lists -> campaigns) works end to end with zero keys and zero PDL spend.
   * Set a real key to hit the live Person Search API (billed per record
   * returned). `PDL_MAX_RESULTS` hard-caps how many profiles a single search
   * can ever retrieve, as a spend guardrail.
   */
  PDL_API_KEY: z.string().optional().default(''),
  PDL_MAX_RESULTS: z.coerce.number().int().min(1).max(1000).default(200),

  REDIS_URL: z.string().optional().default(''),
  SENTRY_RELEASE: z.string().optional().default(''),
  SENTRY_ENVIRONMENT: z.string().optional().default(''),
  AUTH_PROVIDER: z.enum(['supabase', 'clerk']).default('supabase'),
  CLERK_SECRET_KEY: z.string().optional().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  CLERK_WEBHOOK_SECRET: z.string().optional().default(''),
  CLAMD_HOST: z.string().optional().default(''),
  CLAMD_PORT: z.coerce.number().int().default(3310),

  SENTRY_DSN: z.string().optional().default(''),
  POSTHOG_KEY: z.string().optional().default(''),
  POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),

  FEATURE_ADVANCED_ANALYTICS: bool(DEFAULT_FEATURE_FLAGS.ADVANCED_ANALYTICS),
  FEATURE_AV_SCANNING: bool(DEFAULT_FEATURE_FLAGS.AV_SCANNING),
  FEATURE_OUTBOUND_WEBHOOKS: bool(DEFAULT_FEATURE_FLAGS.OUTBOUND_WEBHOOKS),
  FEATURE_GDPR_TOOLS: bool(DEFAULT_FEATURE_FLAGS.GDPR_TOOLS),
  FEATURE_OFFER_MANAGEMENT: bool(DEFAULT_FEATURE_FLAGS.OFFER_MANAGEMENT),
  FEATURE_BULK_IMPORT: bool(DEFAULT_FEATURE_FLAGS.BULK_IMPORT),
  FEATURE_TALENT_SOURCING: bool(DEFAULT_FEATURE_FLAGS.TALENT_SOURCING),

  CAREERS_PREVIEW_SECRET: z.string().optional().default(''),

  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().default(1500),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().default(4),
}).refine(
  (env) => env.AUTH_PROVIDER !== 'clerk' || (env.CLERK_SECRET_KEY != null && env.CLERK_SECRET_KEY !== ''),
  { message: 'CLERK_SECRET_KEY is required when AUTH_PROVIDER=clerk', path: ['CLERK_SECRET_KEY'] },
);

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with a readable message (spec: validate config on startup).
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}
const e = parsed.data;

if (e.NODE_ENV === 'production' && !e.CAREERS_PREVIEW_SECRET) {
  // eslint-disable-next-line no-console
  console.error('CAREERS_PREVIEW_SECRET must be set in production');
  process.exit(1);
}

const features: FeatureFlagState = {
  ADVANCED_ANALYTICS: e.FEATURE_ADVANCED_ANALYTICS,
  AV_SCANNING: e.FEATURE_AV_SCANNING,
  OUTBOUND_WEBHOOKS: e.FEATURE_OUTBOUND_WEBHOOKS,
  GDPR_TOOLS: e.FEATURE_GDPR_TOOLS,
  OFFER_MANAGEMENT: e.FEATURE_OFFER_MANAGEMENT,
  BULK_IMPORT: e.FEATURE_BULK_IMPORT,
  TALENT_SOURCING: e.FEATURE_TALENT_SOURCING,
};

export const config = {
  appName: e.APP_NAME,
  nodeEnv: e.NODE_ENV,
  isProd: e.NODE_ENV === 'production',
  isDev: e.NODE_ENV === 'development',
  isTest: e.NODE_ENV === 'test',
  port: e.PORT,
  corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  publicApiUrl: e.PUBLIC_API_URL || `http://localhost:${e.PORT}`,
  /** The raw, operator-set `PUBLIC_API_URL` — empty when not configured, unlike `publicApiUrl` above which always falls back to localhost. */
  publicApiUrlExplicit: e.PUBLIC_API_URL,
  publicAppUrl: e.PUBLIC_APP_URL,

  mongoUri: e.MONGODB_URI,

  redis: { url: e.REDIS_URL || '' },

  auth: {
    supabaseUrl: e.SUPABASE_URL,
    supabaseJwtSecret: e.SUPABASE_JWT_SECRET,
    allowTestTokens: e.AUTH_ALLOW_TEST_TOKENS,
    testTokenSecret: e.AUTH_TEST_TOKEN_SECRET,
    bypassEnabled: e.AUTH_BYPASS_ENABLED,
    authProvider: e.AUTH_PROVIDER,
    clerkSecretKey: e.CLERK_SECRET_KEY,
    clerkPublishableKey: e.CLERK_PUBLISHABLE_KEY,
    clerkWebhookSecret: e.CLERK_WEBHOOK_SECRET,
  },

  providers: {
    mockAll: e.MOCK_EXTERNAL_SERVICES,
    ai: { provider: e.AI_PROVIDER, apiKey: e.AI_API_KEY, model: e.AI_MODEL },
    email: { resendApiKey: e.RESEND_API_KEY, from: e.EMAIL_FROM },
    messaging: { inboundDomain: e.INBOUND_EMAIL_DOMAIN, inboundSecret: e.INBOUND_EMAIL_SECRET },
    billing: {
      apiKey: e.DODO_API_KEY,
      webhookSecret: e.DODO_WEBHOOK_SECRET,
      environment: e.DODO_ENVIRONMENT,
      proProductId: e.DODO_PRO_PRODUCT_ID,
      proProductIdAnnual: e.DODO_PRO_PRODUCT_ID_ANNUAL,
    },
    storage: {
      endpoint: e.STORAGE_ENDPOINT,
      region: e.STORAGE_REGION,
      bucket: e.STORAGE_BUCKET,
      accessKey: e.STORAGE_ACCESS_KEY,
      secretKey: e.STORAGE_SECRET_KEY,
      publicUrl: e.STORAGE_PUBLIC_URL,
    },
    calendar: {
      clientId: e.GOOGLE_CLIENT_ID,
      clientSecret: e.GOOGLE_CLIENT_SECRET,
      redirectUri: e.GOOGLE_CALENDAR_REDIRECT_URI || `${e.PUBLIC_API_URL || `http://localhost:${e.PORT}`}/api/v1/integrations/google-calendar/callback`,
    },
    avScan: { host: e.CLAMD_HOST || '', port: e.CLAMD_PORT },
    sourcing: { apiKey: e.PDL_API_KEY, maxResults: e.PDL_MAX_RESULTS },
  },

  careersPreviewSecret: e.CAREERS_PREVIEW_SECRET || 'dev-preview-secret',

  observability: {
    sentryDsn: e.SENTRY_DSN,
    sentryRelease: e.SENTRY_RELEASE || undefined,
    sentryEnvironment: e.SENTRY_ENVIRONMENT || undefined,
    posthogKey: e.POSTHOG_KEY,
    posthogHost: e.POSTHOG_HOST,
  },

  features,

  worker: {
    pollIntervalMs: e.WORKER_POLL_INTERVAL_MS,
    maxAttempts: e.WORKER_MAX_ATTEMPTS,
  },
} as const;

export type AppConfig = typeof config;
