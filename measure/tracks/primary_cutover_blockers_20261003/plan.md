# Plan — Primary Cutover Blockers

Owner lane: A. Starts first. Merge to the integration branch before other lanes rebase.

## Phase 0: Verify the audit (2 h)
- [ ] Re-count `bcryptjs`, direct `drizzle-orm`, and tsc errors from a real run (the audit used grep only)
- [ ] Record the Primary database state: ledger doctor output, missing user columns

## Phase 1: Type gate (FR-1)
- [ ] Remove the flag, list all tsc errors, fix them in batches
- [ ] Fix the failing APK test
- [ ] Add `check-types` to CI

## Phase 2: Auth and passwords (FR-2, FR-3)
- [ ] Browser-verify the 09-12 authorization tracks; write failing tests for any gap
- [x] Swap permissions to `@reading-advantage/auth` (b3bf3ef0e)
- [x] Dual-read bcrypt/argon2 with rehash on login, with tests for both formats (b3bf3ef0e)

## Phase 3: Database (FR-4, FR-5, FR-8)
- [ ] Additive migration for the missing user columns
- [ ] Wire doctor + gate in `cloudbuild.yaml`
- [ ] Write the Tutor read test and run it on a restored production copy
- [ ] Check id mapping and `articleId` resolution for Tutor

## Phase 4: Defects (FR-6, FR-7)
- [ ] Sept 15 QA FR-1..FR-8 with regression tests
- [ ] streak, paused clause, upload routes
- [ ] Housekeeping and the tech-debt entry

## Gates
- [ ] Tests, tsc, ESLint green
- [ ] Browser re-verification of every Phase 4 fix
- [ ] Tutor read test green
