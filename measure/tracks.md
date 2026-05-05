# Project Tracks

This file tracks all major tracks for the project.

---

- [x] **Track: Scaffold monorepo and migrate first app**
  *Link: [./archive/monorepo-scaffold_20260429/](./archive/monorepo-scaffold_20260429/)*

---

### Migration Queue

- [x] **Track: Migrate reading-advantage into monorepo**
  *Link: [./archive/migrate-reading-advantage_20260501/](./archive/migrate-reading-advantage_20260501/)*
- [x] **Track: Migrate primary-advantage into monorepo**
  *Link: [./archive/migrate-primary-advantage_20260501/](./archive/migrate-primary-advantage_20260501/)*
- [x] **Track: Migrate www-reading-advantage into monorepo**
  *Link: [./archive/migrate-www-reading-advantage_20260501/](./archive/migrate-www-reading-advantage_20260501/)*
- [x] **Track: Migrate science-advantage into monorepo**
  *Completed: 2026-05-02 (bulk-added in 3b93a05)*

---

### Infrastructure & Backend

- [x] **Track: Test Coverage Baseline** (29/29 tasks)
  *Link: [./archive/test_coverage_baseline_20260502/](./archive/test_coverage_baseline_20260502/)*
- [x] **Track: Unified CI/CD Pipeline** (18/18 tasks)
  *Link: [./archive/unified_ci_cd_pipeline_20260502/](./archive/unified_ci_cd_pipeline_20260502/)*
- [x] **Track: Shared Backend: Scaffold + Schema Unification** (27/27 tasks)
  *Link: [./archive/shared_backend_scaffold_20260502/](./archive/shared_backend_scaffold_20260502/)*
- [x] **Track: Shared Backend: Auth Migration** (15/15 tasks)
  *Link: [./archive/shared_backend_auth_20260502/](./archive/shared_backend_auth_20260502/)*
- [x] **Track: Shared Backend: API Route Migration** (9/29 core tasks complete)
  *Link: [./archive/shared_backend_api_20260502/](./archive/shared_backend_api_20260502/)*
  *Status: Tiers 1–2 routers implemented (users, classes, assignments, articles, progress, reports, auth). Tiers 3–4 (app-specific, AI) deferred to future tracks. Cookie-based auth update will be handled by unified auth track.*
- [x] **Track: Unified Auth System** (Phases 1–6 complete)
  *Link: [./tracks/unified_auth_20260502/](./tracks/unified_auth_20260502/)*
  *Status: Schema, auth pkg, auth-client, tRPC/API routes, reading+primary apps all done. next-auth fully removed. firebaseUid/JWT cleanup complete. Phase 5c (science-advantage) tracked separately.*
- [x] **Track: Shared Config Consolidation** (ESLint restructuring + 10 UI components added)
  *Link: [./tracks/shared_config_consolidation_20260502/](./tracks/shared_config_consolidation_20260502/)*
  *Status: Tailwind v4 unified, ESLint flat config migrated for primary/www, ESLint shared config restructured with composable baseConfig/plugins/ignores exports, advantage-games migrated to shared config, `cn()` deduped, 15 UI components in @reading-advantage/ui. Deferred: visual regression tests, shared i18n types, integration tests.*
- [x] **Track: i18n Migration (reading-advantage)** (19/19 tasks complete)
  *Link: [./archive/i18n_migration_20260502/](./archive/i18n_migration_20260502/)*
  *Status: next-intl config added, client/server exports rewritten, middleware migrated, next-international removed, localeImports dead code removed, flashcard imports fixed, stale locales.ts deleted. `configs/locale-config.ts` kept (still imported by 6 files). Build passes. Archived.*

---

### Pending Tracks

- [x] **Track: Tech Debt Resolution** *Link: [./tracks/tech_debt_resolution_20260503/](./tracks/tech_debt_resolution_20260503/)*
  Resolve 16 open tech-debt items not covered by other tracks. Phases: critical infra (Prisma→Drizzle, auth migration SQL), build config cleanup (ignoreBuildErrors removal), schema integrity, app-specific fixes, shared tooling.
- [~] **Track: Reading-Advantage Build Remediation** *Link: [./tracks/reading_advantage_build_remediation_20260503/](./tracks/reading_advantage_build_remediation_20260503/)*
  Fix 128 lint warnings, 26 failed test suites, and remove ignoreBuildErrors. *Status: Core tests fixed — all 8 `__test__/` suites pass (184 tests). ESLint v9 flat config created. Game component tests still hang (Zustand v4). Build/lint full verification blocked by hardware.*
