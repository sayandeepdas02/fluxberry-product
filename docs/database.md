# Database (MongoDB / Mongoose)

## Collections

| Collection | Purpose | Key indexes |
|---|---|---|
| `users` | Mirrored auth identities | `email` unique, `supabaseId` unique sparse |
| `workspaces` | Tenancy boundary | `slug` unique, `careersSlug` unique partial |
| `careers_pages` | Public careers-page config (one per workspace) | `workspaceId` unique |
| `workspace_members` | Membership + role | `(workspaceId, userId)` unique, `userId` |
| `jobs` | Job postings + structured requirements | `(workspaceId, status)`, `(workspaceId, slug)` unique |
| `application_forms` | One embedded-question form per job | `jobId` unique |
| `candidates` | Workspace-scoped people | `(workspaceId, email)` unique |
| `applications` | The central hiring object | `(jobId, candidateId)` unique, `(workspaceId, jobId)`, `(workspaceId, stage)`, `(workspaceId, score)`, `candidateId` |
| `application_answers` | Answers per application (one doc) | `applicationId` unique |
| `screening_results` | Versioned screening history | `(applicationId, version)`, `(applicationId, active)` |
| `questions` | Question bank | `(workspaceId, archived)`, `(workspaceId, category)` |
| `assessments` | MCQ assessments (embedded refs) | `(workspaceId, status)` |
| `candidate_assessments` | Sent tests + answers + score | `secureToken` unique, `applicationId` |
| `workflows` | Per-job workflow (embedded nodes/edges) | `jobId` unique |
| `workflow_runs` / `workflow_steps` | Execution state (durable) | `applicationId`, `workflowRunId` |
| `events` | Domain events → timeline + analytics | `(workspaceId, createdAt)`, `applicationId`, `candidateId` |
| `jobs_queue` | Async job queue | `(status, runAt)`, `idempotencyKey` unique **partial** |
| `audit_logs` | Important actions | `(workspaceId, createdAt)` |

## Notes

- **Application state lives on `applications`**, never on the candidate. A candidate can have many applications.
- `applications.screeningResult` holds the current result; full history is versioned in `screening_results`.
- `idempotencyKey` uses a **partial** unique index (`$type: 'string'`) so many keyless jobs coexist while keyed jobs dedupe.
- Files never live in Mongo — only `{ storageKey, fileName, fileSize, mimeType }` references.
- Migrations = `npm run db:migrate` (syncs all model indexes). Seed = `npm run db:seed`.
