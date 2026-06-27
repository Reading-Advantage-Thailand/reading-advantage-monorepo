# Test Gaps: Reading Advantage Security / UX / Correctness Review

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 7ad89ac39b6b871da0907c6b873329c75d6dc3b9
> **Source of truth:** [`line-review-synthesis.md`](./line-review-synthesis.md) §2 (severity tally) and §3.2 H-21 (game-page test failures) and §3.3 M-08 (wall-clock performance thresholds) and §3.3 M-20 (helper-only test suites) are the line-anchored evidence backing the test gaps listed below.
> **Phase 7 acceptance:** **PENDING**.

---

## 1. Test Inventory Summary

| Category | File Count | Coverage | Batch verification |
|----------|-----------|----------|--------------------|
| Total test files (`*.test.ts`) | 44 | — | `00-inventory.md` §15 |
| Game logic tests (`lib/games/`) | 20 | Good | batches 40, 41, 42 |
| Store tests (`store/`) | 3 | Partial | batch 49 |
| Integration/unit tests (`__test__/`) | 18 | Sparse | `ra-batch-00.md`, `ra-batch-01.md` (anti-pattern A4, A9) |
| Controller tests | 0 | **Missing** | re-confirmed in batches 44–47 |
| Route handler tests | 0 | **Missing** | re-confirmed in batch 09 |
| API contract tests | 0 | **Missing** | re-confirmed in batches 44–47 |
| Auth flow tests | 1 (rbac.test.ts) | Minimal | `ra-batch-01.md` |
| Session tests | 1 (session-schema.test.ts) | Schema only | `ra-batch-01.md` |
| Game page tests | 7 | Fail in jsdom (no `fetch` mock) | synthesis §3.2 H-21; batches 02, 03, 23 |

---

## 2. Critical Test Gaps

### 2.1 Zero Controller Tests

**Gap:** None of the 54 controllers in `server/controllers/` have test files.

| Controller | Lines | Risk | Test |
|-----------|-------|------|------|
| `article-controller.ts` | 926 | High — AI generation, translation, complex queries | None |
| `classroom-controller.ts` | 1422 | Critical — auth bypass, tenant isolation | None |
| `assignment-controller.ts` | 1041 | High — CRUD, access control | None |
| `stories-controller.ts` | 880 | High — generation, completion tracking | None |
| `admin-controller.ts` | 1263 | High — school-wide data access | None |
| `student-dashboard-controller.ts` | 148 | Medium — dashboard aggregation | None |
| `ai-controller.ts` | 213 | High — AI generation, caching | None |
| `flashcard-controller.ts` | — | Medium — FSRS logic | None |

**Impact:** No way to verify controller behavior without running the full app. Regression risk is high for any change.

### 2.2 Zero Route Handler Tests

**Gap:** None of the 209 route handlers have test files.

Every route handler delegates to a controller via `next-connect`, but there are no tests verifying:
- HTTP method routing (GET/POST/PUT/DELETE)
- Middleware execution (protect, restrictTo)
- Response status codes
- Response body shapes
- Error handling paths

### 2.3 Zero API Contract Tests

**Gap:** No tests verify that API responses match expected schemas.

Example missing contracts:
```typescript
// Should verify:
// - GET /api/v1/student/me returns StudentMeResponse shape
// - POST /api/v1/flashcard/progress/update returns correct HTTP status
// - GET /api/v1/classroom returns { message, data: Classroom[] }
// - Error responses follow consistent shape
```

### 2.4 Missing Auth Flow Tests

**Gap:** Auth integration is minimally tested.

| Flow | Test Status |
|------|------------|
| Login → Session creation | Not tested |
| Register → Account creation | Not tested |
| Logout → Session invalidation | Not tested |
| Password reset flow | Not tested |
| Impersonation flow | Not tested |
| Session expiry | Not tested |
| Role-based access (restrictTo) | 1 test file (rbac.test.ts) — schema only |
| Cross-school access prevention | Not tested |

### 2.5 Missing Validation Tests

**Gap:** No tests verify input validation behavior.

| Input Type | Validation | Test |
|-----------|-----------|------|
| Query parameters | None | Not tested |
| Request bodies | Sparse Zod | Not tested |
| Path parameters | None | Not tested |
| Headers | None | Not tested |

---

## 3. High-Priority Test Recommendations

### 3.1 Classroom Controller Auth Tests (Critical)

```typescript
// Recommended: __test__/classroom-auth.test.ts
// Test that:
// - TEACHER cannot archive/update/delete classroom in another school
// - TEACHER cannot modify students in classrooms they don't own
// - ADMIN can only access classrooms in their school
// - SYSTEM can access all classrooms
// - Unauthenticated requests are rejected
```

### 3.2 Flashcard FSRS Contract Tests (High)

