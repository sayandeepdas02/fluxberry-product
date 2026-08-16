# Architecture

Fluxberry is a **modular monolith**: one Next.js frontend, one Express backend, one worker (sharing the backend codebase), one MongoDB, one object store.

## Request path

```
UI (client component / hook)
  → TanStack Query → lib/api-client (injects Supabase/test token + X-Workspace-Id)
    → Express route → middleware (authenticate → resolveWorkspace → requireWorkspace → requireRole)
      → controller (thin) → service (business logic, emits events) → repository → Mongoose → MongoDB
```

Business logic lives in **services**. Controllers only translate HTTP ↔ service calls. Repositories isolate persistence.

## Async processing

Anything slow is enqueued, never done in the request:

```
POST /public/applications
  → save candidate + application + answers → emit application.created
  → enqueue PARSE_RESUME → return 201

worker: PARSE_RESUME → extract text → AI parse → parsedProfile → enqueue SCREEN_CANDIDATE
        SCREEN_CANDIDATE → deterministic sub-scores + AI reasoning → screeningResult → emit screening.completed
```

- **Queue:** `jobs_queue` collection. The worker claims jobs with an atomic `findOneAndUpdate` (`status: PENDING, runAt ≤ now`), retries with exponential backoff, dead-letters after `WORKER_MAX_ATTEMPTS`, and reclaims jobs whose lock is stale. Behind the `JobQueue` interface so it can become Redis/BullMQ/SQS later.
- **Events:** `EventBus.publish` writes to `events` (source of truth for the candidate timeline & analytics) and notifies in-process subscribers. Critical pipeline steps are enqueued explicitly, so a dropped subscriber never corrupts state.

## Provider abstractions

Core services depend only on interfaces in `backend/src/integrations`:
`AIProvider`, `EmailProvider`, `StorageProvider`, `CodeExecutionProvider`, `InterviewProvider`.
Each getter returns the real adapter when keys are present, otherwise a realistic mock — so the whole product runs, and tests pass, with zero external keys.

## Multi-tenancy

`workspaceId` scopes every org-owned record. The auth middleware verifies: authenticated user → workspace membership → role → resource ownership. The frontend never decides authorization.

## Layout

```
backend/src/
  config/      env (zod-validated), db (single connection)
  middleware/  auth, error-handler, request-id, rate-limit, validate, upload
  routes/ controllers/ services/ repositories/ models/ serializers/
  events/ queue/ integrations/ workers/ utils/
```
