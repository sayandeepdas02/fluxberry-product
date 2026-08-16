# Workflows

Each job can have one workflow — a **linear list of steps** that run top-to-bottom when a candidate applies. Kept intentionally simple (no Zapier-style canvas).

## Node types

| Type | Behaviour |
|---|---|
| `AI_SCREEN` | Wait for AI screening to finish; put `screening_score` in context |
| `CONDITION` | Evaluate a safe structured condition; continue if true, otherwise stop |
| `SEND_ASSESSMENT` | Send an assessment, then wait for the candidate to complete it; put `assessment_score` in context |
| `WAIT` | Durable delay (re-enqueued with `runAt`) |
| `MOVE_STAGE` | Move the application to a stage |
| `SEND_EMAIL` | Email the candidate |
| `CODING_ASSESSMENT`, `AI_INTERVIEW` | Feature-flagged; skipped in V1 |

## Conditions (safe, no eval — spec §97)

`{ field, op, value }` where `field ∈ {screening_score, assessment_score, years_experience, expected_salary, location, stage}` and `op ∈ {gte, lte, gt, lt, eq, neq}`. Missing values fail numeric comparisons (candidate does not qualify).

## Durable execution

- On `application.created`, if the job has an **ACTIVE** workflow, a `workflow_run` is created and `RUN_WORKFLOW` enqueued.
- The engine walks nodes by index, **persisting `context` + a `workflow_step` after every node** (`backend/src/services/workflow-engine.service.ts`).
- At `AI_SCREEN` / `SEND_ASSESSMENT` it sets the run to `WAITING` and returns; it resumes when `screening.completed` / `assessment.completed` fire (`workflowEngine.resumeForApplication`).
- `WAIT` persists `waitUntil` and re-enqueues `RUN_WORKFLOW` with a future `runAt`.
- Errors set the run to `FAILED` with a message (surfaced as "Workflow paused" in the UI).

This survives worker restarts: state lives in Mongo, and every runnable step is a queued job.

## Acceptance (§119)

A run configured `AI screen → score ≥ 7 → send MCQ → score ≥ 70 → move to Interview`:
- Strong candidate (8.4) → screening → assessment (100%) → **Interview**
- Weak candidate (4.9) → **stops** at the screening condition
