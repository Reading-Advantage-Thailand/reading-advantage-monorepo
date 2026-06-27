# Migration Tracks: Reading Advantage Security + Correctness Remediation

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 7ad89ac39b6b871da0907c6b873329c75d6dc3b9
> **Source of truth:** [`line-review-synthesis.md`](./line-review-synthesis.md) (deduplicated, prioritized findings from the 51 batch reports). The C-### / PB-### / F-RA-### finding IDs referenced here trace back to `findings.md`, `review-b-security-result.json`, and the per-batch line-review reports.
> **Phase 7 acceptance:** **PENDING** — the proposed tracks below are remediation proposals, not completed work.

---

## Proposed Remediation Tracks (Priority Order)

These tracks are proposed for the `measure/audit-reports/` → `measure/tracks/` promotion workflow. Each track groups related findings and proposes scope, effort, and dependencies. The line-anchored evidence for every track lives in the 51 batch reports; see `line-review-synthesis.md` §3 for the deduplicated mapping and the originating batch for each finding.

---

### M-RA-SEC-1: Critical — Tenant/School Scoping Enforcement

**Priority:** Critical (do first)
**Findings targeted:** F-RA-001 (cross-school data access), F-RA-010 (resource ownership)
**Estimated effort:** 3–4 weeks

Adopt `TenantDB` / `createTenantDB` for all reading-advantage data access. Add `schoolId` enforcement gates on every tenant-data query. Migrate `getCurrentUser` in `lib/session.ts` to populate `schoolId` and wire it into `createTenantDB`. Add ownership checks on all mutation endpoints (classroom delete, student enrollment changes, user updates).

**Scope:**
- Classify all reading-advantage tables in `tenant-registry.ts` (FLAT/REFERENTIAL/EXEMPT)
- Add `schoolId` column to tables missing it (if any)
- Replace raw `db` with `createTenantDB(db, schoolId)` in all 54 controllers
- Add `assertCan` checks for all destructive operations
- Add adversarial tests: cross-school access attempts must return 403

**Depends on:** Existing `schoolId` column presence in relevant tables
**Blocks:** M-RA-SEC-2 (audit logging needs scoped context)

---

### M-RA-SEC-2: Critical — Secure Unauthenticated System Endpoints

**Priority:** Critical
**Findings targeted:** F-RA-002 (unauthenticated system endpoints)
**Estimated effort:** 1 week

Add authentication and authorization to the 7 identified unauthenticated sensitive endpoints. Apply `restrictAccessKey` or `restrictTo("ADMIN", "SYSTEM")` as appropriate.

**Scope:**
- `/api/v1/metrics/health` — restrictAccessKey or ADMIN auth
- `/api/v1/metrics/cache` — restrictAccessKey or ADMIN auth
- `/api/v1/metrics/stream` — restrictAccessKey or ADMIN auth
- `/api/v1/ai/insights/refresh` — restrictTo("ADMIN", "SYSTEM")
- `/api/v1/articles/generate` — restrictAccessKey (batch job endpoint)
- `/api/v1/stories/generate` — restrictAccessKey
- `/api/v1/activity/update-all-activity` — restrictTo("ADMIN", "SYSTEM")

---

### M-RA-SEC-3: High — Audit Log Infrastructure for Destructive Operations

**Priority:** High
**Findings targeted:** F-RA-003 (no audit logging)
**Estimated effort:** 2 weeks

Wire `recordAuditEvent` from `@reading-advantage/auth` into all destructive operations in reading-advantage controllers. Log article deletion, classroom deletion, student unenrollment, user deletion, license changes, and role changes.

**Scope:**
- Add `recordAuditEvent` calls to: `deleteArticle`, `deleteClassroom`, `patchClassroomUnenroll`, `deleteStories`, user deletion, goal deletion, license management
- Add audit events for: `approveUserArticle` (publish), `addCoTeacher`, `removeCoTeacher`
- Add audit events for: login (delegated to shared auth, verify), logout, password changes

**Depends on:** M-RA-SEC-1 (for tenant-scoped audit context)

---

### M-RA-SEC-4: High — AI Data Privacy — PII Filtering & Consent

**Priority:** High
**Findings targeted:** F-RA-004 (no PII filtering before AI), F-RA-005 (consent-blind publish gate)
**Estimated effort:** 2 weeks

Add PII/redaction layer before sending data to AI providers. Add consent verification for user-generated article publishing. Document AI data flows and retention policies.

