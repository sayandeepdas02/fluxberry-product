# Fluxberry — a simple, AI-native ATS

Fluxberry is a deliberately simple applicant tracking system for startups, founders, and recruiters. The surface is calm and minimal; underneath is a robust, event-driven architecture with AI screening, MCQ assessments, and a durable hiring-workflow engine.

The core object is the **Application** — a candidate can apply to many jobs.

```
Workspace → Job → Application → Candidate → Screening → Assessment → Interview → Hire
```

## What works today

- **Auth & workspaces** — signup/login, onboarding, multi-tenant workspaces, roles (owner/admin/recruiter/viewer)
- **Jobs** — multi-step creation, **AI job-description generation**, publish, stable public slugs
- **Application forms** — toggleable default fields + custom questions
- **Public application** — no candidate account, mobile-first, resume upload
- **Async pipeline** — resume parsing → structured profile → **transparent AI screening** (deterministic sub-scores + AI reasoning) with an explanation
- **Candidates** — table + kanban board, profile with score/timeline, one stage-transition service
- **Assessments** — question bank (seeded), MCQ builder, secure candidate links, server-authoritative timer, server-side scoring, email invites
- **Coding assessments** — Judge0-backed: coding-question editor (languages, visible/hidden test cases, limits), in-browser code runner, async test-case grading with per-case results, wired into the workflow engine (behind `FEATURE_CODING_ASSESSMENT`)
- **AI voice interviews** — Bolna-backed: per-job AI interviewer config (objective + ordered questions + duration + tone), link-based browser voice interview, transcript capture + AI evaluation, wired into the workflow engine with an `interview_score` condition (behind `FEATURE_AI_INTERVIEW`)
- **Workflow engine** — per-job, durable & resumable: AI screen → condition → send assessment → coding test → AI interview → wait → move stage → email
- **Analytics** — funnel, location/salary distribution, sources, time-to-hire
- **Careers page** — a public, per-company page at `/{slug}/careers` (unique claimable URL) with toggleable About/Links/Team sections and an auto-updating open-roles list you can also embed on your own site

Both external features run on realistic mocks with zero keys; set provider keys to go live. The Bolna browser voice SDK (`@bolna/web-call`) is beta/request-access — the candidate page has a documented seam for it.

## Architecture

```
frontend/  Next.js (App Router) + TS + Tailwind + shadcn-style UI + TanStack Query
backend/   Node + Express + TS  (API + worker share one codebase)
shared/    Zod schemas, enums, DTO types (imported by both)
```

`frontend/` and `backend/` are the two deployable applications. `shared/` is an internal
TypeScript library — built at install time (`npm run build --workspace @fluxberry/shared`) and
consumed by both — not a third service; it never runs on its own.

- **Database:** MongoDB + Mongoose
- **Async jobs:** MongoDB-backed `jobs_queue` + a polling worker (atomic claim, retry/backoff, dead-letter). No Redis.
- **Events:** MongoDB `events` collection behind an `EventBus`
- **Providers behind interfaces** (real adapter when keys present, realistic mock otherwise): AI (Anthropic/OpenAI), Email (Resend), Storage (S3/R2), Judge0, Interview
- Layers: `routes → controllers → services → repositories → Mongoose`

See [`docs/architecture.md`](docs/architecture.md) and the rest of `docs/`.

## Prerequisites

- Node.js ≥ 20
- MongoDB running locally (`mongodb://127.0.0.1:27017`) — or a MongoDB Atlas URI
- No external API keys required to run locally (mock providers activate automatically)

## Quick start

```bash
npm install                 # installs all workspaces; builds shared
cp .env.example .env        # defaults work out of the box for local dev
npm run db:seed             # seed workspace "Acme": 3 jobs, 12 candidates, 32 questions, 3 assessments
npm run dev                 # starts shared(watch) + API(:4000) + worker + web(:3000)
```

Open http://localhost:3000, click **Log in**, and enter `demo@fluxberry.dev` (no password — the dev auth path issues a signed test token when Supabase isn't configured).

