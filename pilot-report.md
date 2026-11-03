# Pilot report: primary-advantage lint and tests

Branch: `pilot/cloud-primary-lint-tests`, from `01f2acfe8`. Every change is under
`apps/primary-advantage`, except this report.

## Result

| Command | Exit | Result |
|---|---|---|
| `git fetch --unshallow` | 0 | |
| `pnpm install --frozen-lockfile` | 0 | lockfile unchanged |
| `./node_modules/.bin/turbo run build check-types lint test --filter=primary-advantage` (before the fixes, with `--continue`) | 2 | failed: `primary-advantage#test`, `@reading-advantage/db#check-types`, `@reading-advantage/backend#check-types` |
| `pnpm exec eslint .` in the app (before the fixes) | 1 | 13 errors, 864 warnings |
| `pnpm exec vitest run` on the 6 named files (before the fixes) | 1 | 6 of 6 files failed |
| the same turbo command (after the fixes) | **2** | failed only on `@reading-advantage/backend#check-types` (outside the app, see below); turbo stopped there |
| the same command with `--continue` (after the fixes) | 2 | 73 of 74 tasks pass. Only `@reading-advantage/backend#check-types` fails. primary-advantage build, check-types, and lint pass (0 errors, 515 warnings); its tests pass (401 of 401 files, 2807 of 2807 tests) |

The required command does not exit 0. The only cause is the backend type error listed under
"Failures left". I left it as it is: the task allows fixes only under `apps/primary-advantage`.

The warnings went from 864 to 515 because 349 of them were in `tests/pwa/fixtures/legacy-sw.js`,
which lint now skips (fix 3). No other warning changed.

## Lint errors (13)

1. **react-hooks/rules-of-hooks, 1 error**:
   `app/[locale]/teacher/class-roster/.../lessons/[number]/rehearsal/__tests__/page.test.tsx`.
   - **Cause:** `f5414151e` (feat(student): lessons skip saves in preview). An anonymous mock
     component (`default: () => ...`) calls `useStudentView`.
   - **Fix:** the mock is now a named component, `function LessonCard()`. It renders the same thing.
     Commit `46f1e497f`.
2. **no-control-regex, 1 error**: `lib/safe-callback-path.ts`.
   - **Cause:** `bf74dfaf6` (fix(auth): refuse unsafe callback after locale strip). It added
     `/[\u0000-\u001f\u007f]/`.
   - **Fix:** `[...path].some((c) => c <= "\u001f" || c === "\u007f")`. This is production code,
     but the result does not change. I checked every one of the 65,536 UTF-16 code units, plus
     surrogate pairs and lone surrogates: the old and new checks agree on all of them.
     `lib/__tests__/safe-callback-path.test.ts` and `proxy-callback.test.ts` pass. Commit `b22b34f06`.
3. **no-undef and others, 11 errors** in `tests/pwa/`:
   - **Causes:** `tests/pwa/fixture-server.mjs` came in with `9916b2f05` (test(pwa): takeover
     test in a real browser). It uses `process`, `URL`, and `console`, but the shared base config
     sets Node globals only for js, jsx, ts, and tsx files. `tests/pwa/fixtures/legacy-sw.js` came
     in with `bdc86696f`. It is a byte copy of the live legacy service worker (see
     `tests/pwa/fixtures/README.md`), so its source must not be edited.
   - **Fix:** in `eslint.config.mjs`, a block declares `process`, `URL`, and `console` for
     `tests/pwa/**/*.mjs`, and `legacy-sw.js` is added to the ignore list, next to the existing
     `public/` entry. This is a config ignore of a generated fixture, not an `eslint-disable`
     comment. Commit `1d8f0bb55`.

## Test failures (6 files)

1. **api-no-direct-db**: a new direct import of the db client in
   `app/api/v1/help/events/route.ts` (`import { db } from "@reading-advantage/db"`).
   - **Cause:** `a7a794c23` (feat(primary): help events route and panel events).
   - **Fix:** an existing function matches. `getUnscopedDB` from `@reading-advantage/domain`
     returns the same `db` singleton, and the `users/*` routes already use it. `recordHelpEvent`
     still scopes the insert with `createTenantDB` by the user's school, so the behavior is the
     same. The route test now mocks `getUnscopedDB` instead of the db module. Its assertion
     (`db: {}`) did not change. Commit `2c7cf09bf`.
