'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicConfig, hasSupabase } from '../config';

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client. Returns null when Supabase isn't configured, in which
 * case the app falls back to the dev test-token auth path (spec: easy local dev).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabase) return null;
  if (!cached) {
    cached = createBrowserClient(publicConfig.supabaseUrl, publicConfig.supabaseAnonKey);
  }
  return cached;
}
