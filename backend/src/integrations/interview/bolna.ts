import { config } from '../../config/env';
import { logger } from '../../utils/logger';
import { providerError } from '../../utils/errors';
import {
  composeSystemPrompt,
  type InterviewAgentConfig,
  type InterviewExecStatus,
  type InterviewExecution,
  type InterviewProvider,
  type WebCallSession,
} from './types';

const BOLNA_STATUS_MAP: Record<string, InterviewExecStatus> = {
  queued: 'PENDING',
  scheduled: 'PENDING',
  initiated: 'IN_PROGRESS',
  ringing: 'IN_PROGRESS',
  'in-progress': 'IN_PROGRESS',
  completed: 'COMPLETED',
  'call-disconnected': 'COMPLETED',
  'no-answer': 'FAILED',
  busy: 'FAILED',
  failed: 'FAILED',
  error: 'FAILED',
  'balance-low': 'FAILED',
  canceled: 'FAILED',
  stopped: 'FAILED',
};

/**
 * Bolna adapter (v2 agent API + web-call). Behind InterviewProvider so the rest
 * of the app never sees Bolna specifics. The API key stays server-side; the
 * browser only ever receives a short-lived minted session.
 */
export class BolnaProvider implements InterviewProvider {
  readonly name = 'bolna';

  private get base(): string {
    return config.providers.interview.apiBase.replace(/\/+$/, '');
  }
  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${config.providers.interview.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private agentBody(cfg: InterviewAgentConfig) {
    return {
      agent_config: {
        agent_name: cfg.name,
        agent_welcome_message: cfg.introduction || 'Hi {candidate_name}, thanks for joining. Are you ready to begin?',
        tasks: [
          {
            task_type: 'conversation',
            toolchain: { execution: 'sequential', pipelines: [['transcriber', 'llm', 'synthesizer']] },
            tools_config: {
              llm_agent: {
                agent_type: 'simple_llm_agent',
                agent_flow_type: 'streaming',
                llm_config: { provider: 'openai', model: config.providers.interview.llmModel, max_tokens: 150 },
              },
              synthesizer: config.providers.interview.voiceId
                ? { provider: 'elevenlabs', provider_config: { voice_id: config.providers.interview.voiceId }, stream: true }
                : undefined,
              transcriber: { provider: 'deepgram', model: 'nova-3', language: cfg.language || 'en', stream: true },
            },
            task_config: { call_terminate: cfg.durationMinutes * 60 },
          },
        ],
      },
      agent_prompts: { task_1: { system_prompt: composeSystemPrompt(cfg) } },
    };
  }

  async syncAgent(cfg: InterviewAgentConfig): Promise<{ agentId: string }> {
    const body = this.agentBody(cfg);
    const url = cfg.existingAgentId ? `${this.base}/v2/agent/${cfg.existingAgentId}` : `${this.base}/v2/agent`;
    const res = await fetch(url, {
      method: cfg.existingAgentId ? 'PUT' : 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw providerError(`Bolna agent sync failed (${res.status})`);
    const json = (await res.json()) as { agent_id?: string };
    const agentId = json.agent_id ?? cfg.existingAgentId;
    if (!agentId) throw providerError('Bolna did not return an agent id');
    return { agentId };
  }

  async mintWebCallSession(input: {
    agentId: string | null;
    userData: Record<string, unknown>;
  }): Promise<WebCallSession> {
    const url = config.providers.interview.webCallSessionUrl;
    if (!url) throw providerError('BOLNA_WEBCALL_SESSION_URL is not configured');
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      // The proxy MUST forward user_data or the {placeholders} are dropped.
      body: JSON.stringify({ agent_id: input.agentId, user_data: input.userData }),
    });
    if (!res.ok) throw providerError(`Bolna web-call session mint failed (${res.status})`);
    const session = await res.json();
    return { provider: 'bolna', session, agentId: input.agentId };
  }

  async getExecution(executionId: string): Promise<InterviewExecution> {
    const res = await fetch(`${this.base}/executions/${executionId}`, { headers: this.headers() });
    if (!res.ok) throw providerError(`Bolna execution fetch failed (${res.status})`);
    const j = (await res.json()) as any;
    const status = BOLNA_STATUS_MAP[String(j.status)] ?? 'IN_PROGRESS';
    logger.debug({ executionId, bolnaStatus: j.status, status }, 'bolna execution fetched');
    return {
      status,
      transcript: typeof j.transcript === 'string' ? j.transcript : null,
      durationSec: j.conversation_duration ?? null,
      recordingUrl: j.telephony_data?.recording_url ?? null,
      meta: { totalCost: j.total_cost ?? null, answeredByVoicemail: j.answered_by_voice_mail ?? null },
      agentId: j.agent_id ?? null,
    };
  }
}
