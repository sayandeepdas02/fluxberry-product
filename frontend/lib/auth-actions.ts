'use client';

import { getSupabaseClient } from './supabase/client';
import { hasSupabase } from './config';
import { api, STORAGE_KEYS, setWorkspaceId } from './api-client';

export interface Credentials {
  email: string;
  password: string;
}

/** Sign up. With Supabase: real account. Without: dev test-token path. */
export async function signUp(input: { name: string } & Credentials): Promise<{ needsEmailConfirm: boolean }> {
  if (hasSupabase) {
    const sb = getSupabaseClient()!;
    const { data, error } = await sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name } },
    });
    if (error) throw new Error(error.message);
    return { needsEmailConfirm: !data.session };
  }
  const { token } = await api.post<{ token: string }>(
    '/api/v1/auth/test-token',
    { email: input.email, name: input.name },
    { public: true },
  );
  window.localStorage.setItem(STORAGE_KEYS.testToken, token);
  return { needsEmailConfirm: false };
}

export async function signIn(input: Credentials): Promise<void> {
  if (hasSupabase) {
    const sb = getSupabaseClient()!;
    const { error } = await sb.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) throw new Error(error.message);
    return;
  }
  const { token } = await api.post<{ token: string }>(
    '/api/v1/auth/test-token',
    { email: input.email },
    { public: true },
  );
  window.localStorage.setItem(STORAGE_KEYS.testToken, token);
}

export async function signOut(): Promise<void> {
  if (hasSupabase) {
    const sb = getSupabaseClient();
    await sb?.auth.signOut();
  }
  window.localStorage.removeItem(STORAGE_KEYS.testToken);
  setWorkspaceId(null);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (hasSupabase) {
    const sb = getSupabaseClient()!;
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  }
  // Dev path: nothing to do (no passwords).
}
