# Line-by-Line Review: `sa-batch-02`

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-02` (20 files)  
**Date:** 2026-06-27  
**Reviewer:** Measure audit subagent  

---

## Scope

Batch covers three areas within `apps/science-advantage/app/`:

1. **Teacher dashboard & class pages** (files 1–12) — Next.js App Router pages for teacher analytics, class detail, roster, lesson preview, and the teacher dashboard landing page.
2. **DSAR export route** (files 13–15) — Admin `GET /api/admin/dsar/export` route and its integration/E2E tests.
3. **AI recommendations route** (files 16–20) — `POST /api/ai/recommendations` route and test files (observability FR-5, FR-6, Sentry FR-1).

---

## Review Criteria

| Axis | Focus |
|------|-------|
| **Correctness** | Logic errors, race conditions, mishandled edge cases, broken async contracts |
| **Security/Tenancy/Auth** | School-scoping, auth gates, authorization checks, information disclosure |
| **AGENTS.md Compliance** | Adapter pattern, no direct provider SDKs, backend module ownership, Zod contracts |
| **Test Quality** | Coverage, isolation, determinism, resilience to refactoring, assertion quality |
| **Architecture / Golden Path** | `command()` / `assertCan()` patterns, thin routes, business logic in `@reading-advantage/domain`, tenantDb usage |
| **Docs (JSDoc)** | Every exported function documented per AGENTS.md §Documentation Standards |

---

## File-by-File Findings

### File 1: `app/(teacher)/teacher/classes/[classId]/analytics/lessons/[lessonId]/page.tsx`

**18 lines.** Thin async server component; delegates to `LessonDetailAnalytics` client component.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-001 | 12–15 | LOW | No `requireAuth()` call at the page level. Authorization is deferred entirely to the `LessonDetailAnalytics` client component. This breaks the pattern established by the sibling analytics page (file 2) and class detail page (file 7) which both call `requireAuth()` and check `teacherId` ownership server-side. A student who navigates directly here will not be rejected at the server boundary — the client component must enforce auth independently. |
| F-SA-B02-002 | 1 | LOW | Missing JSDoc on the default export function. |

---

### File 2: `app/(teacher)/teacher/classes/[classId]/analytics/page.tsx`

**75 lines.** Server component with auth, authorization, and caching.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-003 | 11–13 | MEDIUM | `cache(async (classId) => getClassDetailWithCurriculum(classId))` — this function uses the raw `db` client internally (see `get-class-detail.ts`, lines 53, 63, 68, 73, 93) and does **not** inject `schoolId` filters. All tables it queries (`scienceClasses`, `scienceClassStudents`, `scienceCurriculumUnits`, `scienceUnitLessons`, `scienceLessons`) are classified `FLAT` in the tenant registry. The function bypasses `createTenantDB` entirely. The authorization check at lines 48–57 (`teacherId === session.user.id` or `ADMIN`) mitigates cross-tenant data access at the page level, but the function itself has no tenant guard. Per AGENTS.md: "Every query must be scoped by `schoolId`." |
| F-SA-B02-004 | 48–57 | OK | Authorization check is correct and matches the golden path pattern (`teacherId === session.user.id || hasRole(session, 'ADMIN')`). |
| F-SA-B02-005 | 35 | OK | `requireAuth()` called before any data operation — correct ordering. |

---

### File 3: `app/(teacher)/teacher/classes/[classId]/error.tsx`

**33 lines.** Client component error boundary.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-006 | 1 | OK | `"use client"` directive present — correct for error boundary. |
| F-SA-B02-007 | 15–16 | LOW | Error object is passed directly to `clientLogger.error` as `{ error: error }`. The `error` object may contain enumerable properties or none depending on the runtime; if the Error has a `.cause` or custom fields they could leak PII or internal state into the client-side logger. A sanitized serialization (e.g., `{ message: error.message, digest: error.digest }`) would be safer. |
| F-SA-B02-008 | 22–25 | LOW | Hardcoded English-only user-facing error message. No i18n wrapper. The rest of the app uses Thai/English bilingual patterns (e.g., `teacher/page.tsx` line 33–34). Inconsistency. |

---

### File 4: `app/(teacher)/teacher/classes/[classId]/lessons/[slug]/page.tsx`

**33 lines.** Thin server component; delegates to `TeacherLessonPreview`.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-009 | 10 | LOW | `requireRole('TEACHER')` is called but the page does **not** verify that the teacher owns the class (`classId`). A teacher from school A could access this URL with a `classId` from school B. Authorization is deferred to the `TeacherLessonPreview` client component and its internal API calls (which are not tenant-scoped in the URL — they're relative `/api/...` fetches). Missing `classDetail.teacherId === session.user.id` check like the sibling pages have. |
| F-SA-B02-010 | 25 | LOW | `Class: {classId}` — class ID is rendered in the UI. If UUIDs are the internal primary key, this is a minor information disclosure (exposes internal identifiers to users). |

---

### File 5: `app/(teacher)/teacher/classes/[classId]/lessons/[slug]/teacher-lesson-preview.tsx`

**386 lines.** Client component with data fetching, language display, structured content validation.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-011 | 169 | MEDIUM | `fetch('/api/lessons/${lessonSlug}')` — client-side fetch to internal API. The API handler must independently verify authorization for the requesting user. Since the parent server page only ensures the user has role `TEACHER` (not that they own this specific class), and the lesson fetch doesn't include a class context, a teacher could potentially enumerate lessons across classes/schools if the `/api/lessons/[slug]` handler doesn't do its own tenant check. |
| F-SA-B02-012 | 188 | MEDIUM | `fetch('/api/classes/${classId}/assignments')` — same concern as above. The `classId` originates from route params but is passed to a client component construct. There is no server-side validation that the requesting teacher owns this class before the client component makes API calls. |
| F-SA-B02-013 | 70–77 | OK | `validateStructuredContent` uses `LessonContentSchema.safeParse()` — correct use of Zod for external data validation. Degrades gracefully to `null`. |
| F-SA-B02-014 | 198–199 | LOW | The assignments fetch failure is silently caught (`// Silently handle - assignment state just won't show`). Silent catch can mask network errors or 500s, making debugging difficult. A `clientLogger.warn` call here would improve observability. |
| F-SA-B02-015 | 163–209 | LOW | `useEffect` with async fetch creates a potential race condition if the component unmounts before the fetch completes (leading to `setState` on unmounted component). No `AbortController` or mounted flag. |
| F-SA-B02-016 | 62–64 | LOW | `isStructuredContentEnabled` reads `process.env.NEXT_PUBLIC_STRUCTURED_CONTENT_ENABLED` directly in a client component. Fine for build-time inlined env vars, but the comment on lines 58–60 is accurate. |
| F-SA-B02-017 | Various | OK | Bilingual rendering pattern (English + Thai fallback) is consistent across the component. |
| F-SA-B02-018 | 380–386 | OK | `DisplayPreferenceProvider` wraps the preview content — correct context pattern. |

