# Plan — Primary Legacy Data Migration

Runs in its own worktree, in parallel with Lane A. Migrations 0060 and 0061 belong to this
track. Lane A found that its user-columns migration is not needed (no Primary column is
missing). After the merge, never change the tags, the `when` values, or the SQL of 0060 and 0061.

## Merge blockers
- `apps/codecamp-advantage/cloudbuild.yaml:28` sets `MIGRATION_CEILING_TAG=0059_game_challenges`.
  `packages/db/src/migration.ts:71-75` throws when the ceiling is not the last journal entry.
  Merging 0060 and 0061 therefore stops Codecamp deploys. Owner decision: raise Codecamp's
  ceiling to the last tag in the same merge, after review. This track does not change that file.

## Phase 0: Inventory (read only)
- [x] Map each legacy Prisma table (`~/Desktop/primary-advantage/prisma/schema.prisma`) to its shared-schema target; list the §6 tables with no target and propose a target or "dropped, because"
- [x] Find a restored legacy database copy to test against, or record who must provide one

Phase 0 result: [inventory.md](./inventory.md). Only the April dump exists
(`Backup_Primary_2026-04-29.sql`, git-ignored, main checkout); a fresh backup is needed.
Open risks for Phase 2: story-chapter MCQs (22,720 rows) have no link target; flashcard
FSRS state has no columns; duplicate and NOT NULL clashes would abort the ETL.

## Phase 1: ID map and Tutor views (FR-1, FR-2) — unblocks Lane A's Tutor read test
- [x] Additive migration for `primary_legacy_id_map` (cbc839b6a, sentinel e90202faf)
- [x] Additive migration for the `tutor_compat` schema and its four views, with tests (c7cf1bfb5, sentinel e90202faf; column names and types match the April legacy copy)
- [x] Read-only `tutor_reader` login: `packages/db/scripts/tutor-reader-grants.sql` grants CONNECT, USAGE on `tutor_compat`, SELECT on the four views, and sets the search path on the role (owner decision 2026-10-04; real-database test)

## Phase 2: ETL (FR-3)
- [ ] ETL script with `primary_legacy_id_map` writes and the reconciliation report
- [ ] Run twice on the restored legacy copy; zero unexplained skips

## Phase 3: Old article links (FR-4)
- [ ] Legacy ID resolver and redirect on `student/read/[articleId]` and `/writing`
- [ ] Script check of all 27 Origins 2 and 3.1 IDs

## Phase 4: Teacher credentials (FR-5, FR-6)
- [ ] Additive nullable column for a temporary password, and the forced change step
- [ ] Teacher credential script and hand-out list
- [ ] "Username or email" on the teacher sign-in page

## Gates
- [ ] Tests, tsc, ESLint green
- [ ] Browser check of the forced password change and an old article link
- [ ] Lane A Tutor read test green against `tutor_compat`
