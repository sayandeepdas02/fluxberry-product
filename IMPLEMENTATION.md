# Implementation Plan: Fluxberry → binary.so Feature Parity

## Why this document exists

We ran a hands-on competitive teardown of binary.so — signed up, built a workspace, published a job, applied as a candidate, reviewed the candidate record, and audited settings, pricing, integrations, and analytics — then cross-referenced every finding against this codebase (models, services, routes, and frontend pages across `backend/`, `frontend/`, and `shared/`).

**Where we already win:** AI depth (resume parsing, blended screening scores with reasoning, AI-generated job descriptions, AI voice interviews, workflow automation — all ungated), real analytics (binary.so's equivalent is a blurred lock icon behind a paywall), and coding/MCQ assessments (binary.so has nothing comparable).

**Where we're behind:** pipeline flexibility (fixed 7-stage enum vs. binary's fully custom stages), zero third-party integrations (Slack, Google Calendar, LinkedIn), no candidate tags or two-way messaging, no per-job access control, no employee referral system, and — the single largest gap — **no billing or monetization mechanism exists in the product at all.**

This document is the engineering build spec to close every one of those gaps, broken into three sequential phases. Each phase is self-contained enough to ship and demo on its own; later phases build on infrastructure the earlier phases put in place.

**Foundational blocker, read this first:** `backend/src/middleware/auth.ts` is currently fully bypassed — `authenticate` always injects a fixed dev identity, `resolveWorkspace` always grants `role: 'owner'` with no real membership check, and `requireRole()`/`requireWorkspace` are no-op passthroughs. The real implementation already exists and compiles (`backend/src/auth/`, `backend/src/repositories/member.repository.ts`, `backend/src/models/workspace-member.model.ts`, `ROLE_RANK` in `shared/src/enums.ts`) — it's just unused. **Every gating feature in every phase below is decorative until this is fixed**, so it's the first item in Phase 1.

## Conventions to follow throughout

- **Backend vertical slice**: `shared/src/schemas/<x>.ts` (Zod input + DTO types) → `backend/src/models/<x>.model.ts` (Mongoose, `InferSchemaType` + `models.X || model<X>(...)` guard) → `backend/src/repositories/<x>.repository.ts` (thin, workspace-scoped) → `backend/src/services/<x>.service.ts` (business logic, `eventBus.publish`, `auditService.log`, `jobQueue.enqueue`) → `backend/src/serializers/<x>.serializer.ts` → `backend/src/controllers/<x>.controller.ts` (thin `asyncHandler` wrappers) → `backend/src/routes/<x>.routes.ts` (guard array `[authenticate, resolveWorkspace, requireWorkspace]` + `requireRole()`/`validateBody()`) → mounted in `backend/src/routes/index.ts`.
- **Third-party integrations**: `backend/src/integrations/<name>/{types.ts, mock.ts, <real>.ts, index.ts}` — interface in `types.ts`, a deterministic no-network `mock.ts`, real vendor adapter(s), `index.ts` exporting a memoized `getXProvider()` selected by `config.providers.mockAll` then vendor env, plus `__resetXProvider()` for tests. This is the existing pattern behind `ai/`, `email/`, `storage/`, `coding/`, `interview/` — every new integration follows it exactly.
- **Config**: all env vars validated once in `backend/src/config/env.ts`, reshaped into `config.providers.<x>` / `config.features`. Nothing reads `process.env` elsewhere.
- **Feature flags**: `shared/src/feature-flags.ts` (`FEATURE_FLAGS` + `DEFAULT_FEATURE_FLAGS`) → `config.features` → `requireFeature('<X>')` middleware and/or direct checks in services → `GET /meta` → `frontend/hooks/use-features.ts` `useFeature('<X>')`.
- **Async work**: a hand-rolled Mongo-backed job queue (`backend/src/queue/job-queue.ts`, no Bull/Redis) — `enqueue(type, payload, {runAt?, maxAttempts?, idempotencyKey?})`, handlers in `backend/src/workers/handlers/`. New async work (webhooks, digests, notifications) uses this, not new infra.
- **Frontend**: Next.js app router, all dashboard pages `'use client'`. React Query v5, one `use-<domain>.ts` hook file per resource, query keys `[entity, workspaceId, ...]`, mutations invalidate rather than optimistically patch. Form state is plain `useState` + `Field`/`Input`/`Select` primitives from `frontend/components/ui/` (shadcn/ui-style Radix wrappers) — react-hook-form is reserved for the 3 auth pages only. The "hydrate a local edit-buffer from query data exactly once via `useEffect`" pattern (used by job settings, careers builder, form builder) is the standard for new builder-style pages.
- **RBAC**: `Role = 'owner'|'admin'|'recruiter'|'viewer'`, `ROLE_RANK` for "at least" comparisons (`shared/src/enums.ts`) — reuse this model, don't replace it.

---

## Phase 1 — Foundations & Quick Wins

**Goal:** make every future gate real (auth), give the product a revenue mechanism (billing), and close the three sharpest day-to-day pipeline gaps (custom stages, tags, messaging). Ship this as its own release before starting Phase 2.

**Sequencing inside this phase:** item 1.0 (auth de-bypass) must land first and be green in CI before anything else in this phase merges on top of it. Item 1.1 (billing) can proceed in parallel once 1.0's `requireRole` contract is stable. Items 1.2–1.4 are independent of each other.

### 1.0 — Auth/RBAC de-bypass (do first, blocking)

