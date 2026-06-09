# Implementation Plan: TenantDB Proxy Hardening & Honest Coverage

_Spec ref: ./spec.md_
_Blast radius: db-contract.ts is the most-imported file in the monorepo (19 importers); 43 files in packages/domain reference TenantDB. createTenantDB signature is preserved (NFR) so FLAT-table callers are unaffected; risk concentrates in Phase 4 (referential call-site migration)._

## Phase 0: Baseline & Table Inventory
- [ ] Task: Capture green baseline
    - [ ] Run `pnpm --filter @reading-advantage/domain test` and record pass count
    - [ ] Run `pnpm --filter @reading-advantage/db build` to confirm schema compiles
- [ ] Task: Inventory every table by classification
    - [ ] Enumerate all exported tables across packages/db/src/schema/*.ts
    - [ ] Tag each FLAT (has schoolId) / EXEMPT (global catalog/audit) / REFERENTIAL (owner-FK tenant data)
    - [ ] Record the draft classification in plan-notes for Phase 1 (audited decision record)
- [ ] Task: Measure - User Manual Verification 'Phase 0: Baseline & Table Inventory' (Protocol in workflow.md)

## Phase 1: Contract & Schema Definition
- [ ] Task: Define the table classification registry (FR-1)
    - [ ] Create `packages/domain/src/tenant-registry.ts` mapping each table → 'FLAT' | 'EXEMPT' | 'REFERENTIAL'
    - [ ] Build an O(1) lookup keyed by Drizzle table identity (precomputed Map, no per-query reflection)
    - [ ] Populate from the Phase 0 inventory; export a typed `classifyTable(table)` helper
- [ ] Task: Define error contracts and escape-hatch surface (FR-2, FR-3)
    - [ ] Add `TenantScopeError` (named, table + remediation in message)
    - [ ] Add `unscoped(reason: string): DB` to the TenantDB interface/return type
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test (Red)
- [ ] Task: Proxy behavior tests (FR-2..FR-5)
    - [ ] REFERENTIAL bare query throws; same query via `unscoped(...)` succeeds (FR-3)
    - [ ] Unclassified/unknown table throws (FR-2)
    - [ ] Joined FLAT table gets its own schoolId predicate — assert via `.toSQL()` (FR-4); joined REFERENTIAL throws
    - [ ] `insert().values({ schoolId: <other> })` into FLAT throws; omitted schoolId is injected; array form covered (FR-5)
- [ ] Task: Rewrite tenant-coverage test as red spec (FR-6)
    - [ ] Assert every domain-referenced table is classified
    - [ ] Assert FLAT entries have a real schoolId column; non-FLAT do not
    - [ ] Assert REFERENTIAL tables are reached only via `unscoped(...)`
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test (Red)' (Protocol in workflow.md)

## Phase 3: Implement Proxy Hardening (Green)
- [ ] Task: Make the proxy fail-closed (FR-1, FR-2, FR-3)
    - [ ] Replace `hasSchoolId`-silent-passthrough with registry classification at `.from()`/update/delete/insert table capture
    - [ ] FLAT → inject schoolId (preserve current behavior); UNCLASSIFIED → throw; REFERENTIAL → throw with directive
    - [ ] Implement `unscoped(reason)` returning the raw db (greppable, reason recorded)
- [ ] Task: Harden join path (FR-4)
    - [ ] In wrapQueryBuilder join interception, inject schoolId for joined FLAT tables; throw for joined REFERENTIAL
- [ ] Task: Harden insert .values() path (FR-5)
    - [ ] Force/validate schoolId for FLAT inserts (single + array); reject conflicting schoolId; keep onConflictDoUpdate path
- [ ] Task: Make Phase 2 tests green
    - [ ] Run domain suite; iterate proxy until all new tests pass
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement Proxy Hardening (Green)' (Protocol in workflow.md)

## Phase 4: Migrate Referential Call Sites (FR-7)
- [ ] Task: Enumerate breakages
    - [ ] Run domain suite/build; list every call site now throwing on a REFERENTIAL table
- [ ] Task: Migrate call sites to `unscoped(reason)`
    - [ ] Replace silent-TenantDB-on-referential with `unscoped(...)` + owner-FK (users.schoolId) join where cheap
    - [ ] For tables where a real join is non-trivial, record a per-module follow-up in tech-debt.md (Open, with severity)
- [ ] Task: Restore green build
    - [ ] `pnpm --filter @reading-advantage/domain test` green; `pnpm build` passes
- [ ] Task: Measure - User Manual Verification 'Phase 4: Migrate Referential Call Sites' (Protocol in workflow.md)

## Phase 5: Docs & Graph Refresh (FR-8)
- [ ] Task: Document the multi-tenancy model (FR-8)
    - [ ] AGENTS.md Multi-Tenancy section: FLAT / EXEMPT / REFERENTIAL + `unscoped` escape hatch + "add to registry" rule
    - [ ] packages/domain README: how createTenantDB scopes, when to use unscoped, how the coverage test enforces it
- [ ] Task: Refresh generated facts
    - [ ] `build-graph update ./graph.db <changed files>` to keep the graph fresh
- [ ] Task: Full verification
    - [ ] Full domain suite + `pnpm build`; record final counts
- [ ] Task: Measure - User Manual Verification 'Phase 5: Docs & Graph Refresh' (Protocol in workflow.md)
