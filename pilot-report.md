# Primary Advantage coverage pilot

Scope: `apps/primary-advantage` server files under `lib`, `actions`, and `app/api`.
Base: commit `01f2acfe8`. Branch: `pilot/cloud-primary-app-coverage`.
This work adds test files only. It changes no source file, no `package.json`, and no lockfile.

## Coverage

The coverage scope holds 188 files.

| Measure | Before | After |
|---|---|---|
| Line coverage | 71.89% (2932/4078) | 79.76% (3253/4078) |
| Branch coverage | 64.10% (1797/2803) | 71.99% (2018/2803) |
| Statement coverage | 71.47% (3233/4523) | 78.86% (3567/4523) |
| Function coverage | 74.65% (489/655) | 79.69% (522/655) |

## Tests added per file

| Tested file | Line coverage | Branch coverage | Test file (tests) |
|---|---|---|---|
| `app/api/licenses/route.ts` | 62.22% → 97.77% | 45.90% → 93.44% | `app/api/licenses/__tests__/license-routes.test.ts` (40, both routes) |
| `app/api/licenses/[id]/route.ts` | 63.41% → 96.34% | 44.23% → 92.30% | same file |
| `actions/question.ts` | 58.18% → 100% | 52.63% → 100% | `actions/__tests__/question-actions.test.ts` (22) |
| `app/api/flashcard/cards/[cardId]/review/route.ts` | 31.57% → 97.36% | 30.00% → 80.00% | `app/api/flashcard/cards/[cardId]/review/__tests__/review-route.test.ts` (9, 1 expected fail) |
| `actions/flashcard.ts` | 58.00% → 68.25% | 40.22% → 52.87% | `actions/__tests__/flashcard-card-actions.test.ts` (21, 1 expected fail) |
| `actions/class-books.ts` | 58.82% → 100% | 27.77% → 100% | `actions/__tests__/class-books-actions.test.ts` (10) |
| `app/api/classroom/route.ts` | 0% → 92.85% | 0% → 87.50% | `app/api/classroom/__tests__/classroom-routes.test.ts` (12, both routes) |
| `app/api/classroom/[id]/route.ts` | 0% → 80.00% | 0% → 71.42% | same file |
| `app/api/upload/csv/cleanup/route.ts` | 33.33% → 100% | 30.00% → 100% | `app/api/upload/csv/cleanup/__tests__/cleanup-files.test.ts` (11) |
| `app/api/schools/route.ts` | 0% → 98.00% | 0% → 96.87% | `app/api/schools/__tests__/schools-route.test.ts` (13) |
| `actions/signinAction.ts` | 0% → 100% | 0% → 83.33% | `actions/__tests__/signin-practice-actions.test.ts` (14, both files) |
| `actions/practice.ts` | 0% → 100% | 0% → 92.85% | same file |
| `lib/session.ts` | 11.11% → 100% | 0% → 100% | `lib/__tests__/session-and-evidence-queue.test.ts` (10, both files) |
| `lib/primary-evidence-queue.ts` | 0% → 100% | 0% → 100% | same file |

The new files hold 162 tests. 160 pass. 2 are expected fails that mark defects.
The order follows risk: licenses (money), sessions (auth), quiz grading and XP, class writes, uploads.

## Defects

Each defect has an `it.fails` test in its own commit. No source file changes.

1. `actions/flashcard.ts:811-823`: `reviewCard` seeds FSRS with state `NEW` and empty stability on every review.
   Every Good review schedules the card 3 days out, whatever its history.
   Test: `actions/__tests__/flashcard-card-actions.test.ts`, "gives a longer interval after a second correct review than after the first".
2. `app/api/flashcard/cards/[cardId]/review/route.ts:129,145`: the route writes `user_activity` and `xp_logs` with plain inserts keyed on the card.
   The unique keys at `packages/db/src/schema/progress.ts:24` and `packages/db/src/schema/analytics.ts:25` refuse a second review of the card.
   The second review answers 500. No caller in this repository uses this route.
   Test: `review-route.test.ts`, "accepts a second review of the same card".

## Open questions (no test marks them)

- `actions/question.ts:47`: `retakeQuiz` deletes the activity row. The next `finishQuiz` pays XP again. The product intent decides if this is a defect.
- `app/api/licenses/[id]/route.ts:132`: a PUT without `expiryDays` clears the license expiry date.
- `app/api/licenses/route.ts:151`: GET takes any `limit` value. No cap applies.
- `app/api/schools/route.ts:159`: GET answers user and admin counts of 0 for every school.
- `actions/signinAction.ts:22` and `actions/practice.ts:69` call the app's own API from the server. No page calls `signInAction` or `getSentencesForOrderingGame`.

## Baseline failures

These failures exist at the base and stay as they are.

- 2 suites fail with ENOENT on `packages/sales-knowledge/dist/data/evidence/release-candidate.json`: `component-deduplication-behavior.test.tsx` and `loading-state-flow.behavior.test.tsx`.
- 4 tests fail: `api-no-direct-db.test.ts`, `preview-guard-coverage.test.ts`, `app-nav.test.tsx`, and `chapter-page.test.tsx`.

## Commands

All commands ran from the repository root or `apps/primary-advantage`.

| Command | Exit code | Result |
|---|---|---|
| `git fetch --unshallow` | 0 | The clone holds full history. |
| `pnpm install --frozen-lockfile` | 0 | The lockfile stays unchanged. |
| `vitest run --coverage` (before package builds) | 1 | 320 of 401 test files fail: workspace packages lack `dist` builds. |
| `./node_modules/.bin/turbo run build --filter='primary-advantage^...'` | 0 | 24 of 24 build tasks pass. |
| `vitest run --coverage` (before) | 1 | 401 test files: 6 fail. 2774 tests: 2770 pass, 4 fail. |
| `tsc --noEmit -p tsconfig.json` (first run) | 2 | 9 errors, all in new tests: `AuthError` needs a code. A commit fixes them. |
| `tsc --noEmit -p tsconfig.json` (final) | 0 | 0 errors. |
| `eslint <new test files>` | 0 | 0 problems. |
| `vitest run --coverage` (after) | 1 | 411 test files: 6 fail. 2936 tests: 2930 pass, 4 fail, 2 expected fails. |

The coverage command is:

```bash
cd apps/primary-advantage
../../node_modules/.bin/vitest run --coverage --coverage.provider=v8 \
  --coverage.reporter=json-summary --coverage.reporter=json --coverage.reporter=text-summary \
  --coverage.include='lib/**' --coverage.include='actions/**' --coverage.include='app/api/**' \
  --coverage.exclude='**/*.test.*' --coverage.exclude='**/__tests__/**' \
  --coverage.reportOnFailure --coverage.reportsDirectory=<dir>
```

`@vitest/coverage-v8` 4.1.8 is already installed. The run installs nothing.
No test uses a database or a secret.
