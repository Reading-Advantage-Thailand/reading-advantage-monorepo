# Test Strategy: Audit Log Retention + DSAR Bulk Export

> Builds on the committed `audit_events` table + `recordAuditEvent` helper.
> Append-only `REVOKE UPDATE, DELETE` means DELETE-path code cannot be exercised
> against `createMockDb` — it must run against the real `science_advantage_test` DB.

## 1. Testing Pyramid Per Phase

| Phase | Unit (Vitest, mocked) | Integration (`science_advantage_test`) | E2E |
|-------|----------------------|---------------------------------------|-----|
| P1 Env config | Zod parse: default, `.refine(>=365)`, NaN, negative | — | — |
| P2 Purge | Window math helper (UTC cutoff) | Boundary delete, batching loop, post-purge `audit:retention_purge` row | — |
| P3 Periodic job | `createCleanupTask`-style scheduler unit test (fake timers) | `pg_try_advisory_lock` concurrent run no-ops | — |
| P4 DSAR domain | `assertCan('dsar:export')` gate, row-ceiling guard, shape validation | Tenant isolation (school A admin → school B subject = DENIED), pagination, bundle integrity | — |
| P5 Endpoint | Zod query: rejects neither/both of `userId`/`email`; ADMIN-only 403 | Route hits real DB, archive round-trips, `dsar:export` audit row written, 413 on overflow | Optional: `pnpm test:e2e` smoke for download flow |
| P6 Integration | — | Full seed → request → unzip → counts == manifest == DB | — |

**Rule:** any code path that touches `DELETE FROM audit_events` is integration-only.
The mock DB in `packages/domain/src/__tests__/mock-db.ts` cannot model the
privileged-vs-app-role split.

## 2. Shared Fixtures / Mocks

- **`createMockDb`** (`packages/domain/src/__tests__/mock-db.ts`) — reuse for P1, P4
  guard tests, P5 Zod tests. Already supports `insert().values().returning()` and
  `select().from().where()` chains used by `recordAuditEvent` + `queryAuditEvents`.
- **New: `packages/auth/src/__tests__/audit-fixtures.ts`** (proposed) — `seedAuditRowAt(db, { createdAt, action, actorUserId })` helper used by purge integration tests.
- **New: `apps/science-advantage/lib/test/two-school-fixture.ts`** (proposed) — seeds school A + school B with one user each + 3 audit rows each, for tenant-isolation tests in P4/P5. Mirrors the truncate-and-reseed pattern from `app/api/lessons/[lessonSlug]/route.integration.test.ts`.
- **Privileged connection fixture** — read `DIRECT_DATABASE_URL` from env (same one `drizzle-kit migrate` uses). A single shared `getPrivilegedTestDb()` helper avoids leaking a 2nd pool across tests.
- **Time control** — pass `now: Date` explicitly to `purgeExpiredAuditEvents`; do not stub `Date.now()` globally (rate-limiter track lesson).

## 3. Cross-Phase Edge Cases & Dependencies

- **Boundary (P2 ↔ P6):** row at `now - (AUDIT_RETENTION_DAYS * 1d) + 1s` is kept; `- 1s` is purged. Both must be in UTC; `timestamp("created_at", { withTimezone: true })` is already correct in schema.
- **Self-audit recursion (P2):** the `audit:retention_purge` row written *after* the batch must itself fall inside the window — otherwise the next run deletes the previous run's audit trail. Test: run purge twice, assert prior purge rows survive.
- **Advisory lock + scheduler (P3):** the lock key must be a stable 64-bit int; collisions with `session-cleanup` advisory locks would deadlock the scheduler. Pick a documented constant and test it.
- **Tenant isolation (P4 ↔ P5):** `audit_events` is **global, not tenant-scoped** (per `queryAuditEvents` JSDoc). DSAR must filter by `actorUserId IN (users WHERE schoolId = tenant.schoolId)` — a raw `eq(auditEvents.actorUserId, subject.id)` is not enough if the subject moved schools. Add this to P4 test.
- **Row ceiling (P4 ↔ P5):** the 413 response in P5 must surface the *domain* `tooLarge` signal, not a generic 500.
- **PII redaction (P4 ↔ FR-6):** DSAR exports `metadata` columns that were already passed through `safeMetadata` on write. Test: a row containing `password: "x"` in metadata exports as `"[REDACTED]"`.

## 4. Architecture Guardrails