---

### File 6: `app/(teacher)/teacher/classes/[classId]/loading.tsx`

**24 lines.** Skeleton loading state.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-019 | All | OK | Simple skeleton component. No logic, no external deps. Correct usage of `Skeleton` from shadcn/ui. |

---

### File 7: `app/(teacher)/teacher/classes/[classId]/page.tsx`

**114 lines.** Class detail page with curriculum units, intervention summary, join code, snapshot panel.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-020 | 16 | MEDIUM | Same as F-SA-B02-003: `getClassDetailWithCurriculum` uses raw `db` with no `schoolId` filter. Page-level authorization (`teacherId === session.user.id`) protects against access by other teachers, but the function itself has no tenant guard. If this function is ever reused in a context without the page-level auth check, it becomes a cross-tenant data leak. |
| F-SA-B02-021 | 47 | OK | Ownership check `classDetail.teacherId === session.user.id` matches the golden path authorization pattern. |
| F-SA-B02-022 | 82–86 | OK | Empty curriculum state is handled explicitly with a user-facing message. |

---

### File 8: `app/(teacher)/teacher/classes/[classId]/roster/page.tsx`

**71 lines.** Class roster page.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-023 | 11 | MEDIUM | Same `getClassDetailWithCurriculum` tenant-scoping gap (see F-SA-B02-003, F-SA-B02-020). |
| F-SA-B02-024 | 28–47 | OK | Proper auth flow: `requireAuth()` → role check → data fetch → ownership check. |
| F-SA-B02-025 | 42–47 | OK | Ownership + admin authorization check. Consistent with sibling pages. |

