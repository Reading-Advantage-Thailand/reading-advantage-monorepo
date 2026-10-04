# Plan — Primary Cutover Blockers

Owner lane: A. Starts first. Merge to the integration branch before other lanes rebase.

## Phase 0: Verify the audit (2 h)
- [x] Re-count `bcryptjs`, direct `drizzle-orm`, and tsc errors from a real run (the audit used grep only) (a6a919730)
- [x] Record the Primary database state: ledger doctor output, missing user columns (a6a919730)

## Phase 1: Type gate (FR-1)
- [x] Remove the flag, list all tsc errors, fix them in batches (d5271d4ae, 23c699468, c92a5b2ad; 14 → 0 errors)
- [x] Fix the failing APK test — no code defect: it failed only because `game-cartridges` was not built (evidence/phase0-audit-recount.md)
- [x] Add `check-types` to CI — already in `.github/workflows/ci.yml:135` via turbo; heap and builder size set (fa0998d45)

## Phase 2: Auth and passwords (FR-2, FR-3)
- [x] Browser-verify the 09-12 authorization tracks; write failing tests for any gap (590435b65, caf2b2ef8; AC-3 system actions unit-tested only, no SYSTEM login exists)
- [x] Swap permissions to `@reading-advantage/auth` (b3bf3ef0e)
- [x] Dual-read bcrypt/argon2 with rehash on login, with tests for both formats (b3bf3ef0e; review fixes 427467596, f1f36df1b, 3791f850a)

## Phase 3: Database (FR-4, FR-5, FR-8)
- [x] Additive migration for the missing user columns — not needed for Primary (evidence/phase0-audit-recount.md)
- [x] Wire doctor + gate in `cloudbuild.yaml` (546e9d330, 950cb8764, 4bb1876ee, 0528b61e8)
- [ ] Write the Tutor read test and run it on a restored production copy
- [x] Check id mapping and `articleId` resolution for Tutor (4cd6e8087)

## Phase 4: Defects (FR-6, FR-7)
- [ ] Sept 15 QA FR-1..FR-8 with regression tests
- [ ] streak, paused clause, upload routes; school-B assignment read returns 500, must be 403
- [ ] Housekeeping and the tech-debt entry

## Gates
- [ ] Tests, tsc, ESLint green
- [ ] Browser re-verification of every Phase 4 fix
- [ ] Tutor read test green
