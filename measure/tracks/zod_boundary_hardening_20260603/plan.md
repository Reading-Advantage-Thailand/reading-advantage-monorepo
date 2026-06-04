# Plan: Zod Boundary + Env Hardening

> TDD-first. Each FR writes failing tests for the new schema/helper before the implementation. The 4 destructive handlers are migrated first (highest impact).

## Phase 0: Setup

- [ ] Task: Read the current `lib/env.ts:3-15` Zod schema and `.env.example` to understand the surface.
- [ ] Task: Read the 4 destructive handlers + the 21 routes missing Zod; categorize them.
- [ ] Task: Coordinate with Track 3 (Argon2id) and Track 6 (Storage) — the `lib/auth/session.ts:97` read is deleted in Track 3; the `GOOGLE_CLOUD_*` env vars are removed in Track 6.

## Phase 1: `parseBody` / `parseQuery` / `parsePath` Helpers

- [ ] Task: Create `lib/validations/api-helpers.ts` with the 3 helper functions (FR-2).
- [ ] Task: Write failing tests:
  - `parseBody(request, schema)` with valid body returns the parsed value.
  - `parseBody(request, schema)` with invalid body throws `ValidationError` (HTTP 400 with details).
  - `parseQuery` and `parsePath` similar.
- [ ] Task: Implement. Confirm tests pass.

## Phase 2: Migrate 4 Destructive Handlers (Highest Priority)

### Phase 2a: `app/api/classes/[classId]/assignments/route.ts:POST`

- [ ] Task: Add `createAssignmentSchema` to `lib/validations/assignments.ts`: `z.object({ lessonId: z.string().uuid(), dueAt: z.string().datetime().optional() })`.
- [ ] Task: Write failing integration test: POST with `{}` body returns 400 with `{ error: 'invalid_input', details }`.
- [ ] Task: Replace the `body as { lessonId?: string }` cast with `const body = await parseBody(request, createAssignmentSchema)`.
- [ ] Task: Confirm.

### Phase 2b: `app/api/classes/[classId]/assignments/route.ts:DELETE`

- [ ] Task: Add `deleteAssignmentSchema` to `lib/validations/assignments.ts`: `z.object({ assignmentId: z.string().uuid() })`.
- [ ] Task: Write failing integration test: DELETE with `{}` body returns 400.
- [ ] Task: Replace the cast with `parseBody`.
- [ ] Task: Confirm.

### Phase 2c: `app/api/classes/[classId]/roster/route.ts:DELETE`

- [ ] Task: Add `removeStudentFromRosterSchema` to `lib/validations/`: `z.object({ studentId: z.string().uuid() })`.
- [ ] Task: Write failing integration test.
- [ ] Task: Replace the cast.
- [ ] Task: Confirm.

### Phase 2d: `app/api/classes/[classId]/route.ts:DELETE` and `PATCH`

- [ ] Task: Add `updateClassSchema` and `deleteClassSchema` to `lib/validations/class.ts`.
- [ ] Task: Write failing integration tests.
- [ ] Task: Replace the manual field checks.
- [ ] Task: Confirm.

## Phase 3: Migrate 17 Remaining Routes

For each of the 17 routes, follow the pattern:

- [ ] Task: Add the appropriate Zod schema to `lib/validations/`.
- [ ] Task: Write a failing integration test asserting 400 on malformed input.
- [ ] Task: Replace the manual check with `parseBody` / `parseQuery` / `parsePath`.
- [ ] Task: Run the file's existing test suite; confirm green.
- [ ] Task: Run `pnpm turbo run test --filter=science-advantage` after each batch; confirm green.

