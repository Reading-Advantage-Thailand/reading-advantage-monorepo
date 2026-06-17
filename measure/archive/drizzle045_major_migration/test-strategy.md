# Test Strategy: Drizzle 0.45 Major Migration

> **Track:** `drizzle045_major_migration`
> **Build-graph:** `graph.db` fresh (2026-06-15 10:14), 2165 nodes / 3098 edges / 293 files.
> **Baseline:** drizzle-orm 0.44.7 (root override), drizzle-kit 0.31.0, no drizzle-zod installed.
> **Schema surface:** 14 files in `packages/db/src/schema/`, 21 migration SQL files (0000–0020).

---

## 1. Testing Pyramid Guidance

```
          ┌──────────────┐
          │  E2E / Smoke │  Phase 4: `pnpm turbo run lint|test|check-types|build`
          │  (aggregate) │  + `pnpm --filter @reading-advantage/db migrate` against fresh DB
          ├──────────────┤
          │  Integration │  Phase 3: `drizzle-kit generate` diff against baseline,
          │  (real DB)   │  `drizzle-kit migrate` fresh-DB apply, `drizzle-zod` round-trip
          ├──────────────┤
          │  Unit /      │  Phase 2: schema-compile, column-presence, import-contract,
          │  Contract    │  migration-SQL parity, journal-integrity, tenant-coverage
          └──────────────┘
```

- **Phase 2 (Test):** Pure unit + contract. No DB, no network. Schema imports, column assertions, migration-SQL string checks, journal JSON integrity.
- **Phase 3 (Implement):** Integration with real DB. `drizzle-kit generate` diff, `drizzle-kit migrate` fresh-DB apply, drizzle-zod schema round-trip.
- **Phase 4 (Validate):** Aggregate gate. `pnpm turbo run lint|test|check-types|build` across all workspaces.

---

## 2. Shared Test Fixtures & Mocks

| Fixture | Location | Shared by |
|---------|----------|-----------|
| `packages/db/drizzle/` (migration SQL files) | `packages/db/drizzle/` | Phase 2 migration-SQL parity, Phase 3 generate-diff |
| `packages/db/drizzle/meta/_journal.json` | `packages/db/drizzle/meta/` | Phase 2 journal-integrity |
| `packages/db/src/schema/index.ts` barrel | `packages/db/src/schema/` | All schema-compile + column-presence tests |
| Fresh DB (Docker `postgres:16-alpine` on 5432) | `docker-compose.yml` | Phase 3 integration |
| `packages/domain/src/tenant-registry.ts` | domain package | Phase 2 tenant-coverage guardrail |

---

## 3. Cross-Phase Edge Cases & Dependencies

1. **API-breaking column types.** Drizzle 0.45 may change `timestamp`/`jsonb`/`uuid` builder signatures. Phase 2 catches via `import * as schema` + column-name assertions.
2. **Migration format change.** 0.45 may change SQL output format. Phase 2 migration-SQL parity tests must be updated; Phase 3 `drizzle-kit generate` must produce zero-diff.
3. **Journal `when` monotonicity.** Re-stamp invariant (idx 0–16 ≤ 1779120000000, idx 17+ > 1779120000000) must survive. Phase 2 journal-integrity test is the guardrail.
4. **drizzle-zod not installed.** Must be added in Phase 3. Phase 2 `drizzle045-zod-contract.test.ts` is intentionally RED.
5. **TenantDB wrapping.** `createTenantDB` wraps Drizzle query builders. If 0.45 changes the builder API, tenant-coverage + domain tests catch it.
6. **Client construction.** `packages/db/src/client.ts` uses `drizzle(client, { schema })`. Single point of failure if factory signature changes.
7. **pnpm.overrides.** Root pins `drizzle-orm: 0.44.7`. Phase 3 bumps to 0.45.x; all 5 dependent packages resolve via overrides.
8. **No drizzle-kit in build-graph.** CLI-only tool. Phase 3 must exercise via shell commands, not Vitest imports.

---

## 4. Architecture Guardrails

