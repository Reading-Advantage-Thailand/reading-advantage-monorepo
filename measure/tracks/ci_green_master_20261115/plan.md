# Plan: CI green on master

Track: `ci_green_master_20261115` (light lane).

## Phase 1: Failure causes and the two fixes

- [x] 1.1 Read the failing logs of run 43667794723 and list every distinct failure cause.
  Log scan complete: exactly two causes, PC-1 (lint errors in the built game bundles under
  `public/experience/assets/`, all rules are minified-code rules such as `no-this-alias`,
  `no-cond-assign`, `no-undef`, `rules-of-hooks`) and PC-2 (the v2 reconciliation manifest
  report hashes). No other failing step in either job.
- [x] 1.2 Add `public/experience/assets/` to the eslint ignores of
  `apps/www-reading-advantage/eslint.config.mjs` (PC-1, FR-1) and verify the app lint exits 0.
  `1e5343458`. Gate: `pnpm --filter www-reading-advantage lint` exit 0.
- [x] 1.3 Classify the architecture drift (PC-2, FR-3): run the pin refresh, inspect the diff,
  and decide stale pin vs real boundary break.
  Stale pin for the hash fields (FR-2): only www source work merged after the 2026-11-11 pin;
  the two tree hashes did not move. The refresh exposed two further causes: PC-3, six
  `MODULE_RESOLUTION_ERROR` parse errors in working-dir mode (tsconfig `paths` of
  `services/worker` and `packages/sales-knowledge` point at `dist/*.d.ts` files that exist
  only after a build; the projection used by manifest validation resolves them to source, so
  validation ignored them), and PC-4, a debt-change of 337 additions against the v1 baselines
  frozen 2026-07-16 (253 additions under v2), real drift in current source.
- [x] 1.4 Refresh the v2 manifest pins with the repo's own script; record which file changed
  and why (FR-2). `0388a090f`. File: `packages/architecture-enforcement/src/config/
  analyzer-reconciliation.v2.json`, four hash fields only (input snapshot, two report hashes,
  review subject), no new field, no coverage growth. PC-3 fix: `280dd4a2f`, a build step for
  the two target packages before the check in `.github/workflows/ci.yml`.
- [~] 1.5 Run local gates (app lint, architecture check), push to master, watch CI, and close
  the track when CI is green.
  Gates run: app lint exit 0; `pnpm architecture:check --skip-input-snapshot-pin` exits 1
  with `debt-change` (PC-4) and parseErrors=0; root `pnpm lint --concurrency=2` exits 1 on
  `primary-advantage#lint` (PC-5: 13 errors, 11 in `tests/pwa/fixtures/`, 2 in
  `lib/safe-callback-path.ts` and one rehearsal page test). PC-4 and PC-5 are outside the
  light-lane fix rule and stay open for the PM.

## Gate record (2026-11-15, branch `chore/ci-green` rebased on `32475cd34`)

- `pnpm --filter www-reading-advantage lint`: exit 0 (was 146 errors in
  `public/experience/assets/`).
- `pnpm architecture:check --skip-input-snapshot-pin`: exit 1, `debt-change`
  (additions=337, removals=16, renames=161), parseErrors=0. Manifest validation passes.
- `pnpm architecture:check --skip-input-snapshot-pin --policy v2`: exit 1, `debt-change`
  (additions=253).
- `pnpm lint --concurrency=2` (root): exit 1, `primary-advantage#lint`, 13 errors.
- Affected-app selector for the push: `["www-reading-advantage"]`; cd-apps matrix excludes
  www and selects no other app, so only the standing-approved www deploy triggers.

## CI round 1 (run 43674983351 on `b4284d74b`, result: failure)

- Fixed and verified in CI: www lint, www build, www check-types pass; the architecture check
  reaches the analysis with `parseErrors=0` and the manifest validation passes.
- PC-4 remains in the main job: `architecture check: debt-change (files=6931, findings=881,
  parseErrors=0)`. Not a CI or lint config fix; a PM decision on the architecture debt.
- PC-6 remains in the www job: 3 pixel assertions in `real-logos-captures-adversarial.test.ts`
  (en-storytime-light 88 px of #92400e, th-primary-light 148 px, en-primary-light 267 px,
  threshold 1000). The same 3 failed in run 43667794723 before this track. The Phase 3
  re-record at `ec573d635` lost the ink: the cd155425b captures held 46577, 21083, and 21082
  pixels. Needs a capture re-record or a product check; not a CI or lint config fix.
- PC-5 waits behind PC-4: root `pnpm lint` fails on `primary-advantage#lint` (13 errors).

## PM decisions of 2026-11-15 and the round-2 outcome

- **Ledger.** `packages/architecture-enforcement/src/config/baselines/debt-ledger.v1.json`
  sits beside the v1 baselines. It holds `totalAdditions: 337`, `countsByModule`, and the
  full addition list. Largest module: `apps/primary-advantage` with 144 additions.
- **Ratchet.** The check already ratchets through `compareArchitectureDebt` in
  `packages/architecture-enforcement/src/ratchet.ts`: any addition returns `new-debt` and
  exit 1, tested by `ratchet.test.ts` and `ratchet.red.test.ts`. The live check fails today
  with `new-debt (additions=337)`, which proves the ratchet from the current baseline. No
  new ratchet code was added, because the existing mechanism already fails on an increase.
