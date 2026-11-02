# Pilot report: cloud-games-small

Branch: `pilot/cloud-games-small`, based on `01f2acfe8`. No database, secret, or deploy was used.

## Setup

| Command | Exit |
|---|---|
| `git fetch --unshallow` | 0 (the repo is no longer shallow; 5764 commits) |
| `pnpm install --frozen-lockfile` | 0 (lockfile not changed) |

## (a) game-cartridges: Vitest runs stale `dist/*.test.js`

**Cause.** `packages/game-cartridges/vitest.config.ts` has no `test.include`. Vitest 4.1.8 then uses its
default glob `**/*.{test,spec}.?(c|m)[jt]s?(x)`, which matches `dist/`. The committed build
(`tsup … && tsc -p tsconfig.build.json --emitDeclarationOnly`) never emits test files, and
`tsconfig.build.json` excludes them. But `dist/` is never cleaned (tsup runs without `--clean`), so
`*.test.js` files from an older local emit (for example `tsc -p tsconfig.json` without `--noEmit`) stay
there and run as tests. Those files are compiled from old sources, so their assertions fail.
The config came without an `include` in **01fe1f1f5** (`feat(games): build Phaser 4 APK foundation
(track_id: advantage_play_kit_20260710)`); `git log` shows no later change to the file.

**Reproduction.** A fresh `dist/` has no test files, so I made a stale one with
`tsc -p tsconfig.json --noEmit false` in the package. That wrote 62 `dist/*.test.js` files (you saw 53
in an older dist). Then I ran
`./node_modules/.bin/turbo run build test --filter=@reading-advantage/game-cartridges --force`.
`--force` is needed because without it turbo replays the cached passing test log and runs nothing.

| Run | Exit | Test files | Tests |
|---|---|---|---|
| Before the fix, fresh dist (cache hit) | 0 | 62 passed | 800 passed |
| Before the fix, stale dist, `--force` | 1 | 20 failed / 104 passed (124) | 19 failed / 1580 passed / 1 skipped (1600) |
| After the fix, stale dist, `--force` | 0 | 62 passed (62) | 800 passed (800) |
| After the fix, clean dist, `--force` | 0 | 62 passed (62) | 800 passed (800) |

All the failures were in `dist/*.test.js` files, for example `dist/castle-defense.test.js` and
`dist/legacy-traversal-dragon-rider.mechanics.test.js`.

**Fix.** I added `include: ["src/**/*.test.ts"]` to `vitest.config.ts`. Every test file under `src/` is
a `*.test.ts` file (62 files), so no source test is dropped. Commit:
`fix(game-cartridges): run only source tests in vitest (track_id: advantage_play_kit_20260710)`.
I found no `measure/tracks/advantage_play_kit_20260710` folder. The track ID comes from the commit
that created the file.

## (b) vocabulary-games check-types: TS2305 and TS7006 in `challenge-dependencies.ts`

**Cause.** The source is correct. `ApkChallengeRouteDependencies` is exported from
`packages/api/src/routes/apk-challenges/index.ts:24`.
`apps/advantage-games/src/lib/apk/challenge-route.ts` is one line,
`export * from "@reading-advantage/api/routes/apk-challenges"`. The package export resolves that path
to `./dist/routes/apk-challenges/index.d.ts`. If `packages/api/dist` is missing or stale, `tsc` reports
TS2307 at `challenge-route.ts:1`. The `export *` then gives nothing, which causes:

- TS2305 at `challenge-dependencies.ts:7` (`ApkChallengeRouteDependencies`)
- TS7006 at lines 12 (`token`), 13 (`schoolId`), and 19 (`gameId`), because the object has no
  contextual type
- TS2305 in the four `src/app/api/v1/apk/challenges/**/route.ts` files

Both app files and the API module were added in **6e890c307**
(`chore(measure): add phase review findings for the five reading ux tracks`). That commit added 600+
files, including this route-handler split. `git log -S ApkChallengeRouteDependencies` lists only
6e890c307 and 2e7e973d9, and 2e7e973d9 changed only a measure `plan.md`. The underlying gap is in the
root `turbo.json`: `check-types` depends on `^check-types`, not `^build`. So running check-types on a
clean or stale checkout does not build the `dist/` type declarations it needs.

**Reproduction.** On a clean checkout with no package `dist/`, `pnpm --filter vocabulary-games check-types`
exited 2 with 396 errors. The errors include the exact TS2305 (line 7) and TS7006 (lines 12, 13, 19)
errors above. The rest are TS2307 errors for every unbuilt workspace package, plus TS2339 errors in
`packages/game-cartridges/src/*.ts` that come from the unbuilt `advantage-play-kit`. After
`./node_modules/.bin/turbo run build --filter='vocabulary-games^...'` (exit 0, 21/21 tasks), the same
check-types command exited **0** with 0 errors. That was before any change to `src/lib/apk/`.

**Fix.** I made no change under `apps/advantage-games/src/lib/apk/`. The exported type already matches
the real route handler. A local copy of the type in `challenge-route.ts` would not be the smallest fix,
because the `export *` would still fail to resolve, and it would duplicate the type that the api
package owns.

## Final runs

| Command | Exit | Result |
|---|---|---|
| `./node_modules/.bin/turbo run build test --filter=@reading-advantage/game-cartridges --force` | 0 | 4/4 tasks; 62 test files, 800 tests passed |
| `pnpm --filter vocabulary-games check-types` (after the dependency build above) | 0 | 0 errors |

## Failures left (outside the allowed files)

1. **`turbo.json`: `check-types` does not depend on `^build`.** On a clean or stale checkout,
   `pnpm --filter vocabulary-games check-types` fails, as shown in (b), until the workspace
   dependencies are built. The fix would be to add `"^build"` to `check-types.dependsOn`, or to point
   the package `types` exports at source. Both changes are outside the allowed files, so I did not
   make them.
2. **game-cartridges `build` does not clean `dist/`.** Stale files of any kind stay after a build.
   The Vitest `include` now keeps them out of tests, but `tsup --clean` (in `package.json`) would
   remove them. Not changed: outside the allowed files.
3. **Branch note.** The session setup named `claude/fix-vitest-apk-types-5631u4`. The task said to
   work on `pilot/cloud-games-small` only, so all work is there.
