# Line Review: sa-batch-05

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-05 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns

---

## Files Reviewed

1. `apps/science-advantage/app/api/students/[studentId]/gamification-profile/route.ts`
2. `apps/science-advantage/app/api/students/[studentId]/lessons/[lessonId]/analytics/route.integration.test.ts`
3. `apps/science-advantage/app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts`
4. `apps/science-advantage/app/api/students/[studentId]/lessons/[lessonId]/progress/route.integration.test.ts`
5. `apps/science-advantage/app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts`
6. `apps/science-advantage/app/api/students/[studentId]/mastery-profile/route.integration.test.ts`
7. `apps/science-advantage/app/api/students/[studentId]/mastery-profile/route.ts`
8. `apps/science-advantage/app/api/students/me/gamification/route.integration.test.ts`
9. `apps/science-advantage/app/api/students/me/gamification/route.ts`
10. `apps/science-advantage/app/api/teachers/classes/[classId]/intervention-alerts/route.integration.test.ts`
11. `apps/science-advantage/app/api/teachers/classes/[classId]/intervention-alerts/route.ts`
12. `apps/science-advantage/app/api/teachers/dashboard/route.integration.test.ts`
13. `apps/science-advantage/app/api/teachers/dashboard/route.ts`
14. `apps/science-advantage/app/globals.css`
15. `apps/science-advantage/app/layout.tsx`
16. `apps/science-advantage/app/page.tsx`
17. `apps/science-advantage/components.json`
18. `apps/science-advantage/components/client-logger.ts`
19. `apps/science-advantage/components/features/admin/admin-nav.tsx`
20. `apps/science-advantage/components/features/auth/dev-impersonation-panel.tsx`

---

## File-by-File Findings

### File 1: `gamification-profile/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 24–25 | Uses `getCurrentSession()` with manual `if (!session)` guard — consistent with the "soft fail" pattern in this batch. Correctly passes `session.user.schoolId` as tenant context. | OK | — |
| 28 | Calls domain function `getStudentGamificationProfile` with `user`, `tenant`, `input` — follows golden-path domain contract pattern. `tenant.schoolId` sourced from session. | OK | — |
| 32 | Catches `ValidationError` and returns `{ success: false, ...error.toJSON() }`. | OK | — |
| 30, 32, 33, 35 | **Inconsistent error response shape**: Returns `{ success: false, error: '…' }` on 401/403/500, but the domain success payload has no `success: true` wrapper (returns `{ xp, level, levelName, … }` directly). The `api-helpers.ts` provides `apiSuccess()`/`apiError()` helpers that standardise this, but they are not used. Routes 3 and 5 in this batch also differ (`analytics/route.ts` returns bare `{ error }`, `progress/route.ts` returns `{ error }` without `success: false`). | Medium | F-SA-B05-003 |

**Verdict**: Functionally correct. Response shape inconsistency is a codebase-wide pattern deviation, not isolated to this file.

---

### File 2: `analytics/route.integration.test.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 229–247 | **Fragile 401 test**: Uses `try/catch` to intercept `redirect()` throws. If no error is thrown, falls through to `expect(res.status).not.toBe(200)` — a weak assertion that passes for any non-200 status including 500 from unrelated bugs. The comment acknowledges the fragility. | Medium | F-SA-B05-004 |
| 249–261 | Correctly tests 404 for nonexistent student. | OK | — |
| 263–272 | Correctly tests 403 for non-owning teacher. | OK | — |
| 274–286 | Correctly tests 404 for nonexistent lesson. | OK | — |
| 288–319 | **Thorough attempt-history test**: checks ordering (newest-first), score, percentage, colorCode, per-question breakdown. | OK | — |
| 321–340 | **Standards-performance test**: verifies only most recent attempt counts, correct mastery percentage. | OK | — |
| 342–351 | Tests ADMIN bypass of teacher-ownership check. | OK | — |
| 51–64 | `seedUser` does not set `schoolId` on `users`. Since `users` is FLAT in the tenant registry, TenantDB auto-injects `eq(users.schoolId, tenant.schoolId)`. With `schoolId` null, `tenant.schoolId` (from `session.user.schoolId`) would also be null (line 28 of route.ts), causing TenantDB to skip tenant scoping entirely. Tests still pass because the TenantDB warning path bypasses scoping on null schoolId. | Low | F-SA-B05-014 |

