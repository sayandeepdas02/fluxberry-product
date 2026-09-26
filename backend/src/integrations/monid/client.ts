import { logger } from '../../utils/logger';
import { AppError, providerError } from '../../utils/errors';

/**
 * An account/infra-level Monid failure (bad key, empty wallet, unreachable,
 * budget cap, timeout) — as opposed to a normal business-level "this specific
 * run failed" result (e.g. an unresolvable Levels.fyi company slug). Callers
 * that treat a failure as "no data for this input" (and cache that result)
 * MUST re-throw on this subtype instead — an outage is not the same as "no
 * coverage" and must never get cached as one.
 */
export class MonidOperationalError extends AppError {
  constructor(message: string) {
    super('PROVIDER_ERROR', message, 502, { expose: true });
    this.name = 'MonidOperationalError';
  }
}

/**
 * Thin wrapper around Monid's broker API (https://api.monid.ai) — the single
 * account that proxies Apollo, PDL, and Levels.fyi (see docs.monid.ai/api).
 *
 *   POST /v1/run   { provider, endpoint, input }  -> 200 (sync) | 202 (async, poll)
 *   GET  /v1/runs/:runId                          -> status COMPLETED|FAILED|RUNNING|BLOCKED|TIMED_OUT
 *
 * `input` is `{ queryParams?, body?, pathParams? }` — which of these an
 * endpoint expects is whatever `/v1/inspect` reports for it (Apollo & Levels.fyi
 * endpoints take queryParams, PDL endpoints take a JSON body).
 */
const MONID_BASE_URL = 'https://api.monid.ai';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 120_000;

export interface MonidRunInput {
  queryParams?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
}

interface MonidRunResponse {
  runId: string;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | 'BLOCKED' | 'TIMED_OUT';
  output?: unknown;
  providerResponse?: { httpStatus?: number; error?: { message?: string } };
}

export class MonidClient {
  constructor(private readonly apiKey: string) {}

  /** Submits a run and polls until it reaches a terminal state, returning the raw output. */
  async run(provider: string, endpoint: string, input: MonidRunInput): Promise<unknown> {
    const initial = await this.request<MonidRunResponse>('POST', '/v1/run', { provider, endpoint, input });
    let result = initial;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (result.status === 'RUNNING') {
      if (Date.now() > deadline) throw providerError(`Monid run for ${provider}${endpoint} timed out`);
      await sleep(POLL_INTERVAL_MS);
      result = await this.request<MonidRunResponse>('GET', `/v1/runs/${result.runId}`);
    }

    if (result.status === 'BLOCKED') {
      throw new MonidOperationalError('Monid workspace budget/cap blocked this run — check controls at app.monid.ai');
    }
    if (result.status === 'TIMED_OUT') {
      throw new MonidOperationalError(`Monid run for ${provider}${endpoint} timed out upstream`);
    }
    // A run-level FAILED / upstream 4xx-5xx means the underlying provider couldn't
    // process THIS specific request (e.g. an unresolvable company slug — observed
    // in practice to come back as an upstream 502, not a clean 404) — a normal
    // business outcome for some inputs, not a Monid/account-level outage. Callers
    // that treat "not found" as valid input-specific data (like compensation
    // lookups) are meant to catch this as a plain AppError, not MonidOperationalError.
    // The raw upstream status is exposed via `details.upstreamStatus` so a caller
    // that needs a finer distinction (e.g. PDL backfill treating a genuine upstream
    // 5xx as transient/retryable, since that's a different signal than a business
    // 4xx) can make that call itself, per-endpoint, without changing this default.
    if (result.status === 'FAILED' || (result.providerResponse?.httpStatus && result.providerResponse.httpStatus >= 400)) {
      const msg = result.providerResponse?.error?.message ?? `${provider}${endpoint} failed`;
      throw providerError(msg, { upstreamStatus: result.providerResponse?.httpStatus });
    }
    return result.output;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${MONID_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      logger.error({ err, path }, 'Monid request failed');
      throw new MonidOperationalError('Monid is unreachable');
    }

    if (res.status === 402) throw new MonidOperationalError('Monid wallet balance exhausted — top up at app.monid.ai/wallet');
    if (res.status === 401 || res.status === 403) throw new MonidOperationalError('Monid API key invalid or unauthorized');
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error({ status: res.status, text: text.slice(0, 500), path }, 'Monid API error');
      throw new MonidOperationalError(`Monid API error (${res.status})`);
    }
    return (await res.json()) as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