```typescript
// Recommended: __test__/flashcard-contract.test.ts
// Test that:
// - POST /api/v1/flashcard/progress/update returns HTTP 200 for valid input
// - Returns HTTP 400 for missing fields
// - Returns HTTP 403 for unauthenticated
// - Returns HTTP 404 for non-existent card
// - Rating values 1-4 produce correct FSRS scheduling
// - Concurrent updates don't corrupt data
```

### 3.3 API Response Shape Tests (High)

```typescript
// Recommended: __test__/api-contracts.test.ts
// Test that all list endpoints return:
// - { data: Array, meta: { total, page, limit } } or equivalent
// - Empty results return empty array, not null
// - Error responses include { code, message } or standardized shape
```

### 3.4 Article Search Contract Tests (Medium)

```typescript
// Recommended: __test__/article-search.test.ts
// Test that:
// - GET /api/v1/articles with valid params returns paginated results
// - Invalid page/limit values return 400, not NaN
// - Genre/subgenre filtering works correctly
// - Level filtering respects user's level
```

### 3.5 AI Insights Flow Tests (Medium)

```typescript
// Recommended: __test__/ai-insights.test.ts
// Test that:
// - GET /api/v1/ai/summary respects role-based scope
// - Force refresh triggers generation
// - Cached insights are returned on subsequent requests
// - Different roles see different insight scopes
```

---

## 4. Existing Test Quality

### 4.1 Game Tests (20 files)
Good coverage of game logic. These are isolated unit tests that don't depend on DB or API.

### 4.2 Store Tests (3 files)
Test Zustand store state management. Isolated, fast.

### 4.3 Integration Tests (18 files in `__test__/`)
| Test | What it covers | Quality |
|------|---------------|---------|
| `dashboard-summary-controller.test.ts` | Controller SQL generation | Good — verifies SQL structure |
| `velocity-metrics.test.ts` | Metrics calculation | Good |
| `srs-health-core-logic.test.ts` | SRS health logic | Good |
| `query-optimizer.test.ts` | Query optimization | Good |
| `session-schema.test.ts` | Zod schema validation | Good |
| `rbac.test.ts` | Role definitions | Minimal — schema only |
| `assignment-prediction-service.test.ts` | Prediction service | Good |

### 4.4 Missing Test Infrastructure
- No test utilities for mocking `@reading-advantage/db`
- No test fixtures for user/classroom/article data
- No API test helpers (e.g., `createTestRequest()`)
- No shared test setup for auth mocking

---

## 5. Test Coverage by Feature Area

| Feature Area | Controller Tests | Route Tests | Contract Tests |
|-------------|-----------------|-------------|----------------|
| Auth (login/register/session) | 0 | 0 | 0 |
| Student Dashboard | 0 | 0 | 0 |
| Article Reading | 0 | 0 | 0 |
| Story Reading | 0 | 0 | 0 |
| Flashcards/FSRS | 0 | 0 | 0 |
| Classroom Management | 0 | 0 | 0 |
| Assignments | 0 | 0 | 0 |
| Teacher Dashboard | 0 | 0 | 0 |
| Admin Dashboard | 0 | 0 | 0 |
| AI Insights | 0 | 0 | 0 |
| Reports/Metrics | 0 | 0 | 0 |
| Games | 0 (logic tested) | 0 | 0 |
| Workbook Generator | 0 | 0 | 0 |
| Level Test | 0 | 0 | 0 |
| Vocabulary/XP | 0 | 0 | 0 |

**Total: 0 controller tests, 0 route tests, 0 contract tests across all feature areas.**

---

## 6. Product-Behavior / Correctness Test Gaps

### 6.1 Core Learning Loop Tests (Critical)

No tests verify the end-to-end student learning behavior:

| Behavior | Missing Test |
|----------|-------------|
| Article completion after MCQ + SAQ (Basic/Premium) or MCQ + SAQ + LAQ (Enterprise) | `__test__/article-completion.test.ts` |
| XP awarded once per activity (idempotency under retry/concurrency) | `__test__/xp-idempotency.test.ts` |
| Level progression when cumulative XP crosses thresholds | `__test__/level-progression.test.ts` |
| FSRS scheduling after Again/Hard/Good/Easy ratings | `__test__/fsrs-scheduling.test.ts` |
| Streak and daily-goal calculation edge cases | `__test__/streak-calculation.test.ts` |
| Level-test assessment JSON validation and level assignment | `__test__/level-test-assessment.test.ts` |

### 6.2 Teacher / Admin Workflow Tests (High)

| Behavior | Missing Test |
|----------|-------------|
| Assignment creation → student visibility → status transitions → completion | `__test__/assignment-lifecycle.test.ts` |
| Due-date overdue detection in reports | `__test__/assignment-overdue.test.ts` |
| Class accuracy report accuracy (separate MCQ vs. open-ended) | `__test__/class-accuracy-report.test.ts` |
| Teacher dashboard only shows assigned classrooms | `__test__/teacher-scope.test.ts` |
| Admin/school reports aggregate correct schools | `__test__/admin-report-scope.test.ts` |

