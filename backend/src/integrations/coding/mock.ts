import crypto from 'node:crypto';
import type { BatchSubmitInput, CaseExecutionResult, CodeExecutionProvider } from './types';

/**
 * Deterministic mock grader (no keys needed). It "runs" each test case by
 * echoing the submitted source's trimmed presence: a non-empty submission is
 * ACCEPTED for every case, an empty one ERRORs. Results are resolved
 * immediately (done=true) so the async grading flow still exercises end-to-end.
 */
export class MockCodeExecutionProvider implements CodeExecutionProvider {
  readonly name = 'mock';
  private store = new Map<string, CaseExecutionResult>();

  async submitBatch(input: BatchSubmitInput): Promise<{ tokens: string[] }> {
    const ok = input.source.trim().length > 0;
    const tokens = input.testCases.map((tc) => {
      const token = `mock_${crypto.randomBytes(6).toString('hex')}`;
      this.store.set(token, {
        status: ok ? 'ACCEPTED' : 'ERROR',
        done: true,
        stdout: ok ? (tc.expected ?? '') : '',
        stderr: ok ? null : 'empty submission',
        compileOutput: null,
        timeMs: 12,
        memoryKb: 2048,
      });
      return token;
    });
    return { tokens };
  }

  async getBatch(tokens: string[]): Promise<CaseExecutionResult[]> {
    return tokens.map(
      (t) => this.store.get(t) ?? { status: 'PENDING', done: false },
    );
  }
}
