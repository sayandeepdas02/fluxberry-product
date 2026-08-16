import crypto from 'node:crypto';
import type { InterviewProvider, InterviewSession, Transcript } from './types';

export class MockInterviewProvider implements InterviewProvider {
  readonly name = 'mock';
  private sessions = new Map<string, InterviewSession>();

  async createSession(input: { jobTitle: string; candidateName: string }): Promise<InterviewSession> {
    const id = `mock_${crypto.randomBytes(6).toString('hex')}`;
    const session: InterviewSession = { id, status: 'CREATED', joinUrl: `about:blank#${id}` };
    this.sessions.set(id, session);
    return session;
  }

  async getSession(id: string): Promise<InterviewSession> {
    return this.sessions.get(id) ?? { id, status: 'ENDED' };
  }

  async endSession(id: string): Promise<void> {
    const s = this.sessions.get(id);
    if (s) s.status = 'ENDED';
  }

  async getTranscript(id: string): Promise<Transcript> {
    return {
      text: 'AI: Tell me about a system you built.\nCandidate: I built a high-throughput API...',
      segments: [
        { speaker: 'ai', text: 'Tell me about a system you built.', tsMs: 0 },
        { speaker: 'candidate', text: 'I built a high-throughput API handling millions of requests.', tsMs: 3000 },
      ],
    };
  }
}
