# Pilot report: CodeCamp Advantage coverage

Base commit: `01f2acfe8ae9d9ef88c2a62cb425992a00261bab`. Branch: `pilot/cloud-codecamp-app-coverage`.

## Scope

- The work adds 14 test files under `apps/codecamp-advantage`.
- The work changes no source file, no package file, and no lockfile.
- The coverage scope is `lib/**` and `app/**/*.ts`, without test files.
- The app has no `server/` directory. The tests target `lib` and the route handlers.

## Coverage

| Metric | Before | After |
| --- | --- | --- |
| Lines | 81.83% (473/578) | 97.57% (564/578) |
| Branches | 75.60% (341/451) | 93.79% (423/451) |

## Tests per file

| Test file | Tests | Tested file | Lines before → after | Branches before → after |
| --- | --- | --- | --- | --- |
| `app/webhooks/github/pr/route.test.ts` | 4 | `app/webhooks/github/pr/route.ts` | 0.0 → 100.0 | 100.0 → 100.0 |
| `app/api/internal/tutorial-repository-capture/route.test.ts` | 10 | `app/api/internal/tutorial-repository-capture/route.ts` | 27.8 → 100.0 | 16.7 → 100.0 |
| `lib/__tests__/node-tutorial-repository-capture.test.ts` | 6 | `lib/node-tutorial-repository-capture.ts` | 64.9 → 100.0 | 50.0 → 87.5 |
| `app/api/auth/login/route.error.test.ts` | 3 | `app/api/auth/login/route.ts` | 66.7 → 100.0 | 50.0 → 100.0 |
| `app/api/auth/reset-password/route.error.test.ts` | 3 | `app/api/auth/reset-password/route.ts` | 66.7 → 100.0 | 50.0 → 100.0 |
| `app/api/auth/session/route.branches.test.ts` | 3 | `app/api/auth/session/route.ts` | 100.0 → 100.0 | 62.5 → 100.0 |
| `app/api/trpc/[trpc]/route.branches.test.ts` | 7 | `app/api/trpc/[trpc]/route.ts` | 100.0 → 100.0 | 50.0 → 100.0 |
| `app/api/auth/logout/route.branches.test.ts` | 5 | `app/api/auth/logout/route.ts` | 83.3 → 100.0 | 80.0 → 100.0 |
| `app/api/auth/callback/route.branches.test.ts` | 5 | `app/api/auth/callback/route.ts` | 91.4 → 100.0 | 100.0 → 100.0 |
| `lib/__tests__/company-oidc-client.test.ts` | 5 | `lib/company-oidc.ts` | 69.2 → 100.0 | 83.3 → 100.0 |
| `lib/__tests__/module-utils-progress.test.ts` | 14 | `lib/module-utils.ts` | 68.8 → 100.0 | 78.0 → 100.0 |
| `app/api/tutor/intervention/route-actions.test.ts` | 10 | `app/api/tutor/intervention/route.ts` | 83.3 → 100.0 | 75.0 → 95.8 |
| `app/api/chat/__tests__/route-branches.test.ts` | 14 | `app/api/chat/route.ts` | 86.4 → 100.0 | 63.3 → 93.3 |
| `lib/__tests__/use-chat-stream-flow.test.ts` | 9 | `lib/use-chat-stream.ts` | 52.0 → 100.0 | 44.1 → 94.1 |

The tests cover these risks first:

- Webhooks: the PR route forwards the raw signed body byte-exact to the `/pr` handler.
- Data writes: the capture route takes a lease, releases it on failure, and maps limits to 429.
- Grading: the PR status ranks worker states over editorial states.
- Progress: module locks depend only on the nearest lower-order module.
- Auth handoff: session, tRPC, logout, and callback routes fail closed on missing or revoked sessions.
- Tutor writes: resource and evidence writes run in the learner's tenant and reject strict-schema extras.

## Defects

- The tests found no real defect. No test uses `it.fails`.

The tests pin these committed behaviors. Each one may deserve review:

- `app/api/chat/route.ts:127`: a malformed JSON body returns 500, not 400.
- `app/api/chat/route.ts:119`: the rate limit counts a request before input validation at line 128.
- `app/api/chat/route.ts:146`: a context lookup failure, such as a forbidden module, returns 500.
- `app/api/internal/tutorial-repository-capture/route.ts:20`: all bodies without a string `learnerId` share the lease key `invalid`.

## Failure that exists at the base

- `lib/__tests__/prod-smoke/phase-10-edge-cases-and-production-scenarios.test.ts:505` fails before and after this work.
- Its regex expects `expiresAt = new Date(Date.now() + 7 * ...)`.
- `packages/auth/src/session.ts:67` writes `opts?.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`.
- The source still sets 7 days. The regex is stale. A second launch-gate test fails on the same check.
- This work leaves both tests unchanged.

## Commands

| Command | Exit code | Result |
| --- | --- | --- |
| `git fetch --unshallow` | 0 | The clone has full history. |
| `pnpm install --frozen-lockfile` | 0 | The install changes no lockfile. |
| `vitest run --coverage.enabled ...` (first try, packages not built) | 1 | 19 files fail to import `dist` exports. |
| `./node_modules/.bin/turbo run build --filter='codecamp-advantage^...'` | 0 | 22 of 22 package builds pass. |
| Coverage run before (`../../node_modules/.bin/vitest run --coverage.enabled --coverage.reportOnFailure ...`) | 1 | 69 files: 1110 pass, 2 fail, 200 skip (1312). |
| Coverage run after (same command) | 1 | 83 files: 1208 pass, 2 fail, 200 skip (1410). |
| `vitest run` on the 14 new files | 0 | 98 pass. |
| `../../node_modules/.bin/tsc --noEmit -p .` | 0 | No type error. |
| `../../node_modules/.bin/eslint` on the 14 new files | 0 | No lint error. |

Coverage flags: `--coverage.provider=v8 --coverage.include='lib/**' --coverage.include='app/**/*.ts' --coverage.exclude='**/*.test.*' --coverage.exclude='**/__tests__/**'`.

- `@vitest/coverage-v8` 4.1.8 is already installed. The work installs nothing.
- The app has no local `node_modules/.bin`. The runs call the root `vitest` binary.
- The two exit-1 coverage runs come from the failure that exists at the base.
- No test needs a database or a secret.
- Git log shows no track for `app/webhooks/github/pr/route.ts`. Its commit uses the track of `packages/webhooks/src/github.ts`.