**Verdict**: Good coverage (7 cases). One fragile auth test. Missing schoolId on seeded users weakens tenant-scope test coverage.

---

### File 3: `analytics/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 25 | Uses `requireAuth()` (redirect on failure) — consistent with the "hard fail" pattern. Domain call at L28 follows contract. | OK | — |
| 28 | Correctly passes `user`, `tenant`, `input`. | OK | — |
| 32–38 | Catches `ValidationError`, `AuthError`, and specific error string messages. Note: The catch for `Student not found` / `Unauthorized` / `Lesson not found` uses shallow string comparison at L34–38. These strings are implementation details of the domain function — fragile if error messages change. | Low | — |
| 39–40 | **Inconsistent error response shape**: Returns `{ error: '…' }` without `success: false` wrapper, unlike `gamification-profile/route.ts` which wraps in `{ success: false, error: '…' }`. No `success: true` on success payload either. | Medium | F-SA-B05-003 |
| 32 | Uses `error.toJSON()` directly (from `ValidationError`) rather than wrapping in `{ success: false, ... }`. The error shape differs from how `gamification-profile/route.ts` and `mastery-profile/route.ts` format error responses. | Low | — |

**Verdict**: Correct routing logic. Error-handling inconsistency persists across routes in this batch.

---

### File 4: `progress/route.integration.test.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 175–187 | **Bug: `"me"` alias test expects 200 but route validation rejects `"me"`.** The route calls `parsePath(await context.params, studentIdLessonIdParamSchema)` where the schema requires `z.string().uuid()` for `studentId`. The string `"me"` is not a UUID, so `parsePath` throws `ValidationError` → route returns 400. The test asserts 200. Either the schema should accept `"me"` (`z.string().min(1)`) or the route should intercept `"me"` before validation. | **Critical** | F-SA-B05-001 |
| 189–197 | Student viewing own progress by explicit ID — correct, uses enrolled student's UUID. | OK | — |
| 199–230 | Teacher viewing student in their class, with full completion data — thorough, covers all fields. | OK | — |
| 232–241 | Other-teacher 403 test — correct. | OK | — |
| 243–251 | Other-student 403 test — correct. | OK | — |
| 141–147 | 401 test uses `NextRequest` and checks `res.status` directly — better pattern than the `try/catch` in File 2's 401 test. | OK | — |
| 48–49, 51 | `seedUser` does not set `schoolId`. Same tenant-scope concern as File 2. Different from File 2: this test does set `TEST_SCHOOL_ID` on classes, lessons, and completions. | Low | F-SA-B05-014 |
| 128 | Inserts `schools` with `onConflictDoNothing()` — correct singleton pattern. | OK | — |

**Verdict**: Strong coverage (10 cases). One **critical** bug: the `"me"` alias cannot work because the path-param schema is too strict.

---

### File 5: `progress/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 24–25 | Uses `getCurrentSession()` with manual auth check. | OK | — |
| 27 | `parsePath` with `studentIdLessonIdParamSchema` — **this is the root cause of F-SA-B05-001**. The schema enforces UUID for `studentId` but the domain function expects `"me"` to be accepted as an alias. | **Critical** | F-SA-B05-001 |
| 28 | Domain call follows contract. | OK | — |
| 32–37 | Error handling catches `AuthError`, `ValidationError`, and specific string messages. Same fragility concern about string matching as File 3. | Low | — |
| 35 | Uses `error.message === 'Student not found'` — fragile string match. | Low | — |