Rewrite `backend/src/middleware/auth.ts`:
- `authenticate`: read `Authorization: Bearer <token>`, verify via `getTokenVerifier().verify(token)` (the existing `CompositeVerifier` → `TestTokenVerifier` → `SupabaseVerifier` chain), then `authService.ensureUser(identity)`.
- `resolveWorkspace`: resolve `workspaceId` from the `x-workspace-id` header/param, call `memberRepository.find(workspaceId, userId)`. Found → set `req.auth.role` from the real membership doc. Not found → leave unset so `requireWorkspace` rejects with `403`.
- `requireWorkspace`: reject if `req.auth.workspaceId` is unset.
- `requireRole(min)`: real check — `ROLE_RANK[req.auth.role] >= ROLE_RANK[min]` else `403`.
- Add a cutover flag `AUTH_BYPASS_ENABLED` (env, default `false`) that restores today's exact bypass behavior when `true` — a local/dev-only escape hatch, never a supported production mode.

Verify while here: `workspace.service.ts`'s `create()`/`onboard()` creates an `owner` membership row for the workspace creator; `frontend/lib/api-client.ts` attaches a real bearer token from the Supabase session.

**Test impact (budget real time here):** every test under `backend/test/**` that relied on the bypass needs a real test token. Add `backend/test/helpers/auth.ts` (`authHeaders(userId, workspaceId, role)`) that mints via the existing `/auth/test-token` route and seeds a matching `WorkspaceMemberModel` row. Do this as its own PR, merged green, before any other Phase 1 item lands on top — otherwise every subsequent PR's tests also need auth fixes, multiplying the work.

**Production cutover:** before flipping `AUTH_BYPASS_ENABLED` to `false` in production, verify every existing workspace has an `owner` membership row; backfill orphans via a one-off script under `backend/src/scripts/`. Confirm `AUTH_ALLOW_TEST_TOKENS=false` in production env alongside `AUTH_BYPASS_ENABLED=false`.

### 1.1 — Dodo Payments billing + plan-gating scaffold

New integration module `backend/src/integrations/dodo/{types.ts,mock.ts,dodo.ts,index.ts}` following the established pattern:

```ts
export interface BillingProvider {
  readonly name: string;
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  createPortalSession(input: PortalSessionInput): Promise<PortalSessionResult>;
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: Buffer): WebhookEvent;
  getSubscription(customerId: string): Promise<SubscriptionInfo | null>;
}
```
- `mock.ts`: deterministic checkout URL + in-memory subscription map (mirrors `MockEmailProvider`).
- `dodo.ts`: real adapter — **flag explicitly**: confirm Dodo Payments' exact endpoint paths/payload/signature scheme against their live docs before finishing this file; keep method signatures fixed regardless so nothing downstream changes once confirmed.
- `index.ts`: `getBillingProvider()`/`__resetBillingProvider()`, selected via `config.providers.mockAll` then `config.providers.billing.apiKey`.
- Config additions in `backend/src/config/env.ts`: `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_ENVIRONMENT`, `DODO_PRO_PRODUCT_ID` → `config.providers.billing`.

Model changes:
- `backend/src/models/workspace.model.ts` — add `billing: {customerId, subscriptionId, subscriptionStatus, currentPeriodEnd}`. `plan` (`FREE|PRO`) stays the effective gate, flipped only by the webhook handler.
- New `backend/src/models/billing-event.model.ts` — audit log of raw webhook events (`{workspaceId, providerEventId (unique), type, payload, processedAt}`), doubling as DB-level idempotency.

Service `backend/src/services/billing.service.ts`:
- `createCheckout(workspaceId, userId, plan)` → checkout session with `metadata: {workspaceId}` round-tripped by the webhook.
- `createPortalSession(workspaceId)` → clear 404 if no `customerId` yet.
- `handleWebhook(rawBody, sig)` → verify signature → **enqueue** `jobQueue.enqueue('PROCESS_BILLING_WEBHOOK', {...}, {idempotencyKey: 'dodo-webhook-'+event.id})`, return `200` immediately (never mutate synchronously in the route). New `JOB_QUEUE_TYPES` entry + worker handler `backend/src/workers/handlers/process-billing-webhook.ts`: `subscription.active/updated` → `plan='PRO'`; `subscription.canceled`/failed-past-grace → `plan='FREE'`.

Plan → feature-flag mapping: new `shared/src/plan-features.ts` (`PLAN_FEATURES: Record<WorkspacePlan, FeatureFlag[]>`). New `requirePlanFeature(flag)` middleware: `config.features[flag] && PLAN_FEATURES[plan].includes(flag)`, else `403 {code:'PLAN_UPGRADE_REQUIRED', flag}`. Apply now to `ADVANCED_ANALYTICS` and `AI_INTERVIEW` (currently dead/ungated flags) as the reference implementation.

API: `backend/src/routes/billing.routes.ts` — `POST /workspaces/:id/billing/checkout` (`requireRole('owner')`), `POST .../billing/portal`, `GET .../billing`, and `POST /api/v1/webhooks/dodo` (no auth middleware, `express.raw()` body parsing carved out before the global `express.json()`).

Frontend: new Settings → Billing tab, `frontend/hooks/use-billing.ts`, a plan-comparison block sourced from `PLAN_FEATURES`, and a reusable `PlanUpgradeModal` triggered on any `403 {code:'PLAN_UPGRADE_REQUIRED'}` — this becomes the standard upsell UX every later plan-gated feature reuses.

