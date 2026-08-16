import { describe, it, expect } from 'vitest';
import { mapJudge0Status } from '../../src/integrations/coding/types';
import { MockCodeExecutionProvider } from '../../src/integrations/coding/mock';

describe('Judge0 status mapping', () => {
  it('treats status ids 1 and 2 as not-yet-done', () => {
    expect(mapJudge0Status(1)).toEqual({ status: 'PENDING', done: false });
    expect(mapJudge0Status(2)).toEqual({ status: 'PENDING', done: false });
  });

  it('maps terminal statuses correctly', () => {
    expect(mapJudge0Status(3)).toEqual({ status: 'ACCEPTED', done: true });
    expect(mapJudge0Status(4)).toEqual({ status: 'WRONG_ANSWER', done: true });
    expect(mapJudge0Status(5)).toEqual({ status: 'TIMEOUT', done: true });
    // 6 compile, 7-12 runtime, 13 internal, 14 exec-format all collapse to ERROR.
    for (const id of [6, 7, 11, 13, 14]) {
      expect(mapJudge0Status(id)).toEqual({ status: 'ERROR', done: true });
    }
  });
});

describe('mock code execution provider', () => {
  it('returns one token per test case and accepts a non-empty submission', async () => {
    const p = new MockCodeExecutionProvider();
    const { tokens } = await p.submitBatch({
      source: 'print(1)',
      languageId: 71,
      testCases: [
        { input: '', expected: 'ok' },
        { input: '2', expected: 'ok' },
      ],
    });
    expect(tokens).toHaveLength(2);
    const results = await p.getBatch(tokens);
    expect(results.every((r) => r.done)).toBe(true);
    expect(results.every((r) => r.status === 'ACCEPTED')).toBe(true);
  });

  it('errors an empty submission', async () => {
    const p = new MockCodeExecutionProvider();
    const { tokens } = await p.submitBatch({ source: '   ', languageId: 71, testCases: [{ input: '', expected: '' }] });
    const [r] = await p.getBatch(tokens);
    expect(r.status).toBe('ERROR');
  });
});