**Verdict**: Functional aside from the `"me"` schema mismatch. Error handling uses string matching on domain error messages, which is brittle.

---

### File 6: `mastery-profile/route.integration.test.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 395–408 | **Bug: test expects 200 for `limit=300` but schema.max(100) would reject it.** The test name says "rejects limit values above 200" (200, not 100), the comment says "limit is clamped to max; should succeed", and the assertion expects 200. However, `masteryQuerySchema` has `z.coerce.number().int().min(1).max(100)`, which would **reject** 300 with a 400 `ValidationError`. Three inconsistencies: (a) test name mentions 200 but max is 100, (b) test expects 200 but schema would return 400, (c) comment claims clamping but Zod `.max()` is strict rejection, not clamping. | **Critical** | F-SA-B05-002 |
| 162–172 | 401 test — clean, checks both status and error body. | OK | — |
| 174–189 | Student viewing own profile — correct. | OK | — |
| 191–205 | Cross-student access denied — correct 403. | OK | — |
| 207–222 | READY status test — correct. | OK | — |
| 224–268 | CALCULATING status test with `scienceMasteryRuns` — thorough. | OK | — |
| 270–292 | Strand grouping and weakest-first sort — thorough, checks numeric precision. | OK | — |
| 294–326 | Mastery labels and color tokens — thorough boundary test. | OK | — |
| 328–355 | Required fields on standard records — good schema contract test. | OK | — |
| 357–393 | Cursor pagination — correct two-page iteration. | OK | — |
| 410–426 | Strand filter — correct. | OK | — |
| 428–443 | Empty strand filter — correct. | OK | — |
| 445–471 | `aiAnnotation` conditional inclusion — thorough. | OK | — |
| 473–488 | Empty mastery records — correct. | OK | — |
| 32–47 | Cleanup uses `sql` DELETE for standards (by description) — standard pattern. | OK | — |

**Verdict**: Excellent coverage (14 test cases). One **critical** mismatch between schema and test. Clean setup/teardown patterns.

---

### File 7: `mastery-profile/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 12–19 | `masteryQuerySchema` defines `.max(100)` for `limit`. This is the source of F-SA-B05-002 — the schema rejects values >100, which contradicts the test's expectation that values are clamped. | **Critical** | F-SA-B05-002 |
| 35–36 | Uses `getCurrentSession()` + manual check. | OK | — |
| 39 | `parseQuery` with Zod `masteryQuerySchema` — good golden-path use of `parseQuery`. | OK | — |
| 41–51 | Domain call passes correctly structured input including `includeRecommendations` boolean (coerced from string via `.transform`). | OK | — |
| 55 | Error response includes `{ success: false, ...error.toJSON() }` — consistent with file 1, inconsistent with files 3 and 5. | Medium | F-SA-B05-003 |
| 57 | Catches `Student not found` by string — same fragility as files 3 and 5. | Low | — |

**Verdict**: Good route structure. The `masteryQuerySchema` clamp behavior and test expectation are misaligned.

---

### File 8: `students/me/gamification/route.integration.test.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 63–68 | 401 test — clean, checks status and body. | OK | — |
| 70–77 | 403 for non-STUDENT role — correct (route uses `getCurrentSession()`, domain uses `assertCan` with `gamification:read:own`). | OK | — |
| 79–88 | 404 when no profile — correct. | OK | — |
| 90–131 | Main success case — tests XP, level, streak, levelName, xpProgress (with precise math), totalAchievements, recentAchievements (3 of 4, newest-first). Thorough. | OK | — |
| 133–156 | Edge case: level beyond last threshold — 100% progress, zero ranges. Correct. | OK | — |
| 35–51 | `seedUser` does not set `schoolId`. Same tenant-scope gap. | Low | F-SA-B05-014 |
| 60 | Inserts `schools` with `onConflictDoNothing()` — correct. | OK | — |

