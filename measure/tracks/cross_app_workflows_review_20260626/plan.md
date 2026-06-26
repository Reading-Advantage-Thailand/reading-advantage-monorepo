# Implementation Plan: Cross-App Workflows Review

> **Track ID:** `cross_app_workflows_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** Shared foundation plus at least Reading, Primary, Science, CodeCamp, Sales, Marketing, Games, and Website review inventories.

---

## Phase 0: Setup, Inventory, and Evidence Load

- [b] Task: Create `measure/audit-reports/cross-app-workflows_20260626/`. — deferred:review-execution
- [b] Task: Inventory cross-app workflows and load accepted artifacts from child review tracks. — deferred:review-execution
- [b] Task: Build `architecture-map.md` from graph dependencies and review artifacts. — deferred:review-execution

## Phase 1: Identity, Tenant, Data Model

- [b] Task: Review auth/session/user identity consistency across apps. — deferred:review-execution
- [b] Task: Review tenant/school/license model consistency and data isolation risks. — deferred:review-execution
- [b] Task: Review shared database migration and seed/deployment coupling. — deferred:review-execution

## Phase 2: Shared Providers and UI

- [b] Task: Review AI adapter usage and direct provider coupling across apps. — deferred:review-execution
- [b] Task: Review storage adapter usage and file/media access patterns. — deferred:review-execution
- [b] Task: Review shared UI/design system adoption and duplication. — deferred:review-execution

## Phase 3: Deployment, Observability, Tests

- [b] Task: Review env vars, secrets, CI gates, deployment targets, logging, tracing, error reporting, and monitoring. — deferred:review-execution
- [b] Task: Review test strategy consistency and gaps across apps/packages. — deferred:review-execution
- [b] Task: Record cross-app findings and proposed migration tracks. — deferred:review-execution

## Phase 4: Reporting and Acceptance

- [b] Task: Complete all required artifacts. — deferred:review-execution
- [b] Task: Run Measure phase acceptance. — deferred:review-execution
- [b] Task: Feed accepted findings into final prioritization and roadmap. — deferred:review-execution