---

### File 9: `app/(teacher)/teacher/classes/[classId]/students/[studentId]/page.tsx`

**18 lines.** Thin server component, delegates to `StudentDetailAnalytics`.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-026 | 3–17 | LOW | Same concern as F-SA-B02-001: no server-side auth check. Delegates entirely to client component. A student who knows a `classId` and `studentId` could navigate here without server-side rejection. The client component must enforce auth independently. |

---

### File 10: `app/(teacher)/teacher/classes/page.tsx`

**96 lines.** Teacher's class list page with class creation form.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-027 | 16–23 | OK | Correct tenant-scoped pattern: `createTenantDB(db, tenant)` → `teachers.getTeacherClassesWithCounts({ db: tenantDb, ... })`. This is the golden path. The contrast with files 2/7/8 (which use raw `db`) highlights the inconsistency. |
| F-SA-B02-028 | 13 | OK | `requireRole('TEACHER')` — correct. |
| F-SA-B02-029 | 18 | LOW | `session.user as unknown as UserContext` — the double cast suggests a type mismatch between the session type and `UserContext`. This is a type-safety gap that could hide future breakage if `UserContext` shape changes. |

---

### File 11: `app/(teacher)/teacher/page.e2e.spec.ts`

**373 lines.** Playwright E2E tests for the teacher dashboard intervention alerts widget.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-030 | 5 | MEDIUM | Test `beforeEach` navigates to `/signin` but does not perform any login action. All tests will fail if the dev auth impersonation panel is not enabled, or if the test account is not seeded. The comment on line 5 says "assumes dev impersonation or test account" but no credentials are supplied. This makes the test suite non-deterministic across environments. |
| F-SA-B02-031 | 19–32, 39–46, etc. | MEDIUM | Nearly every test wraps assertions in `if (await widget.isVisible())` guards. If the feature is toggled off (the intervention alerts widget is conditional), the tests silently pass without asserting anything. This is a false-pass risk — a regression could break the widget and the test suite would still report green. |
| F-SA-B02-032 | 198 | LOW | `await page.waitForTimeout(1000)` — fixed-timeout waits are flaky. Prefer `waitForSelector` / `waitForResponse` / `waitForFunction`. |
| F-SA-B02-033 | 205 | LOW | Same as above (`waitForTimeout(500)`). |
| F-SA-B02-034 | 311–372 | OK | Keyboard accessibility test is thorough, covering Tab traversal and Enter activation. |
| F-SA-B02-035 | 356–370 | LOW | The for-loop keyboard tabbing pattern (up to 20 Tab presses) is fragile. If the DOM structure changes, the test might never focus the target element. A more robust approach would use `page.getByRole('link', { name: 'Test Student' })` and `focus()` / `press('Enter')`. |

---

### File 12: `app/(teacher)/teacher/page.tsx`

**56 lines.** Teacher dashboard landing page.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-036 | 13 | OK | `requireRole('TEACHER')` — correct. |
| F-SA-B02-037 | 15–22 | OK | Correct `createTenantDB` usage with `teachers.getTeacherClasses`. Golden path. |
| F-SA-B02-038 | 28 | LOW | Emoji in production UI (`🍎`). AGENTS.md ($avoid-feature-creep conventions) discourages emojis unless explicitly requested. Minor inconsistency. |
| F-SA-B02-039 | 33–36 | OK | Bilingual welcome text (English + Thai) — correct pattern. |

