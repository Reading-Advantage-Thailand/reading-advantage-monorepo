# Pilot report: mastery-runtime-compat tests (branch pilot/cloud-zod-compat)

Base commit: `01f2acfe8ae9d9ef88c2a62cb425992a00261bab`.

## Result

`./node_modules/.bin/turbo run build check-types test --filter=@reading-advantage/mastery-runtime-compat`
exits 0 after the fix. Test files: 6 passed of 6. Tests: 63 passed of 63. Turbo tasks: 37 successful of 37.

## Cause of each error

All 5 failing tests had the same error:

```
Error: Engine consumer resolved zod 4.6.7, expected 4.4.3
```

- 3 tests in `src/__tests__/release-artifact.test.ts` (`[digest contract] binds every clean-consumer
  fixture byte to release provenance`, `forces lease overlap while one process consumes a private dist
  snapshot`, `reclaims a stale truncated lease owner without touching a live lease`).
- 2 tests in `src/__tests__/sales-runtime-admission.red.test.ts` (`Sales packed consumer admission
  (intended red)` › `creates an absent repository-local root ...` and `uses distinct successful
  children concurrently ...`).

The cause is commit `7387c4876` "fix(deps): apply guarded security dependency upgrades
(track_id: security_upgrade_20261026)". That commit removed `zod@4.4.3` from `pnpm-lock.yaml` and
added `zod@4.6.7`. (`git log -S"zod@4.6.7" -- pnpm-lock.yaml` and `git log -S"zod@4.4.3"` both
name it.) The engine packages (`knowledge-space-core`, `srs-engine`) declare `zod: ^4.1.12`, so the
lockfile now resolves 4.6.7 for them.

The expected version is pinned in two places. Both came from commit `324d81a83` "feat(sales): admit
Mastery runtime (track_id: sales_mastery_consumer_20260810)" (shown by `git blame`):

- `packages/mastery-runtime-compat/fixtures/consumer/check-consumer.mjs:17`:
  `const ENGINE_ZOD_VERSION = "4.4.3";`. This is the clean-consumer check that throws the error.
- `packages/mastery-runtime-compat/src/__tests__/release-artifact.test.ts:78`:
  `RESOLVED_RUNTIME_VERSIONS.engineZod: "4.4.3"`. This is the expected `resolvedVersions` value.

## Fix

The two version pins now say `4.6.7`, the version in the committed lockfile (moved by `7387c4876`).
The check is unchanged: the consumer must still resolve exactly the pinned engine zod version, and the
test still asserts `resolvedVersions`. I did not change any lockfile version, any production source,
or any assertion.

These lines stay at `4.4.3` on purpose. They are synthetic inputs to unit tests of
`normalizePublishManifestForRelease` and `assertExportTargets`, not lockfile pins, and they pass:
`release-artifact.test.ts:1039`, `:1044` and `:1057`.

Commit: `fix(mastery-compat): pin engine zod to lockfile 4.6.7 (track_id: sales_mastery_consumer_20260810)`.

## Commands and exit codes

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `git fetch --unshallow` | 0 | |
| 2 | `pnpm install --frozen-lockfile` | 0 | One WARN: bin `tutorial-check` not linked because `activity-tutorial/dist` was not built yet. Not related to this fix. |
| 3 | `./node_modules/.bin/turbo run build check-types test --filter=@reading-advantage/mastery-runtime-compat` (before fix) | 2 | Stopped at `@reading-advantage/db#check-types` (see below) before the tests ran. |
| 4 | Same with `--continue` (before fix, diagnosis only) | 2 | `db#check-types` failed. mastery-runtime-compat: 2 of 6 test files failed, 5 of 63 tests failed, 58 passed. |
| 5 | Same with `--continue` (after fix) | 0 | 6 of 6 files and 63 of 63 tests passed. 37 of 37 tasks successful. |
| 6 | Same command, no flags (after fix) | 0 | 6 of 6 files and 63 of 63 tests passed. 37 of 37 tasks, all from cache (replayed run 5). |

## Failures left alone

1. **`@reading-advantage/db#check-types` fails on a clean checkout. This is outside the package, so I did
   not fix it.** Errors: `TS2307: Cannot find module '../../../domain/dist/...'` and
   `'../../../sales-knowledge/dist/index.js'`, plus a resulting `TS7006`. They come from:
   - `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts`, added in `63f1ec7e8`
     "test(sales): expose Phase 2 Review A gaps (track_id: sales_mastery_consumer_20260810)".
   - `packages/db/src/__tests__/sales-phase2-transaction-atomicity.red.test.ts`, added in `628468dae`
     "test(sales): expose projection atomicity gap (track_id: sales_mastery_consumer_20260810)".

   These test files import the build output of `domain` and `sales-knowledge`. But `db` is upstream of
   both packages, and `check-types` only has `dependsOn: ["^check-types"]`. Nothing makes those
   packages build before `db#check-types` runs.

   Whether it passes depends on what is on disk. It passes once `domain/dist` and `sales-knowledge/dist`
   exist from an earlier run, which is why runs 5 and 6 exit 0. A fresh clone fails on the first run.
   The fix belongs in `packages/db` or in `turbo.json`, which are out of scope.

2. **`sales-runtime-admission.red.test.ts` is an intended red test.** Its `describe` blocks are named
   "(intended red)". I did not edit it. Its 2 failures had the same zod-pin cause. With the pin fixed
   to match the lockfile, all its tests now pass. Its owners may want to know that the "red" contract
   is now green.
