import {
  CODING_DEFAULT_CPU_TIME_LIMIT,
  CODING_DEFAULT_MEMORY_LIMIT,
  codingLanguageById,
} from '../../shared';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { providerError } from '../../utils/errors';
import {
  mapJudge0Status,
  type BatchSubmitInput,
  type CaseExecutionResult,
  type CodeExecutionProvider,
} from './types';

/** Judge0 accepts at most 20 submissions per batch. */
const MAX_BATCH = 20;

const b64 = (s: string): string => Buffer.from(s ?? '', 'utf8').toString('base64');
const unb64 = (s: string | null | undefined): string | null =>
  s == null ? null : Buffer.from(s, 'base64').toString('utf8');

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Judge0 adapter (spec §42-43). Behind the CodeExecutionProvider interface.
 * - Auth mode is configurable (self-hosted X-Auth-Token / RapidAPI / Bearer).
 * - Language ids are validated against the live `GET /languages` set at first
 *   use, remapping via the shared catalog name when an id differs per instance.
 * - Always base64 (avoids source/stdin corruption) and never uses callbacks
 *   (Judge0 callbacks are unsigned) — the grader polls instead.
 */
export class Judge0Provider implements CodeExecutionProvider {
  readonly name = 'judge0';
  private availableIds: Set<number> | null = null;
  private nameToId: Map<string, number> | null = null;

  private get base(): string {
    return config.providers.judge0.url.replace(/\/+$/, '');
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const { apiKey, authMode, rapidApiHost } = config.providers.judge0;
    if (!apiKey) return h;
    if (authMode === 'rapidapi') {
      h['X-RapidAPI-Key'] = apiKey;
      if (rapidApiHost) h['X-RapidAPI-Host'] = rapidApiHost;
    } else if (authMode === 'bearer') {
      h['Authorization'] = `Bearer ${apiKey}`;
    } else {
      h['X-Auth-Token'] = apiKey;
    }
    return h;
  }

  /** Lazily fetch the instance language list; best-effort (never hard-fails). */
  private async ensureLanguages(): Promise<void> {
    if (this.availableIds) return;
    try {
      const res = await fetch(`${this.base}/languages`, { headers: this.headers() });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const langs = (await res.json()) as Array<{ id: number; name: string }>;
      this.availableIds = new Set(langs.map((l) => l.id));
      this.nameToId = new Map(langs.map((l) => [l.name.toLowerCase(), l.id]));
      logger.info({ count: langs.length }, 'Judge0 languages loaded');
    } catch (err) {
      // Degrade gracefully: trust the requested id as-is.
      this.availableIds = new Set();
      this.nameToId = new Map();
      logger.warn({ err: (err as Error).message }, 'Judge0 /languages unavailable — using catalog ids');
    }
  }

  /** Resolve a catalog language id to an id valid on THIS instance. */
  private resolveLanguageId(languageId: number): number {
    if (this.availableIds && this.availableIds.has(languageId)) return languageId;
    // Remap via the catalog name (e.g. self-hosted uses a newer Python id).
    const cat = codingLanguageById(languageId);
    if (cat && this.nameToId) {
      for (const [name, id] of this.nameToId) {
        if (name.includes(cat.name) || cat.label.toLowerCase().includes(name)) return id;
      }
    }
    return languageId; // best effort — Judge0 will 422 if truly invalid
  }

  async submitBatch(input: BatchSubmitInput): Promise<{ tokens: string[] }> {
    await this.ensureLanguages();
    const languageId = this.resolveLanguageId(input.languageId);
    const cpu = input.cpuTimeLimit ?? CODING_DEFAULT_CPU_TIME_LIMIT;
    const mem = input.memoryLimit ?? CODING_DEFAULT_MEMORY_LIMIT;

    const submissions = input.testCases.map((tc) => ({
      source_code: b64(input.source),
      language_id: languageId,
      stdin: b64(tc.input ?? ''),
      expected_output: b64((tc.expected ?? '').replace(/\s+$/, '')),
      cpu_time_limit: cpu,
      memory_limit: mem,
      enable_network: false,
    }));

    const tokens: string[] = [];
    for (const group of chunk(submissions, MAX_BATCH)) {
      const res = await fetch(`${this.base}/submissions/batch?base64_encoded=true`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ submissions: group }),
      });
      if (!res.ok) throw providerError(`Judge0 batch submit failed (${res.status})`);
      const json = (await res.json()) as Array<{ token?: string; error?: unknown }>;
      for (const item of json) {
        if (!item.token) throw providerError('Judge0 rejected a submission');
        tokens.push(item.token);
      }
    }
    return { tokens };
  }

  async getBatch(tokens: string[]): Promise<CaseExecutionResult[]> {
    if (tokens.length === 0) return [];
    const results: CaseExecutionResult[] = [];
    const fields = 'token,stdout,stderr,compile_output,status,time,memory';
    for (const group of chunk(tokens, MAX_BATCH)) {
      const qs = new URLSearchParams({
        tokens: group.join(','),
        base64_encoded: 'true',
        fields,
      });
      const res = await fetch(`${this.base}/submissions/batch?${qs.toString()}`, {
        headers: this.headers(),
      });
      if (!res.ok) throw providerError(`Judge0 batch result failed (${res.status})`);
      const json = (await res.json()) as { submissions: any[] };
      for (const s of json.submissions ?? []) {
        const { status, done } = mapJudge0Status(s?.status?.id ?? 1);
        results.push({
          status,
          done,
          stdout: unb64(s?.stdout),
          stderr: unb64(s?.stderr),
          compileOutput: unb64(s?.compile_output),
          timeMs: s?.time != null ? Math.round(Number(s.time) * 1000) : null,
          memoryKb: s?.memory != null ? Number(s.memory) : null,
        });
      }
    }
    return results;
  }
}