**Verdict**: Solid coverage (6 cases). No bugs found in test logic.

---

### File 9: `students/me/gamification/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 15 | `_request?: NextRequest` — optional parameter. The route exports `GET()` with no args, and the test calls `await GET()`. This works because Next.js Route Handlers can receive zero args. However, `_request` is used at L17 in `_request?.url ?? '/api/students/me/gamification'` to populate the trace route name. The fallback is good. | OK | — |
| 23–24 | Uses `getCurrentSession()` with manual auth check. | OK | — |
| 26 | Domain call is minimal (no `input` param, just `user` and `tenant`). | OK | — |
| 30–31 | Error handling catches `AuthError` and specific `Gamification profile not found` message. | OK | — |
| 33 | Catch-all logger error — correct. | OK | — |

**Verdict**: Clean, minimal route. No issues.

---

### File 10: `intervention-alerts/route.integration.test.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 127–130 | 401 test — clean. | OK | — |
| 132–139 | 404 for nonexistent class — correct. | OK | — |
| 141–157 | 403 for non-owner teacher — correct. | OK | — |
| 159–173 | Empty alerts for class with no students — correct. | OK | — |
| 175–205 | Empty alerts when all mastery >= 0.6 — correct, checks `refresh: true`. | OK | — |
| 207–286 | Alerts sorted by score (highest first), critical vs. warning severity — thorough, seed 2 students with different mastery patterns. | OK | — |
| 288–331 | `masteryFilterLevel` threshold (>= 0.6 filtered out) — thorough edge case. | OK | — |
| 333–387 | **Tenant scoping test**: verifies students enrolled in other teachers' classes are excluded. Strong security test. | OK | — |
| 389–459 | Severity query filter — correct. | OK | — |
| 461–471 | ADMIN bypass — correct. | OK | — |
| 46 | `interventionCache.clear()` in cleanup — good practice for test isolation. | OK | — |
| 49–67 | `seedUser` does not set `schoolId`. Same tenant-scope gap. | Low | F-SA-B05-014 |

**Verdict**: Excellent coverage (10 cases). The tenant-scoping test (lines 333–387) is a standout — explicitly verifies that data leaks across class boundaries are prevented.

---

### File 11: `intervention-alerts/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 17–23 | `querySchema` defines rich filtering: `limit`, `severity`, `cursor`, `since`, `refresh`. All properly transformed. | OK | — |
| 25–34 | `cfg` object constructed with `as Parameters<typeof listAlerts>[0]['deps']` — provides runtime dependency injection for caching and detection. Good pattern. However, the object is not validated at runtime — a misconfiguration (e.g., `maxLimit: 0`) would surface as a runtime error inside `listAlerts` without clear attribution. | Low | F-SA-B05-007 |
| 51–52 | Uses `getCurrentSession()` with manual check. | OK | — |
| 53–55 | `parsePath` + `parseQuery` — correct. | OK | — |
| 55 | Domain call passes `deps: cfg` for dependency injection. | OK | — |
| 57–59 | Metrics observation and increment — good observability. | OK | — |
| 60–62 | Response includes `cache-control` header and `x-alert-trace-id`. | OK | — |
| 67 | Metrics on error — good. Error log at same line as metrics. | OK | — |

**Verdict**: Well-structured route with dependency injection, caching, metrics, and observability. Best-in-batch pattern.

---

