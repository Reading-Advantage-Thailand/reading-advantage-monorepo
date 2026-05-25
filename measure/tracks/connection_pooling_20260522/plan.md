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

## Phase 2: Client Configuration

- [ ] Task: Update `buildPostgresOptions` for pooled use (TDD)
    - [ ] Sub-task: Write failing test: built options include `prepare: false`
    - [ ] Sub-task: Write failing test: `max` reads from env with a reduced default
    - [ ] Sub-task: Implement; update `connection-options.test.ts`
- [ ] Task: Measure - User Manual Verification 'Client Configuration' (Protocol in workflow.md)

## Phase 3: Direct Connection for Migrations

- [ ] Task: Introduce `DIRECT_DATABASE_URL`
    - [ ] Sub-task: Add `DIRECT_DATABASE_URL` to the env schema / `.env.example`
    - [ ] Sub-task: Point `drizzle.config.ts` and migration/seed scripts at `DIRECT_DATABASE_URL`
    - [ ] Sub-task: Confirm `DATABASE_URL` (pooler) is used by the app client only
- [ ] Task: Verify migrations apply cleanly via the direct connection
- [ ] Task: Measure - User Manual Verification 'Direct Connection' (Protocol in workflow.md)

## Phase 4: Verification & Docs

- [ ] Task: Connection-count check under simulated concurrency
    - [ ] Sub-task: Drive concurrent queries; confirm `pg_stat_activity` stays bounded by `default_pool_size`
- [ ] Task: Regression sweep — `packages/db`, `packages/domain`, `packages/api` tests
- [ ] Task: Update `tech-stack.md` — pooling topology, the two connection strings, the `LISTEN/NOTIFY` → direct caveat
- [ ] Task: Measure - User Manual Verification 'Verification & Docs' (Protocol in workflow.md)
