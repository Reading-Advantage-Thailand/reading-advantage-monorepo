# Implementation Plan: Wave 1 — Stop Active High-Risk Product Failures

> **Track ID:** `wave1_high_risk_product_failures_20260628`  
> **Depends on:** Wave 0 shared safety foundations or local proof of equivalent primitives.

## Phase 0: Baseline and Slice Selection

- [ ] Task: Confirm Wave 0 status and list which tenant/auth/contract primitives are available.
- [ ] Task: Read Primary, Reading, CodeCamp, and Sales executive summaries plus `migration-tracks.md` files.
  - Evidence refs: `primary-advantage-full_20260626/executive-summary.md`, `reading-advantage-full_20260626/executive-summary.md`, `codecamp-advantage_20260626/executive-summary.md`, `sales-advantage_20260626/executive-summary.md`.
- [ ] Task: Select first vertical slice per app that proves the highest-risk workflow end-to-end.
- [ ] Task: Record baseline failures with targeted tests or reproducible commands before implementation.

## Phase 1: Primary Advantage Core Stabilization

- [ ] Task: Write Red tests for one representative game completion crash caused by missing `update`/`session`.
  - Evidence refs: Primary executive summary Critical findings; Primary migration M1.
- [ ] Task: Implement shared session/completion wrapper and migrate the representative component.
- [ ] Task: Expand migration to all reviewed crash-pattern components using the proven wrapper.
- [ ] Task: Write Red tests for admin student CRUD making real server calls rather than optimistic-only updates.
  - Evidence refs: Primary migration M2/M3; Primary executive summary admin workflows nonfunctional.
- [ ] Task: Restore student/teacher admin UI paths that are commented out or early-return placeholders.
- [ ] Task: Write Red tests for flashcard schema mismatch against shared Drizzle schema.
  - Evidence refs: Primary migration M6; Primary executive summary flashcard system nonfunctional.
- [ ] Task: Resolve flashcard schema/table strategy and update routes/service code.
- [ ] Task: Add auth and tenant checks to highest-risk Primary routes from review findings.
- [ ] Task: Replace fabricated dashboard metrics for one high-risk admin dashboard with real data or explicit unavailable state.
- [ ] Task: Run targeted Primary lint, tests, and type checks.

## Phase 2: Reading Advantage Critical Security and XP Idempotency

- [ ] Task: Write Red tests for classroom destructive operations requiring ownership and tenant verification.
  - Evidence refs: Reading C-007 / C-RA-CRIT-03; Reading migration C-1 / M-RA-SEC-1.
- [ ] Task: Add tenant/ownership checks to classroom mutating operations.
- [ ] Task: Write Red tests for unauthenticated sensitive endpoints/server actions identified in review.
  - Evidence refs: Reading C-RA-CRIT-01, C-RA-CRIT-02, C-RA-CRIT-04, C-RA-CRIT-05, H-03; Reading migration C-4 / M-RA-SEC-2.
- [ ] Task: Add auth/role/system-key guards to those endpoints.
- [ ] Task: Write Red tests for audit events on destructive operations.
- [ ] Task: Wire `recordAuditEvent` for user/classroom/article/enrollment destructive actions.
- [ ] Task: Write adversarial concurrency test for XP double-award race.
  - Evidence refs: Reading PB-001 / C-RA-CRIT-06; Reading migration PB-1.
- [ ] Task: Make XP awarding idempotent with transaction/unique constraint or equivalent domain guard.
- [ ] Task: Add Zod validation for level-test assessment JSON and AI content quality gate at the first high-risk AI boundary.
- [ ] Task: Run targeted Reading tests and build/type/lint gates that are feasible on current hardware; document known pre-existing full-suite limits.

## Phase 3: CodeCamp Runtime Reliability

- [ ] Task: Write Red tests reproducing `TenantScopeError` for CodeCamp REFERENTIAL table domain functions in compiled/runtime-equivalent context.
  - Evidence refs: CodeCamp executive summary CR-1; F-CC-B10-001/F-CC-B09-001/F-CC-B08-001.
- [ ] Task: Add explicit `unscoped("reason")` or owner-FK joins for affected CodeCamp domain functions.
- [ ] Task: Fix test classification drift so Vitest and compiled runtime agree on table classification.
- [ ] Task: Write Red tests for webhook idempotency using delivery ID.
  - Evidence refs: CodeCamp high-severity webhook theme; F-CC-B10-002/F-CC-B10-003/F-CC-B07-039.
- [ ] Task: Add Postgres-backed review job state or integrate with planned webhook retry/DLQ track.
- [ ] Task: Ensure webhook ACK is not blocked by synchronous LLM review.
- [ ] Task: Write streaming protocol test for chat route/client compatibility.
  - Evidence refs: CodeCamp executive summary High theme 2; F-CC-B00-001/F-CC-B04-019.
- [ ] Task: Run CodeCamp/API/webhooks/domain targeted gates.

## Phase 4: Sales Security, Privacy, and Contract Hardening

- [ ] Task: Write Red tests proving `SALES_REP`/`SALES_ADMIN` are authenticated in tRPC context.
  - Evidence refs: Sales C3; F-SALES-B00-030.
- [ ] Task: Fix role schema/context integration.
- [ ] Task: Write Red tests for IDOR on roleplay evaluation and cross-tenant admin reporting.
  - Evidence refs: Sales C1/C2; F-SALES-B05-001/F-SALES-B05-002.
- [ ] Task: Add ownership and tenant/global-scope authorization checks.
- [ ] Task: Write Red tests for audio size/MIME/duration validation before buffering/provider calls.
  - Evidence refs: Sales C4; F-SALES-B00-028/F-SALES-B01-015/F-SALES-B04-007.
- [ ] Task: Add audio validation, privacy/consent checks, and retention metadata.
- [ ] Task: Sanitize lesson markdown or replace unsafe rendering.
- [ ] Task: Fix draft curriculum leakage and completion math skew.
- [ ] Task: Align `audioStorageKey` nullability contracts and tests.
- [ ] Task: Run Sales/API/domain/AI targeted gates.

## Phase 5: Integrated Acceptance

- [ ] Task: Run all touched package/app tests with `CI=true`.
- [ ] Task: Update product-risk register rows with completion evidence only for fixed workflows.
- [ ] Task: Record any deferred Medium/Low follow-ups in `tech-debt.md` if still relevant and within line cap.
- [ ] Task: Run Measure phase acceptance and archive the track.