### Individual processes

```bash
npm run dev:api      # Express API on :4000
npm run dev:worker   # background worker (resume parsing, screening, workflow, email)
npm run dev:web      # Next.js on :3000
```

## Environment

All variables are documented in [`.env.example`](.env.example). A single root `.env` drives both apps. Highlights:

| Group | Keys | Notes |
|---|---|---|
| Core | `MONGODB_URI`, `PORT`, `APP_NAME` | |
| Auth | `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `AUTH_ALLOW_TEST_TOKENS` | leave Supabase blank locally to use the dev token path |
| Providers | `AI_PROVIDER`/`AI_API_KEY`, `RESEND_API_KEY`, `STORAGE_*`, `JUDGE0_*` | blank → mock; set → real |
| Flags | `FEATURE_*`, `MOCK_EXTERNAL_SERVICES` | |

## Scripts

```bash
npm run dev            # everything, hot-reloading
npm run build          # build shared → backend → frontend
npm run typecheck      # typecheck all workspaces
npm run test           # backend unit + integration (Vitest)
npm run db:seed        # seed dev data
npm run db:migrate     # sync all MongoDB indexes
```

## Testing

- **Unit** (`backend/test/unit`): scoring engine, workflow condition engine
- **Integration** (`backend/test/integration`): full auth → workspace → job → public application → candidate flow, plus RBAC, against a real local MongoDB (`fluxberry_test`) with mock providers
- **E2E** (`frontend/e2e`): Playwright — signup → onboarding → create job (needs the dev servers running)

```bash
npm run test                 # unit + integration
npm run test:e2e             # Playwright (start `npm run dev` first)
```

## Deployment (fluxberry.in)

- **Frontend + Backend API →** Vercel — one project, defined in [`vercel.json`](vercel.json)
  using [Vercel Services](https://vercel.com/docs/services): the Next.js app and the Express API
  deploy together on one domain, with `/api/backend/*` routed to the API and everything else to
  the frontend.
- **Worker →** Railway (or Render) — the async job worker (resume parsing, AI screening, email,
  workflow engine) is a long-running process that polls MongoDB, which Vercel Functions
  can't run. It deploys separately from the *same* `backend/` codebase using
  [`railway.toml`](railway.toml) and the existing `npm run start:worker` script — no code changes,
  just a second small deploy target.
- **Database →** MongoDB Atlas
- **Auth →** Supabase (JWT verified by `backend/src/auth/supabase-verifier.ts`)
- **Storage →** Cloudflare R2 or S3
- **Email →** Resend

No Kubernetes, no microservices split beyond the one unavoidable exception (the worker). See
[`docs/local-development.md`](docs/local-development.md).

### Deploying to production, step by step

1. **MongoDB Atlas** — create a free (M0) cluster, copy the connection string into `MONGODB_URI`.
2. **Supabase** — create a project, copy `SUPABASE_URL` / `SUPABASE_JWT_SECRET` (and the anon key
   for the frontend).
3. **Cloudflare R2** (or S3) — create a bucket, set up a public domain/CDN for it, copy the
   endpoint + keys into `STORAGE_*`.
4. **Resend** — verify your sending domain, copy `RESEND_API_KEY`.
5. **Vercel** — import this repo. It auto-detects `vercel.json`. Set every env var from
   [`.env.production.example`](.env.production.example) (backend vars and `NEXT_PUBLIC_*` vars both
   go in the same Vercel project's Environment Variables). Point `fluxberry.in` at it.
6. **Railway** — create a new project from the same repo (root directory: repo root). It picks up
   `railway.toml` automatically. Set the same backend env vars as step 5 (`MONGODB_URI`,
   `SUPABASE_JWT_SECRET`, `RESEND_API_KEY`, `STORAGE_*`, `AI_API_KEY`, etc. — the worker needs
   everything the API needs, minus the `NEXT_PUBLIC_*`/`PORT`/`CORS_ORIGINS` ones).

## License

Prototype / internal.
