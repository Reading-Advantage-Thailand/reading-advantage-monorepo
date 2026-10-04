# Plan — Primary Legacy Data Migration

Runs in its own worktree, in parallel with Lane A. Its migrations come after Lane A's
user-columns migration; Lane A merges to the integration branch first.

## Phase 0: Inventory (read only)
- [x] Map each legacy Prisma table (`~/Desktop/primary-advantage/prisma/schema.prisma`) to its shared-schema target; list the §6 tables with no target and propose a target or "dropped, because"
- [x] Find a restored legacy database copy to test against, or record who must provide one

Phase 0 result: [inventory.md](./inventory.md). Only the April dump exists
(`Backup_Primary_2026-04-29.sql`, git-ignored, main checkout); a fresh backup is needed.
Open risks for Phase 2: story-chapter MCQs (22,720 rows) have no link target; flashcard
FSRS state has no columns; duplicate and NOT NULL clashes would abort the ETL.

## Phase 1: ID map and Tutor views (FR-1, FR-2) — unblocks Lane A's Tutor read test
- [ ] Additive migration for `primary_legacy_id_map`
- [ ] Additive migration for the `tutor_compat` schema and its four views, with tests

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
