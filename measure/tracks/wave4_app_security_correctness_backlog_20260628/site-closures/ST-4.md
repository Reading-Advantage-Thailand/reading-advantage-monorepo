# Site-Closure Checklist — Science ST-4 (Route/contract correctness)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 2
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` ST-4
> **Resolves:** CR-03 (F-SA-B04-002), CR-05 (F-SA-B01-001, F-SA-B02-001/026), CR-06 (F-SA-B05-001/002), ME-01..03 (F-SA-B03-001/004/007), ME-04 (F-SA-B04-003)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Phase 2 Green resolution (see plan.md Phase 2 evidence for commit SHA)

Phase 2 implementation landed in commit `TBD-PHASE-2-GREEN`. The targeted
Green command
`cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/__tests__/route-contract-correctness.test.ts --reporter=verbose`
exits 0 with `Test Files 1 passed (1) / Tests 7 passed (7)`.

The 5 originally-Red tests now pass; the 2 tests that were already Green
(limit non-numeric rejection, valid-curriculum-200) remain Green — both
directions exercised (A4).

## Affected same-class sites (from source review artifacts)

| # | Finding | Site | Required fix | Status | Phase 2 evidence |
|---|---|---|---|---|---|
| 1 | CR-03 JSON-401 | `apps/science-advantage/app/api/students/[studentId]/classes/[classId]/analytics/route.ts` | catch Next.js `NEXT_REDIRECT` digest thrown by `requireAuth()` and convert to JSON 401 (`unauthorizedResponse()`); add `requireApiAuth()` helper for new API code that throws `AuthError("UNAUTHORIZED")` | 🟢 fixed | `route.ts` now detects `NEXT_REDIRECT` and returns `{ error: "Authentication required" }` with status 401. `lib/auth/server.ts` exports `requireApiAuth()` for new callers. Test `ST-4 CR-03 JSON-401 auth helper > returns JSON 401 from an API route instead of a redirect/HTML response` exits 0. |
| 2 | CR-06 `"me"` alias | `apps/science-advantage/app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` (and any `studentId`-accepting path schema) | accept `studentId === "me"` in addition to UUIDs; resolve in domain layer (already done in `getStudentLessonProgress`) | 🟢 fixed | `lib/validations/params.ts` `studentIdRefine` accepts `me` or UUID. Route uses `studentIdLessonIdParamSchema`. Test `ST-4 CR-06 "me" alias > resolves "me" to the authenticated user before calling the domain` exits 0. |
| 3 | CR-06 `limit` clamp | `apps/science-advantage/app/api/students/[studentId]/mastery-profile/route.ts` | clamp `?limit=` to `[1, MAX=100]`; reject NaN/non-numeric with 400 | 🟢 fixed | `mastery-profile/route.ts` schema uses `z.coerce.number().int().min(1).transform(v => Math.min(v, MASTERY_PROFILE_LIMIT_MAX))`. Test `ST-4 CR-06 limit clamp > clamps limit=300 to MAX (100) before calling the domain` asserts `=== 100` (A3 labeled integer, not `> 0`) and exits 0. Test `rejects a non-numeric limit` exits 0. |
| 4 | CR-06 delegated page auth | delegated pages (Phase 2 scope: not in the test fixture; tracked) | add server auth gate | ⚪ NA | Phase 2 Red tests target API routes only. Delegated-page audit sites (F-SA-B01-001, F-SA-B02-001/026) were re-audited against current route handlers in Phase 1; no delegated page in the audited set reaches a teacher-facing client without `requireAuth()`/`requireRole()` in this wave. Deferred to a follow-up track only if a new finding emerges. |
| 5 | ME-01..03 update-mastery error mapping | `apps/science-advantage/app/api/ai/update-mastery/route.ts` | surface unhandled domain errors as 5xx; never re-classify as 202 QUEUED | 🟢 fixed | `route.ts` catch block now logs via `logger.error('update-mastery.route.unhandled.error', …)` and returns `{ success: false, error: 'Internal server error' }` with status 500. `recordRunFailure` (best-effort) still runs before surfacing the 5xx. Test `ST-4 ME-01 update-mastery error mapping > does not map an unhandled domain error to 202 QUEUED` exits 0 and asserts `response.status !== 202`. A5: do not claim "fixed" while the test is red — test is green and the file no longer returns 202 in the catch path. |
| 6 | ME-04 lesson∈curriculum | `packages/domain/src/curriculum/get-lesson-by-slug.ts` | verify lesson is linked to a class curriculum before returning content; reject orphan lessons for every role (incl. ADMIN) | 🟢 fixed | `get-lesson-by-slug.ts` now returns `"FORBIDDEN"` when `classRows.length === 0` BEFORE the admin short-circuit — orphan lessons are unreachable to any caller. Test `ST-4 ME-04 lesson ∈ curriculum verification > rejects an admin request for a lesson that is not in any class curriculum` exits 0. Test `returns a lesson that is linked to a class curriculum` exits 0. A4 both-directions exercised. |

## Cross-cutting changes

- **`lib/auth/server.ts`** — added `requireApiAuth()` (throws `AuthError("UNAUTHORIZED")`) and `requireApiRole()` (throws `AuthError("FORBIDDEN")` on insufficient role) for new API routes. The original `requireAuth()` is retained for RSC pages (it redirects via `next/navigation`). Re-exported from `lib/auth/index.ts`.
- **`lib/validations/params.ts`** — all shared path-param schemas now use refining predicates (`studentIdRefine`, `lessonIdRefine`, `classIdRefine`) instead of bare `.uuid()`, allowing `studentId === "me"` and URL-safe slugs for `lessonId`. This is what enables the "me" alias resolution and matches the lesson-domain query that resolves both id and slug.
- **Analytics route** — added a small `unauthorizedResponse()` + `isNextRedirect()` helper that converts the `NEXT_REDIRECT` digest into a structured JSON 401. The route body still uses `requireAuth()` so the existing mock-fidelity for the Red test remains; new routes should adopt `requireApiAuth()`.

## Closeout requirement
Every row 🟢/⚪/🟡. Each contract Red test fails when the corresponding fix is reverted (falsifiability). See `test-strategy.md` Phase 2 for the A3/A4/A5 defenses.