- [~] **Track: Primary-Advantage Stabilization** *Link: [./tracks/primary_advantage_stabilization_20260503/](./tracks/primary_advantage_stabilization_20260503/)*
  Fix 49 lint errors, add Vitest test suite, remove ignoreBuildErrors. *Status: All 35 lint errors fixed (0 remain). Vitest 35/35 tests pass. Build/ignoreBuildErrors removal blocked by hardware.*
- [~] **Track: Shared ESLint v9 Flat Config Migration** *Link: [./tracks/shared_eslint_v9_migration_20260503/](./tracks/shared_eslint_v9_migration_20260503/)*
  Fix plugin resolution across workspace boundaries, migrate reading-advantage to v9. *Status: reading-advantage migrated to eslint.config.mjs. All 5 apps on flat config. Shared config README written. Plugin resolution verification blocked by hardware.*
- [x] **Track: Science-Advantage Auth Migration** (26/26 tasks) *Link: [./tracks/science_auth_migration_20260503/](./tracks/science_auth_migration_20260503/)*
  Migrate from standalone Prisma auth to shared @reading-advantage/auth, auth-client, and db packages. Build passes, auth files lint clean. Non-auth Prisma (curriculum, lessons) preserved.

---

### Prisma → Drizzle Migration Program (4 tracks)

- [ ] **Track: Prisma → Drizzle Schema Unification**
  *Link: [./tracks/prisma_drizzle_schema_unification_20260505/](./tracks/prisma_drizzle_schema_unification_20260505/)*
  Track 1 of 4. Audit, port, reshape, and unify all non-auth Prisma models into shared Drizzle schema. Adds domain helpers and parity tests. No controller changes. Unblocks tracks 2–4.
- [ ] **Track: reading-advantage Controllers — Prisma → Drizzle**
  *Link: [./tracks/prisma_drizzle_reading_controllers_20260505/](./tracks/prisma_drizzle_reading_controllers_20260505/)*
  Track 2 of 4. **Blocked on track 1.** Migrate 141 Prisma references across 54 controllers, actions, lib, scripts, pages, and route handlers. Final phase deletes Prisma surface and deps.
- [ ] **Track: science-advantage Non-Auth Prisma → Drizzle**
  *Link: [./tracks/prisma_drizzle_science_controllers_20260505/](./tracks/prisma_drizzle_science_controllers_20260505/)*
  Track 3 of 4. **Blocked on track 1.** Migrate 89 non-auth Prisma references (curriculum, lessons, gamification, classes, attempts, mastery). Deletes generated Zod artifacts and Prisma surface.
- [ ] **Track: Prisma → Drizzle Per-Feature Slice Cleanup**
  *Link: [./tracks/prisma_drizzle_slice_cleanup_20260505/](./tracks/prisma_drizzle_slice_cleanup_20260505/)*
  Track 4 of 4. **Blocked on tracks 2–3.** Per-slice cleanup of non-generalizable surface deferred from earlier tracks. Final repo-wide Prisma eradication.

---

### Review Remediation

- [~] **Track: Last-12-Hour Review Fixes**
  *Link: [./tracks/last_12h_review_fix_20260503/](./tracks/last_12h_review_fix_20260503/)*
  *Status: Implemented; manual verification tasks remain open. All code/tests/lint complete.*

- [x] **Track: Last-24-Hour Review Remediation** (7/9 main tasks + 9/9 Phase 5 subtasks complete)
  *Link: [./archive/review_remediation_20260502/](./archive/review_remediation_20260502/)*
  *Status: Auth tests, cross-tenant guards, config drift wiring, DB constraints, and Phase 5 review fixes all verified in code. NextAuth vs tRPC decision resolved: moving to simple username/password DB sessions (new track). lessonProgress.lessonId alignment deferred to tech-debt. Manual verification protocols deferred to implementation.*

- [x] **Track: Implement strict data and authorization contracts** (28/28 tasks)
  *Link: [./archive/strict_contracts_20260504/](./archive/strict_contracts_20260504/)*
  *Status: All four phases complete — TenantDB wrapper, branded types, tRPC output contracts, boundary validation. 28 tasks done. Plan archived.*
- [x] **Track: Strict Contracts Review Remediation** (10 tasks)
  *Link: [./tracks/strict_contracts_review_20260504/](./tracks/strict_contracts_review_20260504/)*
  *Status: Complete. All 10 tasks finished across 4 phases. Tenant scoping fixed, validation/auth gaps closed, 26 new tests added, BOM removed. Pre-existing test/type issues in auth/api noted for separate tracks.*
- [x] **Track: May 5 Review Remediation** (23/24 tasks)
  *Link: [./tracks/remediation_20260505/](./tracks/remediation_20260505/)*
  *Status: Complete. 23/24 tasks done (API test backfill deferred). Domain: 83/83 tests (+13 new). Auth: 64/64 tests. Security/auth gaps fixed, logic bugs resolved, TenantDB edge cases hardened.*
