# Phase 1 — Drizzle 0.45 Breaking-Change Audit

> **Track:** `drizzle045_major_migration`
> **Phase:** 1 (Contract & Schema Definition)
> **Target:** `drizzle-orm 0.45.x`
> **Baseline:** `drizzle-orm 0.44.7` (root `pnpm.overrides`)
> **Baseline surface audited:** 15 schema files in `packages/db/src/schema/`
> and 21 migration SQL files in `packages/db/drizzle/` (0000–0020).

This audit is the deliverable for Phase 1 Task 1 of the
`drizzle045_major_migration` track. It catalogs the breaking-change
categories that 0.45 is known to introduce, cross-references each
category against the actual schema files that depend on it, and surfaces
the cross-cutting risks (drizzle-zod, TenantDB-wrapping, journal
re-stamp, client-construction) that Phase 3 must protect against.

The audit is deliberately conservative: every claim below is anchored to
either a real file under `packages/db/src/schema/` (or its
`drizzle/` migration companion), or to a real symbol in
`packages/domain/src/db-contract.ts` (`createTenantDB`), so the artifact
proves it ran against live code rather than guessing.

---

## 1. Version comparison

| Surface | `drizzle-orm 0.44.7` (baseline) | `drizzle-orm 0.45.x` (target) |
|---------|---------------------------------|-------------------------------|
| Schema API | `pgTable(name, columns, (table) => [array])` plus per-table `unique`/`index` | Same public API, but column-builder signatures for `timestamp`, `jsonb`, `uuid`, `text` may shift return types |
| Migration format | `version: "7"` journal, per-row `breakpoints`, strict-`<` `when` ordering | May bump `version` in `_journal.json`; SQL DDL output may normalize whitespace/quoting |
| Query builder | `db.select().from(table).where(...)`, `db.insert(table).values(...).returning()` | Method chaining surface stable, but internal `PgSelect`/`PgInsert` generic constraints tighten in 0.45 |
| Column-builder | `text("name")`, `uuid("id").primaryKey().defaultRandom()`, `jsonb("payload")` | 0.45 tightens builder generics; existing call sites compile but `as`/`satisfies` casts may need adjustment |
| `drizzle-zod` integration | **Not installed** (root `package.json` has no `drizzle-zod` dependency) | Phase 3 must add `drizzle-zod`; `createInsertSchema` / `createSelectSchema` are the only stable contract |
| `drizzle-kit` | `^0.31.0` | Phase 3 must bump to a `0.32+` line that targets Drizzle 0.45 |

**Baseline pin location:** root `package.json` line 31
(`"drizzle-orm": "0.44.7"` under `pnpm.overrides`); `@reading-advantage/db`
declares `"drizzle-orm": "^0.44.0"` and resolves through the override.

---

## 2. Breaking-change categories (concrete surfaces)

### 2.1 Schema API

Drizzle 0.45 is known to tighten column-builder generics on the
`drizzle-orm/pg-core` entry point. The schema surface in
`packages/db/src/schema/` is broad — every file uses
`pgTable(name, columns, extras?)`. The audit enumerates the affected
shapes below.

| File | Columns at risk | Why |
|------|-----------------|-----|
| `users.ts` | `timestamp("created_at").defaultNow().notNull()`, `uuid("school_id").references(...)` | `.defaultNow()` return-type tightening; `text("license_id")` circular-import workaround must survive the generic tightening |
| `classrooms.ts` | `uuid`, `text`, `timestamp` | `.defaultRandom()` and `.defaultNow()` chains |
| `content.ts` | `jsonb`, `text`, `timestamp` | `jsonb()` builder is on the watch-list per test-strategy §3.1 |
| `progress.ts` | `integer`, `text`, `timestamp` | Standard; low risk |
| `flashcards.ts` | `text`, `uuid` | Standard; low risk |
| `questions.ts` | `jsonb`, `text`, `uuid` | `jsonb()` builder is on the watch-list |
| `analytics.ts` | `text`, `timestamp`, `integer` | Standard; low risk |
| `codecamp.ts` | `text`, `uuid`, `integer`, `jsonb` | `jsonb()` builder is on the watch-list |
| `licenses.ts` | `text`, `timestamp` | Standard; low risk |
| `stories.ts` | `text`, `uuid`, `jsonb` | `jsonb()` builder is on the watch-list |
| `taxonomy.ts` | `text`, `uuid` | Standard; low risk |
| `science.ts` | `text`, `uuid`, `integer`, `jsonb` | Largest file (385 lines); highest aggregate risk |
| `audit.ts` | `text`, `uuid`, `timestamp`, `jsonb` | `jsonb()` builder is on the watch-list |
| `marketing.ts` | `uuid`, `text`, `timestamp`, `jsonb`, multiple `pgEnum` | Newest file (current dirty worktree); 6 enums + 6 tables including `campaigns`, `videoProjects`, `videoAssets`, `pastTopics`, `settings` |
| `index.ts` | Barrel only (`export * from "./<file>.js"` x13) | No compile risk; the missing `export * from "./marketing.js"` line is a downstream effect (see Phase 1 §4 below) |