- **PC-4 re-baseline: stopped by the repo's own freeze, reported to the PM.** The PM order
  was "re-baseline now with the repo's own baseline command". The command exists
  (`pnpm architecture:baseline:update`) but every write route is closed by design:
  1. Policy v1 baselines are frozen. `writeArchitectureBaselines` rejects the v1 paths, and
     `V1_ARTIFACT_BINDINGS` in `v1-validation.ts` pins their bytes. Every policy selection
     re-checks those bytes as Gate 1.
  2. Policy v2 baselines must mirror v1 entries. `validateArtifactFamilySync` throws
     `database v2 baseline entries differ from v1` when they move apart.
  3. The four-file `architecture:reconcile` route fails at HEAD with
     `Reconciliation exact exception already exists: AI_PROVIDER_BOUNDARY
     packages/ai/src/__tests__/phase-11-sdk-v2-call-shape.test.ts`. Its exact-set
     assertion also cannot hold while removals and renames exist.
  4. The repo's own strategy doc asks this question as Q11
     (`measure/tracks/architecture_ci_input_pin_20261110/test-strategy.md`): route (c),
     changing `acceptedSha256`, is a source and hash change, and the Hashing and
     Provenance Policy forbids it. The doc advises routes (a) and (b) and holds task 1.4d.
  A v2 write path with a test was implemented, run, and reverted (`a50dc2173`,
  `a3474aee5`, reverted by `d05b252fd`, `f3db21376`) because it broke the v1-to-v2 mirror
  and made the whole check fail. No hash was added or widened.
- **PC-5: fixed on branch `ci/primary-lint`, commit `39649dca8`, pushed to origin.** The
  branch merges with the next Primary deploy; a master push would deploy Primary, and that
  deploy belongs to the team. Gates on the branch: primary lint 0 errors, check-types exit
  0, the rehearsal test and the safe-callback-path tests pass. The branch fixes 11 errors
  with eslint config entries (legacy service-worker fixture ignore, PWA fixture server
  Node globals), 1 error with an identical charCode loop in `lib/safe-callback-path.ts`,
  and 1 error by naming the lesson card mock component. Master keeps the 13 errors as a
  known failure of the main CI job until the branch merges.
- **PC-6: diagnosed, not fixed, reported.** The primary page revamp (merged `7db52a49d`,
  2026-11-03) and the storytime page revamp (2026-11-03/04) changed the product page
  logos. The Oct-27 ink threshold of 1000 exact-color pixels predates them. Evidence: the
  old primary capture held 21082 exact and 52360 tolerant pixels of `#155e75`; the current
  page holds 267 exact and 20273 tolerant. The old storytime capture held 46577 exact and
  69368 tolerant of `#92400e`; the current page holds 88 exact and 3635 tolerant. A full
  re-record on 2026-11-15 reproduced the same three counts, so the environment is not the
  cause, and it broke the tutor pair test by timing (0 differing pixels), so the re-record
  was reverted. The threshold or the page design needs a www owner decision; a threshold
  change is a test change, not a CI or lint config change.
- **Follow-up task, deferred to a later owner:** cut the additions of the largest module
  first: `apps/primary-advantage`, 144 additions of the 337 in `debt-ledger.v1.json`.

## CI round 3 (run 43686964616 on `a54b5741a`)

- Round 2 push `6b67ebe7e` failed at the architecture step on a stale report pin:
  concurrent www source commits changed the analyzer report after the rebase. The repo's
  own `pin:refresh` regenerated the report hashes and the input snapshot; commit
  `a54b5741a` holds the refresh. The local check then reaches `debt-change (files=6932,
  findings=881, parseErrors=0)`, which is the known PC-4.
- This is the second PC-2 occurrence: every master push that changes analyzer inputs can
  stale the report pin before CI reads it. The refresh must run on the final pushed tree.

## CI round 4 (PM 2026-11-21)

- Failing run `44901340646` on `f4dd177a9`. Two jobs failed and no other job failed:
  the "Build, Lint, and Test" job at `Architecture boundary check`, and the "Check
  www-reading-advantage" job at its single build, lint, type check, and test step.
  Steps after each failure were skipped. No PC-5, PC-4, or PC-6 failure appeared
  in this run.
- Cause (1), third PC-2 occurrence: "Analyzer report hashes do not match current
  byte-identical reports". The www merges after the 2026-11-15 pin changed analyzer
  inputs. The repo's own `pin:refresh` ran on the final tree and wrote four existing
  hash fields of `packages/architecture-enforcement/src/config/
  analyzer-reconciliation.v2.json` (input snapshot, two report hashes, review
  subject). Commit `fd995faa4`. No hash field was added and no coverage widened.
  A second preview refresh reported "no write required".
- Cause (2): the test `src/lib/blog-blocks.test.ts:210` failed with "Test timed out
  in 5000ms" and no assertion failed. The test renders every blog post through two
  pipelines. It reads 139 posts, because the 2026-11-21 daily post (`b7637ab5e`)
  added two. Measured time: 1.3 s locally, 6.2 s on CI. Commit `e09ee183c` sets a
  30 s timeout on that test. No test was deleted or skipped, and no assertion
  weakened.
- The `scroll` warning in the log comes from `blog-pagination.tsx`
  (`scroll={false}` on a Next `Link`). It is not related to the failure.
- Gates on `fd995faa4`:
  `pnpm architecture:check --skip-input-snapshot-pin --policy v2` exit 0, `clean
  (files=7026, findings=800, parseErrors=0)`, `debt: clean (additions=0)`. PC-4 no
  longer blocks the check. The blog test file passes locally: 18 tests, 1.3 s.

## Follow-up (deferred to a later owner)

- [ ] Cut the additions of the largest module first: `apps/primary-advantage`, 144 of the
  337 additions in `packages/architecture-enforcement/src/config/baselines/debt-ledger.v1.json`.
  The ledger holds the per-module counts and the full addition list. This task starts after
  the PM decides the PC-4 baseline route. Owner: a later owner, not this track.
