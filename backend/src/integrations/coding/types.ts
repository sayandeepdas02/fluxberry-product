export interface CodeTestCase {
  input: string;
  expected: string;
}

export interface CodeSubmission {
  source: string;
  language: string; // e.g. "javascript", "python"
  testCases?: CodeTestCase[];
  stdin?: string;
}

export type ExecutionStatus = 'PENDING' | 'ACCEPTED' | 'WRONG_ANSWER' | 'ERROR' | 'TIMEOUT';

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  passed?: number;
  total?: number;
}

/** Provider-agnostic code execution (spec §43). Never run candidate code in-process. */
export interface CodeExecutionProvider {
  readonly name: string;
  submit(input: CodeSubmission): Promise<{ token: string }>;
  getResult(token: string): Promise<ExecutionResult>;
}
