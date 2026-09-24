# Talent Sourcing — build spec

Outbound candidate discovery for Fluxberry. A recruiter types one line —
_"Senior Software Engineer with 4+ years of experience in Rust based in
Bangalore"_ — and Fluxberry parses it into filters, searches People Data Labs,
ranks the results with a transparent match score, and lets the recruiter select
people, save them into lists (talent pools), and run email outreach campaigns
about an open role.

It closes the single biggest product gap called out in `IMPLEMENTATION.md`:
Fluxberry collects inbound applicants but cannot help you _find_ people who have
not applied. This is the top-of-funnel that feeds the existing ATS.

```
Prompt → AI criteria → PDL search → ranked contacts → lists → campaigns → replies → convert to candidate → existing pipeline
```

## Where it plugs into the existing architecture

Nothing here is novel infrastructure. It reuses every established pattern:

- **Provider abstraction** — People Data Labs is a new provider behind an
  interface (`integrations/pdl/`), with a realistic mock so the whole flow runs
  with zero keys, exactly like `ai/`, `email/`, `storage/`. Selected by
  `config.providers.sourcing.apiKey`.
- **AI abstraction** — natural-language → structured filters is a new
  `AIProvider.parseSourcingQuery()` method, implemented in `base-llm.ts`
  (Anthropic/OpenAI) and `mock.ts`, mirroring `generateJobDescription`.
- **Vertical slice** — `shared/schemas → models → repositories → services →
  serializers → controllers → routes` under `/api/v1/sourcing/*`.
- **Async queue** — campaign sends fan out through the existing Mongo job queue
  (`SEND_SOURCING_CAMPAIGN` → `SEND_SOURCING_EMAIL`), reusing the `SEND_EMAIL`
  path and Resend adapter.
- **Gating** — a `TALENT_SOURCING` feature flag, PRO-gated via the existing
  `requirePlanFeature('TALENT_SOURCING')`. Frontend already surfaces
  `PlanUpgradeModal` on a `PLAN_UPGRADE_REQUIRED` 403.
- **Multi-tenancy** — every collection is `workspaceId`-scoped and every route
  goes through `authenticate → resolveWorkspace → requireWorkspace →
  requireActiveSubscription`.

## People Data Labs — cost model and controls

The live Person Search API (`GET /v5/person/search`, header `X-Api-Key`) is
**billed one credit per record returned** (roughly $0.28–0.38/record depending on
plan). Search is the expensive operation, so the design treats credits as a
first-class budget:

- **Bounded pages.** A search retrieves `SOURCING_PAGE_SIZE` (25) profiles at a
  time; "Load more" is an explicit, credit-costing action, never automatic.
- **Hard cap.** `PDL_MAX_RESULTS` (default 200) caps how many profiles a single
  search can ever pull.
- **Cache once, reuse free.** Retrieved people are cached as `SourcedContact`
  docs; viewing, listing, exporting, and emailing them never re-hits PDL.
- **Credit accounting.** Each `SourcingSearch` records `creditsUsed`, surfaced
  in the UI so spend is always visible.
- **Mock-first.** With no `PDL_API_KEY`, a deterministic mock generates
  realistic matching people (stable per query, paginated), so dev/demo/tests
  cost nothing. Set the key to go live; method signatures never change.

## Data model (new collections)

