import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { DEFAULT_FEATURE_FLAGS } from '@fluxberry/shared';
import type { FeatureFlagState } from '@fluxberry/shared';

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
  APP_NAME: z.string().default('Fluxberry'),
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
  DODO_API_BASE: z.string().default('https://api.dodopayments.com'),
  /** Dodo product/price id billed for the PRO plan. */
  DODO_PRO_PRODUCT_ID: z.string().optional().default(''),

  STORAGE_ENDPOINT: z.string().optional().default(''),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_BUCKET: z.string().default('fluxberry-uploads'),
  STORAGE_ACCESS_KEY: z.string().optional().default(''),
  STORAGE_SECRET_KEY: z.string().optional().default(''),
  STORAGE_PUBLIC_URL: z.string().optional().default(''),

  JUDGE0_URL: z.string().optional().default(''),
  JUDGE0_API_KEY: z.string().optional().default(''),
  /**
   * How the Judge0 key is sent: 'token' → X-Auth-Token (self-hosted, default),
   * 'rapidapi' → X-RapidAPI-Key + X-RapidAPI-Host, 'bearer' → Authorization: Bearer.
   */
  JUDGE0_AUTH_MODE: z.enum(['token', 'rapidapi', 'bearer']).default('token'),
  /** Required only when JUDGE0_AUTH_MODE=rapidapi (the X-RapidAPI-Host value). */
  JUDGE0_RAPIDAPI_HOST: z.string().optional().default(''),

  /**
   * Google Calendar OAuth (for the "Schedule interview" feature). Blank ->
   * a realistic mock calendar adapter activates: interviews are recorded
   * internally with a fake meet link, no real Google account is ever touched.
   */
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  /** Must exactly match an authorized redirect URI on the Google OAuth client. */
  GOOGLE_CALENDAR_REDIRECT_URI: z.string().optional().default(''),

  INTERVIEW_PROVIDER: z.string().default('mock'),
  INTERVIEW_PROVIDER_API_KEY: z.string().optional().default(''),
  BOLNA_API_BASE: z.string().default('https://api.bolna.ai'),
  /**
   * Bolna's browser web-call session-mint endpoint. Documented as a PLACEHOLDER
   * in the beta docs — confirm the exact path when web-call access is granted.
   */
  BOLNA_WEBCALL_SESSION_URL: z.string().optional().default(''),
  /** Unguessable secret embedded in the Bolna webhook URL (Bolna does not sign). */
  BOLNA_WEBHOOK_SECRET: z.string().optional().default(''),
  BOLNA_LLM_MODEL: z.string().optional().default('gpt-4o-mini'),
  BOLNA_VOICE_ID: z.string().optional().default(''),

  SENTRY_DSN: z.string().optional().default(''),
  POSTHOG_KEY: z.string().optional().default(''),
  POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),

  FEATURE_CODING_ASSESSMENT: bool(DEFAULT_FEATURE_FLAGS.CODING_ASSESSMENT),
  FEATURE_AI_INTERVIEW: bool(DEFAULT_FEATURE_FLAGS.AI_INTERVIEW),
  FEATURE_WORKFLOW_AUTOMATION: bool(DEFAULT_FEATURE_FLAGS.WORKFLOW_AUTOMATION),
  FEATURE_ADVANCED_ANALYTICS: bool(DEFAULT_FEATURE_FLAGS.ADVANCED_ANALYTICS),
  FEATURE_ASSESSMENTS: bool(DEFAULT_FEATURE_FLAGS.ASSESSMENTS),
  FEATURE_QUESTION_BANK: bool(DEFAULT_FEATURE_FLAGS.QUESTION_BANK),

  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().default(1500),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().default(4),
});

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

const features: FeatureFlagState = {
  CODING_ASSESSMENT: e.FEATURE_CODING_ASSESSMENT,
  AI_INTERVIEW: e.FEATURE_AI_INTERVIEW,
  WORKFLOW_AUTOMATION: e.FEATURE_WORKFLOW_AUTOMATION,
  ADVANCED_ANALYTICS: e.FEATURE_ADVANCED_ANALYTICS,
  ASSESSMENTS: e.FEATURE_ASSESSMENTS,
  QUESTION_BANK: e.FEATURE_QUESTION_BANK,
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

  auth: {
    supabaseUrl: e.SUPABASE_URL,
    supabaseJwtSecret: e.SUPABASE_JWT_SECRET,
    allowTestTokens: e.AUTH_ALLOW_TEST_TOKENS,
    testTokenSecret: e.AUTH_TEST_TOKEN_SECRET,
    bypassEnabled: e.AUTH_BYPASS_ENABLED,
  },

  providers: {
    mockAll: e.MOCK_EXTERNAL_SERVICES,
    ai: { provider: e.AI_PROVIDER, apiKey: e.AI_API_KEY, model: e.AI_MODEL },
    email: { resendApiKey: e.RESEND_API_KEY, from: e.EMAIL_FROM },
    messaging: { inboundDomain: e.INBOUND_EMAIL_DOMAIN, inboundSecret: e.INBOUND_EMAIL_SECRET },
    billing: {
      apiKey: e.DODO_API_KEY,
      webhookSecret: e.DODO_WEBHOOK_SECRET,
      apiBase: e.DODO_API_BASE,
      proProductId: e.DODO_PRO_PRODUCT_ID,
    },
    storage: {
      endpoint: e.STORAGE_ENDPOINT,
      region: e.STORAGE_REGION,
      bucket: e.STORAGE_BUCKET,
      accessKey: e.STORAGE_ACCESS_KEY,
      secretKey: e.STORAGE_SECRET_KEY,
      publicUrl: e.STORAGE_PUBLIC_URL,
    },
    judge0: {
      url: e.JUDGE0_URL,
      apiKey: e.JUDGE0_API_KEY,
      authMode: e.JUDGE0_AUTH_MODE,
      rapidApiHost: e.JUDGE0_RAPIDAPI_HOST,
    },
    interview: {
      provider: e.INTERVIEW_PROVIDER,
      apiKey: e.INTERVIEW_PROVIDER_API_KEY,
      apiBase: e.BOLNA_API_BASE,
      webCallSessionUrl: e.BOLNA_WEBCALL_SESSION_URL,
      webhookSecret: e.BOLNA_WEBHOOK_SECRET,
      llmModel: e.BOLNA_LLM_MODEL,
      voiceId: e.BOLNA_VOICE_ID,
    },
    calendar: {
      clientId: e.GOOGLE_CLIENT_ID,
      clientSecret: e.GOOGLE_CLIENT_SECRET,
      redirectUri: e.GOOGLE_CALENDAR_REDIRECT_URI || `${e.PUBLIC_API_URL || `http://localhost:${e.PORT}`}/api/v1/integrations/google-calendar/callback`,
    },
  },

  observability: {
    sentryDsn: e.SENTRY_DSN,
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
