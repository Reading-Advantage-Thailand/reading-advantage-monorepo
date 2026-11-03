# Pilot report: turbo check-types and pnpm pre-run check

Base commit: `01f2acfe8`. Branch: `pilot/cloud-turbo-tooling`.
Files changed: `turbo.json`, `pnpm-workspace.yaml`. No `.npmrc` exists, and `package.json` was not changed.
Environment: node 22.23.4, pnpm 11.8.0 (from `packageManager`), turbo 2.9.18, 4 CPUs, 15 GB RAM.

## Setup

| Command | Exit |
|---|---|
| `git fetch --unshallow` | 0 (5764 commits) |
| `pnpm install --frozen-lockfile` | 0 (warnings only: the `tutorial-check` bin targets `activity-tutorial/dist/cli.js`, which does not exist before a build) |

## (a) check-types fails on a clean tree

### Cause

- Commit `d35ba3e6b` (fix(build,packages): Phase 4, 2026-05-02) moved the `exports` `types` entries of the workspace packages from `./src/*.ts` to `./dist/*.d.ts`. Later packages follow the same pattern (for example `993cddf52` for advantage-play-kit-3d).
- Commit `04df0790b` (chore(infra): scaffold pnpm workspace and turborepo pipeline) set `check-types.dependsOn` to `["^check-types"]` only. Nothing builds `dist/` before tsc runs.
- On a tree with no `dist/` folders, 24 check-types tasks fail. There are 2781 TS2307 errors (`Cannot find module '@reading-advantage/db'` and others). The TS7006, TS2339 and TS18046 errors that follow come from the same missing types.

### Fix (commit `cf9b52d8a`, `chore(turbo): ...`)

1. `check-types.dependsOn` is now `["^check-types", "^build"]`. This adds the 30 package builds and no Next.js app builds: no app is a dependency of another workspace project.
2. New task `@reading-advantage/db#check-types` also depends on `@reading-advantage/domain#build` and `@reading-advantage/sales-knowledge#build`. The red tests `packages/db/src/__tests__/sales-phase2-review-a-durable.red.test.ts` (`63f1ec7e8`) and `sales-phase2-transaction-atomicity.red.test.ts` (`628468dae`) import `../../../domain/dist/...` and `../../../sales-knowledge/dist/...` by relative path. `domain` depends on `db`, so `db` cannot list `domain` as a dependency, and `^build` does not cover this case. The graph has no cycle: `domain#build` needs `db#build`, not `db#check-types`.

### Runs (all dist folders removed first; `./node_modules/.bin/turbo run check-types --concurrency=2`)

| Run | Exit | Result |
|---|---|---|
| Before the fix, `--continue` | 1 | 21 of 45 tasks pass. 24 fail: activity-runtime, api, auth, backend, codecamp-knowledge, db, domain, game-cartridges-3d, knowledge-space-practice, mastery-runtime-compat, sales-knowledge, srs-engine, webhooks, worker, accounting, accounts, codecamp-advantage, marketing, primary-advantage, reading-advantage, sales-advantage, science-advantage, vocabulary-games, workbooks. Time: 3m45s. |
| After the fix, cold, `--force` (no cache), exact command | 2 | 55 of 57 tasks pass. The run stops at `@reading-advantage/backend#check-types` (see "Failures left"). Time: 3m50s. |
| After the fix, `--continue` | 2 | 69 of 71 tasks pass. 2 fail: `@reading-advantage/backend`, `reading-advantage`. No TS2307 from a missing `dist` remains. |
| After the fix, warm, `--continue` | 2 | 69 of 69 passing tasks are cached. Time: 27.6s. Most of this is the two failing tasks, which are not cached and run again. |

Warm-run cost, same filter (`--filter=!reading-advantage --filter=!@reading-advantage/backend`, which still pulls in backend through `^check-types`), each primed once first:

| turbo.json | Tasks | Warm time (2 runs) |
|---|---|---|
| Before (`01f2acfe8`) | 31 | 21.6s, 22.2s |
| After | 66 (35 are cached builds) | 18.9s, 18.4s |

The warm run is not slower. The extra build tasks are cache hits.

## (b) `CI=true pnpm turbo run test` enters an install before the run

### Cause