---

### File 13: `app/api/admin/dsar/export/dsar-export-e2e.integration.test.ts`

**468 lines.** End-to-end integration test for DSAR export zip bundle.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-040 | 82–157 | OK | The minimal STORE-method ZIP reader is well-implemented, well-documented, and correctly walks the EOCD → CDH → LFH structure. |
| F-SA-B02-041 | 177–206 | OK | Seed functions use `onConflictDoNothing()` for idempotent re-runs. Good. |
| F-SA-B02-042 | 212–226 | OK | `cleanupE2eTestData` uses prefix-scoped DELETE (not TRUNCATE) per `test-strategy.md` §2. Correct. |
| F-SA-B02-043 | 265–468 | OK | Tests are thorough: happy-path zip counts, manifest/ profile/events cross-reference, cross-tenant isolation check (`manifest.profileRecordCount === 0` for nonexistent subject), deterministic UUIDs for fixture isolation. |
| F-SA-B02-044 | 422–467 | OK | Tenant isolation test for the empty-result path — confirms no data leaks when subject does not exist. |
| F-SA-B02-045 | 323–419 | OK | The "counts triple" cross-reference (`manifest.auditEventCount == events.length`, `manifest.totalRows == events.length`, `dbCount == manifest.auditEventCount`) is a well-designed invariant check. |

---

### File 14: `app/api/admin/dsar/export/route.integration.test.ts`

**719 lines.** Route-level integration tests for DSAR export.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-046 | 198–231 | LOW | `seedAuditEvents` helper is defined but never called by any test in this file (comment on line 208 confirms: "Not used by any test in this file"). Dead code. |
| F-SA-B02-047 | 258–266 | OK | Unauthenticated → 401 test. Clear and isolated. |
| F-SA-B02-048 | 268–289 | OK | TEACHER → 403 test. The comment on lines 272–279 explicitly warns about the `requireRole` redirect-vs-500 shape issue — good defensive documentation. |
| F-SA-B02-049 | 305–319 | OK | Zod XOR validation tests (`neither` → 400, `both` → 400). |
| F-SA-B02-050 | 652–718 | MEDIUM | The 413 test uses `vi.doMock` + `vi.resetModules()` + dynamic `import("./route")`. This is a fragile pattern: `vi.doMock` is a per-module mutable global, and the `try/finally` with `vi.doUnmock` is essential but easy to forget. The test's justification (seeding 100k rows would be too slow) is reasonable, but the mock-based approach means the 413 contract is pinned at the route-translation layer only — the domain-level 413 contract is cross-referenced to the domain test. Documentation (lines 654–677) is thorough. |
| F-SA-B02-051 | 540–611 | OK | Audit row write test is precise: checks baseline count (0), fires the route, asserts exactly one new row, then checks the full row shape. |
| F-SA-B02-052 | 613–650 | OK | Negative-path audit test: confirms no `dsar:export` row is written on 401/403/400. |
| F-SA-B02-053 | 496–521 | OK | Email-vs-userID equivalence test. Important contract pinned. |

---

### File 15: `app/api/admin/dsar/export/route.ts`

