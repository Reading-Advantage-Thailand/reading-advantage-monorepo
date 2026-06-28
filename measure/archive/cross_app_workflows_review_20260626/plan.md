# Implementation Plan: Cross-App Workflows Review

> **Track ID:** `cross_app_workflows_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** Shared foundation plus at least Reading, Primary, Science, CodeCamp, Sales, Marketing, Games, and Website review inventories.

---

## Phase 0: Setup, Inventory, and Evidence Load

- [x] Task: Create `measure/audit-reports/cross-app-workflows_20260626/`. Evidence: directory contains all required artifacts listed in `checklist.md`.
- [x] Task: Inventory cross-app workflows and load accepted artifacts from child review tracks. Evidence: `00-inventory.md` loads Shared Foundation, Reading, Primary, Science, CodeCamp, Sales, Marketing, Games, and Website reviews.
- [x] Task: Build `architecture-map.md` from graph dependencies and review artifacts. Evidence: `architecture-map.md` maps auth/session, tenancy, DB/migration, AI, storage, UI, games import, claims, deployment, and test boundaries.

## Phase 1: Identity, Tenant, Data Model

- [x] Task: Review auth/session/user identity consistency across apps. Evidence: `findings.md` CA-001 and `architecture-map.md` §1.
- [x] Task: Review tenant/school/license model consistency and data isolation risks. Evidence: `findings.md` CA-002 and `architecture-map.md` §2.
- [x] Task: Review shared database migration and seed/deployment coupling. Evidence: `findings.md` CA-007 and `architecture-map.md` §3.

## Phase 2: Shared Providers and UI

- [x] Task: Review AI adapter usage and direct provider coupling across apps. Evidence: `findings.md` CA-005 and `architecture-map.md` §4.
- [x] Task: Review storage adapter usage and file/media access patterns. Evidence: `findings.md` CA-006 and `architecture-map.md` §5.
- [x] Task: Review shared UI/design system adoption and duplication. Evidence: `architecture-map.md` §6 and `findings.md` CA-008/CA-013 product-facing surfaces.

## Phase 3: Deployment, Observability, Tests

- [x] Task: Review env vars, secrets, CI gates, deployment targets, logging, tracing, error reporting, and monitoring. Evidence: `findings.md` CA-007, CA-009, CA-011 and `architecture-map.md` §9.
- [x] Task: Review test strategy consistency and gaps across apps/packages. Evidence: `findings.md` CA-010 and `test-gaps.md`.
- [x] Task: Record cross-app findings and proposed migration tracks. Evidence: `findings.md` and `migration-tracks.md`.

## Phase 4: Reporting and Acceptance

- [x] Task: Complete all required artifacts. Evidence: `00-inventory.md`, `architecture-map.md`, `workflow-map.md`, `checklist.md`, `findings.md`, `migration-tracks.md`, `test-gaps.md`, `executive-summary.md`.
- [x] Task: Run Measure phase acceptance. Evidence: `executive-summary.md` records review acceptance PASS and product readiness FAIL/remediation required.
- [x] Task: Feed accepted findings into final prioritization and roadmap. Evidence: `../monorepo-review-roadmap_20260626/deduplicated-findings.md` consumes CA-001 through CA-013.
