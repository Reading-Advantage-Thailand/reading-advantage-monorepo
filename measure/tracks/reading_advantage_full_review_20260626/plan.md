# Implementation Plan: Reading Advantage Full Feature Review

> **Track ID:** `reading_advantage_full_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** `shared_foundation_review_20260626` inventory phase at minimum.

---

## Phase 0: Setup and Inventory

- [x] Task: Confirm fresh `graph.db` and record `reading-advantage` file/node/function counts. Evidence: `review-a-correctness-result.json` graph_context and `measure/audit-reports/reading-advantage-full_20260626/00-inventory.md`.
- [x] Task: Create `measure/audit-reports/reading-advantage-full_20260626/`. Evidence: artifact directory contains required report files.
- [x] Task: Inventory app routes, API routes, route handlers, Firebase/functions surfaces, config files, and test files. Evidence: `00-inventory.md`, `review-b-security-result.json`, `review-c-ux-api-result.json`.
- [x] Task: Build `workflow-map.md` grouping features by student, teacher, admin, and system workflows. Evidence: `measure/audit-reports/reading-advantage-full_20260626/workflow-map.md`.

## Phase 1: Auth, Roles, Tenant Boundaries

- [x] Task: Review authentication/session entry points and legacy Firebase usage. Evidence: `review-b-security-result.json` findings F-RA-002, F-RA-006, F-RA-012 and `00-inventory.md`.
- [x] Task: Inventory role checks, permission checks, and tenant/school scoping across route families. Evidence: `review-b-security-result.json` F-RA-001/F-RA-010 and metrics.
- [x] Task: Quantify direct DB access in app routes and classify by risk. Evidence: `review-b-security-result.json` key_metrics and `00-inventory.md` direct DB metrics.
- [x] Task: Record Critical/High security or tenancy findings immediately. Evidence: `measure/audit-reports/reading-advantage-full_20260626/findings.md` and `review-b-security-result.json`.

## Phase 2: Student Learning Features

- [x] Task: Review student dashboard, assignments, reading flows, quiz/assessment flows, flashcards, vocabulary, progress, and audio/read-along features. Evidence: `review-a-correctness-result.json` PB findings and `workflow-map.md`.
- [x] Task: Check user-visible workflow completeness, data persistence, edge cases, and test coverage. Evidence: `review-a-correctness-result.json` gate_results/test_gaps and `test-gaps.md`.
- [x] Task: Record feature findings and test gaps. Evidence: `findings.md`, `test-gaps.md`, `review-a-correctness-result.json`.

## Phase 3: Teacher/Admin/School Features

- [x] Task: Review classroom, roster, assignment, report, school/admin, and content-management workflows. Evidence: `review-c-ux-api-result.json` files_inspected and `workflow-map.md`.
- [x] Task: Check authorization, tenant separation, reporting correctness, and destructive actions. Evidence: `review-b-security-result.json` and `review-a-correctness-result.json` PB-004/PB-005/PB-006.
- [x] Task: Record workflow and API findings. Evidence: `findings.md`, `executive-summary.md`, `review-c-ux-api-result.json`.

## Phase 4: Content and AI Features

- [x] Task: Inventory article/content generation, AI provider usage, prompt boundaries, and validation. Evidence: `00-inventory.md`, `review-a-correctness-result.json` PB-002/PB-003, `review-b-security-result.json` F-RA-004/F-RA-014.
- [x] Task: Review direct provider coupling, schema validation, output safety, AI data privacy (student PII/learning data sent to providers), and audit/logging requirements. Evidence: `review-b-security-result.json`, `checklist.md`, `executive-summary.md`.
- [x] Task: Record migration recommendations to shared AI/domain adapters. Evidence: `migration-tracks.md`, `review-b-security-result.json` proposed_tracks.

## Phase 5: Architecture and Migration Readiness

- [x] Task: Group thick route handlers into domain-migration buckets. Evidence: `migration-tracks.md` M-RA-SEC-8 and `00-inventory.md`.
- [x] Task: Identify shared abstractions that should move to `packages/domain`, `packages/types`, or `packages/ui`. Evidence: `migration-tracks.md` and `executive-summary.md`.
- [x] Task: Compare findings with existing `reading_advantage_agents_md_audit_20260610` stub and update migration-track proposals. Evidence: `executive-summary.md` relationship note and `migration-tracks.md`.

## Phase 6: Quality Gates and Reporting

- [x] Task: Run targeted lint/type/test/build gates appropriate for Reading Advantage and record results. Evidence: `review-a-correctness-result.json` gate_results; note check-types failed from shared-package drift, full tests timed out, and build was not meaningful due to `ignoreBuildErrors`.
- [x] Task: Complete all required review artifacts. Evidence: `measure/audit-reports/reading-advantage-full_20260626/` contains `00-inventory.md`, `workflow-map.md`, `checklist.md`, `findings.md`, `migration-tracks.md`, `test-gaps.md`, `executive-summary.md`.
- [x] Task: Propose remediation tracks ordered by Critical/High risk first, then migration leverage. Evidence: `migration-tracks.md`, `review-a-correctness-result.json`, `review-b-security-result.json`, `review-c-ux-api-result.json`.

## Phase 7: Acceptance

- [x] Task: Run Measure phase acceptance for this review track. Evidence: `phase-acceptance-result.json` written with status `pass`; blocker checks A1/A3/A4/A5/A6/A7/A8/A11 passed.
- [x] Task: Feed accepted findings into the final roadmap track after phase/final acceptance approves this review. Evidence: `monorepo_review_roadmap_20260626/spec.md` lists `reading_advantage_full_review_20260626` as an accepted-artifact input; accepted artifact paths are recorded in `phase-acceptance-result.json`.