- Commit `6d197f795` (chore(pnpm): upgrade to pnpm@11.8.0 and migrate config, track `pnpm11_major_migration`) moved the repo to pnpm 11. In pnpm 11, `verify-deps-before-run` defaults to `install`. Before every `pnpm <cmd>` (including `pnpm turbo`), pnpm checks the workspace state, and if it looks out of date, it runs a nested `pnpm install` through `spawnSync`.
- The setting that makes the check fail is `enableGlobalVirtualStore`. pnpm 11.8.0 sets it to `false` when `CI=true` (`if (pnpmConfig.ci && pnpmConfig.enableGlobalVirtualStore == null) ... = false`) and leaves it `undefined` otherwise. The check compares the stored value and the current value strictly. With `pnpm_config_verify_deps_before_run=warn`, pnpm prints the reason: `The value of the enableGlobalVirtualStore setting has changed`.
- So `pnpm install --frozen-lockfile` without CI, followed by `CI=true pnpm turbo ...` (or the reverse), always starts a nested install. This is the step that prints `Done` before turbo starts. I saw the nested install every time the CI mode changed (`Packages: -336 ... Done in 7–30s`).
- **What I could not reproduce:** here the nested install exited, and turbo ran after it (exit 0, both with and without a pseudo-TTY via `script`). I did not see the process stay alive after `Done`. The fix removes the nested install, and the nested install is where the hang was reported.

### Fix (commit `769380519`, `chore(pnpm): ...`)

`pnpm-workspace.yaml`: `enableGlobalVirtualStore: false`, with a comment. This is the value pnpm already uses under CI. Without CI, the value was `undefined`, which pnpm also treats as false, so install behavior does not change. I checked this: the `node_modules` tree with and without the pin has the same 3051 manifests and no differences. `verifyDepsBeforeRun` keeps its default, so a real out-of-date tree is still detected.

### Runs

| Command | Exit | Nested install? |
|---|---|---|
| Before: `pnpm install --frozen-lockfile`, then `CI=true timeout 600 pnpm turbo run test --dry-run` | 0 | yes (`Packages: -336`, `Done in 29.7s`) |
| After: `pnpm install --frozen-lockfile`, then `CI=true timeout 600 pnpm turbo run test --dry-run` | 0 | no |
| After: `CI=true pnpm install --frozen-lockfile`, then `timeout 600 pnpm turbo run test --dry-run` | 0 | no |
| After: `CI=true timeout 600 ./node_modules/.bin/turbo run test --dry-run=json` | 0 | n/a. 78 tasks: 48 `test` and 30 `build`. |

I ran only the dry run that the task names. I did not run the test suites: no database was started, as instructed.

## Failures left (outside the allowed files, not fixed)

1. **`@reading-advantage/backend#check-types`**: `src/modules/accounting/__tests__/submissions.test.ts(252,40): error TS2820: Type '"usd"' is not assignable to type '"THB" | "USD" | "JPY"'`. The test passes a lower-case currency on purpose to check the runtime rejection. It came in with commit `966019baf` (test(accounting): red tests for expense submission, track `accounting_app_foundation_20260820`), and the `check-types` script type-checks tests through `tsconfig.test.json` (`ff47431cf`). A fix needs a test-file change, such as an `unknown` cast or a runtime-typed input. This is outside scope and not a tooling fault.
2. **`reading-advantage#check-types`**: `tsc --noEmit` runs out of memory at the default V8 heap (about 2 GB): `FATAL ERROR: ... JavaScript heap out of memory`, exit 134. This also happens before the fix. With `NODE_OPTIONS=--max-old-space-size=6144`, tsc finishes and reports 14 real errors that the OOM was hiding:
   - 9 × TS2307 in `components/index/book.tsx` and `components/ui/toaster.tsx` (both from `60bc7c2dd`, the monorepo migration)
   - 2 × TS2352 in `app/[locale]/(student)/student/games/apk/[cartridgeId]/page.test.tsx`
   - 2 × TS18048 in `app/api/v1/apk/routes.test.ts` (last changed in `6e890c307`)
   - 1 × TS2367 in `components/apk/StudentCartridgeHost.tsx:480` (last changed in `45becfb2c`)

   A heap setting would go in `apps/reading-advantage/package.json`, and the errors are in app files. Both are outside the allowed files.
3. **next-env.d.ts rewritten by the build** (reported, not reproduced: I did not run the Next.js app builds). `apps/accounting`, `apps/accounts`, `apps/sales-advantage`, `apps/science-advantage` and `apps/workbooks` commit `next-env.d.ts`. The other apps list it in `.gitignore`. Next 16 (`writeAppTypeDeclarations`) writes this file on every build or dev run, and its content depends on the mode. For example, `apps/sales-advantage/next-env.d.ts` has the dev path `./.next/dev/types/routes.d.ts` (from `025f8fc9f`), and a build writes `./.next/types/routes.d.ts`. A fix needs a change to each app's `.gitignore` and a `git rm --cached`, which is outside the allowed files.

## Commits

- `cf9b52d8a` chore(turbo): make check-types wait for dependency builds
- `769380519` chore(pnpm): pin enableGlobalVirtualStore to stop nested installs
- this report

Neither changed file has a non-chore owning track for these lines. The `check-types` task and the pnpm settings come from chore commits (`04df0790b`, `6d197f795` config migration), so both commits use `chore(<scope>):` headers. No lockfile change, no assertion change, no ts-ignore, ts-expect-error, eslint-disable or skip.