- **No schema drift.** Phase 2 `schema-parity.test.ts` (584 lines, 30+ describe blocks) asserts every table + column. This test must stay GREEN through the upgrade — it is the primary guardrail against silent column loss.
- **No migration loss.** Phase 2 `migration-sql.test.ts` asserts SQL content for key migrations (0002, 0003, 0004, 0015, 0017). If 0.45 changes DDL output, these assertions must be updated to match the new format — but the *semantic* invariants (constraint names, column presence, FK references) must be preserved.
- **No journal corruption.** Phase 2 `journal-integrity.test.ts` (229 lines) asserts file↔entry parity, idx contiguity, `when` monotonicity, era sanity, re-stamp safety, and sentinel coverage. This test must stay GREEN.
- **No tenant-scope bypass.** Phase 2 `tenant-coverage.test.ts` in domain package scans every domain file for `createTenantDB` usage. If 0.45 changes the Drizzle table type, the tenant-registry classification may need updates.
- **No client-bundle leak.** Per lessons-learned (2026-05-24), `@reading-advantage/db` transitively imports `postgres` (node-only). Phase 4 `pnpm build` across all apps catches any bundle leak.
- **No `ignoreBuildErrors: true` regression.** Per lessons-learned (2026-06-07), this flag was removed. Phase 4 `check-types` must pass.

---

## 5. Per-Phase Test Approach

### Phase 1: Contract & Schema Definition
- **No tests written.** Audit-only phase. Output: documented breaking-change list, schema-file map, Prisma-7 rejection rationale.

### Phase 2: Test (Red)
- **Targeted Red command:** `pnpm --filter @reading-advantage/db test`
- **New test files:**
  - `packages/db/src/__tests__/drizzle045-schema-compile.test.ts` — imports every schema file, asserts column presence, verifies no import errors from 0.45 API changes.
  - `packages/db/src/__tests__/drizzle045-migration-format.test.ts` — asserts SQL output format matches 0.45 conventions (DDL syntax, constraint naming).
  - `packages/db/src/__tests__/drizzle045-zod-contract.test.ts` — stub that imports `drizzle-zod` and asserts `createInsertSchema`/`createSelectSchema` are callable (RED until drizzle-zod is installed in Phase 3).
- **Existing tests that must stay GREEN:**
  - `schema.test.ts` (147 lines) — table exports + column presence
  - `schema-parity.test.ts` (584 lines) — Prisma→Drizzle parity
  - `migration-sql.test.ts` (119 lines) — SQL content assertions
  - `journal-integrity.test.ts` (229 lines) — journal invariants
  - `contract-stubs.test.ts` (151 lines) — artifact presence (from db_migration_ledger track)
  - `connection-options.test.ts` — connection pooling config
  - `package-esm-smoke.test.ts` — ESM import smoke test
- **Intentionally RED test files:** `drizzle045-zod-contract.test.ts` (drizzle-zod not yet installed). Owned by Phase 3 Task "Update drizzle-zod integration." Excluded from Phase 2 Red gate by running only the targeted files, not the full suite.

### Phase 3: Implement (Green)
- **Targeted Green command:** `pnpm --filter @reading-advantage/db test` (all GREEN)
- **Integration tests (real DB):**
  - `drizzle-kit generate` diff against baseline → zero diff
  - `drizzle-kit migrate` against fresh Docker DB → all 21 migrations apply
  - drizzle-zod `createInsertSchema(users)` → Zod parse round-trip
- **Cross-package tests:**
  - `pnpm --filter @reading-advantage/domain test` — tenant-coverage, db-contract
  - `pnpm --filter @reading-advantage/api test` — tRPC routers
  - `pnpm --filter @reading-advantage/auth test` — auth integration tests

### Phase 4: Validate & Close
- **Aggregate gate:** `pnpm turbo run lint test check-types build`
- **Smoke tests:** `pnpm --filter @reading-advantage/db migrate` against fresh DB; `pnpm outdated -r` shows drizzle-orm 0.45.x, drizzle-kit 0.32+; `pnpm audit` clean
- **Documentation:** Update `measure/tech-stack.md` with Drizzle 0.45 version.