**142 lines.** DSAR export route handler.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-054 | 15–25 | OK | `dsarQuerySchema` uses `.refine()` for XOR validation of `userId`/`email`. Correct Zod pattern. |
| F-SA-B02-055 | 28–141 | OK | Proper `runWithRequestContext` wrapper. |
| F-SA-B02-056 | 36–48 | OK | Auth check: manual session lookup + role check (ADMIN or SYSTEM). |
| F-SA-B02-057 | 50–59 | OK | Zod safeParse with flattened error details on 400. |
| F-SA-B02-058 | 67–72 | OK | Calls `exportSubjectData` from `@reading-advantage/domain/audit/dsar` — correct backend module usage. Passes `tenant: { schoolId: session.user.schoolId }`. |
| F-SA-B02-059 | 75–77 | OK | `tooLarge` → 413 translation is a one-liner. |
| F-SA-B02-060 | 79–92 | OK | `recordAuditEvent` from `@reading-advantage/auth` — correct adapter usage. |
| F-SA-B02-061 | 94–139 | OK | Zip and JSON format builders are clean and consistent. |
| F-SA-B02-062 | 61–64 | LOW | `SubjectRef` is typed as `{ userId: string } | { email: string }` but the import reads `import type { SubjectRef } from ...`. If the domain type changes, this construction (`parsed.data.userId ? { userId: ... } : { email: ... }`) could silently produce a type mismatch. A Zod `discriminatedUnion` on the schema itself would be more type-safe. |

---

### File 16: `app/api/ai/recommendations/otel-route-span.test.ts`

**385 lines.** Phase 9 OTel span recording test for recommendations route.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-063 | 86–108 | OK | `StubAIClient` correctly implements the AIClient interface and returns parseable recommendations. |
| F-SA-B02-064 | 110–114 | OK | `@reading-advantage/ai` mock provides `createTestClient` and `getAIClient`. |
| F-SA-B02-065 | 120–127 | HIGH | `vi.mock(import('zod'), ...)` — dynamic mock of the `zod` module itself. This is a fragile workaround for the bun + vitest transform pipeline. The mock re-exports the actual zod module but adds `z` and `default` aliases. If `zod`'s export map changes in a future version, this mock could silently produce incorrect exports. Additionally, this mock is global across all imports in the test, potentially affecting other modules that import `zod` in unexpected ways. The comment on lines 117–119 acknowledges the workaround nature. |
| F-SA-B02-066 | 133–149 | OK | In-memory Redis replacement. Clean pattern. |
| F-SA-B02-067 | 284–318 | MEDIUM | The `getRecommendation` mock is a passthrough that calls `deps.generateRecommendation(context)`. This requires the mock to correctly mirror the domain function's parameter shape. If the domain function's signature changes (e.g., the `deps` type), this test would either fail to compile (good — caught early) or silently pass with incorrect behavior (bad). The passthrough pattern is necessary to exercise the real service path but creates coupling to the domain function's internal parameter structure. |
| F-SA-B02-068 | 350–384 | OK | The span assertion is thorough: checks name, `ai.model`, `ai.schema`, `status.code`. |
| F-SA-B02-069 | 338–348 | OK | `beforeEach` creates a fresh `MockTracerHandle`; `afterEach` shuts it down. Proper isolation. |

---

### File 17: `app/api/ai/recommendations/route.integration.test.ts`

**376 lines.** Integration tests for recommendations route.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-070 | 37–47 | OK | LLM service mock. |
| F-SA-B02-071 | 69–86 | OK | Cleanup function deletes all related tables in dependency order. Good. |
| F-SA-B02-072 | 88–219 | OK | `seedScenario` creates a complete fixture: school, teacher, student, class, unit, lesson, standard, question, attempt, response. |
| F-SA-B02-073 | 222–230 | OK | `beforeEach` resets the recommendation testkit and cleans up. |
| F-SA-B02-074 | 306–328 | OK | Cross-student 403 test (outsider ID) — important security contract pinned. |
| F-SA-B02-075 | 349–375 | OK | Caching test: verifies `generateRecommendation` is called exactly once across two requests for the same `attemptId`. Correctly clears the spy between tests. |
| F-SA-B02-076 | 88–89 | LOW | Users are inserted without a `schoolId` field. `users` is classified as `FLAT` in the tenant registry. While the seeded `outsiderId` also lacks a `schoolId`, this could cause issues if the domain function's tenant query requires `schoolId` to be non-null. |
| F-SA-B02-077 | 232–242 | OK | Unauthenticated 401 test. |
| F-SA-B02-078 | 260–274 | OK | Non-existent attempt → 404 test. |

---