### File 12: `dashboard/route.integration.test.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 132–143 | 401 test — uses fragile `try/catch` pattern (same as File 2). Weak fallback assertion. | Medium | F-SA-B05-004 |
| 145–160 | Student access returns non-2xx — correct (uses `requireRole('TEACHER')` which redirects). | OK | — |
| 162–175 | Empty dashboard for teacher with no classes — correct | OK | — |
| 177–242 | Class progress with completion rate, average score, active students — thorough, checks numeric precision. | OK | — |
| 244–291 | Students needing attention (mastery < 0.6) — correct. | OK | — |
| 293–332 | Zero attention when all mastery >= 0.6 — correct. | OK | — |
| 334–378 | **Tenant scoping**: ignores students in other teacher's classes. Strong security test. | OK | — |
| 380–441 | Recent completions sorted by date, with name/lesson/score — correct. | OK | — |
| 444–481 | Recent completions limited to 5 — correct. | OK | — |
| 483–501 | Zero rates for empty class — correct. | OK | — |
| 503–536 | Multi-class aggregation — correct. | OK | — |
| 51–68 | `seedUser` does not set `schoolId`. Same tenant-scope gap. | Low | F-SA-B05-014 |

**Verdict**: Comprehensive (11 test cases). Tenant-scoping test (lines 334–378) is a highlight. The 401 test fragility is a known codebase pattern.

---

### File 13: `dashboard/route.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 22 | Uses `requireRole('TEACHER')` — this checks both authentication and role in one call. Prevents non-TEACHER roles from accessing the endpoint. | OK | — |
| 24 | Domain call passes `user`, `tenant`. Minimal, clean interface. | OK | — |
| 28 | Catches `AuthError`. | OK | — |
| 29 | Catches `message === 'Unauthorized'` by string. | Low | — |
| 30 | Logs on generic error. | OK | — |
| 13 | `_req: NextRequest` — parameter is unused beyond the route URL for context. The `_` prefix correctly signals intentional disuse. | OK | — |

**Verdict**: Minimal, correct route. `requireRole` pattern is the right choice for teacher-only endpoints.

---

### File 14: `globals.css`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–331 | Well-organized: `@import tailwindcss` + `tw-animate-css`, `@theme inline` for CSS variable mapping, `:root` and `.dark` for light/dark themes, `@layer base`, `@layer components` with `.edu-*` utility classes, keyframe animations, `@media (prefers-reduced-motion: reduce)` for accessibility. | OK | — |
| 6–44, 142–184 | **Duplicate `@theme inline` block**: Lines 6–44 define `--color-*`, `--font-*`, `--radius-*` and lines 142–184 redefine the exact same set. Since both map to `var(--*)` CSS custom properties that are already defined in `:root` / `.dark`, the duplication is functionally harmless but creates a maintenance hazard — if one block is updated without the other, values can diverge. The second block also has slightly different ordering and formatting than the first. | Low | F-SA-B05-009 |
| 79–81, 127–129 | `--font-sans`, `--font-serif`, `--font-mono` defined as CSS values referencing Google Font families. The Next.js `layout.tsx` uses `Geist` and `Geist_Mono` from `next/font/google`, which inject different `--font-geist-sans` / `--font-geist-mono` CSS variables. At runtime, the `font-sans` class utility would use the `DM Sans` fallback rather than `Geist`. This is a CSS–font discrepancy. | Low | — |
| 272–274 | `.xp-progress-fill` uses a raw `transition` declaration instead of `@apply`. Minor pattern inconsistency within the same `@layer components` block. | Low | — |

**Verdict**: Well-structured theme. Duplicate `@theme inline` is the main maintenance concern.

---

### File 15: `layout.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 9–17 | Uses `Geist` and `Geist_Mono` fonts from `next/font/google` — correct approach for Next.js font optimization with CSS variable injection. | OK | — |
| 42–74 | Root layout structure: wraps in `<ThemeProvider>`, `<AuthProvider>`, `<Toaster>`. Standard shadcn/Next.js pattern. | OK | — |
| 50–55 | **Hardcoded Umami analytics script**: Inlines a `<script>` tag pointing to `cloud.umami.is` with a hardcoded `data-website-id`. This violates the AGENTS.md adapter rule: "external service integrations should go through adapter layers." Analytics should go through an internal adapter (`analytics.track()` or similar) not a direct third-party script embed. Also: (a) the comment "Replace this with your own analytics script" at L50 acknowledges this is a placeholder but hardcodes a specific SaaS provider; (b) there is no feature-flag or environment gate — it runs in all environments including production; (c) it fires on every page load for all visitors, which could have GDPR implications without consent management. | Medium | F-SA-B05-010 |
| 61–71 | `<AuthProvider>` wraps children — correct for providing auth context to client components. | OK | — |

