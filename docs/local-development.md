# Local development

## Prerequisites
- Node ≥ 20, npm ≥ 9
- MongoDB running locally, or a MongoDB Atlas URI in `MONGODB_URI`

## First run
```bash
npm install            # workspaces + builds shared (postinstall)
cp .env.example .env   # defaults are ready for local dev
npm run db:seed        # optional but recommended demo data
npm run dev            # shared(watch) + API :4000 + worker + web :3000
```
Log in at http://localhost:3000/login with `demo@fluxberry.dev` (no password — dev token path).

## Processes
`npm run dev` runs four things via `concurrently`:
- `dev:shared` — `tsc --watch` keeping `shared/dist` fresh
- `dev:api` — `tsx watch src/server.ts`
- `dev:worker` — `tsx watch src/workers/worker.ts` (parsing, screening, workflow, email)
- `dev:web` — `next dev`

Run any individually with `npm run dev:api` etc.

## Providers
With no keys, realistic **mocks** are used everywhere (AI returns believable JDs/profiles/scores; email goes to an in-memory outbox; storage writes to `backend/.storage`). Set keys in `.env` to switch a provider to real — no code change.

## Testing
```bash
npm run test        # backend unit + integration (uses local Mongo `fluxberry_test`)
npm run typecheck   # all workspaces
npm run test:e2e    # Playwright — run against a production build
```

Run E2E against a production frontend build (dev-mode on-demand compilation races hydration):

```bash
npm run build --workspace @fluxberry/frontend
(cd frontend && npm run start &)   # prod web on :3000
npm run dev:api & npm run dev:worker &   # API + worker
npm run test:e2e
```

## Common tasks
- Reset demo data: `npm run db:seed` (wipes and reseeds — dev only)
- Sync indexes: `npm run db:migrate`
- Build for prod: `npm run build`, then `npm run start` (API) and `npm run start:worker`

## Troubleshooting
- **Web build error about `import.meta` / `@fluxberry/shared`** — ensure `shared/dist` exists (`npm run build --workspace @fluxberry/shared`); webpack uses `resolve.symlinks=false` for the workspace package.
- **Auth 401 locally** — keep `AUTH_ALLOW_TEST_TOKENS=true` and Supabase vars blank.
- **Worker not processing** — confirm it's running and `MONGODB_URI` matches the API's.
- **Port in use** — API `PORT=4000`, web `3000`.
