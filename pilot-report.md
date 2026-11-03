# Pilot report: reading-advantage check-types, lint, test

Base: `01f2acfe8` on `pilot/cloud-reading-advantage-app`. Only files under `apps/reading-advantage`
were changed (plus this report).

Command (both runs): `./node_modules/.bin/turbo run build check-types lint test --filter=reading-advantage`

## Setup

| Step | Exit |
|------|------|
| `git fetch --unshallow` | 0 |
| `pnpm install --frozen-lockfile` | 0 (one warning: bin `tutorial-check` not linked because `activity-tutorial/dist` did not exist yet) |

## Before (cold cache, run with `--continue` to see every failure)

`Tasks: 59 successful, 68 total`. Failed tasks:

- `reading-advantage#check-types`: `FATAL ERROR: ... JavaScript heap out of memory`, exit 134
- `reading-advantage#lint`: 1 error, `Definition for rule '@next/next/no-img-element' was not found`, plus 2154 warnings
- `reading-advantage#test`: 1 failed, 1062 passed, 1063 total (152 suites, 1 failed)
- `db`, `auth`, `advantage-play-kit`, `codecamp-knowledge`, `domain`, `api` `#check-types`: exit 2, outside scope (see "Failures left")

## Causes and fixes

### 1. check-types: heap out of memory (exit 134)

- **Cause:** `tsc --noEmit` loads 6501 files. The `googleapis` declarations alone are 1.54 M lines in 851 files
  (imported by `utils/classroom.ts`, `store/classroom-store.ts`, `components/teacher/my-classes.tsx`,
  `app/api/v1/classroom/oauth2/classroom/courses/route.ts`). `--extendedDiagnostics` reports 2.5–2.9 GB
  "Memory used". The default V8 heap limit on this machine is 2096 MB.
- **Commit:** no single commit. I measured "Memory used" in a clean worktree at points through the app's
  history: migration commit `60bc7c2dd` (feat: migrate reading-advantage into monorepo, 2026-05-01)
  2.42 GB; `7fd2b503c` 1.98 GB; `2b73a7e28` 2.42 GB; `dc5f51ad2` 2.39 GB; `2ebaa5bcb` 2.18 GB;
  `779f4a542` 2.47 GB; HEAD 2.52 GB. The app has been at or above the ~2 GB default since the migration in
  `60bc7c2dd`. Its `check-types` script has always been a plain `tsc --noEmit` with no heap setting
  (the `build` script already sets 8192 MB).
- **Fix:** `apps/reading-advantage/package.json`:
  `"check-types": "cross-env NODE_OPTIONS=--max-old-space-size=4096 tsc --noEmit"`. This follows the
  existing `build` pattern and uses the `cross-env` already installed. No files are excluded.
  Commit `f1841fe7b`.
- **Exposed errors:** with enough memory, tsc then reported 5 type errors. All came in with `6e890c307`
  (chore(measure): add phase review findings for the five reading ux tracks, 2026-09-12) and
  `45becfb2c`. They were never seen because the OOM always hid them:
  - `app/[locale]/(student)/student/games/apk/[cartridgeId]/page.test.tsx:66,75` TS2352,
    `(notFound as jest.Mock)` where `notFound` is `() => never` (from `6e890c307`). Fix:
    `jest.mocked(notFound)`.
  - `app/api/v1/apk/routes.test.ts:145,146` TS18048, `readResponse`/`equipResponse` possibly undefined
    (from `6e890c307`). `getStudentContext()` returns object literals that TS normalizes to
    `error?: undefined`, so the route handlers' inferred return type includes `undefined`. Fix (test only):
    `expect(readResponse?.status).toBe(200)`. This still fails if the response is undefined.
    Commit `e3e3c855a` covers both test files.
  - `components/apk/StudentCartridgeHost.tsx:480` TS2367, `transition.from !== "paused"` where
    `GameLifecycleTransition` has no `paused` phase (from `45becfb2c`, fix(reading): pass game mode from
    page, track `loading_state_correctness_20260911`). The real host schema-parses every transition, but
    the test "records RPG baselines only for replay and fresh play transitions" passes
    `{ from: "paused", to: "playing" }` and expects no new session. So the guard is kept as is and only the
    comparison is widened: `(transition.from as string) !== "paused"`. Runtime behavior is unchanged.
    Commit `dce842f31`.

