# Spec — Primary Cutover Blockers

Track ID: `primary_cutover_blockers_20261003`
Type: chore
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)

## Context

Primary Advantage in the monorepo must cut over on Oct 14-16 (rehearsals Oct 8-9
and Oct 12-13). A read-only audit on 2026-10-03 found four package-level blockers
and several open defects. Tutor Advantage reads the Primary article tables, so
nothing in this track may break that read path.

## Functional Requirements

- FR-1 (type gate): Remove `typescript.ignoreBuildErrors` from `next.config.ts`
  (line 20 today). Fix all app-owned tsc errors and the one failing APK test.
  `tsc --noEmit` reports 0 errors for the app.
- FR-2 (authorization): Confirm the tracks `primary_authorization_hardening_20260912`
  and `primary_broken_ux_fixes_20260912` actually behave as specified in a browser
  (they are only "implemented_pending_manual_verification"). Cover PATCH
  `/api/users/[id]` privilege escalation, unauthenticated server actions,
  cross-school reads, and client-supplied XP. Move `lib/permissions.ts` and
  `lib/authorization.ts` onto `@reading-advantage/auth` where an equivalent exists.
- FR-3 (passwords): New hashes use argon2 from `@reading-advantage/auth`. Existing
  bcrypt hashes still verify. A successful login rehashes a bcrypt hash to argon2.
  No column change. Find every `bcryptjs` import (the audit count of 5 is a lower bound).
- FR-4 (migration gate): Run the db ledger doctor against the Primary database.
  Add the migration gate to `apps/primary-advantage/cloudbuild.yaml`. Fold the
  missing `emailVerified` / `onborda` user columns into a proper additive migration.
- FR-5 (Tutor read test): Add a script and a test that run the exact queries in
  Tutor's `PrimaryAdvantageDB.ts` (tables `article`, `multiple_choice_questions`,
  `short_answer_questions`, `sentencs_and_words_for_flashcard`) against the new
  schema. The test fails on any renamed or dropped column. Run it against a
  restored copy of the production data before each rehearsal. The legacy table names
  exist in the new database only as the `tutor_compat` views, which track
  `primary_legacy_data_migration_20261004` builds (FR-2). Run the test with
  `search_path=tutor_compat`.
- FR-6 (QA defects): Complete FR-1..FR-8 of `primary_browser_qa_fixes_20260915`
  inside this track and mark that track superseded. Also fix: `streakDays` always 0
  (`actions/flashcard.ts:520`), the dead `transition.from !== "paused"` clause
  (`StudentCartridgeHost.tsx:475`), upload-route school check from the session,
  temp-file leak on the CSV 400 path.
- FR-7 (housekeeping): Close the stale Prisma entry in `measure/tech-debt.md`.
  Remove the `prisma/generated/` lint ignore. Delete `qa-check-user.tmp.ts`, `temp/`,
  `test-results/`. Move `scripts/seed-qa-users.ts` to the db seeds.
- FR-8 (cuid/uuid): Confirm the legacy-to-monorepo data path in
  `docs/deployment/primary-cutover-migration-spec.md` covers id mapping, and that
  Tutor's stored `articleId` keys still resolve after the migration.

## Non-goals

- Moving `server/models` behind `@reading-advantage/domain`, the UI package move,
  FSRS/storage/AI package swaps, and APK host sharing. These go to the semester 2
  track `primary_package_alignment` (stub in the program doc).
- No visual redesign (see `primary_ux_rework_20261003`).

## Acceptance Criteria

- `pnpm --filter primary-advantage test` green. `tsc` 0 errors. ESLint 0 errors.
- Each FR has a regression test. FR-2 and FR-6 are also verified in a real browser.
- The Tutor read test passes against the migrated schema.
- No breaking schema change: every migration is additive (new table or nullable column).
