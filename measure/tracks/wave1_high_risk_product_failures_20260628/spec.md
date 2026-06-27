# Specification: Wave 1 — Stop Active High-Risk Product Failures

## Overview

Fix the highest-risk app-level failures identified by the review program. This wave focuses on Primary Advantage, Reading Advantage, CodeCamp Advantage, and Sales Advantage because they contain Critical/High issues that block safe student, intern, rep, or admin workflows.

## Source Findings

- MR-C03 — Legacy Reading/Primary APIs remain unsafe and uncontracted.
- MR-H04 — CodeCamp and Sales production workflows need hardening before launch claims.
- Product Risk Register rows: Primary core learning loop crashes, Reading tenant/auth gaps, CodeCamp PR review unreliable, Sales audio/AI privacy.
- Primary M1-M6, M8, M11.
- Reading C-1..C-5 and PB-1..PB-3.
- CodeCamp CR-1/CR-2 and High webhook/streaming findings.
- Sales C1-C13 clusters.

## Evidence References

- `measure/audit-reports/monorepo-review-roadmap_20260626/deduplicated-findings.md`
  - MR-C03 Legacy Reading/Primary APIs unsafe and uncontracted.
  - MR-H04 CodeCamp and Sales production workflows need hardening.
- `measure/audit-reports/monorepo-review-roadmap_20260626/product-risk-register.md`
  - Primary core learning loop crashes.
  - Reading tenant/auth gaps.
  - CodeCamp PR review unreliable.
  - Sales audio/AI privacy.
- `measure/audit-reports/primary-advantage-full_20260626/executive-summary.md`
  - 66 Critical / 177 High findings; game completion crashes; admin workflows nonfunctional; flashcard schema mismatch; 72 unprotected endpoints; 48 unscoped queries.
- `measure/audit-reports/primary-advantage-full_20260626/migration-tracks.md`
  - M1 through M8 and M11.
- `measure/audit-reports/reading-advantage-full_20260626/executive-summary.md`
  - C-RA-CRIT-01 through C-RA-CRIT-08; High findings C-001 through C-008; PB-001 through PB-003.
- `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md`
  - M-RA-SEC-1 through M-RA-SEC-5; PB-1 through PB-3.
- `measure/audit-reports/codecamp-advantage_20260626/executive-summary.md`
  - CR-1 TenantDB `TenantScopeError`; CR-2 false-green test classification; webhook idempotency/retry; streaming protocol mismatch.
- `measure/audit-reports/codecamp-advantage_20260626/findings.md`
  - F-CC-B10-001, F-CC-B09-001, F-CC-B08-001, F-CC-B10-002, F-CC-B10-003, F-CC-B10-007, F-CC-B00-001, F-CC-B04-019.
- `measure/audit-reports/sales-advantage_20260626/executive-summary.md`
  - C1/C2/C3 authorization and tenant isolation; C4 audio validation; C5 AI privacy; C6 adapter boundary; C7/C8 curriculum; C13 schema/contract drift.
- `measure/audit-reports/sales-advantage_20260626/findings.md`
  - F-SALES-B05-001, F-SALES-B05-002, F-SALES-B00-023, F-SALES-B00-027, F-SALES-B00-030, F-SALES-B01-015, F-SALES-B01-018, F-SALES-B04-001, F-SALES-B05-006.

## Coverage Model

This wave is scoped by **severity and risk, not by exhaustive finding closure.** It targets the Critical/High runtime and security *failures* in Primary, Reading, CodeCamp, and Sales, using a representative-slice-then-propagate method: prove the fix with a Red→Green behavior test on one representative occurrence, then propagate the proven pattern to the enumerated same-class sites.

Passing Wave 1 therefore means **the named high-risk workflows are fixed and the Critical/High migration tracks below are closed**, not that every line-level finding in the source reports is resolved. The Medium-and-above remainder is explicitly owned by later waves — it is *not* dropped:

- **Wave 4** owns the remaining Medium+ security/correctness tracks (Science ST-1/ST-2/ST-4, Reading SEC-6..10 / PB-4..8, CodeCamp MT-8..11/13/14, Sales T5/T8/T9, Primary M7 and **M9 hardcoded-secrets**, www blog security).
- **Wave 6** owns Medium adapter/i18n/quality tracks (Primary M10/M12/M13, Sales T10/T11, CodeCamp curriculum).

> **Primary M9 (remove hardcoded secrets/credentials) and M7 (Prisma artifact cleanup) are NOT in Wave 1.** They are owned by Wave 4. Wave 1's Primary scope is M1–M6, M8, M11 only.

The authoritative ownership map for all Medium+ tracks is `measure/audit-reports/monorepo-review-roadmap_20260626/medium-plus-coverage-matrix.md`.

## Dependencies

- Wave 0 should complete or explicitly provide the tenant/auth/contracts primitives needed by each slice.
- If Wave 0 is not fully complete, each app slice must locally prove its tenant/auth/contract assumptions with behavior tests.

## Scope

1. Primary: fix game completion crashes, admin CRUD/commented UI, flashcard schema mismatch, auth gaps, tenant scoping, and dashboard truth for highest-risk workflows.
2. Reading: fix Critical auth/tenant gaps, unauthenticated sensitive endpoints, audit logging for destructive operations, XP double-award race, AI assessment/content validation.
3. CodeCamp: fix TenantDB REFERENTIAL runtime failures, false-green tenant tests, webhook async/idempotency/DLQ, and chat streaming protocol.
4. Sales: fix role enum/auth gaps, IDOR/cross-tenant reporting, audio validation/privacy/consent, XSS/draft curriculum leakage, schema nullability drift.

## Non-Goals

- Do not do broad UI redesigns or content rewrites outside the named high-risk failures.
- Do not import Advantage Games into Reading/Primary; Wave 3 owns import readiness.
- Do not change public website claims; Wave 3 owns claims.

## Acceptance Criteria

- Each app slice has Red → Green behavior tests for the original failing workflow.
- Primary students can complete the reviewed game/lesson completion flow without undefined session/update crashes.
- Reading destructive classroom/user/article operations enforce ownership/tenant checks and create audit events.
- CodeCamp PR review path no longer throws `TenantScopeError` and webhook processing is idempotent/retriable.
- Sales roleplay attempt/evaluation paths enforce ownership, validate audio, and document/enforce privacy controls.
- Targeted app/package tests, type checks, and lint commands pass for touched surfaces.
- **Scope completeness (per Coverage Model):** the Critical/High migration tracks owned here are closed — Primary M1–M6/M8/M11, Reading M-RA-SEC-1..5 / PB-1..3, CodeCamp MT-1..6, Sales T1/T2/T3/T7 — with each proven slice's enumerated same-class sites either fixed or listed in the track's deviation notes for a named follow-up wave.
- **No silent drops:** every Medium+ finding not closed here appears against Wave 4 or Wave 6 in `medium-plus-coverage-matrix.md`. Primary M9 (hardcoded secrets) is confirmed owned by Wave 4, not deferred to nowhere.