**Verdict**: Solid layout structure. The hardcoded analytics script is the main architecture concern.

---

### File 16: `page.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–716 | Marketing landing page with hero, features, target audience, technical requirements, CTA, and footer. Pure presentation — no business logic. | OK | — |
| 22 | Uses `getSession()` from `@/lib/auth/server` to check if user is logged in for nav rendering — correct. | OK | — |
| 44 | Uses `session.user.role.toLowerCase()` in the dashboard link href — this is safe because all known roles (`STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`) are lowercase-able without special characters. Minor concern if future roles contain non-ASCII characters. | Low | — |
| 94–107, 579–592 | "Join Waitlist" and "Request Demo" buttons have no `onClick` handler and are not wrapped in `<form>` elements — they are presentational only. This is acceptable for an MVP marketing page but would cause confusion if users click expecting an action. | Low | F-SA-B05-012 |

**Verdict**: Standard marketing page. No functional issues, but the CTA buttons are decorative.

---

### File 17: `components.json`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–21 | Standard shadcn/ui configuration file. Style `"new-york"`, RSC enabled, component paths correctly aliased. | OK | — |
| 20 | `"iconLibrary": "lucide"` — declares Lucide as the icon library. However, the actual codebase extensively uses `@tabler/icons-react` (e.g., `page.tsx` imports `IconChevronRight`, `IconBook`, etc. from `@tabler/icons-react`; `admin-nav.tsx` uses no icons). The runtime `shadcn/ui` CLI and `@radix-ui/react-icons` subset work fine, but this misconfiguration may confuse automated tooling that reads `components.json` to decide which icon set to suggest. | Low | F-SA-B05-011 |

**Verdict**: Standard config. Icon library declaration mismatches actual usage.

---

### File 18: `client-logger.ts`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–21 | Simple client-side logging module that silences ALL console output in production (`NODE_ENV === 'production'`). | Low | F-SA-B05-005 |
| 3–5, 8–10, 13–15, 18–20 | Each function checks `NODE_ENV` and returns early in production. This means production errors on the client are invisible — no network delivery to an observability backend, no fallback storage. The AGENTS.md specifies that observability is "a first-class concern" and that structured logging should be used. This file provides structured event names but drops them in production. A production-grade client logger should be sending events to an observability endpoint regardless of environment. | Medium | F-SA-B05-005 |
| 5, 10, 15, 20 | Uses raw `console.*` — the AGENTS.md says "avoid free-form console logging in production code" and the `lib/observability/logger.ts` server logger exists. This client-side logger is architecturally inconsistent with the server-side approach and provides no production value. | Low | — |

**Verdict**: Works for development debugging. No production utility. Should route to an observability endpoint or be removed from production builds.

---

### File 19: `admin-nav.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1 | `'use client'` — required because it uses `usePathname()`. | OK | — |
| 7–11 | Hardcoded `NAV_ITEMS` with three entries. Simple and maintainable. | OK | — |
| 24 | `pathname === item.href` — exact match only. This means the "Dashboard" link won't be highlighted on `/admin/settings` (if such a route exists) or any sub-route. For a nav with only top-level entries, this is acceptable, but it would fail for nested routes. | Low | F-SA-B05-008 |
| 22–27 | Uses `cn()` utility for conditional class merging — correct shadcn pattern. | OK | — |

**Verdict**: Simple, correct. Exact-match highlighting is a limitation for nested routes.

---