**Scope:**
- Create `filterPII()` utility that strips names, emails, phone numbers, addresses before AI calls
- Add consent metadata to user-generated articles (`consentGranted: boolean`, `consentDate`)
- Gate `approveUserArticle` on consent verification
- Add parental consent tracking for student users
- Add documentation of AI provider data handling (OpenAI, Google Translate retention)
- Migrate Google Translate usage to `@reading-advantage/ai` adapter

---

### M-RA-SEC-5: High — Rate Limiting Hardening

**Priority:** High
**Findings targeted:** F-RA-006 (missing rate limiting)
**Estimated effort:** 1–2 weeks

Either wire the shared rate limiter into reading-advantage auth routes or complete the Postgres-backed rate limiter v2 track and then wire it. Add per-IP and per-username limits on login, register, and password-reset endpoints.

**Scope:**
- Verify shared `packages/auth/rate-limit.ts` is wired in `@reading-advantage/api/routes/auth`
- Add Postgres-backed rate limiter if not already present (see `rate_limiter_v2` track)
- Add 429 response handling to reading-advantage auth routes
- Test with concurrent login attempts

---

### M-RA-SEC-6: High — Admin/SYSTEM License Scope Hardening

**Priority:** High
**Findings targeted:** F-RA-007 (license scoping bypass)
**Estimated effort:** 0.5 weeks

Add audit logging to SYSTEM role access of arbitrary license data. Require explicit justification or restrict SYSTEM to only their own license scope with an explicit override mechanism.

**Scope:**
- Log all SYSTEM role accesses with `licenseId` query param overrides
- Consider requiring `restrictAccessKey` for SYSTEM-level data access
- Add rate limiting on SYSTEM dashboard queries

---

### M-RA-SEC-7: Medium — Zod Input Validation Across All Routes

**Priority:** Medium
**Findings targeted:** F-RA-008 (inconsistent validation), F-RA-011 (raw process.env)
**Estimated effort:** 2–3 weeks

Add Zod schemas to all API route inputs (query params, path params, request body). Replace raw `process.env` reads with zod-validated env config. Create shared validation helpers.

**Scope:**
- Audit all 209 route files for missing validation
- Create `parseQuery`, `parseBody`, `parsePath` helpers
- Create `lib/env.ts` with Zod schema covering all env vars used
- Replace 6+ raw `process.env` reads

---

### M-RA-SEC-8: Medium — Domain Layer Migration

**Priority:** Medium (high leverage, large scope)
**Findings targeted:** F-RA-009 (direct DB access from controllers)
**Estimated effort:** 6–8 weeks

Migrate controller business logic to `@reading-advantage/domain` modules. Replace inline DB queries with domain function calls that enforce tenant scoping and permissions.

**Scope:**
- Create domain modules mirroring controller families: articles, classrooms, users, assignments, stories, flashcards, AI/content generation, metrics
- Move business logic, validation, and authorization into domain functions
- Rewrite controllers as thin delegation layers calling domain functions
- Add `assertCan` permission checks in domain functions
- Add domain function tests

**Depends on:** M-RA-SEC-1 (tenant scoping must be in place first)

---

### M-RA-SEC-9: Medium — Firebase Storage Removal

**Priority:** Medium
**Findings targeted:** F-RA-012 (Firebase storage remnant)
**Estimated effort:** 0.5 weeks

Remove `firebase-admin/storage` dynamic require from `generator-controller.ts`. Migrate audio/image cleanup to the shared `@reading-advantage/storage` adapter or remove cleanup entirely if storage lifecycle is managed elsewhere.

**Scope:**
- Replace `cleanupAudioFiles` and `cleanupStorageFiles` with `@reading-advantage/storage` calls
- Remove `firebase-admin` dependency if no other usage exists
- Verify storage cleanup works with current storage provider

---

### M-RA-SEC-10: Medium — Metrics/Health Endpoint Hardening

**Priority:** Medium
**Findings targeted:** F-RA-013 (unauthenticated metrics endpoints)
**Estimated effort:** 0.5 weeks

Add minimal auth (access key or ADMIN role) to metrics and health endpoints. Limit exposed data to non-sensitive aggregates.

**Scope:**
- Add `restrictAccessKey` to `/api/v1/metrics/health`, `/api/v1/metrics/cache`, `/api/v1/metrics/stream`
- Remove detailed DB health info from public health endpoint

---

### M-RA-SEC-11: Low — AI Adapter Consistency

**Priority:** Low
**Findings targeted:** F-RA-014 (direct Google Translate SDK), F-RA-015 (no structured logging), F-RA-016 (schoolId on articles)
**Estimated effort:** 1 week

Route Google Translate through `@reading-advantage/ai` adapter. Add structured logging wrapper. Add `schoolId` optional filter to article queries.

---

## Dependency Graph