### 6.3 AI Content Generation Tests (High)

| Behavior | Missing Test |
|----------|-------------|
| Generated article matches requested CEFR level (readability score) | `__test__/article-level-validation.test.ts` |
| Generated questions match article content and have one correct answer | `__test__/question-generation.test.ts` |
| Level-test chat produces valid assessment JSON | `__test__/level-test-output.test.ts` |
| AI failures fall back gracefully | `__test__/ai-fallback.test.ts` |

### 6.4 Edge-Case / Data Persistence Tests (Medium)

| Behavior | Missing Test |
|----------|-------------|
| Concurrent flashcard progress updates do not corrupt FSRS state | `__test__/flashcard-concurrency.test.ts` |
| Duplicate activity log requests do not double-award XP | `__test__/activity-log-idempotency.test.ts` |
| Missing/invalid targetId in activity log is rejected | `__test__/activity-target-validation.test.ts` |
| User with missing license data defaults to Basic (not Enterprise) | `__test__/license-default.test.ts` |

---

## 7. Recommended Test Investment Order

1. **XP idempotency / activity-log concurrency** — fixes PB-001 and prevents exploitation.
2. **Classroom authorization** — existing C-007; add adversarial tests.
3. **Level-test assessment contract** — fixes PB-002.
4. **Article/question generation level gate** — fixes PB-003.
5. **Assignment lifecycle + status enum** — fixes PB-004.
6. **Class accuracy report correctness** — fixes PB-005 / PB-006.
7. **FSRS scheduling contract** — core learning loop.
8. **API contract tests** — broad regression safety.

## 8. Test-Quality Issues Surfaced by the 51-Batch Review

The line review found several test-quality issues that the original sampled pass did not flag and that are not captured in the controller/route/contract test counts above. These are line-anchored findings in the synthesis and should be considered part of any test investment:

- **C-RA-CRIT-07 (anti-pattern A4):** `__test__/implementation-validation.test.ts` is a vacuous-pass suite that asserts literal objects defined inside the test file. It claims to validate Phase 2.5 deliverables but never inspects the filesystem or imports. (`ra-batch-00.md` H-01.)
- **C-RA-CRIT-08 (anti-pattern A9):** Five `__test__/jest30-phase5-*.test.ts` files resolve artifacts under `measure/tracks/jest30_major_migration/`, but that directory was archived to `measure/archive/jest30_major_migration/` on 2026-06-22. The tests are guaranteed to fail until the path is fixed. (`ra-batch-00.md` H-02.)
- **M-08 (synthesis §3.3):** Three test suites (`alignment-metrics-core.test.ts:248-274`, `assignment-funnel-analytics.test.ts:472-506`, `genre-engagement-core.test.ts:425-463`) use hardcoded `< 100ms` wall-clock assertions, which are non-deterministic across CI runners.
- **M-20 (synthesis §3.3):** Three test suites (`alignment-metrics-core.test.ts`, `assignment-funnel-analytics.test.ts`, `genre-engagement-core.test.ts`) define the helper functions they test inside the test file rather than importing from production code. They exercise no production code.
- **H-21 (synthesis §3.2):** Six game-page test files fail in jsdom because `fetch` is not mocked: `dragon-rider/page.test.tsx`, `enchanted-library/page.test.tsx`, `magic-defense/page.test.tsx`, `rpg-battle/page.test.tsx`, `rune-match/page.test.tsx`, `wizard-vs-zombie/page.test.tsx`. (`ra-batch-02.md` F-UX-029, F-UX-030, F-UX-031; `ra-batch-03.md` H-02.)
- **M-05 (synthesis §3.3):** Several suites use `as any` for inputs that could be typed with partial interfaces or `unknown` (e.g. `alignment-metrics-core.test.ts:163,188`).

## 9. Cross-Reference to Other Artifacts

- The 0/54 controller test count, 0/209 route handler test count, and 0 product-behavior learning-outcome test count are **independently confirmed** by the line-review batches: see synthesis §2 and the "Test / Coverage Observations" sections of `ra-batch-00.md`, `ra-batch-01.md`, `ra-batch-09.md`, `ra-batch-44.md`, `ra-batch-45.md`, `ra-batch-46.md`, `ra-batch-47.md`.
- The M-RA-PB-8 (Product-Level Learning Loop Test Suite) migration track in `migration-tracks.md` is the proposed remediation for the gaps listed in §6.1.
- The C-RA-CRIT-07 and C-RA-CRIT-08 cleanup items should be folded into M-RA-PB-8 as a small upfront cleanup.
- This document does not claim acceptance or closeout. Phase 7 is pending.
