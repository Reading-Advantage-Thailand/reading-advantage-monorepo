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
  *Link: [./tracks/unified_ci_cd_pipeline_20260502/](./tracks/unified_ci_cd_pipeline_20260502/)*
- [x] **Track: Shared Backend: Scaffold + Schema Unification** (27/27 tasks)
  *Link: [./tracks/shared_backend_scaffold_20260502/](./tracks/shared_backend_scaffold_20260502/)*
- [x] **Track: Shared Backend: Auth Migration** (15/15 tasks)
  *Link: [./tracks/shared_backend_auth_20260502/](./tracks/shared_backend_auth_20260502/)*
- [x] **Track: Shared Backend: API Route Migration** (9/29 core tasks complete)
  *Link: [./tracks/shared_backend_api_20260502/](./tracks/shared_backend_api_20260502/)*
  *Status: Tiers 1–2 routers implemented (users, classes, assignments, articles, progress, reports, auth). Tiers 3–4 (app-specific, AI) deferred to future tracks. Cookie-based auth update will be handled by unified auth track.*
- [~] **Track: Unified Auth System** (0/40 tasks)
  *Link: [./tracks/unified_auth_20260502/](./tracks/unified_auth_20260502/)*
  *Status: Replaces NextAuth+JWT+Firebase with simple username/password DB sessions. Modeled on science-advantage pattern.*
- [~] **Track: Shared Config Consolidation** (20/27 tasks complete, 7 deferred)
  *Link: [./tracks/shared_config_consolidation_20260502/](./tracks/shared_config_consolidation_20260502/)*
  *Status: Tailwind v4 unified, ESLint flat config migrated for primary/www, `cn()` deduped, package builds fixed. Deferred: UI component migration, visual regression tests, full ESLint v9 for reading-advantage.*
- [~] **Track: i18n Migration (reading-advantage)** (13/18 tasks complete, 5 deferred)
  *Link: [./tracks/i18n_migration_20260502/](./tracks/i18n_migration_20260502/)*
  *Status: next-intl config added, client/server exports rewritten, middleware migrated, next-international removed, build passes. Deferred: flashcard component import updates, locale-config.ts cleanup.*

---

### Review Remediation

- [x] **Track: Last-24-Hour Review Remediation** (7/9 main tasks + 9/9 Phase 5 subtasks complete)
  *Link: [./tracks/review_remediation_20260502/](./tracks/review_remediation_20260502/)*
  *Status: Auth tests, cross-tenant guards, config drift wiring, DB constraints, and Phase 5 review fixes all verified in code. NextAuth vs tRPC decision resolved: moving to simple username/password DB sessions (new track). lessonProgress.lessonId alignment deferred to tech-debt. Manual verification protocols deferred to implementation.*
