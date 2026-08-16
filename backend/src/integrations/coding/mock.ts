import crypto from 'node:crypto';
import type { CodeExecutionProvider, CodeSubmission, ExecutionResult } from './types';

/** Deterministic mock: "accepts" any non-empty submission. */
export class MockCodeExecutionProvider implements CodeExecutionProvider {
  readonly name = 'mock';
  private store = new Map<string, ExecutionResult>();

  async submit(input: CodeSubmission): Promise<{ token: string }> {
    const token = `mock_${crypto.randomBytes(6).toString('hex')}`;
    const total = input.testCases?.length ?? 1;
    const ok = input.source.trim().length > 0;
    this.store.set(token, {
      status: ok ? 'ACCEPTED' : 'ERROR',
      stdout: ok ? 'ok' : '',
      passed: ok ? total : 0,
      total,
      timeMs: 12,
    });
    return { token };
  }

  async getResult(token: string): Promise<ExecutionResult> {
    return this.store.get(token) ?? { status: 'PENDING' };
  }
}