---

## 6. Build-Graph Findings That Shaped This Strategy

| Finding | Impact on Strategy |
|---------|-------------------|
| **No drizzle-zod in graph.** `build-graph search drizzle-zod` returned zero results. Confirmed: drizzle-zod is not installed. Phase 2 `drizzle045-zod-contract.test.ts` is intentionally RED; Phase 3 installs it. | Phase 2 Red gate must exclude this file. |
| **No drizzle-kit in graph.** `drizzle-kit` is CLI-only, not imported in source. Phase 3 integration tests must exercise it via shell commands, not Vitest imports. | Phase 3 needs `drizzle-kit generate` / `drizzle-kit migrate` shell gates. |
| **14 schema files, 21 migrations.** `build-graph files packages/db` shows the full surface. Every schema file must compile under 0.45. | Phase 2 compile test must import all 14 files. |
| **`createTenantDB` has 0 callers in graph.** The graph shows only `contains` and `param_flow` edges — no `calls` edges. This is a graph limitation (dynamic wrapping), not a code gap. Tenant-coverage test in domain package is the real guardrail. | Phase 3 must run domain tests to verify tenant wrapping survives. |
| **5 packages depend on drizzle-orm.** db, domain, api, auth, science-advantage. pnpm.overrides at root pins 0.44.7. | Phase 3 bump must touch root `package.json` only; all packages resolve via overrides. |
| **No vitest.config.ts in packages/db.** DB package uses vitest directly (no custom config). Tests run via `vitest run`. | Phase 2/3 commands use `pnpm --filter @reading-advantage/db test`. |
| **schema-parity.test.ts is 584 lines.** Largest schema test — 30+ describe blocks covering every table. | This is the primary guardrail; must stay GREEN through upgrade. |
| **journal-integrity.test.ts has re-stamp safety invariant.** idx 0–16 ≤ 1779120000000, idx 17+ > 1779120000000. | Must survive migration format changes. |

---

## 7. Live-Proof Plan

| Phase | Targeted Red Command | Green / Closeout Gate |
|-------|---------------------|----------------------|
| **Phase 1** | N/A (audit-only) | Documented breaking-change list + schema-file map committed |
| **Phase 2** | `pnpm --filter @reading-advantage/db vitest run src/__tests__/drizzle045-schema-compile.test.ts src/__tests__/drizzle045-migration-format.test.ts` | Both new test files RED (fail against 0.44 API). All existing tests (`schema.test.ts`, `schema-parity.test.ts`, `migration-sql.test.ts`, `journal-integrity.test.ts`, `contract-stubs.test.ts`, `connection-options.test.ts`, `package-esm-smoke.test.ts`) GREEN. `drizzle045-zod-contract.test.ts` intentionally RED (owned by Phase 3, excluded from this gate). |
| **Phase 3** | `pnpm --filter @reading-advantage/db test` | All tests GREEN (including drizzle045-zod-contract). `drizzle-kit generate` zero-diff. `drizzle-kit migrate` fresh-DB apply. Cross-package tests GREEN. |
| **Phase 4** | `pnpm turbo run lint test check-types build` | All aggregate gates GREEN. `pnpm outdated -r` shows drizzle-orm 0.45.x, drizzle-kit ^0.31.7. `pnpm audit` clean. `measure/tech-stack.md` updated. |

### Intentionally-RED Test Files

| File | Phase Owned By | Exclusion Mechanism |
|------|---------------|---------------------|
| `packages/db/src/__tests__/drizzle045-zod-contract.test.ts` | Phase 3 (still [~]) | Excluded from Phase 2 gate by targeted file list; not in `vitest run` glob. |

### Fake Harness Note

No fake harnesses are used. The Phase 2 Red gate uses targeted file paths to exclude the intentionally-RED `drizzle045-zod-contract.test.ts`. The Phase 3 integration gate uses real Docker Postgres (`docker-compose.yml`). The Phase 4 aggregate gate is the production `turbo run` pipeline — no harness indirection.