| Collection | Purpose | Key fields / indexes |
|---|---|---|
| `sourcing_searches` | One executed NL search (prompt → criteria → cached page state) | `workspaceId`, `createdBy`, `prompt`, `criteria`, `status`, `total`, `fetched`, `creditsUsed`, `scrollToken`, `lastRunAt`. Idx `(workspaceId, createdAt)` |
| `sourced_contacts` | A cached person, workspace-scoped, deduped | `workspaceId`, `pdlId`, `provider`, name/title/company/location/skills/yearsExperience, `workEmail`/`personalEmail`, `rawProfile`, `matchScore`, `matchReasons`, `addedToJob`. Idx `(workspaceId, pdlId)` unique-sparse, `(workspaceId, createdAt)` |
| `sourcing_lists` | A talent pool | `workspaceId`, `name`, `description`, `contactCount`, `createdBy`. Idx `(workspaceId, name)` |
| `sourcing_list_members` | List ↔ contact join | `workspaceId`, `listId`, `contactId`, `addedBy`, `note`. Idx `(listId, contactId)` unique |
| `sourcing_campaigns` | An outreach campaign to a list | `workspaceId`, `name`, `listId`, `subject`, `body` (merge tags), `fromName`, `replyToEmail`, `status`, `scheduledAt`, `sentAt`, `stats{}`. Idx `(workspaceId, status)` |
| `sourcing_campaign_recipients` | Per-recipient send/track state | `workspaceId`, `campaignId`, `contactId`, `email`, `status`, `providerMessageId`, `unsubscribeToken`, `sentAt`, `error`. Idx `(campaignId, status)`, `unsubscribeToken` unique |
| `sourcing_suppressions` | Workspace unsubscribe / bounce list | `workspaceId`, `email` (lowercased). Idx `(workspaceId, email)` unique |

`SourcedContact` is the durable people store. A sourced contact can be
**converted** into the ATS: a `Candidate` + `Application` with
`source: 'SOURCED'`, dropping them into an existing job's pipeline (records the
link back on `addedToJob`).

## Transparent match score

Consistent with Fluxberry's "AI advises, human decides" identity, every contact
gets a **0–100 match score computed deterministically against the parsed
criteria** (not an opaque number), plus plain-language `matchReasons`:

- skills overlap (share of requested skills present) — heaviest weight
- title / role match
- seniority match
- years-of-experience within the requested band
- location match

The score is computed in the service, so the same ranking applies to both mock
and live PDL results. Results are sorted by it, so the strongest fits are on top.

## AI: prompt → criteria

`AIProvider.parseSourcingQuery({ prompt })` returns a `SourcingCriteria`:
`{ titles[], seniority[], skills[], minYears?, maxYears?, locations[],
countries[], companies[], excludeCompanies[], industries[], keywords[] }`.

The criteria are shown back to the recruiter as **editable chips** — this is the
"Fluxberry automatically set your filters" moment, made transparent and
correctable. Editing chips and re-running does not re-call the AI.

## API surface (`/api/v1/sourcing/*`)

All guarded by `authenticate, resolveWorkspace, requireWorkspace,
requireActiveSubscription, requireFeature('TALENT_SOURCING'),
requirePlanFeature('TALENT_SOURCING')`, plus per-route `requireRole('recruiter')`.

Search & contacts
- `POST /sourcing/search` `{ prompt }` → `{ search, contacts }` (AI parse → PDL
  page → cache → score). `aiLimiter`.
- `POST /sourcing/searches/:id/more` → next page (costs credits).
- `PATCH /sourcing/searches/:id/criteria` `{ criteria }` → re-run with edited chips.
- `GET /sourcing/searches` / `GET /sourcing/searches/:id` → history + rehydrate.
- `GET /sourcing/contacts/:id` → full profile (reveals email).
- `POST /sourcing/contacts/export` `{ contactIds }` → CSV.
- `POST /sourcing/contacts/:id/convert` `{ jobId }` → create Candidate+Application.

Lists
- `GET/POST /sourcing/lists`, `GET/PATCH/DELETE /sourcing/lists/:id`
- `POST /sourcing/lists/:id/contacts` `{ contactIds }` (add) / `DELETE .../contacts/:contactId`

