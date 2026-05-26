# Specification: Connection Pooling

## Overview

Every Next.js app in the monorepo connects to one PostgreSQL instance (a VPS in
production) through a single `postgres-js` client created in
`packages/db/src/client.ts` with `max: 10`. The apps deploy as
horizontally-scaled containerized / serverless workloads (see Deployment Context
below); each running instance constructs its own client and its own pool — so
the effective connection count is roughly `max × concurrent instances × apps`,
which exhausts the Postgres `max_connections` (default 100) under modest load.

This track introduces a **transaction-mode connection pooler** between the apps
and Postgres, tunes the `postgres-js` client for pooled use, and separates the
migration/direct connection from the pooled connection. It is independent of the
Prisma→Drizzle and storage tracks and can run in parallel with them.

It is also a prerequisite for the future reactive query layer
(`reactive_query_layer_20260522`): transaction-mode pooling is incompatible with
`LISTEN/NOTIFY`, so this track establishes the direct-connection escape hatch
that reactivity will need.

## Current State

- `packages/db/src/client.ts` — a single `postgres-js` client; `buildPostgresOptions`
  (`connection-options.ts`) sets `max: 10`, `idle_timeout: 20`, `connect_timeout: 30`.
- `postgres-js` uses named prepared statements by default (`prepare: true` implicit).
- One `DATABASE_URL` serves app queries, `drizzle-kit` migrations, and seeds alike.
- Production Postgres runs on a VPS with no pooler in front.
- `docker-compose.yml` runs only the `postgres` service for local dev — no pooler,
  so dev does not mirror production topology.

## Deployment Context

The apps are moving **off Vercel**. The production target is **GCP Cloud Run or
Cloudflare** — not yet finalized; any app still on Vercel is legacy and will be
removed at cutover. Both candidate targets scale horizontally to many instances,
so the connection-exhaustion problem is identical either way. The pooler choice
(FR-1) should be settled **together with** the deployment-target decision:

- **GCP Cloud Run** (containers): self-hosted PgBouncer in transaction mode, as
  specified below.
- **Cloudflare Workers:** Cloudflare **Hyperdrive** is the native connection
  pooler + query cache and would replace a self-hosted PgBouncer in production.
  The rest of this spec — client tuning (FR-2) and the direct-connection split
  (FR-3) — still applies unchanged.

This spec assumes self-hosted transaction-mode pooling as the default. If
Cloudflare Workers is chosen, substitute Hyperdrive in FR-1 and Phase 1; local
dev still uses a containerized PgBouncer regardless (FR-1).

## Approach Decision (ratify before Phase 1)

**Recommended: PgBouncer in transaction mode**, deployed as a container alongside
the VPS Postgres.

- Transaction mode multiplexes many client connections onto few server
  connections — the correct mode for short serverless requests.
- Mature, lightweight, runs as a standard container, well-documented.
- Alternatives considered: Cloudflare Hyperdrive (the right choice **if** the
  deployment target is Cloudflare Workers — see Deployment Context), Supavisor
  (heavier, Supabase-oriented), pgcat (newer, fewer operators familiar with it).

If the team prefers a different pooler, record the decision and rationale before
Phase 1. The rest of this spec assumes transaction-mode pooling but is otherwise
pooler-agnostic.

## Functional Requirements

### FR-1: Deploy the Pooler
- A transaction-mode pooler runs in front of the production Postgres (PgBouncer
  for GCP Cloud Run; Cloudflare Hyperdrive if the target is Cloudflare Workers —
  see Deployment Context).
- For PgBouncer: `pool_mode = transaction`; `max_client_conn` sized for expected
  concurrency; `default_pool_size` sized so `default_pool_size × distinct
  (db,user) pairs ≤ Postgres max_connections` with headroom. Document the sizing
  math. (Hyperdrive manages this itself.)
- A containerized PgBouncer is added to `docker-compose.yml` so local dev mirrors
  transaction-mode pooling — regardless of the production pooler choice.

### FR-2: Client Configuration for Pooled Use
- `buildPostgresOptions` sets `prepare: false` — `postgres-js` named prepared
  statements are incompatible with transaction-mode pooling.
- Per-process `max` is reduced (transaction-mode multiplexing means each app
  process needs only a small pool — default `max: 3`, overridable via env).
- Tuning decisions documented inline in `connection-options.ts` and in `tech-stack.md`.

### FR-3: Separate Migration / Direct Connection
- Introduce `DIRECT_DATABASE_URL` — a direct, un-pooled, session connection to Postgres.
- `DATABASE_URL` points at the pooler (transaction mode) and is used by the app client only.
- `drizzle-kit` migrations, seeds, and any DDL use `DIRECT_DATABASE_URL` —
  transaction-mode pooling is unsafe for migrations (advisory locks, multi-statement DDL).
- `drizzle.config.ts` and migration/seed scripts read `DIRECT_DATABASE_URL`.

### FR-4: Reactivity Escape Hatch (forward-compat — no reactivity built here)
- Document that `LISTEN/NOTIFY` and other session-scoped features must use
  `DIRECT_DATABASE_URL`, never the transaction-mode pooler. The future reactive
  query layer (`reactive_query_layer_20260522`) depends on this.

### FR-5: Verification
- A connection-count check: under simulated concurrent load, Postgres
  `pg_stat_activity` connection count stays bounded by the pooler's server-side
  pool size, not by app-instance concurrency.
- All existing `packages/db` / `packages/domain` / `packages/api` tests pass
  against the pooled connection.
- Migrations apply cleanly via `DIRECT_DATABASE_URL`.

## Non-Functional Requirements

- The backend swap is configuration only — app and domain code do not change
  (they import `db` from `packages/db` exactly as before).
- Local dev parity: `docker-compose up` brings up Postgres + pooler together.
- Follow the Workflow's TDD for `connection-options.ts` changes (unit-test the
  option builder).

## Acceptance Criteria

1. PgBouncer (or the ratified alternative) runs in `docker-compose.yml` in
   transaction mode; the production deployment is documented.
2. `buildPostgresOptions` sets `prepare: false` and a reduced, env-configurable
   `max`; `connection-options.test.ts` is updated.
3. `DIRECT_DATABASE_URL` exists; `drizzle-kit` migrations and seeds use it;
   `DATABASE_URL` points at the pooler.
4. Migrations apply cleanly through the direct connection; app queries succeed
   through the pooler.
5. Under simulated concurrent load, `pg_stat_activity` stays bounded by the
   pooler's server-side pool size.
6. All `packages/db`, `packages/domain`, `packages/api` test suites green.
7. `tech-stack.md` documents the pooling topology, the two connection strings,
   and the `LISTEN/NOTIFY` → direct-connection caveat.

## Out of Scope

- Building any reactivity (`reactive_query_layer_20260522`).
- Read-replica routing or horizontal Postgres scaling.
- Migrating production data or changing the Postgres host.
- Per-app connection isolation beyond a shared pooler.
- The deployment-target decision itself (GCP Cloud Run vs Cloudflare) — this
  track consumes that decision but does not make it.
