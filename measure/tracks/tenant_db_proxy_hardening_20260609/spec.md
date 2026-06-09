# Spec: TenantDB Proxy Hardening & Honest Coverage

## Overview
`packages/domain/src/db-contract.ts` (`createTenantDB`) is the monorepo's most-imported
file (19 importers) and the core multi-tenancy abstraction. It silently provides **zero**
scoping for any table lacking a literal `schoolId` column, while `tenant-coverage.test.ts`
rubber-stamps that gap with a string match (`content.includes("TenantDB")`). The result is
a false sense of security on referential-tenant tables (progress, content, stories,
flashcards, analytics, questions, codecamp). This track makes the proxy **fail-closed**,
forces every table into an **audited classification**, hardens the join and insert paths,
and replaces the string-match coverage test with one that verifies real scoping.

Science tables were already given `school_id` (resolved by `tenant_db_school_id_20260603`),
so the silent gap now bites reading-advantage and codecamp tables specifically.

## Functional Requirements

**FR-1 — Table classification registry (single source of truth).**
Introduce an explicit registry classifying every Drizzle table as exactly one of:
`FLAT` (has `schoolId` column), `EXEMPT` (intentionally global — e.g. `audit_events`,
shared curriculum catalog), or `REFERENTIAL` (tenant data scoped via an owner FK, no
`schoolId` column). The registry is the audited decision record; adding a table without
classifying it is a build failure (FR-6).

**FR-2 — Fail-closed on unclassified tables.**
`createTenantDB`/`wrapQueryBuilder` MUST throw a descriptive error when a query targets a
table that is not in the registry. (Nothing is currently unclassified, so this is pure
drift protection — no existing breakage.)

**FR-3 — Referential tables throw, with an explicit escape hatch.**
Querying a `REFERENTIAL` table through TenantDB throws a directive error (per the agreed
message: "has no schoolId column … use a users.schoolId join via a raw db, or add it to
the exemption list"). An explicit, greppable escape hatch (`tenantDb.unscoped(reason)` →
returns the raw `db`) lets a caller perform a manual owner-FK join with a recorded reason.
Silent pass-through is removed entirely.

**FR-4 — Join scoping.**
In `select().from(A).innerJoin(B)…`, a joined `FLAT` table B MUST also get its
`schoolId = tenant.schoolId` condition injected (not just the primary table). A joined
`REFERENTIAL` table throws (must go through `unscoped`). `EXEMPT` joined tables pass.

**FR-5 — Insert `.values()` enforcement.**
For `FLAT` tables, `insert().values(...)` MUST force `schoolId = tenant.schoolId`: reject
(throw) when a caller supplies a conflicting `schoolId`, and inject it when omitted. Apply
to both single and array value forms, and the existing `onConflictDoUpdate` path.

**FR-6 — Honest coverage test.**
Rewrite `tenant-coverage.test.ts` to stop trusting `content.includes("TenantDB")`. It MUST
assert: (a) every table referenced in `packages/domain` is classified in the registry;
(b) every `FLAT` entry actually has a `schoolId` column in the schema, and every non-FLAT
entry does not; (c) a `REFERENTIAL` table is only reached via `unscoped(...)`, never via a
bare TenantDB query. Drift in any direction fails the build.

**FR-7 — Migrate existing referential call sites.**
Migrate the `packages/domain` call sites that currently query `REFERENTIAL` tables through
TenantDB over to `unscoped(reason)` (+ owner-FK join where cheap) so the build stays green
under FR-3. Scope is the domain package only (~43 TenantDB files, bounded).

**FR-8 — Document the model.**
Document the FLAT / EXEMPT / REFERENTIAL model and the `unscoped` escape hatch in
`AGENTS.md` (Multi-Tenancy section) and the domain package README.

## Non-Functional Requirements
- No change to `createTenantDB(db, tenant)` signature — `FLAT`-table callers are unaffected.
- Proxy is a hot path: classification lookup must be O(1) (precomputed map), no per-query schema reflection.
- Error messages name the offending table and the remediation.

## Acceptance Criteria
- A unit test proves a bare TenantDB query against a `REFERENTIAL` table (e.g. `lessonProgress`) throws, and the same query via `unscoped(...)` succeeds.
- A unit test proves an unclassified/unknown table throws.
- A unit test proves a joined `FLAT` table receives its own `schoolId` predicate (assert via `.toSQL()`).
- A unit test proves `insert().values({ schoolId: <other> })` into a `FLAT` table throws, and an omitted `schoolId` is injected.
- The rewritten coverage test fails when a table is left unclassified, when a `FLAT` entry lacks `schoolId`, and when a `REFERENTIAL` table is queried without `unscoped`.
- Full `packages/domain` test suite is green; `pnpm build` passes.

## Out of Scope
- Adding `schoolId` columns to referential tables (per-table migrations + backfill) — tracked as follow-up per module; this track makes the gap *visible and audited*, it does not close cross-school isolation for every referential table.
- The 209 reading-advantage `route.ts` files that bypass the domain layer (open Critical tech-debt, separate track).
- primary-advantage Prisma removal (open Critical tech-debt, separate track).
- LLM prompt-injection hardening in `review-exercise.ts` (separate, already partially mitigated).
- `packages/types` modularization (codecamp.ts = 256 entities; minor, separate).
