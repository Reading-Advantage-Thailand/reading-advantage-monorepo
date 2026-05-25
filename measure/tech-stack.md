# Tech Stack

## Monorepo Orchestration

- **Package Manager:** pnpm (with `pnpm-workspace.yaml`)
- **Task Runner / Caching:** Turborepo (`turbo.json` pipeline)
- **Build System:** Next.js (per-app, various versions consolidated during migration)

## Core Technologies

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | TypeScript 5.x | All apps already use TS; unified `tsconfig.json` in shared config package |
| Frontend Framework | React 19 | Consolidated target (www-reading-advantage upgraded from React 18) |
| Meta-Framework | Next.js 15–16 | All apps are Next.js; independent app versions allowed during migration |
| Styling | Tailwind CSS 3–4 | All apps use Tailwind; unified config in shared package |
| UI Components | Radix UI + shadcn/ui | Common across all apps; extracted to `@reading-advantage/ui` |
| State Management | Zustand (games), React Query (others) | App-specific; not forced into shared layer |
| Animation | Framer Motion | Used by primary-advantage and games; available in shared UI |

## Backend & Data

| Technology | Usage |
|-----------|-------|
| Drizzle | Schema, migrations, queries (replaces Prisma in new backend) |
| tRPC | Primary product backend interface — typed procedures consumed by Next.js apps |
| Hono | External HTTP boundaries only — webhooks, health checks, legacy endpoints |
| Zod | Input validation on all tRPC procedures |
| GitHub REST/GraphQL API | Exercise repo management, PR reviews, Issue tracking for codecamp |
| PostgreSQL | Unified database (local Docker for dev, VPS for production). See "Database Connections" below for the pool/direct split. |
| Sessions | Cookie-based DB sessions via `@reading-advantage/auth` (username/password) |
| Firebase Functions | reading-advantage (legacy, being deprecated) |
| AI SDK | Google + OpenAI providers across all apps |

## Testing

| Tool | Purpose |
|------|---------|
| Vitest | Unit tests (science-advantage, www-reading-advantage, codecamp-advantage) |
| Jest | Unit tests (advantage-games, reading-advantage) |
| Playwright | E2E tests (all apps) |

## DevOps

| Tool | Purpose |
|------|---------|
| GitHub Actions | CI/CD pipelines |
| GCP Cloud Run or Cloudflare | Production deployment target for Next.js apps — under evaluation, not yet finalized (see `measure/tracks/connection_pooling_20260522/`) |
| Vercel | Legacy — being removed at cutover to GCP/Cloudflare |
| Firebase | reading-advantage functions deployment (legacy, being deprecated) |

> *2026-05-22: Deployment is moving off Vercel; GCP Cloud Run vs Cloudflare is not yet decided. The connection-pooling and reactive-query-layer tracks both depend on this decision.*

## Workspace Structure