### 1.2 — Custom pipeline stages

**Decision: per-job ordered custom-stage array, not a full enum rip-out, not a pure label overlay.** Keep `Application.stage` as a free-form string (drop the Mongoose enum), default every job to the 7 system stages, let jobs opt into a custom ordered list.

- `backend/src/models/job.model.ts` — add embedded `stages: [{id, label, color, sortOrder, system, terminal}]`, `default: null` (`null` = system defaults).
- `backend/src/models/application.model.ts` — `stage` becomes `{type: String, required: true, default:'APPLIED'}`, no enum constraint; validity enforced in the service layer.
- `shared/src/schemas/workflow.ts` — `moveStageConfig.stage` becomes `z.string().min(1)`. `condition-engine.ts`'s `'stage'` field needs no change (already string comparison).
- New `shared/src/schemas/pipeline-stage.ts` (`upsertPipelineStagesSchema`, max 20 stages).
- `backend/src/services/job.service.ts` — `getStages`/`updateStages`: `system` stages can be relabeled/reordered but not deleted; deleting a stage with active applications is rejected (`409` with affected-candidate count); at least one non-terminal stage must remain. Workflow `MOVE_STAGE` execution validates the target stage id still exists at run time and fails soft if not.
- New endpoints: `GET/PUT /jobs/:jobId/stages` (`requireRole('recruiter')`).

Frontend touch-list: `frontend/lib/labels.ts`'s `STAGE_LABELS` becomes the default-only fallback; `frontend/components/candidates/candidate-board.tsx`'s hardcoded `COLUMNS` becomes a `stages` prop; `candidates-view.tsx`'s stage filter and the candidate detail move-stage `<Select>` source from `job.stages` when scoped to one job. **Confirm with product**: the cross-job "All candidates" board can't merge differently-named per-job columns — recommend it stays on the 7 system stages, with custom columns only on per-job views (verify this matches binary.so's actual behavior, which we didn't directly observe). New "Manage stages" UI in job settings (add/rename/reorder via `@dnd-kit/sortable`/delete/color-pick, same builder pattern as `form/page.tsx`). Job clone must deep-copy `stages`.

### 1.3 — Candidate tags/labels

