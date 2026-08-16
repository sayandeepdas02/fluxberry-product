# Pending / Deferred Features

Features intentionally not built in the current version. Grouped by area, with where the scaffolding lives so they can be finished quickly.

## Shipped

- **Coding assessments (Judge0)** — flag `FEATURE_CODING_ASSESSMENT`. ✅ Implemented.
  Recruiters author coding questions (languages + visible/hidden test cases + limits) and build CODING assessments; candidates write and run code in the browser; submissions grade asynchronously via Judge0 (batch submit → poll worker) with per-test-case results, and the `CODING_ASSESSMENT` workflow node is wired (send-and-wait). Judge0 host is configurable (`JUDGE0_AUTH_MODE`: self-hosted / RapidAPI / Bearer); runs on a realistic mock with zero keys.
- **AI voice interviews (Bolna)** — flag `FEATURE_AI_INTERVIEW`. ✅ Implemented.
  Recruiters configure a per-job AI interviewer (objective + ordered questions + duration + tone); a Bolna agent is synced per job. Candidates take a browser voice interview from a link; the transcript is fetched and scored via the existing `evaluateInterview` AI contract, persisted on an `Interview` record, and the `AI_INTERVIEW` workflow node is wired (send-and-wait) with an `interview_score` condition field. Webhook is gated by a URL secret and re-fetches the execution by id (Bolna does not sign). Runs on a realistic simulated interview with zero keys. **Note:** the real browser WebRTC path uses Bolna's `@bolna/web-call` (beta / request-access); the candidate page has a documented seam where the SDK plugs in, and the session-mint URL is isolated in `BOLNA_WEBCALL_SESSION_URL` (a documented placeholder until confirmed).

## Feature-flagged (interfaces + adapters exist, UI not wired)

- **Advanced analytics** — flag `FEATURE_ADVANCED_ANALYTICS`.
  Current analytics use on-the-fly aggregation. Missing: precomputed `job_analytics` / `workspace_analytics` tables updated by an `AGGREGATE_ANALYTICS` worker.

## Observability

- **Sentry** — `SENTRY_DSN` config exists; no SDK init yet. Add request/worker error capture (scrub PII/resume/keys).
- **PostHog product analytics** — `POSTHOG_KEY` config exists; events (`signup_completed`, `job_published`, …) not emitted.

## Reliability & security

- **Webhook infrastructure** — `POST /webhooks/:provider` with signature verification + async processing + a unique `provider_event_id` (idempotency). Not implemented.
- **Data retention** — `deleteCandidateData()` / `anonymizeCandidate()` service boundaries. Not implemented.
- **Resume virus scanning** — spec §22 step 3. Not implemented (file MIME/extension/size/signature validation IS done).
- **Distributed rate limiting** — current limiter is in-memory (fine for a single API instance). Move to a shared store (Redis) for multi-instance.

## Product features (not yet built)

- **Notifications center** — lightweight "3 new candidates / 1 assessment completed" panel.
- **Command menu (⌘K)** — quick search/actions.
- **Bulk candidate actions** — select candidates → move stage / send assessment / reject.
- **Assessment-status filter** on the candidates list (basic filters exist: job, stage, score, location, salary, search).
- **Email reminders** — assessment/interview reminder scheduling (invite/advanced/rejected templates exist).
- **Interview scheduling** — calendar invites, availability.
- **Job duplication** — clone job + form + workflow (not candidates).
- **CSV / external import** — candidates, jobs.
- **OAuth / Google login** — Supabase supports it; not wired (email + dev test-token today).
- **Offer management** — intentionally out of V1 (spec §138); `HIRED` stage exists.

## Notes

- All external providers (AI, email, storage) run as **realistic mocks** with zero keys. Set keys in `.env` to activate real Anthropic/OpenAI, Resend, and R2/S3.
- Auth uses a dev test-token path locally; wire Supabase (`SUPABASE_*`) for production.