```
M-RA-SEC-1 (tenant scoping) ──┬── M-RA-SEC-3 (audit logging)
                              ├── M-RA-SEC-8 (domain layer)
                              └── M-RA-SEC-11 (article schoolId)

M-RA-SEC-2 (secure endpoints) ── independent
M-RA-SEC-4 (AI privacy)      ── independent
M-RA-SEC-5 (rate limiting)   ── independent (shared pkg)
M-RA-SEC-6 (admin scoping)   ── depends on M-RA-SEC-1
M-RA-SEC-7 (zod validation)  ── independent
M-RA-SEC-9 (firebase removal)── independent
M-RA-SEC-10 (metrics auth)   ── independent
```

---

## Effort Summary

| Track | Priority | Est. Effort | Findings |
|-------|----------|-------------|----------|
| M-RA-SEC-1 | Critical | 3–4 weeks | F-RA-001, F-RA-010 |
| M-RA-SEC-2 | Critical | 1 week | F-RA-002 |
| M-RA-SEC-3 | High | 2 weeks | F-RA-003 |
| M-RA-SEC-4 | High | 2 weeks | F-RA-004, F-RA-005 |
| M-RA-SEC-5 | High | 1–2 weeks | F-RA-006 |
| M-RA-SEC-6 | High | 0.5 weeks | F-RA-007 |
| M-RA-SEC-7 | Medium | 2–3 weeks | F-RA-008, F-RA-011 |
| M-RA-SEC-8 | Medium | 6–8 weeks | F-RA-009 |
| M-RA-SEC-9 | Medium | 0.5 weeks | F-RA-012 |
| M-RA-SEC-10 | Medium | 0.5 weeks | F-RA-013 |
| M-RA-SEC-11 | Low | 1 week | F-RA-014, F-RA-015, F-RA-016 |

---

## Product-Behavior / Correctness Tracks (review role A)

### M-RA-PB-1: Critical — XP/Level Progression Idempotency

**Priority:** Critical
**Findings targeted:** PB-001
**Estimated effort:** 3 days

Prevent double XP/level awards under concurrent `postActivityLog` requests by wrapping the read-check-insert-update sequence in a transaction or by enforcing a unique constraint on `xpLogs(userId, activityId)`.

**Scope:**
- Add unique index on `xpLogs(userId, activityId)` (or equivalent) in `packages/db`.
- Rewrite `postActivityLog` XP path as an atomic upsert/transaction.
- Add adversarial concurrency tests that fire parallel completion requests and assert total XP increases exactly once.
- Audit game-score routes for the same race condition.

**Depends on:** None (schema migration is independent).

---

### M-RA-PB-2: High — Level-Test Assessment Contract

**Priority:** High
**Findings targeted:** PB-002
**Estimated effort:** 2 days

Validate the AI-produced level-test assessment JSON before it reaches the frontend or updates the user record.

**Scope:**
- Define `LevelTestAssessmentSchema` in `@reading-advantage/types`.
- Apply schema in `level-test-controller.ts` after `parseAssessment`.
- Return a structured error if the AI output is malformed so the UI can re-prompt.
- Add unit tests with valid/invalid assessment payloads.

---

### M-RA-PB-3: High — AI Content Quality Gate

**Priority:** High
**Findings targeted:** PB-003
**Estimated effort:** 1 week

Add a validation gate after AI-generated articles, story chapters, and questions to ensure they match requested CEFR level, genre, and schema.

**Scope:**
- Add Zod schemas for all generator outputs.
- Add readability/CEFR scoring validation (e.g., `text-readability-ts`) to reject off-level content.
- Replace `temperature: 1` with a lower, deterministic setting or remove temperature where structured output is used.
- Convert raw string throws to `Error` instances.
- Add generator tests with mocked AI responses.

---

### M-RA-PB-4: Medium — Assignment Status Enum & Lifecycle

**Priority:** Medium
**Findings targeted:** PB-004
**Estimated effort:** 3 days

Centralize assignment status as a shared enum and align frontend/backend status semantics.

**Scope:**
- Move assignment status to `@reading-advantage/types`.
- Replace `statusToInt` and ad-hoc string comparisons with the enum.
- Add assignment lifecycle tests (created → assigned → in-progress → completed → overdue).

---

### M-RA-PB-5: Medium — Reporting Metrics Correctness

**Priority:** Medium
**Findings targeted:** PB-005, PB-006
**Estimated effort:** 3 days

Fix class-accuracy aggregation and document the open-ended scoring rubric.

**Scope:**
- Report MCQ accuracy and open-ended accuracy separately.
- If a combined metric is required, weight by question type or normalize scores.
- Define a shared scoring rubric enum and use it in grading, feedback, and reports.
- Add report-correctness tests.