- **No `db.delete(auditEvents)` outside `packages/auth/src/audit-retention.ts`.** Add a grep guard in CI (or a `doctor` rule) — the privileged-connection rule is meaningless if any other module can call DELETE.
- **DSAR endpoint must call the domain function, not the DB.** No raw Drizzle in `app/api/admin/dsar/export/route.ts`. Mirrors the `queryAuditEvents` pattern at `packages/domain/src/audit/index.ts:13`.
- **`assertCan(user, 'dsar:export', tenant)` is required** before any subject lookup — never after. Permission test in P4 must assert ordering (no DB hit on denied path).
- **Streaming, not buffering.** P4 test asserts `exportSubjectData` returns an async iterable / paginated reader; a memory-buffered implementation fails the row-ceiling test by construction.
- **The purge function records its own audit event via `recordAuditEvent`** — not a direct insert. Keeps the `safeMetadata` redaction path uniform.

## 5. Per-Phase Test Approach Notes

- **P1:** pure Zod tests in `packages/*/src/__tests__/env.test.ts`. No DB.
- **P2:** integration test file `packages/auth/src/audit-retention.integration.test.ts` (or science-advantage if env-coupling demands). `beforeEach` truncates `audit_events` via privileged conn; seeds boundary rows; asserts (a) deleted count, (b) surviving rows, (c) exactly one new `audit:retention_purge` row. Batch test: monkey-patch `BATCH_SIZE` to 2, seed 5 expired rows, assert 3 DELETE statements.
- **P3:** unit test the lock-key constant + scheduler registration; integration test runs purge twice in parallel via `Promise.all`, asserts only one DELETE happened (advisory lock held).
- **P4:** unit tests for `assertCan` denial and ceiling guard (mock-db); integration test for tenant isolation + pagination using the two-school fixture.
- **P5:** route-handler integration test using the existing `app/api/.../route.integration.test.ts` pattern. Unzip the response with `jszip` (already a transitive dep via codecamp) or a thin reader; assert `manifest.md` counts match `audit-events.json.length`.
- **P6:** one happy-path E2E in science-advantage covering seed → endpoint → archive → assertion. Quality gates: `pnpm turbo run {test,build,check-types} --filter=@reading-advantage/auth --filter=@reading-advantage/domain --filter=science-advantage` must exit 0.

## 6. build-graph Findings That Shaped Strategy

Graph stats: 1554 nodes / 2243 edges / 193 files, fresh (today). Relevant probes:

- `inspect recordAuditEvent` → `packages/auth/src/audit.ts:75–100`, 0 outgoing edges, only `param_flow` incoming. **Implication:** zero existing callers of `recordAuditEvent` are visible to the graph (callers exist but graph hasn't linked them — see `audit-log_infrastructure` track). Safe to add `audit:retention_purge` and `dsar:export` action strings without breaking existing call sites; signature is **not** changing.
- `inspect queryAuditEvents` → `packages/domain/src/audit/index.ts:13–63`, exported, 5 incoming `param_flow` edges. **Implication:** this is the canonical "audit + ADMIN + tenant" pattern — mirror its `{ db, user, tenant, input }` argument shape in `exportSubjectData` for consistency.
- `search createTenantDB` → `packages/domain/src/db-contract.ts`. **Implication:** DSAR must use `createTenantDB(db, tenant)` for the *profile/activity* portion, but `audit_events` has **no `schoolId` column** (confirmed in `packages/db/src/schema/audit.ts`) — so audit-event scoping has to be derived via the actor's school. Captured as cross-phase edge case §3.
- `search session-cleanup` and `advisory` → no graph matches; `apps/science-advantage/lib/platform/session-cleanup.ts` exists on disk but isn't indexed (outside scanned packages). **Implication:** the periodic-job pattern must be copy-adapted manually; cannot rely on `build-graph callers` to find existing scheduler entry-points. Treat as new infrastructure in P3.
- `search assertCan` → `packages/auth/src/assert.ts`. Single source — adding the `'dsar:export'` permission key only requires touching `packages/auth/src/roles.ts` (the role/permission matrix) and is low blast-radius.
- **Blast-radius summary:** all new exports (`purgeExpiredAuditEvents`, `exportSubjectData`, `DsarBundle`, `'dsar:export'` permission key) are net-new — no signature changes to existing exports. Graph caller-check in `review` should be **Pass** by construction; run `build-graph update` after each phase's commit to keep it that way.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: audit_log_retention_dsar_20260605
phase: track setup
commits: none
tests_run: none (strategy only; no implementation)
files_changed: measure/tracks/audit_log_retention_dsar_20260605/test-strategy.md (new)
plan_updates: none (plan untouched; strategy is additive guidance for implementer)
known_failures: none
handoff: Implementer should (1) treat any DELETE-path test as integration-only against science_advantage_test, (2) add two new fixture helpers (audit-fixtures, two-school-fixture) before P2/P4, (3) note that audit_events has no schoolId column — DSAR tenant scoping must join through users.schoolId, (4) run `build-graph update ./graph.db <changed files>` after each phase commit, (5) confirm DIRECT_DATABASE_URL availability for the privileged purge connection before P2.
END_MEASURE_AGENT_RESULT
