# Plan: Zod Boundary + Env Hardening

> TDD-first. Each FR writes failing tests for the new schema/helper before the implementation. The 4 destructive handlers are migrated first (highest impact).

## Phase 0: Setup

- [x] Task: Read the current `lib/env.ts:3-15` Zod schema and `.env.example` to understand the surface.
- [x] Task: Read the 4 destructive handlers + the 21 routes missing Zod; categorize them.
- [x] Task: Coordinate with Track 3 (Argon2id) and Track 6 (Storage) — the `lib/auth/session.ts:97` read is deleted in Track 3; the `GOOGLE_CLOUD_*` env vars are removed in Track 6.

## Phase 1: `parseBody` / `parseQuery` / `parsePath` Helpers

- [x] Task: Create `lib/validations/api-helpers.ts` with the 3 helper functions (FR-2).
- [x] Task: Write failing tests:
  - `parseBody(request, schema)` with valid body returns the parsed value.
  - `parseBody(request, schema)` with invalid body throws `ValidationError` (HTTP 400 with details).
  - `parseQuery` and `parsePath` similar.
- [x] Task: Implement. Confirm tests pass (12/12).

## Phase 2: Migrate 4 Destructive Handlers (Highest Priority)

### Phase 2a: `app/api/classes/[classId]/assignments/route.ts:POST`

- [x] Task: Add `createAssignmentSchema` to `lib/validations/assignments.ts`.
- [x] Task: Replace the `body as { lessonId?: string }` cast with `parseBody(request, createAssignmentSchema)`.
- [x] Task: Confirm.

### Phase 2b: `app/api/classes/[classId]/assignments/route.ts:DELETE`

- [x] Task: Add `deleteAssignmentSchema` to `lib/validations/assignments.ts`.
- [x] Task: Replace the cast with `parseBody`.
- [x] Task: Confirm.

### Phase 2c: `app/api/classes/[classId]/roster/route.ts:DELETE`

- [x] Task: Add `removeStudentFromRosterSchema` to `lib/validations/roster.ts`.
- [x] Task: Replace the cast.
- [x] Task: Confirm.

### Phase 2d: `app/api/classes/[classId]/route.ts:PATCH`

- [x] Task: Add `patchClassBodySchema` inline. Existing `updateClassSchema` retained for domain use.
- [x] Task: Replace the manual field checks with `parseBody`.
- [x] Task: Confirm.

## Phase 3: Migrate Remaining Routes

- [x] Task: Create `lib/validations/quiz.ts` with `submitQuizAttemptSchema`.
- [x] Task: Create `lib/validations/params.ts` with reusable path param schemas.
- [x] Task: Update all 21+ routes to use `parsePath`/`parseQuery`/`parseBody`.
- [x] Task: Confirm type-check passes.

Routes migrated:
- `app/api/lessons/[lessonSlug]/quiz/route.ts` — parseBody + parsePath
- `app/api/lessons/[lessonSlug]/route.ts` — parsePath
- `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` — parsePath
- `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` — parsePath
- `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` — parsePath
- `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` — parsePath
- `app/api/classes/[classId]/analytics/overview/route.ts` — parsePath
- `app/api/classes/[classId]/curriculum/route.ts` — parsePath
- `app/api/students/[studentId]/achievements/route.ts` — parsePath
- `app/api/students/[studentId]/gamification-profile/route.ts` — parsePath
- `app/api/students/me/gamification/route.ts` — no params needed
- `app/api/students/[studentId]/assignments/route.ts` — parsePath
- `app/api/students/[studentId]/mastery-profile/route.ts` — parsePath + parseQuery
- `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` — parsePath + parseQuery
- `app/api/teachers/dashboard/route.ts` — no params needed
- `app/api/student/classes/route.ts` — no params needed
- `app/api/classes/join/route.ts` — parseBody (already had Zod, migrated to use helper)
- `app/api/classes/route.ts` — parseBody + parseQuery
- `app/api/classes/[classId]/route.ts` — parseBody
- `app/api/classes/[classId]/assignments/route.ts` — parseBody
- `app/api/classes/[classId]/roster/route.ts` — parseBody

## Phase 4: Extend `lib/env.ts` Zod Schema

- [x] Task: Extend the Zod schema to cover all 22+ env vars from `.env.example` (FR-3).
- [x] Task: Add `.refine` rule for `AI_RECOMMENDER_HASH_SECRET` (≥32 chars).
- [x] Task: Export structured `aiRecommender` and `aiImage` config objects from `lib/env.ts`.
- [x] Task: Update `lib/env.test.ts` with tests covering `.env.example` surface. All 21 tests pass.

## Phase 5: Replace Raw `process.env.*` Reads

- [x] Task: Replace `lib/config/ai.ts` — now re-exports from `env.aiRecommender`.
- [x] Task: Replace `lib/config/ai-images.ts` — now re-exports from `env.aiImage`.
- [x] Task: Replace `lib/config/features.ts` — now uses `env.NEXT_PUBLIC_FEATURE_AI_RECOMMENDATION`.
- [x] Task: Replace `lib/analytics.ts` — guarded `process.env` read for client-side safety.
- [x] Task: Replace `proxy.ts` — uses `env.DEV_AUTH_ENABLED`.
- [x] Task: Replace `lib/auth/session.ts` — uses `env.NODE_ENV`.
- [x] Task: Grep gate passes: 0 raw `process.env.*` reads in `lib/` or `proxy.ts`.

## Phase 6: Form Schema Sharing (F-604 Phase 2 — Deferred)

> Deferred per spec — science-advantage migration only.

## Phase 7: Final Acceptance

- [x] Task: Lint passes (0 errors, 0 warnings on changed files).
- [x] Task: Type-check passes (`tsc --noEmit` exits 0).
- [x] Task: Grep gates pass (AC #1, #3, #5).
- [x] Task: 43 unit tests pass (validations + env + config).

## Phase 8: Closeout

- [x] Task: Update `measure/tech-debt.md` findings F-601, F-602, F-603, F-604, F-704 to Resolved.
- [x] Task: Add lessons-learned entry.
- [x] Task: Update track metadata and archive.
