# Security

## AuthN / AuthZ
- Bearer token verified on every authenticated request via `AuthTokenVerifier` (Supabase HS256, or a dev test token). Users are mirrored into Mongo.
- Middleware chain: `authenticate → resolveWorkspace → requireWorkspace → requireRole`. Resource ownership is checked in services. The frontend never decides authorization.
- Workspace isolation: every org-owned query is scoped by `workspaceId`; non-members get 403.

## Public surface
- Candidate endpoints live under `/public/*`, are rate-limited, and are token/slug-gated. A candidate token authorizes only its own operation — never reading other candidates or workspace data.
- Application submission validates all fields, checks file MIME/extension/size **and content signature** (magic bytes), and detects duplicates.

## Files
- Resumes live in object storage, never Mongo. Access is via **short-lived signed URLs** (5 min); the mock adapter signs local files with an HMAC + expiry.

## Transport & input
- `helmet` secure headers, configurable CORS allow-list, per-route rate limits (login, public apply, upload, AI, assessment).
- Zod validation on body/query/params. Mongo queries use parameterized filters and escape user-supplied regex — never string-interpolated.
- Central error middleware never leaks stack traces in production.

## Reliability & audit
- Idempotency keys on external operations (email, resume parse, assessment invites) via the queue's partial unique index.
- `audit_logs` records job/candidate/assessment/workflow actions.
- Structured logging (pino) redacts `authorization`, `password`, `apiKey`, and resume content; sensitive data is never logged.

## Not yet wired (roadmap)
- Sentry / PostHog integration points exist in config but are inert without keys.
- Webhook signature verification and data-retention (`deleteCandidateData` / `anonymizeCandidate`) are designed for but not implemented in V1.
