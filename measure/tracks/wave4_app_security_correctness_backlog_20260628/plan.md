# Implementation Plan: Wave 4 — App Security & Correctness Backlog (Medium+)

> **Track ID:** `wave4_app_security_correctness_backlog_20260628`
> **Depends on:** Wave 0 tenant/auth/contract primitives; Wave 2 tenant-isolation + provider harnesses (local proof if absent).
> **Method:** Contract-first TDD. Red tests before implementation. One representative-then-propagate slice per finding cluster; remaining same-class sites enumerated and closed, not pattern-only.

## Phase 0: Baseline and Coverage Lock

- [ ] Task: Read `medium-plus-coverage-matrix.md` and confirm this wave's owned track IDs are still accurate.
- [ ] Task: Confirm Wave 0/Wave 2 primitives available (createTenantDB, assertCan, tenant-isolation test helper, provider guard); record which must be locally proven.
- [ ] Task: Record baseline pass/fail for the required verification commands per touched app.
- [ ] Task: Create a site-closure checklist for each owned migration track, enumerating affected same-class sites from the source review artifacts before implementation begins.

## Phase 1: Science Security and Tenant Scoping

- [ ] Task: Write Red cross-tenant tests for `awardXp`/`updateStreakForProfile`/badge writes leaking across schools.
  - Evidence refs: Science ST-1 (F-SA-B22-001/003/019/020/061/062, F-SA-B21-056/057); Monorepo MR-C01 Science symptom.
- [ ] Task: Route gamification writes through `createTenantDB` + `assertCan()`.
- [ ] Task: Write Red tests for `lib/services/**` (`get-class-detail`, `get-student-classes`, `mastery-worker`, `getClassDetailWithCurriculum`) missing user context/tenant scope.
  - Evidence refs: Science ST-2 (F-SA-B24-036/037/044/045/051/056/057, F-SA-B02-003/020/023).
- [ ] Task: Add user context + `assertCan()` + `tenantDb` to those services.
- [ ] Task: Add a TenantDB-adoption guard (SP-3) failing raw `@reading-advantage/db` imports in Science app code.
- [ ] Task: Run Science + domain targeted tests.

## Phase 2: Science Route/Contract Correctness

- [ ] Task: Write Red tests for JSON-401 auth helper, `"me"` alias, `limit` clamp, `update-mastery` error mapping, and lesson∈curriculum verification.
  - Evidence refs: Science ST-4 (CR-03/CR-05/CR-06, ME-01..04).
- [ ] Task: Implement the auth helper and contract fixes; keep transport thin.
- [ ] Task: Run Science targeted tests.

## Phase 3: Reading Authorization, Validation, and Endpoint Hardening

- [ ] Task: Write Red tests for admin/SYSTEM license-scope escalation paths.
  - Evidence refs: Reading M-RA-SEC-6.
- [ ] Task: Enforce license scope on reviewed admin/SYSTEM operations.
- [ ] Task: Add Zod input validation to reviewed routes; harden metrics/health endpoints; remove Firebase storage usages.
  - Evidence refs: Reading M-RA-SEC-7/SEC-9/SEC-10.
- [ ] Task: Migrate reviewed Reading controller business logic into `@reading-advantage/domain`.
  - Evidence refs: Reading M-RA-SEC-8.
- [ ] Task: Run Reading + domain targeted tests.

## Phase 4: Reading Product-Behavior Correctness and Learning-Loop Tests

- [ ] Task: Write Red tests for assignment status enum/lifecycle, reporting metrics correctness, activity target validation + license fallback, and typed request context for reports.
  - Evidence refs: Reading M-RA-PB-4/PB-5/PB-6/PB-7.
- [ ] Task: Implement the correctness fixes behind domain functions.
- [ ] Task: Build the product-level learning-loop test suite covering XP → level → assignment progression.
  - Evidence refs: Reading M-RA-PB-8.
- [ ] Task: Run Reading targeted tests.

## Phase 5: CodeCamp Reliability and Least-Privilege

- [ ] Task: Write Red tests for typed domain errors, tenant-scoped PR-review queries, and isolated test-harness state.
  - Evidence refs: CodeCamp MT-8/MT-9/MT-10.
- [ ] Task: Implement typed errors, PR-review scoping, and per-case harness isolation.
- [ ] Task: Add progression policy, least-privilege permission checks, and observability via shared adapter.
  - Evidence refs: CodeCamp MT-11/MT-13/MT-14.
- [ ] Task: Run CodeCamp/domain/api targeted tests.

## Phase 6: Sales Reliability, Curriculum, and Observability

- [ ] Task: Write Red tests for curriculum integrity/progression gating, transactional + rate-limited roleplay/reporting writes, and Sales audit events.
  - Evidence refs: Sales T5/T8/T9.
- [ ] Task: Implement transaction wrappers, rate limits (reuse Wave 0 limiter), progression gates, and audit logging.
- [ ] Task: Run Sales/domain targeted tests.

## Phase 7: Primary Prisma Removal and Secret Eradication

- [ ] Task: Write Red tests/guards asserting no Prisma runtime import and no hardcoded secret/credential literals in committed Primary source.
  - Evidence refs: Primary M7; Primary M9 (~103 instances).
- [ ] Task: Remove Prisma artifacts; replace hardcoded secrets with env reads + production guards for seed/test credentials.
- [ ] Task: Run Primary targeted tests, type checks, and lint.

## Phase 8: Public Blog Security

- [ ] Task: Write Red tests proving blog HTML is sanitized and frontmatter is Zod-validated.
  - Evidence refs: www T9 (LRF-028).
- [ ] Task: Add sanitization + Zod frontmatter parsing to the blog rendering path.
- [ ] Task: Run www targeted tests.

## Phase 9: Quality Gates and Closeout

- [ ] Task: Run all required verification commands from `spec.md`.
- [ ] Task: Update `medium-plus-coverage-matrix.md` marking owned tracks resolved only when behavior tests prove the fixes.
- [ ] Task: Verify each site-closure checklist marks every affected same-class site fixed, not-applicable, or explicitly deferred to a named follow-up.
- [ ] Task: Add lessons learned for any new tenant/secret/observability patterns.
- [ ] Task: Run Measure phase acceptance and archive the track.
</content>
