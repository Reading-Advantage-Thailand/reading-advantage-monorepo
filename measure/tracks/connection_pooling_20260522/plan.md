# Implementation Plan: Connection Pooling

> Track Type: Chore (infrastructure). Independent of the Prisma→Drizzle and
> storage tracks — can run in parallel. TDD applies to `connection-options.ts`.

## Phase 1: Pooler Approach & Local Topology [checkpoint: 5969de7]

- [x] Task: Ratify the pooler choice (PgBouncer transaction mode, or a recorded alternative)
- [x] Task: Add the pooler to `docker-compose.yml` (7d0fddd)
    - [x] Sub-task: Add a `pgbouncer` service in transaction mode pointing at the `postgres` service
    - [x] Sub-task: Set `pool_mode`, `max_client_conn`, `default_pool_size`; document the sizing math
    - [x] Sub-task: Verify the pooler is reachable (`psql -h 127.0.0.1 -p 6432`) and a live `postgres-js` client query succeeds through it (end-to-end app verification follows in Phase 2 after the env-var swap)
- [x] Task: Measure - User Manual Verification 'Pooler & Local Topology' (Protocol in workflow.md)

**Phase 1 follow-ups (carry to Phase 4):**
- M2 (sizing headroom): bump `postgres` `max_connections` to 200, or reduce `default_pool_size` to 15, once Phase 3+ workloads land. Re-verify with `pg_stat_activity`.
- M3 (healthcheck): consider switching pgbouncer healthcheck to `psql ... SHOW VERSION` against the admin `pgbouncer` DB. Stylistic; current `pg_isready` works.
- L1 (`ignore_startup_parameters`): add `application_name` if Phase 2 testing surfaces "unsupported startup parameter" errors.
- L2 (restart semantics): document in `tech-stack.md` that restarting Postgres locally requires `docker compose restart pgbouncer` to flush stale backend connections.
- L3 (existing volumes): document in `tech-stack.md` that devs with pre-existing `postgres_data` volumes must manually `createdb codecamp_advantage` and `createdb science_advantage_test`, or `docker compose down -v` for a fresh init.

## Phase 2: Client Configuration [checkpoint: 6da552d]

- [x] Task: Update `buildPostgresOptions` for pooled use (TDD) (34eb03b)
    - [x] Sub-task: Write failing test: built options include `prepare: false`
    - [x] Sub-task: Write failing test: `max` reads from env with a reduced default
    - [x] Sub-task: Implement; update `connection-options.test.ts`
- [x] Task: Measure - User Manual Verification 'Client Configuration' (Protocol in workflow.md)

## Phase 3: Direct Connection for Migrations [checkpoint: 51bd274]

- [x] Task: Introduce `DIRECT_DATABASE_URL` (701e942)
    - [x] Sub-task: Add `DIRECT_DATABASE_URL` to the env schema / `.env.example`
    - [x] Sub-task: Point `drizzle.config.ts` and migration/seed scripts at `DIRECT_DATABASE_URL`
    - [x] Sub-task: Confirm `DATABASE_URL` (pooler) is used by the app client only
- [x] Task: Verify migrations apply cleanly via the direct connection (701e942)
- [x] Task: Measure - User Manual Verification 'Direct Connection' (Protocol in workflow.md)

**Phase 3 production-deployment note (carry to Phase 4 docs):**
- `apps/codecamp-advantage/cloudbuild.yaml` currently binds only the `DATABASE_URL`
  Secret Manager entry. In production today there is NO PgBouncer in front of the
  VPS Postgres, so `DATABASE_URL` IS the direct connection. The `DIRECT_DATABASE_URL`
  env binding is deliberately NOT added to cloudbuild.yaml in Phase 3 because the
  Secret does not exist yet — adding the binding would fail the deploy.
- When PgBouncer is deployed in front of the VPS Postgres (separate operational
  work, out of this track's scope), the operator MUST:
  1. Create a new `DIRECT_DATABASE_URL` secret in Secret Manager pointing at the
     underlying Postgres (port 5432).
  2. Update `DATABASE_URL` to point at the pooler (port 6432).
  3. Add `DIRECT_DATABASE_URL=DIRECT_DATABASE_URL:latest` to the `--set-secrets`
     list in cloudbuild.yaml.
  This 3-step swap is what makes the FR-3 split active in production. Until then,
  `drizzle.config.ts` and `codecamp-seed.ts` fall back to `DATABASE_URL` with a
  console warning (correct, non-breaking behavior).

## Phase 4: Verification & Docs

- [x] Task: Connection-count check under simulated concurrency
    - [x] Sub-task: Drive concurrent queries; confirm `pg_stat_activity` stays bounded by `default_pool_size`
- [x] Task: Regression sweep — `packages/db`, `packages/domain`, `packages/api` tests
- [x] Task: Update `tech-stack.md` — pooling topology, the two connection strings, the `LISTEN/NOTIFY` → direct caveat
- [x] Task: Measure - User Manual Verification 'Verification & Docs' (Protocol in workflow.md)