2. **preview-guard-coverage**: `articles/[articleId]/route.ts` has write handlers but no guard.
   - **Cause:** `394a5f4d1` (fix(articles): sign-in for GET, 404 for POST). It exports
     `POST`, `PUT`, `PATCH`, and `DELETE` as `notFound`. They only answer 404 and write nothing.
   - **Fix:** this route is now in `EXEMPT`, with that reason. The test that checks the exempt list
     still requires that each entry has a write handler and no guard. Adding a guard instead would
     change the production response. Commit `a94f8d99d`.
3. **app-nav**: the SYSTEM menu now has a 4th item, `helpreport`.
   - **Cause:** `fe8bae268` (feat(primary): system help video report page) moved the committed menu.
   - **Fix:** the expected list now includes `helpreport`. Commit `b2cc5557c`.
4. **chapter-page**: the image `src` does not contain `images/story/cl123.png`.
   - **Cause:** `652777c75` (fix(primary): article pictures use the resizer). It removed
     `unoptimized`, so the picture goes through `/_next/image?url=<encoded>`. That commit updated
     `chapter-content.behavior.test.tsx` but not this test.
   - **Fix:** the test now expects `stringContaining(encodeURIComponent("images/story/cl123.png"))`.
     It is the same check against the URL-encoded path. Commit `eabfab2b4`.
5. **component-deduplication-behavior** and 6. **loading-state-flow.behavior**: both suites fail
   at import time:
   `ENOENT ... open '/@fs/home/.../packages/sales-knowledge/dist/data/evidence/release-candidate.json'`.
   - **Cause:** the import chain is test → `components/lesson/lesson-progress-bar.tsx` →
     `components/lesson/task/index.ts` → `actions/article.ts` and `actions/lesson-games.ts` →
     `@reading-advantage/domain` (root) → `sales-mastery` → `@reading-advantage/sales-knowledge`.
     `loadPackagedSalesEvidenceBytes` runs at import time and reads
     `new URL("./data/evidence/...", import.meta.url)`. That loader comes from `b86b137ff` and
     `03934b457` (fix(sales): make release evidence build-safe, and resolve media assets in docker
     build). Vitest inlines the linked workspace dist, and Vite rewrites that URL to a `/@fs/`
     path, which `readFileSync` cannot open. This fails even after the dist is built.
   - **Fix:** `vitest.config.ts` now lists the sales-knowledge `dist` folder under
     `server.deps.external`, so Node loads it with its real `file:` URL. The change is test config
     only and leaves production code as it is. Commit `f43c6aa4e`.
   - Once these two suites load, they run 33 more tests. That is why the total went from 2774
     to 2807.
   - In the first turbo run, the failures at module resolution (`Failed to resolve import
     "@reading-advantage/domain/..."`) went away once the dependency packages were built. They were
     not code errors.

## Failures left (outside apps/primary-advantage, not fixed)

- **`@reading-advantage/backend#check-types`** fails with
  `src/modules/accounting/__tests__/submissions.test.ts(252,40): TS2820: Type '"usd"' is not
  assignable to type '"THB" | "USD" | "JPY"'`.
  - **Cause:** `febc6a0dc` (feat(backend): restrict settled currencies,
    track `accounting_structural_alignment_20260919`) narrowed the currency type. The red test from
    `966019baf` still passes a lowercase `"usd"` on purpose.
  - This blocks the turbo command from exiting 0.
- **`@reading-advantage/db#check-types`** failed in the first run with
  `TS2307 Cannot find module '../../../domain/dist/...'` and `'../../../sales-knowledge/dist/index.js'`.
  - **Cause:** `63f1ec7e8` and `628468dae` (test(sales): Phase 2 red tests). The db package
    imports the dist of other packages, and turbo does not build those first.
  - It passed in the later runs because the dist folders existed by then. In a clean clone it fails.
    That is a build-order problem outside the app.

## Notes

- I made no database calls, read no secret, and deployed nothing. Lockfile versions did not change.
- The session setup named the branch `claude/primary-advantage-lint-tests-xjpit7`. The task named
  `pilot/cloud-primary-lint-tests`. Both pointed at `01f2acfe8`. All the work is on
  `pilot/cloud-primary-lint-tests`, as the task asked.
- Commit headers use the track from `git log` of the changed file. For the app-nav test, I used
  `primary_in_app_help_20261023`, the track whose commit moved the expectation. Config-only changes
  use `chore(primary-advantage):`.
