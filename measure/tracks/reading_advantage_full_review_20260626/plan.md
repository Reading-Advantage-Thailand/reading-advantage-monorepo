# Implementation Plan: Reading Advantage Full Feature Review

> **Track ID:** `reading_advantage_full_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** `shared_foundation_review_20260626` inventory phase at minimum.

---

## Phase 0: Setup and Inventory

- [x] Task: Confirm fresh `graph.db` and record `reading-advantage` file/node/function counts. Evidence: `review-a-correctness-result.json` graph_context, `measure/audit-reports/reading-advantage-full_20260626/00-inventory.md`, and line-review inventory of 1,016 tracked files in `line-review-coverage.md`.
- [x] Task: Create `measure/audit-reports/reading-advantage-full_20260626/`. Evidence: artifact directory contains required report files plus `line-review/ra-batch-00.md` through `line-review/ra-batch-50.md`.
- [x] Task: Inventory app routes, API routes, route handlers, Firebase/functions surfaces, config files, and test files. Evidence: `00-inventory.md`, `line-review-coverage.md`, and 51 line-review batch reports.
- [x] Task: Build `workflow-map.md` grouping features by student, teacher, admin, and system workflows. Evidence: `measure/audit-reports/reading-advantage-full_20260626/workflow-map.md`.

## Phase 1: Auth, Roles, Tenant Boundaries

- [x] Task: Review authentication/session entry points and legacy Firebase usage. Evidence: `review-b-security-result.json`, `00-inventory.md`, and line-review batches 06, 10, 36, 40, 42, 43, 44, 47, 50.
- [x] Task: Inventory role checks, permission checks, and tenant/school scoping across route families. Evidence: `review-b-security-result.json`, `00-inventory.md`, and route/controller line-review batches 07-16, 44-47.
- [x] Task: Quantify direct DB access in app routes and classify by risk. Evidence: `review-b-security-result.json`, `00-inventory.md`, and controller batches 44-47.
- [x] Task: Record Critical/High security or tenancy findings immediately. Evidence: `measure/audit-reports/reading-advantage-full_20260626/findings.md` and `review-b-security-result.json`.

## Phase 2: Student Learning Features

- [x] Task: Review student dashboard, assignments, reading flows, quiz/assessment flows, flashcards, vocabulary, progress, and audio/read-along features. Evidence: line-review batches 02-04, 11-14, 20-31, 36, 38-42, 48-50 plus `workflow-map.md`.
- [x] Task: Check user-visible workflow completeness, data persistence, edge cases, and test coverage. Evidence: line-review batch reports, `test-gaps.md`, and `line-review-coverage.md`.
- [x] Task: Record feature findings and test gaps. Evidence: `findings.md`, `test-gaps.md`, and `line-review/ra-batch-00.md` through `ra-batch-50.md`.

## Phase 3: Teacher/Admin/School Features

- [x] Task: Review classroom, roster, assignment, report, school/admin, and content-management workflows. Evidence: line-review batches 01, 05-10, 15-16, 18-20, 32-33, 44-47.
- [x] Task: Check authorization, tenant separation, reporting correctness, and destructive actions. Evidence: line-review batches 06-16 and controller batches 44-47.
- [x] Task: Record workflow and API findings. Evidence: `findings.md`, `executive-summary.md`, and batch reports.

## Phase 4: Content and AI Features

- [x] Task: Inventory article/content generation, AI provider usage, prompt boundaries, and validation. Evidence: `00-inventory.md` and line-review batches 08, 14-15, 17, 37, 44, 48-50.
- [x] Task: Review direct provider coupling, schema validation, output safety, AI data privacy (student PII/learning data sent to providers), and audit/logging requirements. Evidence: `checklist.md`, `executive-summary.md`, and line-review batches 37, 40, 43-44, 48-50.
- [x] Task: Record migration recommendations to shared AI/domain adapters. Evidence: `migration-tracks.md`, controller/generator batch reports 44-48, and utility batch 50.

## Phase 5: Architecture and Migration Readiness

- [x] Task: Group thick route handlers into domain-migration buckets. Evidence: `migration-tracks.md`, `00-inventory.md`, and route/controller line-review batches 07-16, 44-47.
- [x] Task: Identify shared abstractions that should move to `packages/domain`, `packages/types`, or `packages/ui`. Evidence: `migration-tracks.md`, `executive-summary.md`, and batches 32-35, 44-50.
- [x] Task: Compare findings with existing `reading_advantage_agents_md_audit_20260610` stub and update migration-track proposals. Evidence: `executive-summary.md` relationship note and `migration-tracks.md`.

## Phase 6: Quality Gates and Reporting

- [x] Task: Run targeted lint/type/test/build gates appropriate for Reading Advantage and record results. Evidence: `review-a-correctness-result.json` gate_results; note check-types failed from shared-package drift, full tests timed out, and build was not meaningful due to `ignoreBuildErrors`. Static line-review reports also record per-batch test gaps.
- [x] Task: Complete all required review artifacts. Evidence: `measure/audit-reports/reading-advantage-full_20260626/` contains `00-inventory.md`, `workflow-map.md`, `checklist.md`, `findings.md`, `migration-tracks.md`, `test-gaps.md`, `executive-summary.md`, `line-review-coverage.md`, and 51 batch reports.
- [x] Task: Propose remediation tracks ordered by Critical/High risk first, then migration leverage. Evidence: `migration-tracks.md`, `review-a-correctness-result.json`, `review-b-security-result.json`, `review-c-ux-api-result.json`.

## Phase 7: Acceptance

- [~] Task: Run Measure phase acceptance for this review track after line-review synthesis. Evidence pending: prior `phase-acceptance-result.json` predates the 51-batch line review and must be rerun or superseded.
- [~] Task: Feed accepted findings into the final roadmap track after phase/final acceptance approves this review. Evidence pending: final roadmap must consume the line-review synthesis, not the earlier sampled pass.
