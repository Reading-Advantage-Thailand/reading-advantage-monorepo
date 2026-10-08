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
- [x] ETL script with `primary_legacy_id_map` writes and the reconciliation report (`packages/db/scripts/primary-legacy-import.ts`, library in `src/migrations-data/primary-legacy-import.ts`, `pnpm --filter @reading-advantage/db legacy-import`)
- [x] Run twice on the restored legacy copy; zero unexplained skips (2026-10-06, April copy into `primary_etl_scratch`: identical counts on both runs; every skip has a reason, see [etl-run-20261006.md](./etl-run-20261006.md); the owner decisions it needs are listed there)
- [x] Run on the production copy of 2026-10-06 (`primary_legacy_20261006`, today's Cloud SQL export) twice with identical counts: [etl-run-20261006-production.md](./etl-run-20261006-production.md)
- [x] Run on the production copy of 2026-10-07 (`primary_legacy_20261007`) twice with identical counts: [etl-run-20261007-production.md](./etl-run-20261007-production.md)
- [x] Move the saved flashcards into the Primary flashcard store (owner decision 2026-10-07, option A): decks, cards, progress of the reviewed cards, and reviews; FSRS stability and difficulty have no column (integration 92d87807c; two runs into `primary_etl_20261007`, identical counts)
- [x] Owner decisions 2026-10-07: saved cards whose word or sentence left their article after the content reload move as text only (accepted); the 4 MCQs with an answer outside their options are fixed, not skipped (`MCQ_ANSWER_FIXES`, b2f202877; 6220 MCQs)
- [x] Run again with the `--roles`, `--usernames`, and `--teachers` answers (owner decisions 2026-10-07; 0fd3f7cab; two runs into `primary_etl_20261007`, identical counts)
- [x] Rehearsal 1, local part (2026-10-08): fresh export into `primary_rehearsal1_20261008`; two ETL defects fixed (7bb6b1065); browser check 22 of 22: [rehearsal-1-20261008.md](./rehearsal-1-20261008.md)
- [x] Rehearsal 1, cloud part (2026-10-08): `primary_v2` on Cloud SQL, `PRIMARY_V2_DATABASE_URL`, ETL over the proxy (owner), deploy without traffic (revision 00128-pac, tag `rehearsal1`), browser check 25 of 25 at the tag URL
- [x] Rehearsal 2 (2026-10-08 to 2026-10-09 06:05 Bangkok): pass. Cloud ETL 2 min 22 s, Tutor read check MATCH 625, sample 5/5; browser check C10 form 18/18 and real school 25/25 on the cutover image `00129-xin`; local copy for graph and Workbooks ([rehearsal-2-20261010.md](./rehearsal-2-20261010.md))
- [ ] Run into the cutover target (2026-10-11)

## Phase 3: Old article links (FR-4)
- [x] Legacy ID resolver and redirect on `student/read/[articleId]` and `/writing` (owner: allowed in the feature freeze, 2026-10-07): `resolveLegacyArticleId` (domain articles) and the read page redirect; `/writing` opens the article page. Defect fixed on the way: a student sign-in ignored `callbackUrl`, so a signed-out QR scan opened the home page; it now opens the `/student/...` callback
- [x] Script check of all Origins 2 and 3.1 IDs: 28 of 28 (27 lessons and E12) open a published article on `primary_etl_20261007` ([legacy-links-check-20261007.md](./legacy-links-check-20261007.md); `pnpm --filter @reading-advantage/db legacy-links-check`)

## Phase 4: Teacher credentials (FR-5, FR-6)
- [x] Additive nullable column for a temporary password, and the forced change step (owner: allowed in the feature freeze, 2026-10-07): migration `0071_primary_temporary_password` (`accounts.temporary_password_issued_at`). With a temporary password the Primary login answers 403 `PASSWORD_CHANGE_REQUIRED` and opens no session; the staff form then asks for a new password and posts it to `/api/auth/temporary-password` (`createTemporaryPasswordChangeHandler`: verifies the temporary password, stores the new hash, clears the mark, ends the sessions, audits `auth:password_changed`)
- [x] Teacher credential script and hand-out list (also the two SYSTEM accounts `phikulphookathin` and `readingadvantage0`: Google sign-in only before): `apps/primary-advantage/scripts/issue-temporary-passwords.ts` gives every TEACHER and ADMIN user, and each SYSTEM user named in `--system`, a temporary password (this also covers the 6 staff scrypt hashes). Owner decision 2026-10-07: 5 SYSTEM accounts get one (the CEO, support, and 3 more); 1 more legacy SYSTEM account is not moved (`roles.json`); the names are in the private inputs folder, not here and writes the CSV hand-out list (mode 600, refused inside the repository). Dry run by default; `--apply --out <file>`; `--reissue`. Run it after the last ETL run: an ETL rerun puts the legacy hashes back. Rehearsal on `primary_etl_20261007`: 22 issued (8 TEACHER, 8 ADMIN, 6 SYSTEM); the real handlers gave 403, then the change 200, the old temporary password 401, and the new password 200 with a session
- [x] Teacher sign-in by username only (owner decision 2026-10-04: no email sign-in). Usernames are `lower(email)` (D6), so a teacher types the address used before; login lower-cases the input (lane A 3a9237113)

## Gates
- [x] Tests, tsc, ESLint green (2026-10-07, integration 942f3e1ba): tsc 0 errors for db, api, auth-client, and Primary; api 353/353; auth-client 32/32; Primary 1334 passed, 1 skipped (the PGlite smoke hook timed out once under the full parallel run and passes alone in 7 s); db 40 failures, the same set as the 2026-10-04 baseline (company-identity integration env, the frozen 58-migration counts, codecamp-0049 ceiling, marketing import); ESLint 0 errors and 1 older warning on the 20 Primary files of this track. The gate found and fixed: the PGlite `accounts` table had no `temporary_password_issued_at` (22 model tests), the i18n test broke on the domain index import of FR-4, the cn/tw/vi `rewardInInventory` line (reward pieces M4), the Hero vs. Zombie catalog modalities (Forge F2 part B), and the api users test mocks (objective tags)
- [x] Browser check of the forced password change and an old article link (2026-10-07, production build): a QA teacher with a temporary password on the shared local database got the new-password step and no session; two different passwords were refused; the save signed in to `/en/teacher/dashboard`; then the temporary password failed and the new one worked. On `primary_etl_20261007` a QA student opened the printed QR id `cmgqx8v6602p3t79btatvfjuw` and reached the migrated article; an unknown id showed "We could not find this story"; signed out, the link went to the sign-in page with the link as `callbackUrl`, and the sign-in opened the article
- [x] Lane A Tutor read test green against `tutor_compat` (2026-10-07, `primary_etl_20261007` against `primary_legacy_20261007`: shape PASS, rows MATCH for 621 articles; the check expects the four `MCQ_ANSWER_FIXES`). Run it again after the cutover-target ETL run