### 2.2 Migration format

Drizzle 0.45 may bump the journal `version` field in
`packages/db/drizzle/meta/_journal.json` (currently `"version": "7"`)
and may normalize the SQL DDL output (whitespace, identifier quoting).

**Concrete risk for this monorepo:** the journal-integrity invariant
documented in
`packages/db/src/__tests__/journal-integrity.test.ts` (229 lines)
asserts that `when` is monotonic, that `idx 0–16 <= 1779120000000`
and `idx 17+ > 1779120000000`, and that there is one entry per
`*.sql` file. The 21 migration SQL files in `packages/db/drizzle/`
are listed in §3 of `phase1-schema-map.md` (sister artifact).

If 0.45's `drizzle-kit generate` re-emits SQL with different
whitespace, `migration-sql.test.ts` (119 lines) will fail and Phase 3
must regenerate the snapshot file. **Semantic invariants — constraint
names, FK references, column presence — must be preserved.** Test
surface affected: `migration-sql.test.ts`, `journal-integrity.test.ts`.

### 2.3 Query builder

`createTenantDB` (packages/domain/src/db-contract.ts:302–563) wraps
Drizzle query builders and injects `eq(table.schoolId, tenant.schoolId)`
on `select`, `update`, and `delete` against FLAT (schoolId-bearing)
tables in the registry.

The wrapper relies on the **public** `db.select().from(table).where(...)`
shape. Drizzle 0.45 may rename or restrict internal generic parameters
on `PgSelect`/`PgUpdate`/`PgDelete`. The audit does NOT predict a
break — but flags the TenantDB-wrapping surface (see §3) as a
mandatory Phase 3 re-verification.

The build-graph confirms `createTenantDB` is exported and has 0
incoming `calls` edges in the static graph (only `contains` and
`param_flow`). The graph shows no callers — that is a graph
limitation (dynamic wrapping at request time), not a code gap.
Tenant-coverage is asserted at runtime by
`packages/domain/src/__tests__/tenant-coverage.test.ts`, which scans
every domain file for `createTenantDB` usage.

### 2.4 drizzle-zod

`drizzle-zod` is **not installed** in this monorepo at the 0.44.7
baseline. Phase 3 must add it. The audit surfaces this so Phase 3
doesn't lose track of it: a fresh `drizzle-zod` release pinned to
the same 0.45 line must compile against the new schema API.

### 2.5 Column-builder

Tightening of column-builder generics in 0.45 is the most likely
compile-time breakage. Files at risk: every schema file listed in
§2.1 above. The widest blast radius is `science.ts` (385 lines, many
`jsonb`/`timestamp` chains), `marketing.ts` (newest, includes 6
`pgEnum` declarations plus 6 tables), and `users.ts` (the barrel
re-export source for `accounts`, `sessions`, `schools`).

---

## 3. Cross-cutting risk surfaces (Phase 3 must protect)

These are surfaced per `test-strategy.md` §3.3, §3.4, §3.5, §3.6.
Phase 3 may not skip any of them.

### 3.1 drizzle-zod (test-strategy §3.4)

`build-graph search drizzle-zod` returned zero results at
`graph.db` mtime 2026-06-15 11:18 (2166 nodes / 3095 edges / 294
files). Confirmed: drizzle-zod is not installed. Phase 2's
`drizzle045-zod-contract.test.ts` is intentionally RED on this
baseline; Phase 3 owns installing drizzle-zod and re-running that
file. The contract test must show `createInsertSchema(users)` and
`createSelectSchema(users)` callable, then pass a Zod parse round-trip
on `users.email`.

### 3.2 TenantDB-wrapping (test-strategy §3.5)

`createTenantDB` is exported from `packages/domain/src/db-contract.ts`
(build-graph `inspect` confirms: 261 lines, `tags: ["exported"]`, 3
incoming edges all `contains`/`param_flow`). If 0.45 changes the
Drizzle builder API, the wrapping breaks. Phase 3 must re-run the
domain package's tenant-coverage test to verify the wrapping survives
the bump.

The audit cannot inspect the runtime call sites from build-graph (the
wrapper is applied dynamically); it can only confirm the symbol is
present and exported, which it is. The runtime guarantee comes from
`packages/domain/src/__tests__/tenant-coverage.test.ts`.

