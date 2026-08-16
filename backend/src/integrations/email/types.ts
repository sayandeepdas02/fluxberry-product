export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  /** Dedupe key to avoid double-sends on retries (spec §91). */
  idempotencyKey?: string;
}

export interface EmailResult {
  id: string;
  provider: string;
}

/** Provider-agnostic email surface (spec §54). */
export interface EmailProvider {
  readonly name: string;
  send(input: EmailInput): Promise<EmailResult>;
}