### File 18: `app/api/ai/recommendations/route.test.ts`

**271 lines.** Phase 5 FR-6 unit tests (runWithRequestContext wrap contract).

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-079 | 36–99 | OK | `findJsonLogStrings` helper correctly parses JSON log lines from console spies. |
| F-SA-B02-080 | 228–248 | OK | Core FR-6 assertion: at least one log line carries `requestId`, `route`, `method`, `latencyMs`. |
| F-SA-B02-081 | 250–258 | OK | Regression guard: response status is 500 (unchanged from pre-migration). |
| F-SA-B02-082 | 261–270 | OK | Sanity checks that `logger.error` and `runWithRequestContext` are importable. |
| F-SA-B02-083 | All | OK | All external deps are `vi.mock`-ed. The test is a true unit test. |

---

### File 19: `app/api/ai/recommendations/route.ts`

**61 lines.** Recommendations route handler (POST).

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-084 | 3 | **CRITICAL** | `import * as Sentry from '@sentry/nextjs'` — direct import of a provider SDK. Per AGENTS.md §AI and §Provider Neutrality Rule: "Application code must not depend directly on provider SDKs." Sentry calls should go through the `logger` / observability adapter (`@/lib/observability/logger`), which should abstract the provider behind an internal interface. Currently the route bypasses the adapter and calls `Sentry.captureException(error)` at line 54 directly. |
| F-SA-B02-085 | 20–59 | OK | Handler is wrapped in `runWithRequestContext`. |
| F-SA-B02-086 | 30–31 | OK | `getCurrentSession()` with 401 on null. |
| F-SA-B02-087 | 37–47 | OK | Calls `getRecommendation` from `@reading-advantage/domain/ai` with `tenant: { schoolId: session.user.schoolId }`. Correct backend module usage. |
| F-SA-B02-088 | 51–57 | OK | Catch block handles `RateLimitError` (429), `AuthError` (401/403), and generic errors (500) with Sentry capture + structured logging + metrics. |
| F-SA-B02-089 | 61 | OK | `unstable_recommendationTestkit` — test support export. |

---

### File 20: `app/api/ai/recommendations/sentry-throw-in-route.test.ts`

**327 lines.** Phase 9 FR-1 Sentry capture test.

| ID | Line | Severity | Finding |
|----|------|----------|---------|
| F-SA-B02-090 | 71–83 | OK | `vi.hoisted` mock for Sentry SDK — correct use of `vi.hoisted` to define fns before `vi.mock` hoisting. |
| F-SA-B02-091 | 189–194 | OK | `getRecommendation` mock throws a forced error. |
| F-SA-B02-092 | 232–268 | OK | Core assertion: `captureExceptionMock` called exactly once with the correct Error instance. |
| F-SA-B02-093 | 270–286 | OK | Negative assertion: `captureMessage` is NOT called (guards against devs swapping the API). |
| F-SA-B02-094 | 288–326 | OK | Regression guard: the structured-logger error line (`ai.recommendation.error`) is still emitted alongside Sentry. |
| F-SA-B02-095 | All | OK | Well-structured test with clear RED/GREEN expectations in the header comment (lines 1–53). |

---

## Findings Summary (25 unique IDs)

### Critical

| ID | File | Line | Issue |
|----|------|------|-------|
| F-SA-B02-084 | 19 (route.ts) | 3 | **Direct Sentry SDK import** — violates AGENTS.md §Provider Neutrality Rule. All provider SDK calls must go through adapters. The `logger` observability adapter should abstract Sentry. |

### High

| ID | File | Line | Issue |
|----|------|------|-------|
| F-SA-B02-065 | 16 (otel-route-span.test.ts) | 120–127 | **Fragile dynamic zod mock** — `vi.mock(import('zod'), ...)` is a workaround for bun+vitest transform pipeline. Could break with zod version updates. |
| F-SA-B02-003/020/023 | 2, 7, 8 | Various | **getClassDetailWithCurriculum bypasses tenant-scoped DB** — uses raw `db` without `schoolId` filters. Mitigated by page-level ownership checks but creates latent cross-tenant data exposure risk if the function is reused without the page-level auth gate. |

