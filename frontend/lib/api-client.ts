import { publicConfig } from './config';
import { getSupabaseClient } from './supabase/client';

export const STORAGE_KEYS = {
  testToken: 'fluxberry_test_token',
  workspaceId: 'fluxberry_workspace_id',
} as const;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** Current access token: dev test-token (if set) else the Supabase session token. */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const test = window.localStorage.getItem(STORAGE_KEYS.testToken);
    if (test) return test;
  }
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function getWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEYS.workspaceId);
}

export function setWorkspaceId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) window.localStorage.setItem(STORAGE_KEYS.workspaceId, id);
  else window.localStorage.removeItem(STORAGE_KEYS.workspaceId);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  workspaceId?: string | null;
  token?: string | null;
  signal?: AbortSignal;
  /** Skip auth token (for public endpoints). */
  public?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${publicConfig.apiUrl}${path}`;
  const headers: Record<string, string> = { ...opts.headers };

  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  if (!opts.public) {
    const token = opts.token ?? (await getAccessToken());
    if (token) headers.Authorization = `Bearer ${token}`;
    const ws = opts.workspaceId ?? getWorkspaceId();
    if (ws) headers['X-Workspace-Id'] = ws;
  }

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('NETWORK', `Unexpected response (${res.status})`, res.status);
  }

  if (!res.ok || json?.success === false) {
    const err = json?.error ?? {};
    throw new ApiError(err.code ?? 'INTERNAL', err.message ?? 'Request failed', res.status, err.details);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PUT', body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};