### File 20: `dev-impersonation-panel.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 48 | Component renders unconditionally — there is no `process.env.DEV_AUTH_ENABLED` or similar check to hide this component in production. The server-side `handleImpersonate` function gates the actual impersonation, so this is not a security vulnerability. However, production users will see a non-functional "Dev Impersonation" UI with demo user options. | Low | F-SA-B05-006 |
| 60–64 | Sends a POST to `/api/auth/impersonate` with the selected `userId`. The endpoint delegates to `@reading-advantage/api/routes/auth` which applies the `DEV_AUTH_ENABLED` gate server-side. The security boundary is properly maintained. | OK | — |
| 79 | Uses `border-amber-200 bg-amber-50` styling to visually distinguish as "development" UI. Good visual affordance. | OK | — |
| 21–46 | `DEMO_USERS` array is hardcoded with well-known demo user IDs (`student-1`, `teacher-1`, etc.). If these user IDs ever change in the seed data, the panel would silently fail. | Low | — |

**Verdict**: Properly secured behind the server-side `DEV_AUTH_ENABLED` gate. The unconditional rendering is a UX concern, not a security one.

---

## Summary of Findings

### Critical (must fix)

| ID | File | Description |
|----|------|-------------|
| F-SA-B05-001 | `progress/route.ts` + `progress/route.integration.test.ts` | `studentIdLessonIdParamSchema` requires UUID for `studentId` but the domain function and test expect `"me"` to be accepted. The `parsePath` call rejects `"me"` with 400; the test expects 200. Either the schema must use `z.string().min(1)` or the route must intercept `"me"` before validation. |
| F-SA-B05-002 | `mastery-profile/route.ts` + `mastery-profile/route.integration.test.ts` | `masteryQuerySchema` defines `limit: z.coerce.number().int().max(100)` but the test (line 395) passes 300 and expects 200. The test name says "above 200", comment says "clamped to max", but Zod `.max()` rejects, it does not clamp. The test assertion (200) contradicts the schema (400). |

### Medium

| ID | File | Description |
|----|------|-------------|
| F-SA-B05-003 | Multiple routes | Inconsistent error-response shape across the batch: `gamification-profile/route.ts` and `mastery-profile/route.ts` use `{ success: false, error: '…' }` while `analytics/route.ts` and `progress/route.ts` return bare `{ error: '…' }`. No route uses the `apiSuccess()`/`apiError()` helpers from `lib/api-helpers.ts`. The inconsistency creates an unpredictable API surface for clients. |
| F-SA-B05-004 | `analytics/route.integration.test.ts` (L229), `dashboard/route.integration.test.ts` (L132) | 401 tests use fragile `try/catch` to catch `redirect()` throws, with a weak fallback `expect(res.status).not.toBe(200)` that passes for any non-200 status. |
| F-SA-B05-005 | `client-logger.ts` | Silences all console output in production. Client-side errors become invisible. No adapter-pattern integration with an observability backend. |
| F-SA-B05-010 | `layout.tsx` (L50–55) | Hardcoded Umami analytics script tag. Bypasses the AGENTS.md adapter rule for external services. No environment gating, no consent management. |

### Low

| ID | File | Description |
|----|------|-------------|
| F-SA-B05-006 | `dev-impersonation-panel.tsx` | Panel renders unconditionally in production. Server-gated, so not a vulnerability, but confusing for production users. |
| F-SA-B05-007 | `intervention-alerts/route.ts` | `cfg` dependency-injection object has no runtime validation structure; misconfigurations surface as opaque runtime errors. |
| F-SA-B05-008 | `admin-nav.tsx` | Exact-match pathname highlighting breaks for nested routes. |
| F-SA-B05-009 | `globals.css` | Duplicate `@theme inline` blocks (L6–44 and L142–184) with same variable set — maintenance hazard if one diverges. |
| F-SA-B05-011 | `components.json` | Declares `"iconLibrary": "lucide"` but codebase uses `@tabler/icons-react` — may confuse shadcn CLI tooling. |
| F-SA-B05-012 | `page.tsx` | CTA buttons ("Join Waitlist", "Request Demo") are presentational with no event handlers or form actions. |
| F-SA-B05-013 | Domain (cross-file) | `getStudentGamificationProfile` auto-creates profiles on read; `getMyGamification` throws 404. The inconsistency is intentional but undocumented. |
| F-SA-B05-014 | Integration tests | Several test files (`analytics`, `progress`, `intervention-alerts`, `dashboard`, `gamification`) seed users without `schoolId`. Since `users` is FLAT in the tenant registry and `session.user.schoolId` becomes null/undefined, the TenantDB warning path disables tenant scoping entirely. Tests still pass (queries are unscoped), but this weakens tenant-scope test coverage. |