---

### M-RA-PB-6: Medium — Activity Target Validation & License Fallback

**Priority:** Medium
**Findings targeted:** PB-007, PB-008
**Estimated effort:** 2 days

Make activity target IDs explicit and license-level fallback conservative.

**Scope:**
- Require validated `targetId` in `postActivityLog`; remove fallback chains.
- Treat missing/invalid license data as `LicenseType.BASIC`.
- Add validation and license-default tests.

---

### M-RA-PB-7: Medium — Typed Request Context for Reports

**Priority:** Medium
**Findings targeted:** PB-009
**Estimated effort:** 2 days

Remove unsafe `(req as any).session` / `(req as any).params` casts from report controllers.

**Scope:**
- Pass user/context objects explicitly from route handlers to controllers.
- Replace `requireRole([...] as any)` with typed role checks.
- Add TypeScript-strictness checks.

---

### M-RA-PB-8: High — Product-Level Learning Loop Test Suite

**Priority:** High
**Findings targeted:** PB-010
**Estimated effort:** 2 weeks

Backfill behavior-focused integration tests for core learning outcomes.

**Scope:**
- Article completion after required question types.
- XP idempotency and level progression.
- FSRS scheduling after ratings.
- Assignment lifecycle and overdue detection.
- Level-test assessment contract.
- AI content level validation (with mocked provider).

**Depends on:** M-RA-PB-1, M-RA-PB-2, M-RA-PB-3 (tests validate those fixes).

---

## Updated Dependency Graph

```
M-RA-SEC-1 (tenant scoping) ──┬── M-RA-SEC-3 (audit logging)
                              ├── M-RA-SEC-8 (domain layer)
                              └── M-RA-SEC-11 (article schoolId)

M-RA-PB-1 (XP idempotency)   ── independent
M-RA-PB-2 (level-test schema) ── independent
M-RA-PB-3 (AI quality gate)   ── independent
M-RA-PB-4 (assignment enum)   ── independent
M-RA-PB-5 (report metrics)    ── independent
M-RA-PB-6 (target/license)    ── independent
M-RA-PB-7 (typed context)     ── depends on M-RA-SEC-8 boundary
M-RA-PB-8 (learning-loop tests) ──┬── M-RA-PB-1
                                  ├── M-RA-PB-2
                                  └── M-RA-PB-3
```

## Effort Summary

| Track | Priority | Est. Effort | Findings |
|-------|----------|-------------|----------|
| M-RA-SEC-1 | Critical | 3–4 weeks | F-RA-001, F-RA-010 |
| M-RA-SEC-2 | Critical | 1 week | F-RA-002 |
| M-RA-SEC-3 | High | 2 weeks | F-RA-003 |
| M-RA-SEC-4 | High | 2 weeks | F-RA-004, F-RA-005 |
| M-RA-SEC-5 | High | 1–2 weeks | F-RA-006 |
| M-RA-SEC-6 | High | 0.5 weeks | F-RA-007 |
| M-RA-SEC-7 | Medium | 2–3 weeks | F-RA-008, F-RA-011 |
| M-RA-SEC-8 | Medium | 6–8 weeks | F-RA-009 |
| M-RA-SEC-9 | Medium | 0.5 weeks | F-RA-012 |
| M-RA-SEC-10 | Medium | 0.5 weeks | F-RA-013 |
| M-RA-SEC-11 | Low | 1 week | F-RA-014, F-RA-015, F-RA-016 |
| M-RA-PB-1 | Critical | 3 days | PB-001 |
| M-RA-PB-2 | High | 2 days | PB-002 |
| M-RA-PB-3 | High | 1 week | PB-003 |
| M-RA-PB-4 | Medium | 3 days | PB-004 |
| M-RA-PB-5 | Medium | 3 days | PB-005, PB-006 |
| M-RA-PB-6 | Medium | 2 days | PB-007, PB-008 |
| M-RA-PB-7 | Medium | 2 days | PB-009 |
| M-RA-PB-8 | High | 2 weeks | PB-010 |

**Total Critical + High effort:** ~11–14 weeks
**Total medium + low effort:** ~12–15.5 weeks
**Grand total:** ~23–29.5 weeks (parallelizable to ~14–18 weeks with 2–3 engineers)

---

## Line-Review Evidence Backing Each Track

The 51 line-review batch reports provide the line-anchored evidence behind every M-RA-SEC-* and M-RA-PB-* track listed above. The table below shows which batches supply the strongest evidence for each track. The synthesis document is the deduplicated, prioritized view; the batch reports are the canonical evidence.