Routes to migrate (in priority order):
- `app/api/lessons/[lessonSlug]/quiz/route.ts:245-253` (the manual `if (!attemptId || !responses)` check)
- `app/api/lessons/[lessonSlug]/route.ts` (path param validation)
- `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` (path + query)
- `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` (path)
- `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` (path)
- `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (path)
- `app/api/classes/[classId]/analytics/overview/route.ts` (path)
- `app/api/classes/[classId]/curriculum/route.ts` (path)
- `app/api/students/[studentId]/achievements/route.ts` (path)
- `app/api/students/[studentId]/gamification-profile/route.ts` (path)
- `app/api/students/me/gamification/route.ts` (none — already minimal)
- `app/api/students/[studentId]/assignments/route.ts` (path)
- `app/api/students/[studentId]/mastery-profile/route.ts` (already validates query; add path)
- `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (already validates query; ensure path)
- `app/api/teachers/dashboard/route.ts` (none)
- `app/api/student/classes/route.ts` (none)
- `app/(student)/assignments/page.tsx` (F-003 stub — page-level; coordinate with Track 1)

## Phase 4: Extend `lib/env.ts` Zod Schema

- [ ] Task: Extend the Zod schema to cover all 22+ env vars from `.env.example` (FR-3).
- [ ] Task: Add `.refine` rules for `AI_RECOMMENDER_HASH_SECRET` (≥32 chars) and `GOOGLE_CLOUD_KEY_FILE` (must exist if set).
- [ ] Task: Add a `.refine` for `DATABASE_URL` vs `DIRECT_DATABASE_URL` (different hostnames).
- [ ] Task: Update `lib/env.test.ts` with tests for each new var. Cover: valid config passes; missing required var throws; bad format (e.g. malformed URL) throws; `.refine` rules enforced.
- [ ] Task: Run `lib/env.test.ts`; confirm all pass.

## Phase 5: Replace Raw `process.env.*` Reads

For each file in the FR-4 list:
- [ ] Task: Add the corresponding import from `lib/env` (or wherever the validated env is exported).
- [ ] Task: Replace each `process.env.X` read with `env.X` (or the appropriate accessor).
- [ ] Task: Verify the file's existing tests still pass.
- [ ] Task: Grep gate: `rg "process\.env\." apps/science-advantage/lib/ apps/science-advantage/proxy.ts` returns 0 hits.

## Phase 6: Form Schema Sharing (F-604 Phase 2 — Optional)

> Phase 2 of F-604 is deferred unless the maintainer asks for it. The in-scope work is the science-advantage migration in Phase 1-5.

- [ ] Task: Create `packages/types/src/contracts/class.ts` with the shared `createClassSchema` + `createClassFormSchema`.
- [ ] Task: Re-export from `packages/types/src/index.ts`.
- [ ] Task: Update `apps/science-advantage/components/features/classes/create-class-form.tsx` to import from `@reading-advantage/types`.
- [ ] Task: Update `apps/science-advantage/components/features/student/join-class-form.tsx` similarly.
- [ ] Task: Run `pnpm turbo run test --filter=science-advantage`; confirm green.
- [ ] Task: Coordinate with reading-advantage + primary-advantage teams; do not migrate their forms in this track.

## Phase 7: Final Acceptance

- [ ] Task: `pnpm turbo run lint --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run test --filter=science-advantage` exits 0.
- [ ] Task: `pnpm turbo run check-types --filter=science-advantage` exits 0 (depends on Track 11).
- [ ] Task: `pnpm turbo run build --filter=science-advantage` exits 0.
- [ ] Task: Grep gates (AC #1, #3, #5) pass.
- [ ] Task: All 4 destructive handlers return 400 on malformed input (AC #7).

## Phase 8: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_housekeeping_batch` to mark F-601, F-602, F-603, F-604, F-704 `Resolved`.
- [ ] Task: Add a lessons-learned entry: "Zod at every external boundary catches bugs at request time, not at DB time — the 4 destructive handlers were vulnerable to malformed bodies causing 500s."
- [ ] Task: Move track to `measure/archive/zod_boundary_hardening_20260603/` and update `measure/tracks.md`.
