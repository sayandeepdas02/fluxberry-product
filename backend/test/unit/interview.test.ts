import { describe, it, expect } from 'vitest';
import { composeSystemPrompt } from '../../src/integrations/interview/types';
import { MockInterviewProvider } from '../../src/integrations/interview/mock';

describe('interview system prompt composition', () => {
  it('embeds the ordered questions and templating placeholders', () => {
    const prompt = composeSystemPrompt({
      name: 'Screen',
      objective: 'Assess backend depth',
      introduction: 'Hi',
      questions: ['Tell me about yourself', 'Describe a hard bug you fixed'],
      durationMinutes: 6,
      tone: 'friendly',
      language: 'en',
    });
    expect(prompt).toContain('{job_title}');
    expect(prompt).toContain('{candidate_name}');
    expect(prompt).toContain('Assess backend depth');
    // Questions numbered in order.
    expect(prompt).toMatch(/1\. Tell me about yourself/);
    expect(prompt).toMatch(/2\. Describe a hard bug you fixed/);
    expect(prompt.indexOf('1. Tell me about yourself')).toBeLessThan(
      prompt.indexOf('2. Describe a hard bug you fixed'),
    );
  });
});

describe('mock interview provider', () => {
  it('syncs an agent and returns a transcript to evaluate', async () => {
    const p = new MockInterviewProvider();
    const { agentId } = await p.syncAgent({
      name: 'x', objective: '', introduction: '', questions: ['Q1'], durationMinutes: 6, tone: 'professional', language: 'en',
    });
    expect(agentId).toMatch(/^mock_agent_/);

    const session = await p.mintWebCallSession({ agentId, userData: {}, questions: ['Q1'] });
    expect(session.provider).toBe('mock');
    expect(session.questions).toEqual(['Q1']);

    const exec = await p.getExecution('mock_exec_1');
    expect(exec.status).toBe('COMPLETED');
    expect(exec.transcript && exec.transcript.length).toBeGreaterThan(0);
  });
});
