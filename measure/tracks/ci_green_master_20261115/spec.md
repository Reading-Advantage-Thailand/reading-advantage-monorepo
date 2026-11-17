# Spec: CI green on master

Track: `ci_green_master_20261115` (light lane, chore). Source: PM order 2026-11-15.

Owner words (PM, 2026-11-15): "red CI hides real failures; push-often needs green CI."

## Scope

CI on master only. The failing run is 43667794723 at `8d3cb8233`: jobs "Build, Lint, and Test"
and "Check www-reading-advantage".

## Problem statement

Two distinct failure causes exist on master:

- PC-1: `eslint .` in `apps/www-reading-advantage` reports 146 errors, all inside the built,
  minified game bundles in `public/experience/assets/`. Zero errors in `src/`. The bundles are
  tracked build artifacts, not source.
- PC-2: the architecture boundary check fails with "V2 reconciliation manifest is invalid:
  Analyzer report hashes do not match current byte-identical reports". The v2 manifest
  `analyzer-reconciliation.v2.json` was pinned 2026-11-11 (`de25d49a9`); merged source work
  since then changed the analyzed tree, so the pinned report hash is stale.

## Functional requirements

- FR-1: ESLint in `apps/www-reading-advantage` ignores `public/experience/assets/`. The ignore
  entry goes in the app's own `eslint.config.mjs` as an ignore, not as per-file disables, and
  no lint rule that applies to `src/` changes.
- FR-2: The architecture check passes with the repo's own pin refresh script
  (`pnpm --filter @reading-advantage/architecture-enforcement pin:refresh`). No new hash field
  is added and no hash coverage widens; only the fields the check validates are refreshed.
- FR-3: Before refreshing, the drift is classified: stale pin (source moved after the pin) or
  a real boundary break (new violations in the refreshed report). A real boundary break is
  fixed as source, not papered over with a hash refresh.
- FR-4: Any other cause found in the failing logs is reported; it is fixed only when it is
  small and lives in CI or lint config.

## Acceptance

- `pnpm --filter www-reading-advantage lint` exits 0 in the worktree.
- `pnpm architecture:check --skip-input-snapshot-pin` exits 0 in the worktree.
- CI workflow `.github/workflows/ci.yml` passes on master on GitHub.
- Before push: the `cd-apps.yml` and `cd-www-reading-advantage.yml` path filters are checked;
  only a www deploy may trigger (standing-approved). A deploy of any other app stops the push.

## Out of scope

Lint rule changes for `src/`, new hash fields, manifest coverage growth, and any non-CI
failure beyond the two causes above.