### Medium

| ID | File | Line | Issue |
|----|------|------|-------|
| F-SA-B02-001/026 | 1, 9 | 1–18 | **No server-side auth** on analytics/student pages — delegation to client components without server-side auth gate. |
| F-SA-B02-009 | 4 (page.tsx) | 10 | **Missing class ownership check** in lesson preview page — `requireRole('TEACHER')` but no `teacherId === classDetail.teacherId` verification. |
| F-SA-B02-011/012 | 5 (preview.tsx) | 169, 188 | **Client-side internal API fetches without server-side class ownership verification** — API handlers must independently verify the requesting teacher owns the class. |
| F-SA-B02-030 | 11 (e2e.spec.ts) | 5 | **E2E test does not perform login** — navigates to `/signin` but does not supply credentials. Non-deterministic across environments. |
| F-SA-B02-031 | 11 (e2e.spec.ts) | 19+ | **Conditional assertion guards cause false passes** — `if (await widget.isVisible())` wraps assertions; feature toggle-off makes tests pass without verifying anything. |
| F-SA-B02-050 | 14 (route.integration.test.ts) | 652–718 | **Fragile `vi.doMock` pattern** in 413 test — necessary workaround for slow seeding but creates cleanup-ordering risk. |
| F-SA-B02-067 | 16 (otel-route-span.test.ts) | 284–318 | **Passthrough mock couples to domain function internals** — the mock mirrors `getRecommendation`'s `deps` parameter shape, creating a hidden contract dependency. |

### Low

| ID | File | Line | Issue |
|----|------|------|-------|
| F-SA-B02-002 | 1 | 1 | Missing JSDoc on exported page component. |
| F-SA-B02-007 | 3 (error.tsx) | 16 | Raw error object passed to client logger — could leak PII. |
| F-SA-B02-008 | 3 (error.tsx) | 22–25 | English-only error message in bilingual app. |
| F-SA-B02-010 | 4 (page.tsx) | 25 | Internal class ID exposed in UI. |
| F-SA-B02-014 | 5 (preview.tsx) | 198 | Silent catch on assignments fetch. |
| F-SA-B02-015 | 5 (preview.tsx) | 163–209 | No AbortController on fetch useEffect. |
| F-SA-B02-029 | 10 (classes/page.tsx) | 18 | `as unknown as UserContext` type-safety gap. |
| F-SA-B02-032/033 | 11 (e2e.spec.ts) | 198, 205 | `waitForTimeout` instead of deterministic wait. |
| F-SA-B02-035 | 11 (e2e.spec.ts) | 356–370 | Fragile keyboard tabbing loop. |
| F-SA-B02-038 | 12 (page.tsx) | 28 | Emoji in production UI. |
| F-SA-B02-046 | 14 (route.integration.test.ts) | 198–231 | Dead code (`seedAuditEvents` helper). |
| F-SA-B02-062 | 15 (route.ts) | 61–64 | Manual SubjectRef construction bypasses Zod discriminatedUnion. |
| F-SA-B02-076 | 17 (route.integration.test.ts) | 88–89 | Users seeded without `schoolId`. |

---

## Architecture Pattern Observations

### Golden Path ✓

- **Tenant-scoped DB via `createTenantDB`** — file 10 (classes/page.tsx) and file 12 (teacher/page.tsx) correctly use `createTenantDB(db, tenant)` and pass the scoped DB to domain functions.
- **Domain functions in `@reading-advantage/domain`** — file 15 (DSAR route) calls `exportSubjectData` from `@reading-advantage/domain/audit/dsar`; file 19 (recommendations route) calls `getRecommendation` from `@reading-advantage/domain/ai`.
- **Zod validation at external boundaries** — file 14/15 (DSAR), file 19 (recommendations) all use Zod schemas with `safeParse`.
- **`runWithRequestContext` wrapper** — files 15 and 19 wrap handlers for observability context propagation.
- **`requireAuth()` + ownership check** — files 2, 7, 8 use the correct pattern of auth-then-authorization.
- **Adapters for cross-cutting concerns** — `recordAuditEvent` from `@reading-advantage/auth` (file 15), `logger` from `@/lib/observability/logger` (file 19).

