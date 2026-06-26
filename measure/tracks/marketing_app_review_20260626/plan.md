# Implementation Plan: Marketing App Review

> **Track ID:** `marketing_app_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`

---

## Phase 0: Setup and Inventory

- [b] Task: Confirm fresh `graph.db` and record `marketing` file/node/function counts. — deferred:review-execution
- [b] Task: Create `measure/audit-reports/marketing-app_20260626/`. — deferred:review-execution
- [b] Task: Inventory pages, API routes, app-local libraries, DB schema usage, tests, and existing video pipeline plan gaps. — deferred:review-execution
- [b] Task: Build `workflow-map.md` and `ai-boundary-map.md`. — deferred:review-execution

## Phase 1: Workflow Review

- [b] Task: Review topic research, topic saving/deduplication, script generation, scene editing, and project persistence. — deferred:review-execution
- [b] Task: Check validation, error handling, state transitions, UX, and persistence correctness. — deferred:review-execution
- [b] Task: Record feature findings. — deferred:review-execution

## Phase 2: Auth, Roles, API Boundaries

- [b] Task: Review auth/session and role/permission checks on marketing app routes, API handlers, and project access; verify enforcement of any role-based access (e.g., admin vs. contributor). — deferred:review-execution
- [b] Task: Identify auth/role findings and verify they match current app architecture; record gaps as remediation-track proposals. — deferred:review-execution

## Phase 3: AI and Data Boundaries

- [b] Task: Review app-local AI client usage, provider selection, settings, prompt safety, structured output validation, and malformed output handling. — deferred:review-execution
- [b] Task: Review data privacy and storage risks for marketing projects and generated scripts. — deferred:review-execution
- [b] Task: Record AI/data findings and proposed migration tracks. — deferred:review-execution

## Phase 4: Tests, Build, Reporting

- [b] Task: Reconcile existing missing tests from `video_pipeline_20260613` with this review's `test-gaps.md`. — deferred:review-execution
- [b] Task: Run targeted marketing lint/type/test/build gates and record results. — deferred:review-execution
- [b] Task: Complete all artifacts and run Measure phase acceptance. — deferred:review-execution
