# Implementation Plan: Connection Pooling

> Track Type: Chore (infrastructure). Independent of the Prisma→Drizzle and
> storage tracks — can run in parallel. TDD applies to `connection-options.ts`.

## Phase 1: Pooler Approach & Local Topology

- [x] Task: Ratify the pooler choice (PgBouncer transaction mode, or a recorded alternative)
- [~] Task: Add the pooler to `docker-compose.yml`
    - [x] Sub-task: Add a `pgbouncer` service in transaction mode pointing at the `postgres` service
    - [x] Sub-task: Set `pool_mode`, `max_client_conn`, `default_pool_size`; document the sizing math
    - [x] Sub-task: Verify local apps connect through the pooler
- [ ] Task: Measure - User Manual Verification 'Pooler & Local Topology' (Protocol in workflow.md)

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
