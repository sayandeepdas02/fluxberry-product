# AI

All AI goes through the `AIProvider` interface (`backend/src/integrations/ai`). Adapters: `AnthropicProvider`, `OpenAIProvider`, `OpenRouterProvider` (default model `deepseek/deepseek-v4.1-flash`, reasoning off), `MockAIProvider`. Selected by `AI_PROVIDER`; falls back to mock when no key is set (so the product runs and tests pass offline).

## Capabilities

- `generateJobDescription` — markdown JD + structured requirements
- `parseResume` — resume text → structured profile (`summary, yearsExperience, skills, education, workExperience, projects`)
- `screenCandidate` — evidence-based `summary / strengths / concerns` + a 0–10 `relevanceScore`
- `evaluateInterview` — flagged; scores + summary from a transcript

## Transparent screening (spec §29-30)

Screening is **not** an unexplained LLM number:

1. The scoring engine (`scoring.engine.ts`, pure & unit-tested) computes deterministic sub-scores from structured signals: **skills 35%, experience 20%, relevance 20%, location 10%, compensation 10%, education 5%**.
2. The LLM contributes only the **relevance** dimension and the qualitative reasoning.
3. Weighted sum → a 0–10 score with a full breakdown and a "why this candidate" explanation, stored (versioned) in `screening_results`.

## Provenance & safety

- Every AI output stores `{ provider, model, promptVersion, timestamp }`. Prompts are versioned templates in `integrations/ai/prompts.ts`.
- Prompts instruct the model to ignore protected characteristics and ground judgments in job-relevant qualifications (spec §98). The UI frames AI as decision-support, not a decision.
- AI failures never destroy candidate data: resume parse/screening failures mark status `FAILED` and are retryable; the application stays valid.
