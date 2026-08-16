# API

Base URL: `/api/v1`. All responses use one envelope:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "JOB_NOT_FOUND", "message": "Job not found" } }
```

Authenticated requests send `Authorization: Bearer <token>` and, for workspace-scoped routes, `X-Workspace-Id: <id>`. Validation is Zod on body/query/params.

## Auth
- `GET /auth/me` — session (user + workspaces + needsOnboarding)
- `PATCH /auth/profile`
- `POST /auth/test-token` — dev only; issues a signed token for `{ email, name? }`

## Workspaces
- `POST /workspaces`, `GET /workspaces`, `POST /workspaces/onboarding`
- `GET/PATCH /workspaces/:id` · `GET/POST /workspaces/:id/members` · `PATCH/DELETE /workspaces/:id/members/:memberId`

## Jobs
- `GET /jobs` · `POST /jobs` · `GET/PATCH /jobs/:jobId`
- `POST /jobs/:jobId/publish` · `POST /jobs/:jobId/status`
- `POST /jobs/generate-description` — AI JD generation
- `GET/PATCH /jobs/:jobId/form` · `GET/PUT /jobs/:jobId/workflow`

## Candidates & applications
- `GET /candidates` (filter/search/paginate) · `GET /candidates/:id` · `GET /candidates/:id/resume-url`
- `GET /applications/:id` · `GET /applications/:id/timeline` · `GET /applications/:id/workflow-run`
- `POST /applications/:id/stage|shortlist|hire|reject|rescreen`
- `POST /applications/:id/assessments` (send) · `GET /applications/:id/assessments`

## Question bank & assessments
- `GET/POST /questions` · `GET /questions/categories` · `GET/PATCH/DELETE /questions/:id`
- `GET/POST /assessments` · `GET/PATCH /assessments/:id`

## Analytics
- `GET /analytics`

## Careers page
- `GET /careers` (config) · `PUT /careers` (sections + publish) · `POST /careers/slug` (claim URL) · `GET /careers/slug-available?slug=`

## Public (no auth, token/slug gated)
- `GET /public/jobs/:workspaceSlug/:jobSlug` · `POST /public/jobs/:workspaceSlug/:jobSlug/apply` (multipart)
- `GET /public/careers/:slug` (careers page) · `GET /public/careers/:slug/jobs` (embed)
- `GET /public/assessments/:token` · `POST /public/assessments/:token/start|answer|submit`

## Roles
`viewer` read-only · `recruiter` manage jobs/candidates/assessments/workflows · `admin` + members/settings · `owner` everything. Enforced by `requireRole`.