### Deviations 🚩

- **`getClassDetailWithCurriculum` bypasses `createTenantDB`** — files 2, 7, 8. The function uses raw `db` directly (in `get-class-detail.ts`) and does not inject `schoolId` filters. While page-level authorization prevents unauthorized access, the function itself has no tenant guard. This is a gap vs. the explicit pattern used in files 10 and 12.
- **Direct Sentry SDK import** — file 19 (route.ts). Violates the provider neutrality rule. The `logger` adapter should wrap Sentry internally.
- **Client components handle their own auth** — files 1 and 9 have no server-side auth check, relying on client components to enforce auth. This is a weaker security posture than sibling pages.
- **Mixed server-side/auth patterns** — file 4 uses `requireRole('TEACHER')` but skips class ownership verification, unlike files 2, 7, and 8.

---

## Limitations

1. **No runtime execution** — this review is static. Some findings (e.g., the Zod mock compatibility, race conditions in useEffect) could only be confirmed by running the tests.
2. **Dependency graph not fully traced** — `getClassDetailWithCurriculum`'s internals were reviewed, but the full chain of its callees and their tenant behavior was not audited beyond the file itself.
3. **Test execution not verified** — while test logic appears sound, actual pass/fail status at HEAD was not confirmed (some tests are intentionally RED per TDD phase comments).
4. **No i18n audit** — i18n coverage was noted (file 3 error boundary) but not systematically checked across all files.
5. **Coverage vs. acceptance** — this report identifies issues but does not assert acceptance or closeout of any track phases.

---

## Per-File Index

| # | File Path | Lines | Findings |
|---|-----------|-------|----------|
| 1 | `.../analytics/lessons/[lessonId]/page.tsx` | 18 | F-SA-B02-001, -002 |
| 2 | `.../analytics/page.tsx` | 75 | F-SA-B02-003, -004, -005 |
| 3 | `.../error.tsx` | 33 | F-SA-B02-006, -007, -008 |
| 4 | `.../lessons/[slug]/page.tsx` | 33 | F-SA-B02-009, -010 |
| 5 | `.../lessons/[slug]/teacher-lesson-preview.tsx` | 386 | F-SA-B02-011–018 |
| 6 | `.../loading.tsx` | 24 | F-SA-B02-019 |
| 7 | `.../page.tsx` | 114 | F-SA-B02-020, -021, -022 |
| 8 | `.../roster/page.tsx` | 71 | F-SA-B02-023, -024, -025 |
| 9 | `.../students/[studentId]/page.tsx` | 18 | F-SA-B02-026 |
| 10 | `.../classes/page.tsx` | 96 | F-SA-B02-027, -028, -029 |
| 11 | `.../page.e2e.spec.ts` | 373 | F-SA-B02-030–035 |
| 12 | `.../page.tsx` | 56 | F-SA-B02-036, -037, -038, -039 |
| 13 | `dsar-export-e2e.integration.test.ts` | 468 | F-SA-B02-040–045 |
| 14 | `route.integration.test.ts` | 719 | F-SA-B02-046–053 |
| 15 | `route.ts` | 142 | F-SA-B02-054–062 |
| 16 | `otel-route-span.test.ts` | 385 | F-SA-B02-063–069 |
| 17 | `route.integration.test.ts` | 376 | F-SA-B02-070–078 |
| 18 | `route.test.ts` | 271 | F-SA-B02-079–083 |
| 19 | `route.ts` | 61 | F-SA-B02-084–089 |
| 20 | `sentry-throw-in-route.test.ts` | 327 | F-SA-B02-090–095 |

---

End of report.
