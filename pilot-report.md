# Pilot report: authz fixes for Primary Advantage, findings 1 to 4

Base: commit 0c37d4189 (01f2acfe8 plus `authz-primary-report.md`). Branch: `pilot/cloud-authz-primary-fix`.
Each finding has one test commit first and one fix commit after it.
The test commit fails before the fix, and passes after it.

## Finding 1: XP minting through retakeQuiz, finishQuiz and submitChapterWritten

- **Test:** `apps/primary-advantage/actions/__tests__/xp-minting.test.ts`, 7 tests.
- **Gap shown:** a forged MC submit paid 53 XP. `retakeQuiz` deleted the activity row and took story types.
- **Fix:**
  - `retakeQuiz` keeps the activity row and marks it not complete. The XP log stays tied to that row.
  - `retakeQuiz` takes only an article uuid and the MC, SA or LA type. Story types get "Invalid retake".
  - `awardQuestionXp` inserts the XP log with `onConflictDoNothing` on the user and row. A second award pays no XP and no GP.
  - `finishQuiz` reads the stored MC answer key and grades each response on the server. `gradeMcResponses` keeps one response for each stored question.
- **Commits:** 309904cca (test), 820ed458a (fix).
- **Callers changed:** none. The signatures stay the same. Every caller of `retakeQuiz` passes `MC_QUESTION`.
- **Test fixtures changed:** `finish-quiz-existing-row`, `finish-quiz-evidence` and `award-question-xp` gain `onConflictDoNothing` and the key read. No assertion changed.
- **Risk that stays:**
  - SA and LA XP still comes from the client score, clamped at 5 and 25.
  - `submitChapterWritten` still takes the AI score from the client, capped at 25. It now pays once for each chapter and kind.
  - `restartLessonAction` in `packages/domain` deletes activity rows. A new row then gets a new XP log. That fix is outside scope.
  - The evidence keys in `data.questions` still carry the client's `correct` flag.
  - A reopened row with `completed = false` stays until the resubmit. Readers that ignore `completed` count it.

## Finding 2: upload/csv and upload/classes

- **Tests:** `app/api/upload/csv/__tests__/class-access.test.ts` (3 tests) and `app/api/upload/classes/__tests__/class-access.test.ts` (2 tests).
- **Gap shown:** a TEACHER imported teachers, and filled another teacher's class, with status 200.
- **Fix:**
  - Both routes refuse teacher rows (`teachers.csv`, and `classes.csv` on the csv route) with 403 for callers below ADMIN.
  - Both routes call `canManageClassroom` on each matched class before any write. One unmanaged class refuses the whole file with 403.
  - The csv route reads each class once, before the user writes, and reuses that row.
- **Commits:** b75462706 (test), 2c9668be3 (fix).
- **Callers changed:** none. `app/[locale]/admin/import-data/page.tsx` already shows the `details` of a refusal.
- **Test fixtures changed:** five upload tests now use an ADMIN session for teacher rows. They also queue the class read of `canManageClassroom`.
- **Risk that stays:**
  - The rank check reads the session role only. A legacy `user_roles` admin row does not count.
  - A class created between the check and the write is not checked again.

## Finding 3: the lesson chatbot

- **Test:** `app/api/assistant/lesson-chatbot/__tests__/abuse.test.ts`, 4 tests.
- **Gap shown:** the route had no rate limit. It put client-written article text into the system prompt.
- **Fix:**
  - The route allows 40 calls in 10 minutes for each user, with `consumeRateLimit`. Call 41 gets 429.
  - The body is `{ articleId, messages, isInitial }`, with a strict schema. Client article text gets 400.
  - `getLessonChatbotContext` in `server/models/articleModel.ts` loads the article text and its question list. A missing or draft article gets 404.
- **Commits:** b5544c46f (test), 50c7475eb (fix).
- **Callers changed:** `components/lesson/lesson-language-question.tsx` sends `articleId` and no article text.
- **Test fixtures changed:** `lesson-chatbot/__tests__/route.test.ts` sends the new body and mocks the article read. The size-limit cases still return 400.
- **Risk that stays:**
  - The limit store lives in memory, so each Cloud Run instance counts on its own.
  - Any signed-in role can still call the route. The 60 messages of 4000 characters still come from the client.

