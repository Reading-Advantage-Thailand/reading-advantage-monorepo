# Cross-App Workflows Review — Checklist

> **Track:** `cross_app_workflows_review_20260626`
> **Date:** 2026-06-27
> **Type:** Review-only synthesis. No remediation performed.

## Input Evidence Load

- [x] Shared Foundation review loaded (26 findings, 10 migration-track proposals)
- [x] Reading Advantage review loaded (51 batches, 1016 files, synthesis)
- [x] Primary Advantage review loaded (103 batches, 446 files, 893 findings)
- [x] Science Advantage review loaded (37 batches, 738 files, 922 raw findings)
- [x] CodeCamp Advantage review loaded (11 batches, 209 files, consolidated findings)
- [x] Sales Advantage review loaded (6 batches, 110 files, 138 findings)
- [x] Marketing App review loaded (7 batches, 45 files, 44 findings)
- [x] Advantage Games review loaded (47 batches, 929 files, 1749 findings)
- [x] Company Website review loaded (10 batches, 130 files, 44 findings)

## Cross-App Concern Coverage

### Identity, Tenant, Data Model

- [x] Auth/session/user identity consistency across apps reviewed
  - Evidence: F-SF-008, F-SALES-B00-030 (role-enum gap), C-RA-CRIT-01..05 (reading unauthenticated), C-H-3 (codecamp curriculum teaches forgeable headers)
- [x] Tenant/school/license model consistency reviewed
  - Evidence: F-SF-001 (9 unclassified tables), F-SF-004 (null-tenant TenantDB), CR-1 (codecamp TenantScopeError), C2 (sales cross-tenant exposure), D-04 (games leaderboard unregistered)
- [x] Shared database migration and seed/deployment coupling reviewed
  - Evidence: F-SF-006 (missing sentinels), F-SF-014 (Drizzle version mismatch), HI-05 (grade-4 seed contract violation), F-CC-B07-034 (uniqueness backfill halt)

### Shared Providers and UI

- [x] AI adapter usage and direct provider coupling reviewed
  - Evidence: F-SF-021 (legacy bypass), F-SALES-B03-010 (barrel leak), C-013 (reading Google Translate SDK), LR-004-003 (marketing per-request client)
- [x] Storage adapter usage and file/media access patterns reviewed
  - Evidence: F-SF-022 (missing get() method), F-SF-021 (legacy Google Cloud Storage), Primary path traversal
- [x] Shared UI/design system adoption and duplication reviewed
  - Evidence: F-SF-020 (duplicate cn()), F-SF-018 (10/20 components untested), LRF-010 (empty component files)

### Deployment, Observability, Tests

- [x] Env vars, secrets, CI gates, deployment targets reviewed
  - Evidence: HI-08 (Vercel Prisma in Drizzle app), H-10 (Cloud Run allUsers), F-SF-011 (cookie secure gated on NODE_ENV), C-H-5 (prod-smoke in CI)
- [x] Logging, tracing, error reporting, monitoring reviewed
  - Evidence: CR-02 (Sentry bypass), M-02 (console.log everywhere), F-SF-016 (unstructured webhook logging)
- [x] Test strategy consistency and gaps reviewed
  - Evidence: Reading 0/209 route tested, Science CR-04 (vacuous tenant tests), CodeCamp CR-2 (false-green mock), Games C-13 (smoke-only e2e), F-SF-017 (types 0 tests)

### Cross-App Synthesis

- [x] Cross-app findings recorded with deduplication
- [x] Proposed migration tracks name affected apps and package owners
- [x] Website/product claims vs reality reviewed
  - Evidence: LRF-002 (stale 2025 claims on 6+ pages), LRF-001 (9 products overstated), LRF-012 (placeholder case studies), LRF-014 (duplicated efficacy stats)

## Required Artifacts

- [x] `00-inventory.md` created
- [x] `architecture-map.md` created
- [x] `workflow-map.md` created
- [x] `checklist.md` created
- [x] `findings.md` created
- [x] `migration-tracks.md` created
- [x] `test-gaps.md` created
- [x] `executive-summary.md` created

## Quality Gates

- [b] Lint gate: deferred:review-execution (review-only track)
- [b] Type-check gate: deferred:review-execution (review-only track)
- [b] Test gate: deferred:review-execution (review-only track)
- [b] Build gate: deferred:review-execution (review-only track)
- [b] Graph gate: deferred:review-execution (review-only track)
- [b] Browser/smoke gate: deferred:review-execution (review-only track)

## Non-Goals Confirmed

- [x] Did not duplicate app-specific findings wholesale
- [x] Deduplicated shared root causes across apps
- [x] Did not create new architecture without review evidence
- [x] Did not resolve product prioritization (feeds to final roadmap)
- [x] No source code was modified

## Acceptance Criteria

- [x] Cross-app risks supported by findings from at least one child review
- [x] Shared-root-cause findings deduplicate app-level symptoms
- [x] Proposed migration tracks identify affected apps and package owners
