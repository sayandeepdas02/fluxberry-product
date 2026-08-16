/** Recruiter config compiled into a provider agent. */
export interface InterviewAgentConfig {
  name: string;
  objective: string;
  introduction: string;
  /** Ordered question texts the agent must ask. */
  questions: string[];
  durationMinutes: number;
  tone: string;
  language: string;
  /** When set, update this agent instead of creating a new one. */
  existingAgentId?: string | null;
}

/** What the browser needs to start the voice call. */
export interface WebCallSession {
  provider: 'mock' | 'bolna';
  /** Bolna: short-lived credentials for the @bolna/web-call SDK. */
  session?: unknown;
  agentId?: string | null;
  /** Mock: the scripted questions, so the simulated call UI can render them. */
  questions?: string[];
}

export type InterviewExecStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

/** Normalized result of a completed (or in-flight) call. */
export interface InterviewExecution {
  status: InterviewExecStatus;
  transcript?: string | null;
  durationSec?: number | null;
  recordingUrl?: string | null;
  meta?: Record<string, unknown> | null;
  /** Agent that ran this call, per the provider. Null when the provider can't attest to it (e.g. mock). */
  agentId?: string | null;
}

/**
 * Provider-agnostic AI interview surface (spec §44). Core services depend only
 * on this; Bolna/mock are chosen by config. Poll/fetch based — the call itself
 * runs client-side (browser WebRTC) or on the provider's telephony.
 */
export interface InterviewProvider {
  readonly name: string;
  /** Create or update the provider agent from a recruiter config. */
  syncAgent(cfg: InterviewAgentConfig): Promise<{ agentId: string }>;
  /** Mint a short-lived browser session (server holds the API key). */
  mintWebCallSession(input: {
    agentId: string | null;
    userData: Record<string, unknown>;
    questions: string[];
  }): Promise<WebCallSession>;
  /** Fetch a call/execution by id (transcript, duration, recording, status). */
  getExecution(executionId: string): Promise<InterviewExecution>;
}

/**
 * Compose the single free-text system prompt Bolna expects from a recruiter
 * config. Exported for unit testing. `{candidate_name}` / `{job_title}` are
 * Bolna variable placeholders filled from per-call user_data.
 */
export function composeSystemPrompt(cfg: InterviewAgentConfig): string {
  const lines: string[] = [];
  lines.push(
    `You are an AI recruiter conducting a ${cfg.durationMinutes}-minute voice screening interview for the {job_title} role.`,
  );
  lines.push(`Tone: ${cfg.tone}. Speak naturally and keep the conversation moving.`);
  if (cfg.objective) lines.push(`Objective: ${cfg.objective}`);
  lines.push(
    'Begin by briefly introducing yourself and confirming the candidate, {candidate_name}, is ready. Obtain verbal consent to record before proceeding.',
  );
  lines.push('Ask the following questions in order, one at a time, and wait for the answer before continuing:');
  cfg.questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  lines.push(
    'Ask a brief, relevant follow-up only when a question is marked for it or an answer clearly warrants clarification.',
  );
  lines.push(
    `Keep the whole interview within ${cfg.durationMinutes} minutes. When done, thank the candidate and end the call.`,
  );
  return lines.join('\n');
}