## Finding 4: getFeedback

- **Test:** `apps/primary-advantage/actions/__tests__/get-feedback-limits.test.ts`, 9 tests.
- **Gap shown:** the feedback schemas took any length. One user called the paid AI with no limit.
- **Fix:**
  - `lib/zod.ts` adds `.max()` caps through `FEEDBACK_CAPS`: language 32, passage 50000, question 1000, answer 2000.
  - `lib/zod.ts` adds `feedbackRequestSchema`. `getFeedback` checks it before the AI call and returns `{ error: "invalid" }`.
  - `getFeedback` allows 20 calls in 10 minutes for each user, with `consumeRateLimit`. Then it returns `{ error: "rate_limited" }`.
- **Commits:** f9ef5d1fd (test), c8aa93cb7 (fix).
- **Callers changed:**
  - `components/articles/questions/written-question-content.tsx` shows the error and opens no modal.
  - `components/lesson/practice/lesson-task-saq.tsx` shows the error, saves nothing and keeps the task open.
- **Risk that stays:**
  - The limit store lives in memory, so each instance counts on its own.
  - Any signed-in role can still call `getFeedback`. The question text still comes from the client.
  - `getChapterWrittenFeedback` calls the same AI with no rate limit.

## Commands

| Command | Exit code | Result |
|---|---|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | Installed. The lockfile did not change. |
| `./node_modules/.bin/turbo run test --filter=primary-advantage` (baseline, with the first test file only) | 1 | 2770 passed, 11 failed: 7 new tests and 4 known failures. 2 suites failed to load. |
| `./node_modules/.bin/turbo run build check-types lint test --filter=primary-advantage --continue` | 2 | 71 of 74 tasks passed. 3 tasks failed, listed below. |

Final test count: 2795 passed, 4 failed, in 406 files. 6 files failed: 4 with a failing test, 2 that did not load.
`primary-advantage#build` and `primary-advantage#check-types` passed.

## Failures and causes

All of these failures were in the baseline. No changed file causes one.

- `@reading-advantage/backend#check-types`: TS2820 `"usd"` in `packages/backend/src/modules/accounting/__tests__/submissions.test.ts:252`. This is known and outside scope.
- `primary-advantage#lint`: 13 errors, 863 warnings. The errors are in 4 files that this branch does not change:
  - `tests/pwa/fixtures/legacy-sw.js` (8)
  - `tests/pwa/fixture-server.mjs` (3)
  - `lib/safe-callback-path.ts` (1)
  - `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/rehearsal/__tests__/page.test.tsx` (1)
  - The changed files have 0 lint errors.
- `primary-advantage#test`, 4 failing tests:
  - `lib/__tests__/api-no-direct-db.test.ts`: `app/api/v1/help/events/route.ts` imports the db client directly.
  - `lib/__tests__/preview-guard-coverage.test.ts`: the non-GET stubs in `app/api/articles/[articleId]/route.ts` have no preview guard.
  - `components/nav/__tests__/app-nav.test.tsx`: the SYSTEM menu has a `helpreport` item that the test does not expect.
  - `chapter-page.test.tsx`: `next/image` encodes the image URL, so the raw `images/story/cl123.png` substring does not match.
- `primary-advantage#test`, 2 suites that did not load: `component-deduplication-behavior.test.tsx` and `loading-state-flow.behavior.test.tsx`. They fail with ENOENT on `packages/sales-knowledge/dist/data/evidence/release-candidate.json`.

## Changes needed outside scope

- `packages/domain/src/primary-lesson-attempts/attempts.ts`: a lesson restart deletes activity rows, so the next award gets a new XP log.
- `apps/primary-advantage/cloudbuild.yaml`: a shared rate-limit store, or `TRUST_PROXY_COUNT` (finding 5). The new limits count on each instance only.
