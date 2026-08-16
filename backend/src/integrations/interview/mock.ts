import crypto from 'node:crypto';
import type {
  InterviewAgentConfig,
  InterviewExecution,
  InterviewProvider,
  WebCallSession,
} from './types';

/**
 * Deterministic mock interview provider (no keys needed). It fabricates an agent
 * id, hands the scripted questions to the simulated call UI, and returns a
 * plausible transcript so the evaluate → score pipeline runs end-to-end.
 */
export class MockInterviewProvider implements InterviewProvider {
  readonly name = 'mock';

  async syncAgent(_cfg: InterviewAgentConfig): Promise<{ agentId: string }> {
    return { agentId: `mock_agent_${crypto.randomBytes(4).toString('hex')}` };
  }

  async mintWebCallSession(input: {
    agentId: string | null;
    userData: Record<string, unknown>;
    questions: string[];
  }): Promise<WebCallSession> {
    return { provider: 'mock', agentId: input.agentId, questions: input.questions };
  }

  async getExecution(_executionId: string): Promise<InterviewExecution> {
    const transcript = [
      'AI: Hi, thanks for joining. Can you introduce yourself?',
      'Candidate: Sure — I am a backend engineer with five years building high-throughput APIs.',
      'AI: Tell me about your most impactful project.',
      'Candidate: I led a payments service handling millions of daily transactions with strong reliability.',
      'AI: How do you approach debugging a production incident?',
      'Candidate: I stabilize first, gather metrics and logs, form a hypothesis, then fix and add regression tests.',
      'AI: Great, thank you. That concludes our interview.',
    ].join('\n');
    return {
      status: 'COMPLETED',
      transcript,
      durationSec: 320,
      recordingUrl: null,
      meta: { mock: true },
    };
  }
}