```
├── docker-compose.yml    # Local PostgreSQL + PgBouncer (transaction-mode pooler)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Database Connections

> *Settled 2026-05-25 by `measure/tracks/connection_pooling_20260522/`.*

Every app connects to a single PostgreSQL instance through **two** connection
strings with different purposes:

| Env var | Purpose | Connection mode | Used by |
|---|---|---|---|
| `DATABASE_URL` | App queries (request-scoped reads/writes) | Pooled (transaction mode) | `packages/db/src/client.ts` — the shared `db` import |
| `DIRECT_DATABASE_URL` | Migrations, seeds, `LISTEN/NOTIFY` consumers, any session-scoped feature | Direct (session mode) | `packages/db/drizzle.config.ts`, `packages/db/src/seed/codecamp-seed.ts` |

**Why the split.** Transaction-mode pooling (PgBouncer or Cloudflare Hyperdrive)
multiplexes many client connections onto few backend sessions — the right model
for short serverless requests. But it breaks anything that holds a backend
session across queries:
- Named prepared statements (`postgres-js` default — disabled via `prepare: false`)
- `pg_advisory_lock` (used by `drizzle-kit migrate` to serialize concurrent runs)
- Multi-statement DDL transactions (Drizzle migrations)
- `LISTEN/NOTIFY` (the future reactive-query layer)

Those features MUST use `DIRECT_DATABASE_URL`. App query paths MUST use
`DATABASE_URL` so connection counts stay bounded by the pooler.

### Local topology

`docker-compose.yml` runs both services so dev mirrors production:

| Service | Port | Notes |
|---|---|---|
| `postgres` (postgres:16-alpine) | `5432` | The actual DB. `DIRECT_DATABASE_URL` points here. |
| `pgbouncer` (bitnami/pgbouncer:1.23.1, transaction mode) | `6432` | Sits in front of `postgres`. `DATABASE_URL` points here. |

Sizing math: postgres default `max_connections=100`. Pgbouncer `default_pool_size=20`
× 4 distinct (db, user) pairs = 80 worst-case backend conns, leaving ~20 headroom
for `DIRECT_DATABASE_URL` callers + interactive `psql` + healthchecks.
`max_client_conn=200` accommodates many concurrent dev processes.

Restarting `postgres` locally requires `docker compose restart pgbouncer` to flush
stale backend connections. Existing dev volumes from before 2026-05-25 will not
have `codecamp_advantage` or `science_advantage_test` databases — either
`docker compose down -v` for a fresh init or `psql -h localhost -p 5432 -U postgres
-c "CREATE DATABASE codecamp_advantage; CREATE DATABASE science_advantage_test;"`.

### Client tuning (`packages/db/src/connection-options.ts`)

| Setting | Value | Why |
|---|---|---|
| `prepare` | `false` | Transaction-mode pooling reassigns backends between queries; named prepared statements are session-scoped and would error with `prepared statement "s_1" does not exist` |
| `max` | `3` (env-overridable via `DATABASE_POOL_MAX`, positive integer) | Each app process needs only a small client pool — the pooler does the multiplexing. A horizontally-scaled deployment with 50 instances × `max:3` = 150 client conns funneled into 20 backend conns at the pooler |
| `idle_timeout` | `20` | Recycle idle client conns to avoid holding pooler slots |
| `connect_timeout` | `30` | Generous for cold-start Cloud Run instances |

### Production deployment status (as of 2026-05-25)

There is **no PgBouncer in production yet** — `DATABASE_URL` in Cloud Run env is
still the direct VPS Postgres URL. `drizzle.config.ts` and `codecamp-seed.ts`
fall back to `DATABASE_URL` with a `console.warn` when `DIRECT_DATABASE_URL` is
unset, so the production deploy keeps working without any cutover work.

When PgBouncer is deployed to production (separate operational task, out of the
connection-pooling track's scope), the operator must:

1. Create a new `DIRECT_DATABASE_URL` Secret in Secret Manager pointing at the
   underlying Postgres (port 5432 of the VPS).
2. Update the existing `DATABASE_URL` Secret to point at the pooler (port 6432).
3. Add `DIRECT_DATABASE_URL=DIRECT_DATABASE_URL:latest` to the `--set-secrets`
   list in `apps/codecamp-advantage/cloudbuild.yaml` (and any other Cloud Run
   service's deploy config).

The fallback warning shows up in deploy logs until step 1 completes — that is
deliberate.

If the eventual production target is Cloudflare Workers instead of Cloud Run,
substitute Cloudflare **Hyperdrive** for PgBouncer; the client tuning
(`prepare:false`, small `max`) and the `DIRECT_DATABASE_URL` split apply
identically because Hyperdrive is also a transaction-mode pooler.

### Verified concurrency bound

A scripted concurrency check (12 simulated instances × `max:3` clients driving
50 concurrent `pg_sleep(1)` queries through the pooler) confirmed that
`pg_stat_activity` backend connection count stayed bounded by
`default_pool_size=20`, peaking at 8 — versus an estimated 36 unpooled. See the
`connection_pooling_20260522` track's Phase 4 git note for the exact
measurement.