### 2. lint: `Definition for rule '@next/next/no-img-element' was not found`

- **Cause:** `apps/reading-advantage/__test__/word-list-data-source.test.tsx:28` had an
  `// eslint-disable-next-line @next/next/no-img-element` directive. The shared flat config
  (`@reading-advantage/config/eslint`) does not load `@next/eslint-plugin-next`, and the app does not
  install it, so ESLint cannot resolve the rule name. Introduced in `fdd093147` (refactor(reading): merge
  word list dialogs with data source, track `component_deduplication_20260911`).
- **Fix:** removed the stale directive. Nothing reports that rule, so no warning replaces it. Adding the
  plugin would need a lockfile change. Commit `37f0beb4f`.

### 3. test: `__tests__/controllers/post-activity-log-idempotency.test.ts` (expected 1 xpLogs row, received 0)

- **Cause:** the test (from `9366f27a1`, track `wave1_high_risk_product_failures_20260628`) posts
  `ARTICLE_READ`. Commit `89dda10d6` (fix(reading): enforce xp authority and staff scope, track
  `structural_ux_alignment_20260911`) made XP server-owned through `xpForActivityType`/`ACTIVITY_XP`, and
  `ARTICLE_READ` has no entry there, so it awards 0 XP. The idempotent insert path is never reached. The
  idempotency logic itself works.
- **Fix:** the test now uses `ARTICLE_RATING` (server-awarded 10 XP), the committed state since
  `89dda10d6`. The assertion "exactly one xpLogs row" is unchanged. Commit `289e0e12e`.

### 4. test: `components/apk/StudentCartridgeHost.test.tsx` › "retries a transient content-load failure"

- **Cause:** the test (from `6feed85e9`, track `apk_product_simplification_20260820`) returns
  `{ term: "river", translation: "river" }` with no target-locale fields on the retry. Commit `45becfb2c`
  (track `loading_state_correctness_20260911`) made `dragon-flight` require
  `requestedTargetLocale: "th"` and Thai `selectedTargetLocales`, so the retry shows
  "Thai translations are unavailable for this game." and the game host never mounts.
- **Fix:** the retry payload now matches the committed contract: `requestedTargetLocale: "th"`,
  `selectedTargetLocales: ["th"]`, translation `แม่น้ำ`. The assertions are unchanged (the host mounts
  and shows "river", fetch is called twice). Commit `ff76985bc`.

## After

`./node_modules/.bin/turbo run build check-types lint test --filter=reading-advantage` exited **0**:
`Tasks: 68 successful, 68 total` (58 cached).

- `reading-advantage:check-types`: exit 0
- `reading-advantage:lint`: exit 0, `2154 problems (0 errors, 2154 warnings)` (warnings left as instructed)
- `reading-advantage:test`: exit 0, `Test Suites: 152 passed, 152 total`, `Tests: 1063 passed, 1063 total`
- `reading-advantage:build`: exit 0

No production behavior changed. No assertion was weakened or deleted. No ts-ignore, ts-expect-error,
eslint-disable or skip was added. The lockfile is unchanged.

## Failures left (outside `apps/reading-advantage`, not fixed)

- **Cold-cache check-types race in dependency packages.** On the first run, `check-types` failed with
  exit 2 for `@reading-advantage/db` (9 errors), `auth` (44), `advantage-play-kit` (48),
  `codecamp-knowledge` (2), `domain` (29) and `api` (52). All are TS2307 "Cannot find module" errors for
  other packages' `dist/` output (for example `../../../domain/dist/...`, `@reading-advantage/db`, and
  `game-contracts` exports), plus follow-on implicit-any errors. Root `turbo.json` makes `check-types`
  depend only on `^check-types`, not `^build`, so on a clean checkout it can run before those `dist/`
  folders exist. After `build` had produced them, all six passed on the second run. Without `--continue`,
  a truly cold run can still fail here. A likely fix is adding `"^build"` to `check-types.dependsOn` in
  root `turbo.json`, which is outside the allowed scope.
- **Install warning:** `pnpm install` could not link the `tutorial-check` bin because
  `packages/activity-tutorial/dist/cli.js` does not exist before a build. It is harmless here and outside
  scope.
