# Dragon Flight Runtime-Foundation Acceptance — 2026-08-02

## Status

Accepted as a bounded implementation and contract-evidence slice for the
Dragon Flight runtime foundation under
`apk_existing_core_cutover_20260727`.

This receipt does **not** accept Task 5, Phase 5, the signed-attempt protocol,
both-host completion, server enforcement, production, retirement, cutover, a
cohort, or product-owner approval.

## Accepted implementation boundary

The indexed change is limited to Dragon Flight and its generic runtime
dependencies:

- surface-local CSS-pixel pointer snapshots, including pointer-origin and
  release coordinates;
- zero-height responsive mount provisioning plus style restoration on both
  successful destruction and factory failure;
- host forwarding for responsive policy/canvas presentation and optional
  suppression of unverified local result/restart UI while preserving defaults;
- canonical asset URL joining when a supplied pack root has a trailing slash;
- the direct `@reading-advantage/game-cartridges/host-proof` Dragon Flight
  subpath, including current-composition `apkRecompose`, redraw, and current
  safe-rectangle pointer routing;
- exactly one existing `createRuntimeEdition` fixture re-export from the
  already-public Play Kit testing entrypoint so cartridge tests do not import a
  different package's source tree.

`packages/game-cartridges/package.json` retains its existing `./catalog`
export. The indexed metadata adds only `./host-proof` and
`src/host-proof.ts` to the original build inputs. Concurrent later-cohort
exports remain unstaged.

## Acceptance evidence

Terra independently accepted the staged 16-file phase after confirming a clean
index diff and the following focused commands:

```sh
CI=true pnpm --filter @reading-advantage/advantage-play-kit exec vitest run \
  src/editions/editions.test.ts \
  src/runtime/input.test.ts \
  src/runtime/runtime.test.ts \
  src/react/apk-game-host.test.tsx \
  src/react/apk-game-host-host-proof-controls.test.tsx \
  src/testing/test-kit.test.ts \
  --reporter=verbose --no-file-parallelism
# 6 files, 33 tests passed

CI=true pnpm --filter @reading-advantage/game-cartridges exec vitest run \
  src/host-proof-runtime.test.ts \
  src/host-proof-zero-layout.test.ts \
  src/host-proof-action-diagnostics.test.ts \
  src/host-proof-same-frame-actions.test.ts \
  --reporter=verbose --no-file-parallelism
# 4 files, 7 tests passed
```

Both affected package type checks and scoped lint passed. Play Kit build and
the game-cartridges build passed; the latter emitted the `host-proof` subpath.
`git diff --cached --check` was clean.

The tests cover trailing-root URL joining, offset-surface pointer routing,
compact-to-wide title recomposition with redraw and current geometry, ordered
local action diagnostics, zero-height lifecycle cleanup, and hidden local
result/restart controls with unchanged defaults. Ordered local diagnostics are
not evidence of server dwell, server enforcement, anti-cheat, human play,
comprehension, mastery, or XP integrity.

## Deliberate non-claims and remaining gates

The Standard-Pack suitability/ingestion track remains blocked. This slice does
not choose, hydrate, materialize, ingest, or accept any Standard-Pack source,
asset provenance, license, or selected-union authority.

The Core track remains in progress. Reading and Primary authoritative host
proof, the full server protocol and adversarial receipts, independent
production proof, owner authorization, legacy retirement, later-cohort
authorization, and cross-host closeout remain open. The action, defense,
traversal, and puzzle cohorts remain deferred on a separately accepted Dragon
Flight reference outcome.

`build-graph` was unavailable on `PATH`, so the requested graph update could
not run; this does not alter the bounded test and staged-diff evidence above.

## Role receipts

- Terra: phase acceptance of the staged 16-file cut after independent focused
  verification.
- Sol: staged-slice acceptance as a bounded Dragon Flight runtime foundation
  only.
- Luna: implementation to Terra's red tests and focused verification evidence.