- New `backend/src/models/label.model.ts` (workspace-scoped `{name, color}`, unique per workspace).
- `backend/src/models/application.model.ts` — add `labelIds: [ObjectId ref Label]`.
- New `shared/src/schemas/label.ts` + full CRUD slice: `GET/POST /workspaces/:id/labels`, `PATCH/DELETE .../labels/:labelId`, `PUT /applications/:id/labels` (full-replace, `requireRole('recruiter')`). Deleting a label `$pull`s it from every application's `labelIds`.
- Application/candidate-list serializers resolve `labelIds` into `{id,name,color}[]`.
- Frontend: add the missing `frontend/components/ui/popover.tsx` wrapper (Radix Popover is installed but unwrapped — follow `dialog.tsx`'s idiom exactly). New `label-picker.tsx` (checkbox list + inline "create new label" + color swatches). Label chips on candidate cards/rows/detail page; label filter on `candidates-view.tsx`. Caps: 100 labels/workspace, 20/application.

### 1.4 — Two-way candidate messaging

- New `backend/src/models/message.model.ts` — one thread per application: `{workspaceId, applicationId, sender:'recruiter'|'candidate', senderUserId, subject, body, providerMessageId (unique, partial index), direction:'outbound'|'inbound', readByRecruiter}`.
- `backend/src/services/message.service.ts`:
  - `sendAdHoc()`: persist the outbound message, then reuse the **existing** `SEND_EMAIL` queue + `getEmailProvider().send()` — only new addition is a `Reply-To: application+<id>@<INBOUND_EMAIL_DOMAIN>` convention (new `replyTo?` field on `EmailInput`).
  - `receiveInbound(payload)`: **open item** — Resend is outbound-only today; inbound needs either a Resend inbound feature (if plan supports it) or a separate vendor (Postmark/SendGrid/Mailgun inbound). Design the webhook to accept a normalized `{to,from,subject,text,html,messageId}` shape regardless of vendor. Parse `applicationId` from the `to` address, dedupe via `providerMessageId`, never bounce-loop on parse failure.
- `backend/src/models/notification.model.ts` — add `'new_message'` type, fan out to `recruiter+` workspace members on inbound.
- New endpoints: `GET/POST /applications/:id/messages`, `POST /webhooks/inbound-email/:secret` (URL-secret-gated, same convention as the existing Bolna webhook).
- **Security**: sanitize/escape inbound HTML before rendering — never trust raw inbound `bodyHtml`.
- Frontend: new `message-thread.tsx` tab on candidate detail (chronological bubbles + composer), `use-messages.ts` hook with polling (matches the notification-bell's 30s `refetchInterval` pattern — no websocket layer exists here).

**Phase 1 open risks:** Dodo's exact API is unconfirmed (blocking sub-task); auth de-bypass test-suite updates are the largest line-count item — isolate it in its own PR; inbound-email vendor for messaging is undecided.

---

## Phase 2 — Collaboration & Integrations

**Goal:** the features that make Fluxberry usable by larger, more structured teams — scoped access, real calendar/Slack integrations, reusable workspace templates, and a genuinely differentiated conversational AI surface.

### 2.1 — Per-job/per-requisition access control

Depends on Phase 1's auth de-bypass.

- `backend/src/models/job.model.ts` — add `restrictedTo: [ObjectId ref User]` (empty = visible to all, today's behavior).
- New `requireJobAccess()` middleware (same factory shape as `requireRole()`): `owner`/`admin` always pass; otherwise pass if `restrictedTo` is empty or contains the user. Applied to `job.routes.ts` and `candidate.routes.ts` (via an application→job lookup helper).
- **Perf-critical**: denormalize `restrictedTo` onto `Application.jobRestrictedTo` (synced on job update) rather than `$lookup`-joining on every hot-path candidate-list query. Build one shared `applyJobAccessFilter(query, auth)` repository helper reused everywhere jobs/applications are listed — analytics, workspace-wide candidate list, and command-menu search all need it, and it's easy to miss a call site otherwise.
- Frontend: "Access" section in job settings (multi-select of workspace members, default "Visible to everyone" toggle).

### 2.2 — Google Calendar integration + human interview scheduling

Explicitly separate from the existing AI-voice-interview system (`ai-interview-config.model.ts`, `bolna.ts`) — do not conflate them.

- New `backend/src/integrations/calendar/{types.ts,mock.ts,google.ts,index.ts}` (OAuth2 + Calendar API v3 via `googleapis` — a stable, public API).
- New `backend/src/models/calendar-connection.model.ts` (per-recruiter OAuth grant — **tokens need at-rest encryption**; confirm no existing crypto utility, build one via `node:crypto` AES-GCM if absent).
- New `backend/src/models/interview-schedule.model.ts` (human interviews, distinct model) and `availability.model.ts` (per-recruiter recurring weekly rules).
- `backend/src/services/interview-schedule.service.ts`: `proposeSlots()` (availability minus `getFreeBusy()`, email a booking link, sibling pattern to `frontend/app/interview/[token]`), `bookSlot()` (re-validate free-busy at booking time to avoid double-book races, create the calendar event with the candidate as attendee), `cancelSchedule()`.
- New `EVENT_TYPES` entries (`human_interview.scheduled`/`.completed`).
- New routes: OAuth start/callback, availability CRUD, propose/book/cancel, public token-gated booking page.
- Frontend: Settings → Calendar tab, "Schedule interview" action on candidate detail, public `frontend/app/interview-booking/[token]/page.tsx` slot picker.

### 2.3 — Slack integration

Notification scope has no dependency; the optional Ask-AI-in-Slack scope depends on item 2.5's `chat()` method — sequence notifications first.

- New `backend/src/integrations/slack/{types.ts,mock.ts,slack.ts,index.ts}` (Slack OAuth v2 + `chat.postMessage` + request signing).
- New `backend/src/models/slack-connection.model.ts` (workspace-level, bot token encrypted, `notifyNewCandidate`/`notifyStageChange` toggles).
- New `backend/src/services/slack-notify.service.ts` subscribing to the existing `application.created`/`candidate.stage.changed` event types, enqueuing a new `SEND_SLACK_MESSAGE` job type.
- New Settings → **Integrations** tab — shared home for Slack now and LinkedIn in Phase 3.
- Ask-AI-bot slash command (deferred until 2.5 ships `chat()`).

### 2.4 — Workspace default templates

- New `backend/src/models/workspace-defaults.model.ts` (one per workspace): `defaultStages` (reuses 1.2's `pipelineStageSchema` verbatim), `defaultWorkflowTemplate`, `defaultInterviewNameTemplate`, `replyShortcuts` (feeds 1.4's message composer), `feedbackFormTemplate`, `assignmentLibrary`.
- `job.service.ts`'s `create()` pre-populates a new job's `stages`/workflow from workspace defaults when set.
- New Settings → Advanced/Templates tab, `requireRole('admin')` for edits.

### 2.5 — Conversational "Ask AI" side panel + natural-language auto-shortlist

**Real gap in the AI abstraction, not a prompt tweak** — `AIProvider` is single-shot only today.

- `backend/src/integrations/ai/types.ts` — new `chat(input: ChatInput): Promise<ChatResult>` (multi-turn, tool-call-capable), implemented in `base-llm.ts`/`anthropic.ts`/`openai.ts`/`mock.ts` using each SDK's native multi-turn + tool-use support.
- New `backend/src/models/ai-conversation.model.ts` (scoped `global`/`job`/`candidate`), `ai-chat.service.ts`, full CRUD/send-message slice.
- **NL auto-shortlist**: new dedicated `AIProvider.translateCriteria(nlQuery) → Condition[]` method, mapping free text onto the *existing* workflow condition primitives. Extend `CONDITION_FIELDS` (today only `screening_score, assessment_score, interview_score, years_experience, expected_salary, location, stage`) with `skills_match` (new deterministic field), `source`, and `applied_date` (needs a date-comparison branch in `condition-engine.ts`, since today's `evaluateCondition` only does numeric/string comparison). New `shortlist.service.ts`'s `runNlShortlist()` is a **read-only preview** — recruiter reviews matches and explicitly confirms a bulk action, preserving the "AI advises, human confirms" boundary the product already follows for screening scores.
- Frontend: new `frontend/components/ui/sheet.tsx` (Radix Dialog styled as a side-panel), globally-mounted trigger sibling to `command-menu.tsx` with a **different keybinding** (e.g. Cmd+J — do not collide with Cmd+K), chat panel + shortlist-preview mode showing proposed conditions in plain English + a confirm-and-bulk-action button.

### 2.6 — Application form: generic file-upload + video-response question types

- `shared/src/enums.ts` — add `VIDEO_RECORDING` to `FORM_QUESTION_TYPES`.
- `frontend/app/(dashboard)/app/jobs/[jobId]/form/page.tsx` — remove the existing filter excluding `FILE_UPLOAD` from custom-question choices; add `VIDEO_RECORDING`.
- `apply-form.tsx`'s `CustomField` — new branches: generic file input (new `answerFiles` map, since files can't live in the JSON `answers` map); video via browser `MediaRecorder` (new `video-recorder-field.tsx`, with a plain file-picker fallback — never force live-only recording).
- Backend: replace the public apply route's single-file `multer` config with a generic `.any()` config (mime-type allow-list per question type, per-file/total size caps); `public.controller.ts`'s `apply` handler uploads each `answer_file_<questionId>` via the existing storage abstraction.
- New `GET /applications/:id/answers/:questionId/download-url` endpoint (short-lived signed URL, same pattern as the existing resume-URL endpoint).
- **Flag**: video-sized uploads may need disk-buffered (not memory-buffered) multer storage — 10MB resumes were fine in-memory, ~25MB+ video is a real scaling concern.

**Phase 2 open risks:** per-job access control needs one shared filter helper applied consistently everywhere, or it leaks; Google Calendar OAuth tokens need at-rest encryption; Slack + Calendar both need a public HTTPS callback (confirm the tunneling setup already used for Bolna's webhook can be reused); keep the AI `chat()` tool surface minimal in v1 (read-only shortlist translation, not a general action-taking agent).

---

## Phase 3 — Growth & Monetization Depth

**Goal:** the features that expand sourcing (referrals, LinkedIn) and turn the already-strong analytics engine into a real paid tier.

### 3.1 — Employee referral program

- New `backend/src/models/referral.model.ts`: `{workspaceId, referrerUserId, referrerEmail, referrerName, code (unique per workspace), jobId (optional), applicationIds[], rewardStatus:'NONE'|'PENDING'|'PAID', rewardNote}`.
- **Reward mechanics — explicit v1 decision**: binary.so's own referral rewards were paywalled/unobservable, so this is our own design: **manual tracking only in v1** — an admin marks `PENDING → PAID` with a free-text note, no automated payout integration. Don't assume the Phase 1 Dodo Payments integration trivially extends to *disbursements* (it's built for *collections*) if automated payouts are wanted later.
- **Scope decision — members-only v1**: restrict referral-link generation to workspace members to avoid building a separate referrer-auth surface; external/alumni referrers can be a v2 addition.
- Public flow: `GET /public/r/:code` redirects to the target job's apply page with `?source=REFERRAL&ref=:code`; `public.controller.ts`'s `apply` handler tags the resulting application (new `Application.referralCode` field) and pushes onto `Referral.applicationIds`. `CANDIDATE_SOURCES` already has `REFERRAL` — no enum change needed.
- New routes: `GET /referrals/my` (`requireRole('viewer')` — any member can generate a link), `POST /referrals`, admin-only `GET /workspaces/:id/referrals` + `PATCH .../referrals/:id/reward`.
- Frontend: member-facing `frontend/app/(dashboard)/app/referrals/page.tsx` + an admin reward-management view.

### 3.2 — LinkedIn job cross-posting

- New `backend/src/integrations/linkedin/{types.ts,mock.ts,linkedin.ts,index.ts}`.
- **Business blocker to validate before scheduling engineering time**: LinkedIn's job-posting API requires Talent Solutions partnership-tier access, unlike Google Calendar's self-serve API — confirm Fluxberry can obtain it. If not, fall back to a thinner "generate a pre-filled LinkedIn manual-posting link" feature instead of true API cross-posting.
- New `linkedin-connection.model.ts` (workspace-level OAuth, same shape as Slack's), `Job.linkedInPosting: {postingId, postedAt, status}`.
- Wired into the existing `publish()` flow as an opt-in per-job checkbox — enqueues a new `POST_JOB_TO_LINKEDIN` job type.
- Frontend: LinkedIn card in the Integrations tab (built in Phase 2); publish-dialog checkbox; posting-status display + "Close on LinkedIn" synced to job archive.

### 3.3 — Advanced analytics tier

`analytics.service.ts` is already solid (funnel, 30-day trend, location/salary distribution, time-to-hire, source breakdown, 15-min cache) — this closes the loop on the `ADVANCED_ANALYTICS` flag that's been declared-but-dead since Phase 1's plan-gating middleware was built.

- **Cohort/trend comparison**: reruns existing aggregation pipelines parameterized by two date ranges, returns side-by-side deltas.
- **Recruiter-performance leaderboard**: v1 attributes by `Job.createdBy` (no true per-application ownership concept exists yet) — **flag as an approximation**, don't market it as a precise metric until a real per-application assignment model exists (a natural evolution of Phase 2's `restrictedTo`).
- **Funnel benchmarking** (weakest of the three, first to cut if time is tight): job funnel vs. workspace average, since there's no real cross-customer benchmark dataset yet.
- All new endpoints behind `requirePlanFeature('ADVANCED_ANALYTICS')` — the reference call-site Phase 1's middleware was built for.
- Frontend: new "Advanced" section in the analytics page, rendering the `PlanUpgradeModal` in place of charts when the plan gate rejects.

**Phase 3 open risks:** referral reward automation and external-referrer scope are both explicit v1-descope decisions, not technical constraints — revisit only if there's validated demand; LinkedIn API access is a business/partnership blocker to resolve before scheduling engineering time; the leaderboard's job-creator attribution is a known approximation.

---

## Phase 4 — Existing-Feature UX Parity

**Goal:** Phases 1–3 close feature gaps. This phase closes the *feel* gap — binary.so's day-to-day interaction quality is noticeably better even on features Fluxberry already has. This isn't a visual/color refresh: a direct audit confirmed Fluxberry's design tokens (pink primary CTA, calm white/near-black neutral palette, working light+dark mode) are already coherent and deliberate. The gap is entirely in **interaction patterns** — page-vs-modal choices, missing keyboard shortcuts, absent inline help, terse confirmation copy, and inconsistent per-record action UI. Every item below cites the exact current state so the "before" is never guesswork.

**Sequencing note:** unlike Phases 1–3, these items touch existing screens, not new subsystems — most don't depend on Phase 1's auth de-bypass and could be pulled forward and parallelized with Phase 1 if bandwidth allows. Item 4.1 (candidate modal) and 4.7 (standardized action menu) are the highest-leverage, since they touch the screens recruiters live in most.

### 4.1 — Candidate detail: page → modal with prev/next navigation + sticky action bar

**Current state** (confirmed): `frontend/app/(dashboard)/app/candidates/[candidateId]/page.tsx` is a full page route — opening a candidate means a full navigation away from the list, and returning means a plain "← Candidates" link back. There is no prev/next-candidate control, no keyboard shortcuts anywhere on the page, and no persistent action bar — Shortlist/Reject sit inline in the page header, "Move to stage"/"Send assessment"/"Send AI interview" sit in a separate card further down. binary.so's equivalent opens as a modal overlay with left/right chevrons at the screen edges to move between candidates without losing your place in the list, plus a sticky bottom bar (Archive/Shortlist/stage-dropdown) showing single-letter keyboard hints.

- Convert the candidate detail route to open as a modal/sheet over the candidates list (reuse the `frontend/components/ui/sheet.tsx` primitive being introduced in Phase 2 item 2.5, or build it now if Phase 4 ships first — either way, one new primitive, one build). Keep the underlying `/app/candidates/[candidateId]` URL working (deep-linkable, shareable) by rendering the modal as an intercepting route or a client-side overlay driven by the URL, not by removing the route.
- Add prev/next navigation: `candidates-view.tsx` already holds the filtered/sorted candidate list in memory — pass the current list's ordered ids into the detail view (via query param, route state, or a shared context) so the modal can compute "next id"/"previous id" and wire left/right arrow buttons plus `ArrowLeft`/`ArrowRight` keydown handlers.
- Add a sticky bottom action bar (Shortlist / Reject / Move-to-stage dropdown) replacing the current scattered inline buttons, with small keyboard-hint badges (reuse the `<kbd>` styling already used once in `command-menu.tsx:60`) — e.g. "S" for Shortlist, "A" for Archive/Reject. Wire the actual keydown listeners in the modal component (scoped to when the modal is open, so these shortcuts don't fire globally).

### 4.2 — Job creation: wizard → live single-page document

**Current state** (confirmed): `frontend/app/(dashboard)/app/jobs/new/page.tsx` is a strict 3-step wizard (Basics → Description → Review) with no autosave — nothing persists until "Save draft"/"Publish job" on the final step — and no live preview; the candidate-facing rendered preview only appears on step 3, requiring a "Back" click to resume editing. binary.so's builder is one continuously-editable, always-autosaving document where editing *is* the preview (what the recruiter sees while typing is exactly what the candidate will see).

- Restructure job creation as a single scrollable page: title (large heading, inline-editable), meta fields (location, employment type, work mode, salary, experience) as inline pills/tags rather than a separate step, description as an inline rich-text/markdown area rendering in place.
- Add autosave: debounce field changes into a `PATCH /jobs/:id` call (job is created as a `DRAFT` on first keystroke rather than only on an explicit step-3 submit), with a small "Saving…/Changes saved" indicator near the title — mirrors the `frontend/app/(dashboard)/app/jobs/[jobId]/form/page.tsx` builder's existing dirty-state pattern, just wired to autosave instead of an explicit Save button.
- Keep the AI-generate-description action available inline (not gated behind a separate step) — a button near the description field that fills it in place, exactly like today's step-1 toggle, just not gated behind wizard navigation.
- This converts job *creation* and job *settings* (`frontend/app/(dashboard)/app/jobs/[jobId]/settings/page.tsx`) into effectively the same continuously-editable document — consider merging them into one screen once this ships, since a wizard-vs-settings-page distinction stops making sense once creation itself is a live document.

### 4.3 — Job publish flow: real confirmation moment with shareable link

**Current state** (confirmed): publishing today produces only a terse toast — `'Job published'` — then either a redirect to the job's own page (from the new-job wizard) or nothing at all (from the job overflow menu). The shareable application link exists as a separate, disconnected "Copy application link" button elsewhere in the UI; publishing never surfaces it. binary.so shows a dedicated confirmation screen immediately after publish: a centered success state, the short shareable link inline with a one-click copy button, and a soft feature nudge below it.

- After a successful publish mutation, show a confirmation dialog/panel (not just a toast) with: a success icon + "Job published" heading, a one-line reassurance ("Your job is live and accepting applications"), the shareable link inline with a "Copy link" button (reuse the existing `copyLink` logic from `jobs/[jobId]/layout.tsx`, just surfaced automatically instead of requiring a separate manual click), and a dismiss action.
- Keep the existing toast as a fallback for the "Publish" action taken from the overflow menu when the confirmation dialog would be redundant (e.g. re-publishing an already-shared job) — use judgment on when the full confirmation vs. a toast is shown, but the *first* publish of a job should always get the full moment.

### 4.4 — Inline helper copy on settings and form-builder toggles

**Current state** (confirmed): every `Switch` in `frontend/app/(dashboard)/app/jobs/[jobId]/form/page.tsx` (Required/Enabled on both system and custom fields) is a bare label with no explanation of what it does. The `Field` component already supports a `hint` prop and it's already used elsewhere (e.g. `Field label="Skills" hint="Used to match and score candidates."` in `jobs/new/page.tsx`) — this is purely a matter of applying an existing, proven pattern to a surface that was missed, not building anything new.

- Add one-line muted hint copy under every settings/form-builder toggle using the existing `Field`/hint pattern — e.g. "Required" → "Applicants must answer this before submitting"; "Enabled" → "Show this question on the application form". Audit `careers/page.tsx`, `interview/page.tsx`, `workflow/page.tsx`, and `question-dialog.tsx`'s switches at the same time (not individually confirmed in the audit, but likely the same gap) and apply the same fix everywhere a bare `Switch` exists without a hint.

### 4.5 — Empty states: support embedded demo/help links

**Current state** (confirmed): `frontend/components/ui/empty-state.tsx` supports only `icon`, `title`, `description`, `action` — every empty state in the app (jobs list, candidates list, assessments, analytics) is purely informational with no path to learn more. binary.so's empty states on features a recruiter hasn't used yet (Interviews, Assignments) pair the same icon+title+description with a short "Watch a 5 min demo" video link — genuinely useful first-run education embedded exactly where it's needed.

- Extend `EmptyState`'s props with an optional `helpLink?: {label: string; href: string}` (or `videoUrl`), rendered as a small secondary link/button below the primary action. Apply it first to empty states for genuinely new-to-the-user features (once built: Ask AI panel, Calendar/Slack integrations, referrals) rather than retrofitting every existing empty state — the highest-value use is orienting people to features they haven't tried yet.

### 4.6 — Question-type picker: icon-per-type visual richness

**Current state** (confirmed): `AddQuestionDialog` in `frontend/app/(dashboard)/app/jobs/[jobId]/form/page.tsx` renders question types as a plain `<Select>` with text-only labels ("Short text", "Multiple choice", etc.) — visually indistinguishable from any other dropdown in the app. binary.so's equivalent shows a distinct icon per type (T for short answer, lines for long answer, # for number, list for multiple choice, phone/LinkedIn/calendar/paperclip/video-camera icons for their respective types), making the picker scannable at a glance rather than requiring reading each label.

- Replace the plain `<Select>` with a small icon+label list (a popover or an inline grid of clickable rows), each `FormQuestionType` mapped to a `lucide-react` icon (`Type` for short text, `AlignLeft` for long text, `Hash` for number, `List` for multiple choice, `ToggleLeft` for yes/no, `Paperclip` for file upload, `Video` for the new video-recording type from Phase 2 item 2.6). This is a small, self-contained component change — no schema/backend impact.

### 4.7 — Standardize a reusable per-record "..." action menu

**Current state** (confirmed): there is no consistent action-menu pattern anywhere in the app today. The `DropdownMenu` primitive is used in exactly one place for record actions (the job detail overflow menu — Publish/Pause/Resume/Close/Duplicate). Every other surface invents its own: candidates use inline "Shortlist"/"Reject" buttons with no menu; the members list uses a bare "Remove" text button; the question bank uses a single icon button that archives directly with no Edit/Delete choice; jobs list rows have no per-row action affordance at all. binary.so uses one consistent "..." menu with the same Edit/Move/Delete vocabulary everywhere — candidates, jobs, forms — so the interaction is learned once and reused everywhere.

- Build one reusable `frontend/components/ui/record-menu.tsx` (or extend the existing `dropdown-menu.tsx` wrapper with a preset "record actions" variant) taking a declarative `actions: {label, icon, onSelect, variant?:'default'|'destructive'}[]` prop.
- Roll it out to: candidate list rows and candidate detail (Edit label metadata / Move to another job / Archive), jobs list rows (Edit / Duplicate / Close / Archive — consolidating what's currently only in the job detail overflow menu), members list (replacing the bare "Remove" button with a menu that also holds role-change, consistent with everywhere else), question bank rows (Edit / Archive, instead of the current single direct-archive icon button).
- This is as much an information-architecture decision as a component build: audit every current bespoke action surface (the exact list above, from the direct-code audit) and migrate each to the shared component rather than leaving old and new patterns coexisting.

### 4.8 — App-wide keyboard shortcuts beyond Cmd+K

**Current state** (confirmed): the *only* keyboard binding anywhere in the dashboard is Cmd/Ctrl+K for the command palette (`command-menu.tsx`) — no single-letter shortcuts exist anywhere (verified by grep across the whole frontend). binary.so shows inline keyboard hints on its bottom action bar (A=Archive, S=Shortlist) as a genuine power-user affordance, not just decoration — recruiters processing dozens of candidates a day feel the difference immediately.

- Introduce a small shared keyboard-shortcut hook (e.g. `frontend/hooks/use-hotkey.ts`, a thin wrapper registering a scoped keydown listener that's disabled while any text input/textarea/contentEditable has focus, to avoid hijacking typing) and wire it into the candidate modal from item 4.1 (S=Shortlist, A=Archive/Reject, ←/→=prev/next candidate) as the first and highest-value application. Extend to other list/detail views opportunistically once the pattern is proven (e.g. `/` to focus search, matching a very common convention), but don't over-scope this item — the candidate modal is where the time-savings actually matters most.

### 4.9 — Toast/confirmation copy pass

**Current state** (confirmed): existing toast copy (`'Job published'`, `'Candidate rejected'`, `'Application form saved'`, `'Member invited'`, etc.) is specific-to-the-entity and reasonably good — better than a generic "Success" — but stays terse/status-style rather than reassuring or benefit-oriented. Error messages fall back to raw thrown-error strings with generic fallbacks (`'Could not save job'`), which is more utilitarian than binary.so's tone.

- This is a lower-effort, high-visibility pass: rewrite the highest-traffic confirmations (publish, shortlist/reject, form save, invite) to state the implication, not just the fact — e.g. `'Job published'` → `'Your job is live and accepting applications'`; `'Application form saved'` → `'Your changes are saved and visible to new applicants'`. Leave error-message tone alone for now (raw error surfacing is often more useful for debugging than a softened generic message) unless a specific error is common enough to deserve a hand-written, actionable string (e.g. the existing `'Logo must be under 1MB'` is already a good example of this done right — extend that quality bar to a few other common validation failures, not a blanket rewrite).

**Phase 4 open risks:** item 4.1 (modal conversion) is the largest single change in this phase and touches a page every recruiter uses constantly — stage it behind a feature flag or do it as a close-reviewed, well-tested standalone PR, not bundled with unrelated candidate-page changes. Item 4.2 (wizard → live document) has the same risk profile for job creation. Items 4.4–4.9 are low-risk, incremental, and can ship independently and continuously without waiting on 4.1/4.2.

---

## Cross-Phase Dependencies

- **Phase 1's auth de-bypass blocks everything downstream**: billing's `requireRole('owner')`, stages/tags/messaging's `requireRole('recruiter')`, Phase 2's per-job access control entirely, both OAuth integrations' per-user connections, the AI panel's per-user conversations, Phase 3's per-member referral codes.
- **Phase 1's `requirePlanFeature` middleware** should exist before every future consumer — Phase 3's advanced analytics explicitly closes the loop on it.
- **Phase 1's `pipelineStageSchema`** (custom stages) is reused verbatim by Phase 2's workspace-default templates.
- **Phase 1's message composer** is extended by Phase 2's reply-shortcut snippets.
- **Phase 2's `AIProvider.chat()`** is a prerequisite for Slack's optional Ask-AI bot scope.
- **Phase 4 is largely independent of Phases 1–3** — it touches existing screens, not new subsystems, so most items can be parallelized with Phase 1 rather than strictly queued after Phase 3. The one real link: item 4.1's candidate modal and item 2.5's Ask AI side panel both introduce the same new `frontend/components/ui/sheet.tsx` primitive — build it once, whichever ships first.

## Verification checklist

Exercise each item end-to-end, not just unit tests:

1. **Auth**: non-member → `403` on any workspace route; `viewer` → `403` on a `requireRole('recruiter')` route; `owner`/`admin` unaffected. Full `backend/test/integration/*` suite green with real test tokens.
2. **Billing**: mock-provider checkout→webhook→plan-flip loop; webhook idempotency (POST the same event twice, confirm one `BillingEventModel` row, no double-processing).
3. **Custom stages**: add/rename/reorder/delete on a job, drag a candidate through them, confirm a `MOVE_STAGE` node referencing a deleted stage id fails soft, not crashes.
4. **Tags**: create/apply/remove/delete, confirm cascade cleanup off applications.
5. **Messaging**: outbound message reaches the mock email outbox; simulated inbound webhook threads correctly and fires a `new_message` notification.
6. **Per-job access**: restricted job invisible (not just blocked) to a non-listed recruiter in both list and detail views.
7. **Calendar/Slack/LinkedIn**: full mock-provider flow first, then a real sandbox account before enabling for real workspaces.
8. **Ask AI panel**: NL-to-shortlist never auto-executes a bulk action without explicit recruiter confirmation — hard requirement, not a nicety.
9. **Referrals**: link → application tagged `source=REFERRAL` with correct `referralCode` → shows in referrer's dashboard.
10. **Advanced analytics**: `FREE` workspace sees the upsell modal, not charts; `PRO` workspace's cohort numbers spot-check against the existing trusted base analytics for the same date range.
11. **Candidate modal**: open a candidate from the list, confirm the URL is still deep-linkable/shareable, navigate prev/next via arrows and keyboard, confirm shortcuts don't fire while a text field has focus.
12. **Live job document**: type in the title/description with no explicit save, refresh the page mid-edit, confirm the draft persisted; confirm the AI-generate action still works inline.
13. **Publish confirmation**: publish a brand-new job, confirm the link shown in the confirmation dialog matches the one produced by the existing "Copy application link" button exactly.
14. **Record menu rollout**: spot-check that candidates, jobs, members, and question-bank rows all now use the same menu component and vocabulary, not a mix of old and new patterns.
