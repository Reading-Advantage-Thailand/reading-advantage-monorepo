# Pilot report: packages/db contract tests

Base: `01f2acfe8` on branch `pilot/cloud-db-contracts`. I changed only files under `packages/db`
(test files only) and this report. I changed no migration, schema, deploy file or lockfile.

## Commands

| Step | Command | Exit | Result |
|------|---------|------|--------|
| 1 | `git fetch --unshallow` | 0 | full history (5764 commits) |
| 2 | `pnpm install --frozen-lockfile` | 0 | one warning: missing `tutorial-check` bin in `packages/codecamp-knowledge` (not related) |
| 3 | `./node_modules/.bin/turbo run build check-types test --filter=@reading-advantage/db` | 2 | turbo stopped at the `check-types` error |
| 3b | the same with `--continue` (before the fixes) | 2 | build ok; check-types fails; test: **42 failed / 1230 passed / 49 skipped** (1321), files 18 failed / 86 passed / 8 skipped |
| 6 | the same with `--continue` (after the fixes) | 2 | build ok; check-types fails (the same sales errors); test: **33 failed / 1239 passed / 49 skipped** (1321), files 13 failed / 91 passed / 8 skipped |

Per-file checks after each fix: `npx vitest run <file>` in `packages/db`. The three drizzle045 files: 71/71 passed. Codecamp: 3/3 passed. Marketing adversarial: 55/55 passed.

The final command does **not** exit 0. All remaining failures are in the "leave" list below.

## Fixed: out-of-date expectations (one commit per test file)

| Test file | Failing check | Cause (commit) | Fix | Commit |
|-----------|---------------|----------------|-----|--------|
| `drizzle045-phase1-contracts-adversarial.test.ts` | 4 tests: 28 schema files / 58 migrations expected; the tree has 37 / 75 | New schema files and migrations from `6e890c307` (game-challenges.ts, rpg.ts, 0058, 0059) to `7f657f0a2` (primary-help.ts, 0074) | `CURRENT_SCHEMA_FILES` = the 37 files on disk; `CURRENT_MIGRATION_INDICES` length 75. The doc-claim lists (`EXPECTED_*`) did not change | `9659b36eb` |
| `drizzle045-phase2-contracts-adversarial.test.ts` | 2 tests: `EXPECTED_MIGRATION_FILES` stops at 0057 | same: `6e890c307` … `7f657f0a2` | 0058–0074 file names added to the allowlist | `66e17cdef` |
| `drizzle045-phase3-integration-gates.test.ts` | 1 test: the journal must have 58 entries; it has 75 | same: `6e890c307` … `7f657f0a2` | 0058–0074 tags added to `EXPECTED_JOURNAL_TAGS`. I checked that the journal tags equal the `.sql` files on disk | `98b44e41e` |
| `codecamp-0049-ledger-gap-deploy-contract.test.ts` | 1 test: migrate-db step must contain `MIGRATION_CEILING_TAG=0049_codecamp_exercise_quiz_repair` | `12d6da458` raised the ceiling to `0059_game_challenges` "after reviewing 0050-0059" | The step must now match `MIGRATION_CEILING_TAG=0059_game_challenges`. It still must not contain `0050_finance_operations_records`, and now also must not contain `0060_primary_legacy_id_map` (the next migration after the new ceiling). The 0049 doctor-gate test and the runner fail-closed test did not change | `2bb409648` |
| `phase-2-marketing-schema-adversarial.test.ts` | 1 test: `research-topics/route.ts` must import `settings` | `0f98e1e74` moved the settings read into `apps/marketing/app/lib/ai-credentials.ts` | The route must import `pastTopics`. The test now also checks `ai-credentials.ts`, which must import `settings`. So `settings` still has a checked consumer | `95a34dd47` |

I removed no assertion. The codecamp and marketing tests each have one more assertion than before. The ceiling rise in `12d6da458` was a reviewed, deliberate change (its message says so). So I treated it as an out-of-date expectation, not a broken rule.

## Left red (not fixed), with reasons

1. **The sales red tests import `../../../domain/dist`.** These cause all the `check-types` errors and two test files that do not load (0 tests collected):
   - `src/__tests__/sales-phase2-review-a-durable.red.test.ts` (added in `63f1ec7e8`)
   - `src/__tests__/sales-phase2-transaction-atomicity.red.test.ts` (added in `628468dae`; it uses the same `dist` import pattern)

   `packages/domain/dist` and `packages/sales-knowledge/dist` do not exist, because the db filter does not build them. tsc reports TS2307 (module not found) and TS7006 (the knock-on implicit `any`). Your instructions say to leave these files.
2. **The company-identity integration tests need a database or podman.** 31 tests fail with `COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL is required for PostgreSQL tests`. 2 tests in `local-bootstrap.integration.test.ts` fail with `Fresh-volume bootstrap proof requires podman or docker`. That makes 33 tests in 11 files under `src/company-identity/__tests__/`. Ten of the files came in `ba033761d` (company_identity_sso_20260715). `sentinel-table-absence.integration.test.ts` came in `0a246c8b3`. This session has no database, so these cannot pass here.

## Other notes

- Nothing outside `packages/db` failed in this run. The filter only runs the db package.
- The commit headers use the `track_id` of the most recent track in each test file's `git log`. The three drizzle045 files were created without a track id, so they use `monorepo_package_review_20260907`.
