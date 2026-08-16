import type {
  CodeExecutionProvider,
  CodeSubmission,
  ExecutionResult,
  ExecutionStatus,
} from './types';
import { config } from '../../config/env';
import { providerError } from '../../utils/errors';

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63, // Node.js
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  go: 60,
  typescript: 74,
};

/** Judge0 adapter (spec §42-43). Kept behind the CodeExecutionProvider interface. */
export class Judge0Provider implements CodeExecutionProvider {
  readonly name = 'judge0';

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.providers.judge0.apiKey) h['X-Auth-Token'] = config.providers.judge0.apiKey;
    return h;
  }

  async submit(input: CodeSubmission): Promise<{ token: string }> {
    const languageId = LANGUAGE_IDS[input.language.toLowerCase()] ?? 63;
    const res = await fetch(`${config.providers.judge0.url}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        source_code: input.source,
        language_id: languageId,
        stdin: input.stdin ?? input.testCases?.[0]?.input ?? '',
        expected_output: input.testCases?.[0]?.expected,
      }),
    });
    if (!res.ok) throw providerError(`Judge0 submit failed (${res.status})`);
    const json = (await res.json()) as { token: string };
    return { token: json.token };
  }

  async getResult(token: string): Promise<ExecutionResult> {
    const res = await fetch(`${config.providers.judge0.url}/submissions/${token}?base64_encoded=false`, {
      headers: this.headers(),
    });
    if (!res.ok) throw providerError(`Judge0 result failed (${res.status})`);
    const j = (await res.json()) as any;
    const statusId = j.status?.id as number;
    let status: ExecutionStatus = 'PENDING';
    if (statusId === 3) status = 'ACCEPTED';
    else if (statusId === 4) status = 'WRONG_ANSWER';
    else if (statusId === 5) status = 'TIMEOUT';
    else if (statusId >= 6) status = 'ERROR';
    else status = 'PENDING';
    return {
      status,
      stdout: j.stdout ?? undefined,
      stderr: j.stderr ?? j.compile_output ?? undefined,
      timeMs: j.time ? Math.round(Number(j.time) * 1000) : undefined,
      passed: status === 'ACCEPTED' ? 1 : 0,
      total: 1,
    };
  }
}
