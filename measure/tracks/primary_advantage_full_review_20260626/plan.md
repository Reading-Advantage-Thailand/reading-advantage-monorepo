# Implementation Plan: Primary Advantage Full Feature Review

> **Track ID:** `primary_advantage_full_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`  
> **Depends on:** `shared_foundation_review_20260626`; should run after Reading Advantage inventory for divergence context.

---

## Phase 0: Setup and Inventory

- [b] Task: Confirm fresh `graph.db` and record `primary-advantage` file/node/function counts. — deferred:review-execution
- [b] Task: Create `measure/audit-reports/primary-advantage-full_20260626/`. — deferred:review-execution
- [b] Task: Inventory routes, API routes, model/data-access files, Prisma files, Drizzle usage, tests, and feature pages. — deferred:review-execution
- [b] Task: Build `workflow-map.md` for student, teacher, admin, and content workflows. — deferred:review-execution

## Phase 1: Migration Truth

- [b] Task: Verify Prisma imports, Prisma schema/migration files, `lib/prisma.ts`, package dependencies, and runtime usage. — deferred:review-execution
- [b] Task: Verify Drizzle usage and shared `@reading-advantage/db` usage. — deferred:review-execution
- [b] Task: Record false registry claims or migration drift in findings. — deferred:review-execution
- [b] Task: Propose a Prisma/Drizzle remediation track if still needed. — deferred:review-execution

## Phase 2: Fork-Divergence Review

- [b] Task: Identify Reading-derived feature families and Primary-specific adaptations. — deferred:review-execution
- [b] Task: Classify differences as intentional, accidental, risky, or undocumented. — deferred:review-execution
- [b] Task: Create `fork-divergence.md` with evidence-backed categories. — deferred:review-execution

## Phase 3: Product Feature Review

- [b] Task: Review primary student workflows, teacher/classroom workflows, reports, quizzes, vocabulary, media, and workbook/content generation. — deferred:review-execution
- [b] Task: Check UX appropriateness for primary students and age-specific data/consent risks. — deferred:review-execution
- [b] Task: Record findings and test gaps. — deferred:review-execution

## Phase 4: Auth, Tenant, API Boundaries

- [b] Task: Review auth/session, role checks, tenant/school scoping, route validation, and destructive actions. — deferred:review-execution
- [b] Task: Identify direct DB/Prisma/domain bypass patterns. — deferred:review-execution
- [b] Task: Record migration recommendations. — deferred:review-execution

## Phase 5: Reporting and Acceptance

- [b] Task: Run targeted lint/type/test/build gates appropriate for Primary Advantage and record results. — deferred:review-execution
- [b] Task: Complete all required artifacts. — deferred:review-execution
- [b] Task: Run Measure phase acceptance and feed accepted findings into the final roadmap. — deferred:review-execution
