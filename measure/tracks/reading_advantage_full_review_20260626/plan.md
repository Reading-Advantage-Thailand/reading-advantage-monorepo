# Implementation Plan: Reading Advantage Full Feature Review

> **Track ID:** `reading_advantage_full_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** `shared_foundation_review_20260626` inventory phase at minimum.

---

## Phase 0: Setup and Inventory

- [b] Task: Confirm fresh `graph.db` and record `reading-advantage` file/node/function counts. — deferred:review-execution
- [b] Task: Create `measure/audit-reports/reading-advantage-full_20260626/`. — deferred:review-execution
- [b] Task: Inventory app routes, API routes, route handlers, Firebase/functions surfaces, config files, and test files. — deferred:review-execution
- [b] Task: Build `workflow-map.md` grouping features by student, teacher, admin, and system workflows. — deferred:review-execution

## Phase 1: Auth, Roles, Tenant Boundaries

- [b] Task: Review authentication/session entry points and legacy Firebase usage. — deferred:review-execution
- [b] Task: Inventory role checks, permission checks, and tenant/school scoping across route families. — deferred:review-execution
- [b] Task: Quantify direct DB access in app routes and classify by risk. — deferred:review-execution
- [b] Task: Record Critical/High security or tenancy findings immediately. — deferred:review-execution

## Phase 2: Student Learning Features

- [b] Task: Review student dashboard, assignments, reading flows, quiz/assessment flows, flashcards, vocabulary, progress, and audio/read-along features. — deferred:review-execution
- [b] Task: Check user-visible workflow completeness, data persistence, edge cases, and test coverage. — deferred:review-execution
- [b] Task: Record feature findings and test gaps. — deferred:review-execution

## Phase 3: Teacher/Admin/School Features

- [b] Task: Review classroom, roster, assignment, report, school/admin, and content-management workflows. — deferred:review-execution
- [b] Task: Check authorization, tenant separation, reporting correctness, and destructive actions. — deferred:review-execution
- [b] Task: Record workflow and API findings. — deferred:review-execution

## Phase 4: Content and AI Features

- [b] Task: Inventory article/content generation, AI provider usage, prompt boundaries, and validation. — deferred:review-execution
- [b] Task: Review direct provider coupling, schema validation, output safety, AI data privacy (student PII/learning data sent to providers), and audit/logging requirements. — deferred:review-execution
- [b] Task: Record migration recommendations to shared AI/domain adapters. — deferred:review-execution

## Phase 5: Architecture and Migration Readiness

- [b] Task: Group thick route handlers into domain-migration buckets. — deferred:review-execution
- [b] Task: Identify shared abstractions that should move to `packages/domain`, `packages/types`, or `packages/ui`. — deferred:review-execution
- [b] Task: Compare findings with existing `reading_advantage_agents_md_audit_20260610` stub and update migration-track proposals. — deferred:review-execution

## Phase 6: Quality Gates and Reporting

- [b] Task: Run targeted lint/type/test/build gates appropriate for Reading Advantage and record results. — deferred:review-execution
- [b] Task: Complete all required review artifacts. — deferred:review-execution
- [b] Task: Propose remediation tracks ordered by Critical/High risk first, then migration leverage. — deferred:review-execution

## Phase 7: Acceptance

- [b] Task: Run Measure phase acceptance for this review track. — deferred:review-execution
- [b] Task: Feed accepted findings into the final roadmap track. — deferred:review-execution