### 3.3 client.ts factory signature (test-strategy §3.6)

`packages/db/src/client.ts` is the single point of failure for the
drizzle-orm `drizzle(client, { schema })` factory call. The file is
29 lines and is the only place in this monorepo where the factory is
invoked. If 0.45 changes the factory signature (e.g., adds a required
`schema` mode, removes the `client` argument from the postgres-js
adapter), `client.ts` is the single file Phase 3 must update.

Build-graph confirms `client.ts` exports `db`, `client`, `DB` (the
`type_alias: DB`). The grep `^drizzle\(` in client.ts line 26 is the
only factory call site in the monorepo — confirmed via the build-graph
outgoing-edges view of `db-contract.ts` and the absence of any other
`drizzle(` import outside `client.ts` and the test fixtures.

### 3.4 Journal-integrity (test-strategy §3.3)

`_journal.json` at `packages/db/drizzle/meta/_journal.json` carries the
re-stamp invariant (`idx 0–16 <= 1779120000000`, `idx 17+ >
1779120000000`) that was deliberately crafted in
`packages/db/drizzle/MIGRATION_LEDGER.md`. If 0.45 re-emits the journal
with a different `version` field, the `journal-integrity.test.ts`
test (229 lines) will need its version-check assertion updated, but
the **re-stamp invariant must be preserved** or the migrator will
silently skip entries on fresh databases.

---

## 4. Out-of-scope call-outs

### 4.1 Barrel export drift (informational)

The current `packages/db/src/schema/index.ts` barrel does not include
`export * from "./marketing.js"`. The `marketing.ts` file exists on
disk (the dirty-worktree add), but consumers that
`import * as schema from "@reading-advantage/db/schema"` will not see
the `campaigns`, `videoProjects`, `videoAssets`, `pastTopics`, or
`settings` symbols until the barrel is updated. Phase 1 does NOT
modify the barrel (the contract test asserts the file exists on disk,
not the barrel re-export), but Phase 3 should add the export line as
part of the migration. The Phase 1 schema map (§3 of the sister
artifact) lists `marketing.ts` as part of the schema surface and the
test passes against that surface.

### 4.2 Carve-out: primary-advantage

The Prisma 7 question is settled in the sister artifact
`phase1-prisma-7-rejection.md`. The Drizzle 0.45 bump applies to all
five workspaces that resolve `drizzle-orm` through the root override
(`db`, `domain`, `api`, `auth`, `science-advantage`). `primary-advantage`
does not currently consume `@reading-advantage/db` — it has its own
Prisma client — so it is unaffected by the 0.45 bump.

---

## 5. Phase 3 implications (handoff note)

When Phase 3 implements the 0.45 upgrade, it must:

1. Bump `drizzle-orm` to `0.45.x` in root `pnpm.overrides`.
2. Bump `drizzle-kit` to a `0.32+` line in `packages/db/devDependencies`.
3. Add `drizzle-zod` as a `devDependency` of `packages/db`.
4. Re-run `drizzle-kit generate` and verify zero-diff against the
   21 SQL files in `packages/db/drizzle/` (or accept the diff and
   update `migration-sql.test.ts` to match the new format).
5. Update `packages/db/src/client.ts` if the factory signature moves.
6. Re-run `packages/db` tests: `schema.test.ts`, `schema-parity.test.ts`,
   `migration-sql.test.ts`, `journal-integrity.test.ts`,
   `contract-stubs.test.ts`, `connection-options.test.ts`,
   `package-esm-smoke.test.ts` — all must stay GREEN.
7. Add the intentionally-RED `drizzle045-zod-contract.test.ts` to
   the GREEN set after installing `drizzle-zod`.
8. Re-run `packages/domain` tests including
   `tenant-coverage.test.ts` to verify `createTenantDB` wrapping
   survives the bump.
9. Run `pnpm turbo run lint test check-types build` per Phase 4.

---

## 6. Provenance

- Build-graph baseline: `graph.db` mtime 2026-06-15 11:18, 2166 nodes / 3095 edges / 294 files.
- `createTenantDB` symbol confirmed via `build-graph inspect ./graph.db createTenantDB`.
- Schema surface confirmed via `build-graph files ./graph.db packages/db`.
- Migration SQL count confirmed via `ls packages/db/drizzle/*.sql | wc -l` = 21.
- Journal `version` and `when` invariants read directly from `packages/db/drizzle/meta/_journal.json`.
- Baseline `drizzle-orm 0.44.7` pin read directly from root `package.json` `pnpm.overrides`.