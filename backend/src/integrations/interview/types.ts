export interface InterviewSession {
  id: string;
  status: 'CREATED' | 'ACTIVE' | 'ENDED';
  joinUrl?: string;
}

export interface TranscriptSegment {
  speaker: 'ai' | 'candidate';
  text: string;
  tsMs: number;
}

export interface Transcript {
  text: string;
  segments: TranscriptSegment[];
}

/** Provider-agnostic AI interview surface (spec §44). Replaceable per vendor. */
export interface InterviewProvider {
  readonly name: string;
  createSession(input: { jobTitle: string; candidateName: string }): Promise<InterviewSession>;
  getSession(id: string): Promise<InterviewSession>;
  endSession(id: string): Promise<void>;
  getTranscript(id: string): Promise<Transcript>;
}
