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