| Track | Synthesis ID | Originating batch report(s) |
|-------|--------------|------------------------------|
| M-RA-SEC-1 | C-RA-CRIT-03, H-04, H-10, H-11, H-14 | `ra-batch-09.md`, `ra-batch-10.md`, `ra-batch-44.md`, `ra-batch-45.md`, `ra-batch-46.md`, `ra-batch-47.md` |
| M-RA-SEC-2 | C-RA-CRIT-04, H-03 | `ra-batch-09.md`, `ra-batch-10.md`, `ra-batch-13.md`, `ra-batch-16.md`, `ra-batch-44.md` |
| M-RA-SEC-3 | H-05 | `ra-batch-44.md` through `ra-batch-47.md`; `00-inventory.md` §10 |
| M-RA-SEC-4 | H-06 | `ra-batch-37.md` (prompts), `ra-batch-44.md` (ai-controller), `ra-batch-48.md` (article-generator), `ra-batch-49.md` (translation-generator) |
| M-RA-SEC-5 | (no direct line-review finding; depends on shared rate-limiter track) | n/a |
| M-RA-SEC-6 | H-04, M-17 | `ra-batch-46.md`, `ra-batch-47.md` |
| M-RA-SEC-7 | H-02 | batches 09, 10, 11, 14, 44, 45, 46 |
| M-RA-SEC-8 | C-RA-CRIT-01, C-RA-CRIT-02, H-19, M-09 | `ra-batch-01.md` (server actions), `ra-batch-44.md` through `ra-batch-47.md` (controllers), `ra-batch-15.md` (system direct DB) |
| M-RA-SEC-9 | H-01 | `ra-batch-44.md`, `ra-batch-49.md` |
| M-RA-SEC-10 | H-03 | `ra-batch-13.md` (metrics/health), `ra-batch-14.md` (metrics/cache, metrics/stream) |
| M-RA-SEC-11 | H-01, H-15 | `ra-batch-44.md`, `ra-batch-48.md`, `ra-batch-49.md` |
| M-RA-PB-1 | C-RA-CRIT-06, H-22 | `ra-batch-46.md` (`user-controller.ts:157-328`); `ra-batch-11.md` (flashcard) |
| M-RA-PB-2 | H-08 | `ra-batch-13.md`, `ra-batch-37.md`, `ra-batch-48.md` |
| M-RA-PB-3 | H-08 | `ra-batch-48.md` (article-generator), `ra-batch-49.md` |
| M-RA-PB-4 | M-16 | `ra-batch-44.md`, `ra-batch-46.md` |
| M-RA-PB-5 | M-15 | `ra-batch-45.md`, `ra-batch-46.md` |
| M-RA-PB-6 | M-13, M-14 | `ra-batch-46.md` (`user-controller.ts:169-198`, `user-controller.ts:37-66`), `ra-batch-47.md` (`question-controller.ts:25-63`) |
| M-RA-PB-7 | H-07 | `ra-batch-45.md`, `ra-batch-46.md`, `ra-batch-47.md` |
| M-RA-PB-8 | §3.2 H-21, §3.3 M-08 | `test-gaps.md` §5; re-confirmed in batches 00, 01, 09, 44 |

## Additional Risks Surfaced by the 51-Batch Review

The line review surfaced items that the original sampled pass did not flag and that are not yet in the M-RA-SEC-* / M-RA-PB-* plan:

- **C-RA-CRIT-05** (admin page role check) and **C-RA-CRIT-01 / C-RA-CRIT-02** (unauthenticated `actions/rating.ts` and `actions/pratice.ts` session fabrication) — these are server-action paths and are best grouped with M-RA-SEC-1 and M-RA-SEC-8 in a follow-up track.
- **C-RA-CRIT-07** (vacuous `implementation-validation.test.ts`) and **C-RA-CRIT-08** (archived-path Jest 30 tests) — anti-patterns A4 and A9; these should be folded into M-RA-PB-8 (test suite backfill) as a small upfront cleanup.
- **H-20** (demo refresh endpoint executing shell with only access-key auth) — currently no track; consider a new M-RA-SEC-12.
- **H-16** (SQL injection vector in `refresh-materialized-views.ts:17-31`) — currently no track; consider a new M-RA-SEC-13.
- **M-10** (`Dockerfile` bakes secrets, uses `npm` in a pnpm monorepo, copies `prisma/`) — no track; consider M-RA-OPS-1.

These additions are *proposals*. Phase 7 acceptance is **PENDING**; the final decision to spin off new tracks belongs to the next agent in the measure-orchestrator pipeline.