---

## Strengths Observed

1. **Domain-function contract**: All 8 API routes follow the golden-path pattern — call a domain function with `{ user, tenant, input }`. The domain functions handle authorization via `assertCan()`, not the routes.

2. **Tenant scoping**: The TenantDB abstraction is consistently applied. Domain functions create a `tenantDb` via `createTenantDB(db, tenant)`, which automatically injects `schoolId` filters. The `intervention-alerts` route explicitly tests boundary enforcement (students from other classes excluded).

3. **Input validation**: Every route uses `parsePath` / `parseQuery` with Zod schemas at the API boundary. This satisfies the AGENTS.md requirement for "runtime validation at all external boundaries."

4. **Observability**: Routes consistently wrap handlers in `runWithRequestContext()` and use structured logger events. The `intervention-alerts` route adds metrics counters and histograms.

5. **Test coverage**: Integration tests are thorough and well-structured. Standouts: `mastery-profile` (14 cases), `dashboard` (11 cases), `intervention-alerts` (10 cases). Tests for tenant isolation, ADMIN bypass, edge cases (empty states, boundary thresholds), and pagination are all present.

6. **Dependency injection**: The `intervention-alerts` route injects caching and detection dependencies through a `deps` object — a clean pattern for testability.

---

## Limitations

- **No unit tests for route files themselves**: The `.route.integration.test.ts` files test the full `GET` export with a real database but there are no `.route.test.ts` files for pure unit tests with mocked DB. This is acceptable given the integration-first testing strategy documented in `AGENTS.md`.
- **No rate-limit or CSRF protection observed**: These route handlers accept requests without CSRF tokens or rate-limit checks. The AGENTS.md recommends both for production endpoints. This may be handled at the middleware level (not in batch scope).
- **No audit event emission**: Per AGENTS.md, "Security-sensitive actions should create audit events." The routes in this batch are read-only (`GET`) endpoints — audit events may be more relevant for write operations not included in this batch.
- **`requireAuth()` vs `getCurrentSession()` patterns**: The codebase is split between two auth-check patterns. `requireAuth()` throws/redirects (used by `analytics/route.ts` and `dashboard/route.ts`); `getCurrentSession()` returns null (used by the other 6 routes). Both are valid, but the inconsistency means different routes behave differently on auth failure (redirect vs 401 JSON), which can confuse API consumers.

---

## Batch-Level Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 20/20 |
| Route files | 8 (files 1, 3, 5, 7, 9, 11, 13) + 1 delegate (file 20 POST) |
| Integration test files | 6 (files 2, 4, 6, 8, 10, 12) |
| Config/CSS/component files | 5 (files 14, 15, 16, 17, 18, 19) |
| Critical findings | 2 (F-SA-B05-001, F-SA-B05-002) |
| Medium findings | 4 (F-SA-B05-003, F-SA-B05-004, F-SA-B05-005, F-SA-B05-010) |
| Low findings | 8 (F-SA-B05-006, F-SA-B05-007, F-SA-B05-008, F-SA-B05-009, F-SA-B05-011, F-SA-B05-012, F-SA-B05-013, F-SA-B05-014) |
| Total findings | 14 |

---

*End of batch report. No acceptance or closeout claims are made in this document.*
