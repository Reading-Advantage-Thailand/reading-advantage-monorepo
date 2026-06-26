# Implementation Plan: Shared Foundation Review

> **Track ID:** `shared_foundation_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Methodology:** Inventory first, evidence-backed review second, remediation proposals last.

---

## Phase 0: Setup and Inventory

- [b] Task: Confirm `graph.db` is fresh and non-empty with `build-graph stats ./graph.db`. — deferred:review-execution
- [b] Task: Create `measure/audit-reports/shared-foundation_20260626/`. — deferred:review-execution
- [b] Task: Record package inventory counts from `build-graph stats`, `build-graph files`, and package manifests. — deferred:review-execution
- [b] Task: List all package scripts and quality gates from package manifests without running full review yet. — deferred:review-execution

## Phase 1: Database and Tenancy

- [x] Task: Inventory `packages/db` schemas, migrations, seeds, migration ledger, and exports. — evidence: `measure/audit-reports/shared-foundation_20260626/00-inventory.md`
- [x] Task: Review tenant registry coverage and referential scoping rules in `packages/domain`. — evidence: `findings.md` F-DB-001/F-DB-002, `test-gaps.md` Gap 1/Gap 2
- [x] Task: Check schema/migration drift risks, destructive migrations, and seed coupling. — evidence: `findings.md` F-DB-004/F-DB-008/F-DB-009
- [x] Task: Record findings in `findings.md` and test gaps in `test-gaps.md`. — evidence: appended Phase 1 sections

## Phase 2: Auth, Sessions, Permissions, Audit

- [b] Task: Inventory `packages/auth` and `packages/auth-client` exports and callers. — deferred:review-execution
- [b] Task: Review password hashing, sessions, rate limiting, audit logging, role/permission registration, and tenant resolution. — deferred:review-execution
- [b] Task: Identify legacy JWT/Firebase compatibility risks that app reviews must verify. — deferred:review-execution
- [b] Task: Record findings and proposed remediation tracks. — deferred:review-execution

## Phase 3: Domain and API Boundaries

- [x] Task: Inventory `packages/domain` modules and exported business functions. — evidence: `measure/audit-reports/shared-foundation_20260626/00-inventory.md` §1.1–1.4
- [x] Task: Review module structure: contracts, queries, mutations, permissions, errors, tests. — evidence: `findings.md` F-DAPI-008/F-DAPI-009, `checklist.md` Domain layer
- [x] Task: Inventory `packages/api` tRPC routers and route adapters. — evidence: `00-inventory.md` §2.2–2.4
- [x] Task: Verify transport layers are thin and domain behavior is reusable outside tRPC/Next routes. — evidence: `findings.md` F-DAPI-003/F-DAPI-013, `test-gaps.md` TG-DAPI-007

## Phase 4: Provider Adapters

- [b] Task: Inventory `packages/ai`, `packages/storage`, `packages/webhooks`, and `packages/integrations/github`. — deferred:review-execution
- [b] Task: Review provider-neutral adapter seams, direct SDK coupling, env validation, retry/error behavior, and webhook authentication. — deferred:review-execution
- [b] Task: Identify app-specific direct provider use that child app tracks must verify. — deferred:review-execution

## Phase 5: Shared UI, Utils, Types, Config

- [b] Task: Inventory shared UI components, utility hooks, type contracts, and config package exports. — deferred:review-execution
- [b] Task: Review accessibility, type safety, package boundary hygiene, and duplicated utility risks. — deferred:review-execution
- [b] Task: Identify package APIs that should be stabilized before app refactors. — deferred:review-execution

## Phase 6: Reporting

- [~] Task: Complete `00-inventory.md`. — evidence: Phase 3 domain/API sections created in `measure/audit-reports/shared-foundation_20260626/00-inventory.md`
- [~] Task: Complete `checklist.md` with scored categories. — evidence: Phase 3 checklist created in `measure/audit-reports/shared-foundation_20260626/checklist.md`
- [~] Task: Complete `findings.md` with severity-ordered findings. — evidence: Phase 3 findings appended in `measure/audit-reports/shared-foundation_20260626/findings.md`
- [~] Task: Complete `migration-tracks.md` with proposed remediation tracks. — evidence: Phase 3 proposed tracks in `measure/audit-reports/shared-foundation_20260626/migration-tracks.md`
- [~] Task: Complete `test-gaps.md`. — evidence: Phase 3 test gaps in `measure/audit-reports/shared-foundation_20260626/test-gaps.md`
- [~] Task: Complete `executive-summary.md`. — evidence: Phase 3 summary in `measure/audit-reports/shared-foundation_20260626/executive-summary.md`

## Phase 7: Acceptance

- [x] Task: Run relevant package-level lint/type/test gates only after findings are drafted, recording pass/fail without using gate failure as a substitute for review. — evidence: lint/check-types pass for db/domain; db tests 139 failed (F-DB-003/F-DB-004), domain tenant-coverage fails (F-DB-001)
- [b] Task: Run Measure phase acceptance for this review track. — deferred:review-execution
- [b] Task: Update parent masterplan with any blocked downstream app reviews. — deferred:review-execution
