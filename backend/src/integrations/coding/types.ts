import type { ExecutionStatusValue } from '@fluxberry/shared';

export interface CodeTestCase {
  input: string;
  expected: string;
}

/** One source graded against N test cases (one Judge0 submission per case). */
export interface BatchSubmitInput {
  source: string;
  /** Judge0 language_id (from the shared CODING_LANGUAGES catalog). */
  languageId: number;
  testCases: CodeTestCase[];
  /** Per-run limits. Seconds / KB. Provider defaults apply when omitted. */
  cpuTimeLimit?: number;
  memoryLimit?: number;
}

export type ExecutionStatus = ExecutionStatusValue;

/** Normalized result for a single test case (one Judge0 token). */
export interface CaseExecutionResult {
  status: ExecutionStatus;
  /** false while Judge0 status.id <= 2 (In Queue / Processing). */
  done: boolean;
  stdout?: string | null;
  stderr?: string | null;
  compileOutput?: string | null;
  timeMs?: number | null;
  memoryKb?: number | null;
}

/**
 * Provider-agnostic code execution (spec §43). Never run candidate code
 * in-process. Submissions are batched (one token per test case) and polled.
 */
export interface CodeExecutionProvider {
  readonly name: string;
  /** Submit one source against every test case; returns a token per case, in order. */
  submitBatch(input: BatchSubmitInput): Promise<{ tokens: string[] }>;
  /** Poll results for the given tokens, preserving order. */
  getBatch(tokens: string[]): Promise<CaseExecutionResult[]>;
}

/**
 * Map a Judge0 `status.id` to our normalized status. Exported for unit tests.
 * 1 In Queue, 2 Processing, 3 Accepted, 4 Wrong Answer, 5 TLE,
 * 6 Compilation Error, 7-12 Runtime Error, 13 Internal, 14 Exec Format.
 */
export function mapJudge0Status(statusId: number): { status: ExecutionStatus; done: boolean } {
  if (statusId <= 2) return { status: 'PENDING', done: false };
  if (statusId === 3) return { status: 'ACCEPTED', done: true };
  if (statusId === 4) return { status: 'WRONG_ANSWER', done: true };
  if (statusId === 5) return { status: 'TIMEOUT', done: true };
  return { status: 'ERROR', done: true }; // 6-14: compile/runtime/internal
}
