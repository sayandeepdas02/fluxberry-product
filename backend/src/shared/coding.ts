/**
 * Coding-assessment shared constants.
 *
 * The canonical language allow-list maps our stable identifiers to Judge0
 * `language_id`s. These are the classic, long-lived Judge0 CE ids; the backend
 * resolves the live id set from `GET /languages` at boot and falls back to
 * these, so recruiters always pick from a fixed catalog and stored question
 * `language_id`s stay stable across instances.
 */

export const CODING_LANGUAGES = [
  { id: 71, name: 'python', label: 'Python 3', monaco: 'python' },
  { id: 63, name: 'javascript', label: 'JavaScript (Node.js)', monaco: 'javascript' },
  { id: 62, name: 'java', label: 'Java', monaco: 'java' },
  { id: 54, name: 'cpp', label: 'C++', monaco: 'cpp' },
  { id: 50, name: 'c', label: 'C', monaco: 'c' },
  { id: 60, name: 'go', label: 'Go', monaco: 'go' },
  { id: 74, name: 'typescript', label: 'TypeScript', monaco: 'typescript' },
  { id: 51, name: 'csharp', label: 'C#', monaco: 'csharp' },
  { id: 72, name: 'ruby', label: 'Ruby', monaco: 'ruby' },
] as const;

export type CodingLanguage = (typeof CODING_LANGUAGES)[number];
export type CodingLanguageId = CodingLanguage['id'];

/** All catalog Judge0 language ids (used as the validation allow-list). */
export const CODING_LANGUAGE_IDS: number[] = CODING_LANGUAGES.map((l) => l.id);

export function codingLanguageById(id: number): CodingLanguage | undefined {
  return CODING_LANGUAGES.find((l) => l.id === id);
}

export function codingLanguageByName(name: string): CodingLanguage | undefined {
  return CODING_LANGUAGES.find((l) => l.name === name.toLowerCase());
}

/**
 * Normalized execution status our Judge0 provider maps every submission to.
 * Kept provider-agnostic so the model, DTOs and UI share one vocabulary.
 */
export const EXECUTION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'WRONG_ANSWER',
  'ERROR',
  'TIMEOUT',
] as const;
export type ExecutionStatusValue = (typeof EXECUTION_STATUSES)[number];

/** Safe defaults (seconds / KB). Instances may override via GET /config_info. */
export const CODING_DEFAULT_CPU_TIME_LIMIT = 5;
export const CODING_DEFAULT_MEMORY_LIMIT = 128000;

/** Guardrails for recruiter-authored coding questions. */
export const CODING_MAX_TEST_CASES = 50;
export const CODING_MAX_SOURCE_BYTES = 64_000;
