import { publicConfig } from './config';

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

/**
 * A route gated by a plan the workspace doesn't have (see requirePlanFeature
 * on the backend) fails with this distinct code instead of a generic 403 —
 * catch it in a mutation's onError and show PlanUpgradeModal instead of a
 * plain error toast.
 */
export function getPlanUpgradeFlag(err: unknown): string | undefined {
  if (err instanceof ApiError && err.code === 'PLAN_UPGRADE_REQUIRED') {
    return (err.details as { flag?: string } | undefined)?.flag;
  }
  return undefined;
}

/** Current access token: dev test-token (if set), then Clerk session token. */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window !== 'undefined') {
    const test = window.localStorage.getItem(STORAGE_KEYS.testToken);
    if (test) return test;
  }
  if (typeof window !== 'undefined') {
    const clerkSession = (window as any).Clerk?.session;
    if (clerkSession) {
      const token = await clerkSession.getToken();
      if (token) return token;
    }
  }
  return null;
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
