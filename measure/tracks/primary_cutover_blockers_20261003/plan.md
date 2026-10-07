# Plan — Primary Cutover Blockers

Owner lane: A. Starts first. Merge to the integration branch before other lanes rebase.

## Phase 0: Verify the audit (2 h)
- [x] Re-count `bcryptjs`, direct `drizzle-orm`, and tsc errors from a real run (the audit used grep only) (a6a919730)
- [x] Record the Primary database state: ledger doctor output, missing user columns (a6a919730)

## Phase 1: Type gate (FR-1)
- [x] Remove the flag, list all tsc errors, fix them in batches (d5271d4ae, 23c699468, c92a5b2ad, 4191cb259; 14 → 0 errors)
- [x] Fix the failing APK test — no code defect: it failed only because `game-cartridges` was not built (evidence/phase0-audit-recount.md)
- [x] Add `check-types` to CI — already in `.github/workflows/ci.yml:135` via turbo; heap and builder size set (fa0998d45)

## Phase 2: Auth and passwords (FR-2, FR-3)
- [x] Security review fixes: C1 18d352ff1, C2 4461973c3, H1 3545408bb, H2 7e6ba137f, M1 0843b1882, H3/M2 3791f850a, L1-L3 427467596, L4 f1f36df1b af5fea08e
- [x] Second review fixes: c0a02325d, d18f35212, 556545cf6, 97ab8659b, ab1e361fc, 372f9734b, aa7dcbeb6, 881d01d6a
- [x] Third review fixes: M-1 9651bd429, M-2 306ce9050, L-1/L-3 3c2f05367, L-4/L-5 7e22a0c93
- [x] Fourth review fixes: caller admin rows own-school only, createTeacher admin gate e29da500d; reset audit rank 3546a6925; test 6724f8107
- [x] Fifth review fixes: reset hook stays boolean so an old api build fails closed a6fa37eca; test 8e478c5c0
- [x] Browser-verify the 09-12 authorization tracks; write failing tests for any gap (590435b65, caf2b2ef8; AC-3 system actions unit-tested only, no SYSTEM login exists)
- [x] Swap permissions to `@reading-advantage/auth` (b3bf3ef0e)
- [x] Dual-read bcrypt/argon2 with rehash on login, with tests for both formats (b3bf3ef0e; review fixes 427467596, f1f36df1b, 3791f850a)

## Phase 3: Database (FR-4, FR-5, FR-8)
- [x] Additive migration for the missing user columns — not needed for Primary (evidence/phase0-audit-recount.md)
- [x] Wire doctor + gate in `cloudbuild.yaml` (546e9d330, 950cb8764, 4bb1876ee, 0528b61e8; review fixes 3afbf1a70, c3647ad60, f711531f1)
- [x] Write the Tutor read test and run it on a restored production copy (cb7c961a7, 8ca1efd47, 1d2d909f8; run on the restored April copy: shape PASS, row check waits for the ETL)
- [x] Check id mapping and `articleId` resolution for Tutor (4cd6e8087)

## Phase 4: Defects (FR-6, FR-7)
- [x] Sept 15 QA FR-1..FR-8 with regression tests (FR-1 ed50d20ba, FR-2 1e8141c50, FR-3 ecdab4e58, FR-4 4461973c3 3799fc6c9, FR-5 d69c92c0c 7e6ba137f, FR-6 7ca6bd931 e7223b343, FR-7 878378cd2, FR-8 5a96b75d2)
- [x] streak, paused clause, upload routes; school-B assignment read returns 500, must be 403 (streak dcf0a64d4, paused d5271d4ae, upload temp files 68e85a061, upload school already session-scoped, assignment 3f814930c)
- [x] Housekeeping and the tech-debt entry (b169e15c2, eb993bb41, e36ecc5f1, f8d2b886f)

## Step 0 of the parity goal (2026-10-04)
- [x] Local SYSTEM login: the QA seed gives `qa-system` a password; the seed is out of the db build (fdeb16051)
- [x] Staff sign-in by username only: no email field, no Google button, no sign-up link (owner decision 2026-10-04) (3a9237113)
- [x] SYSTEM picks the school when it creates staff or students; role "admin" makes a real school admin (ecb77ceca, 38ca37512)
- [x] License routes choose the database scope by role; the license insert stores `school_name` (466f54c95)
- [x] Browser check: SYSTEM creates a school, a license, and the school admin; the admin sees the license and creates a teacher and a student; the teacher signs in. Closes the AC-3 SYSTEM login gap.

## Phase 5: Deploy image (2026-10-06)
- [x] Runner stage copies the full `public` folder (evidence/phase5-docker-public-folder.md)
- [ ] Build the image once and request five public URLs from the container (evidence/phase5-docker-public-folder.md, open check)

## Gates
- [x] Tests, tsc, ESLint green (2026-10-04 rerun) — tsc 0 errors for Primary, api, auth, db (db fix 5b8dac175); Primary 736/736; api 338 passed, 6 skipped, 1 file hook timeout under load (wave0-phase3-typed-errors, 15/15 alone); auth 333/334, only the known phase-7-closeout failure; db 40 failures that predate Lane A (company-identity integration env, drizzle045 counts 58 vs 60, codecamp-0049 ceiling, marketing import); ESLint 0 errors, 156 warnings on 64 changed Primary files (packages have no ESLint config)
- [x] Browser re-verification of every Phase 4 fix (0b25ba006, evidence/phase4-browser-recheck.md)
- [x] Tutor read test green — 2026-10-07 on the ETL scratch copy `primary_etl_20261007` against `primary_legacy_20261007`: shape PASS, rows MATCH for 621 published articles; the four owner-approved MCQ answer fixes are expected values in the check (track primary_legacy_data_migration_20261004)