Campaigns
- `GET/POST /sourcing/campaigns`, `GET/PATCH/DELETE /sourcing/campaigns/:id`
- `GET /sourcing/campaigns/:id/recipients`
- `POST /sourcing/campaigns/:id/test` `{ toEmail }` (send yourself a preview)
- `POST /sourcing/campaigns/:id/send` `{ scheduledAt? }`
- Public (no auth): `GET /sourcing/u/:token` → one-click unsubscribe.
- Inbound reply webhook reuses the existing convention:
  `campaign+<recipientId>@<INBOUND_EMAIL_DOMAIN>` → mark recipient `REPLIED`.

## UX

Nav: "Talent Sourcing" moves from the cosmetic `LOCKED_NAV` to real `NAV`
(`/app/talent-sourcing`, `UserSearch` icon). Three sub-areas: Search, Lists,
Campaigns.

**Search (the hero).**
1. A single large prompt box: _"Describe your ideal candidate"_ with example
   chips to click.
2. On submit, the parsed criteria appear as **editable chips** (titles, skills,
   seniority, years, locations). A primary button reads _"Search N profiles"_ and
   shows the credit cost.
3. Results table: name, title, company, location, a mono **match score**, skill
   chips, and a contactability dot (has email). Multi-select checkboxes +
   select-all, cloning the candidates-view pattern.
4. Row click opens a profile slide-over (`Sheet`): full experience, education,
   skills, links, revealed contact, and actions (Add to list, Add to job).
5. A floating bulk bar (identical pattern to the candidates view) when rows are
   selected: _N selected_ → Add to list · Export CSV · Create campaign.
6. "Load more" appends the next page.

**Lists.** A table of talent pools; a list detail view showing its contacts with
the same select + bulk actions, plus "Create campaign from this list."

**Campaigns.** A composer: pick a list, write subject + body with
`{{firstName}}` / `{{company}}` merge tags, live preview against a sample
contact, send a test to yourself, then send or schedule. A campaign detail view
shows per-recipient status and aggregate stats (sent / delivered / opened /
replied / bounced / unsubscribed).

## Cold-outreach compliance (built in, not bolted on)

Sourced leads are cold contacts, so every campaign email includes, by
construction:

- a working **unsubscribe link** (one-click, tokenized, public route),
- a physical-address / sender-identity footer,
- suppression: unsubscribed and hard-bounced emails go on a workspace
  `sourcing_suppressions` list and are skipped by every future campaign,
- throttled sending through the queue.

The recruiter remains responsible for lawful outreach (GDPR / CAN-SPAM / local
law); the product makes the compliant path the default one.

## Configuration

```
PDL_API_KEY=            # blank -> realistic mock; set -> live People Data Labs
PDL_MAX_RESULTS=200     # hard cap on profiles per search (spend guardrail)
FEATURE_TALENT_SOURCING=true
# reuses existing RESEND_API_KEY / EMAIL_FROM / INBOUND_EMAIL_DOMAIN for campaigns
```

## Phasing & status

- **Phase 1a — foundation (DONE, typechecked, verified).** Shared contracts
  (`schemas/sourcing.ts`, enums, flags, plan-features, mirrored to
  `frontend/lib/shared`), `config.providers.sourcing`, the People Data Labs
  provider + realistic mock (`integrations/pdl/`), and
  `AIProvider.parseSourcingQuery` across `types/prompts/base-llm/mock`. Proven on
  the canonical prompt end to end.
- **Phase 1b — search backend slice.** `sourcing_searches` + `sourced_contacts`
  models, repository, `sourcing.service` (parse → search → cache → score),
  serializer, controller, routes, mount; CSV export.
- **Phase 1c — search UI.** Nav unlock, `/app/talent-sourcing` hero page,
  `use-talent-sourcing` hook, criteria chips, ranked results + multi-select,
  profile slide-over, CSV export.
- **Phase 2 — lists + convert-to-candidate bridge.**
- **Phase 3 — outreach campaigns** (composer, queue fan-out, tracking,
  unsubscribe/suppression, reply threading).

Each phase is independently shippable and demoable.
