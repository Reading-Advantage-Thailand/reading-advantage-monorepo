# Primary UI and auth implementation

Date: 2026-09-07

## Result

The shared auth client now provides an authoritative `refresh()` action.

Each login, logout, or refresh increments an action generation. An older response cannot replace state after a newer action. A completion refresh cannot run after logout starts.

A failed login now clears the initial loading state. Refresh updates XP, role, and the full session user from `/api/auth/session`.

Primary completion flows now await `refresh()` after successful writes. The flows retain their completion state, toast, modal, and router behavior.

Completion flows obtain `refresh()` from `useAuth()`. The state-only `useSession()` contract remains unchanged.

Primary navigation now compares uppercase role values. The school leaderboard now requires a student school before its query.

Article pages now handle the single nullable flashcard row. The save flow uses the matching completed user activity.

Report pages normalize nullable activity fields at the presentation boundary. The teacher report uses the selected student's name and CEFR level.

The sentence manager now uses the current `flashcardCards` row. It no longer presents a due date that the table does not store.

The assignment table now uses the current student assignment status and response fields. Nullable due dates show a clear empty value.

The license form now derives nullable names and start dates from stored license fields.

The unused storage probe and its hidden test-page control were removed.

The classroom-code action now resolves its actor on the server. It denies unauthorized callers before the model call.

Student login codes now use `generateSecureCode(8)` and retain the uppercase alphanumeric format.

The CSV route documentation now states that imported rows can contain only student or teacher roles.

## Validation

From `packages/auth-client`:

```bash
node ../../node_modules/vitest/vitest.mjs run src/__tests__/hooks.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Result: 1 file passed and 21 tests passed.

From `apps/primary-advantage`:

```bash
node ../../node_modules/vitest/vitest.mjs run actions/__tests__/classroom.authorization.test.ts components/pratice/__tests__/order-words-game.completion.test.tsx components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx server/models/__tests__/classroomModel.authorization.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Result: 4 files passed and 9 tests passed.

From `apps/primary-advantage`:

```bash
node ../../node_modules/vitest/vitest.mjs run components/__tests__/authoritative-session-refresh.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Result: 1 file passed and 16 tests passed.

The final completion test run used this command:

```bash
CI=true node ../../node_modules/vitest/vitest.mjs run components/__tests__/authoritative-session-refresh.test.ts components/pratice/__tests__/order-words-game.completion.test.tsx components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism
```

Result: exit 0. Three files and 18 tests passed.

The auth client build used this command from `packages/auth-client`:

```bash
node ../../node_modules/tsup/dist/cli-default.js src/index.ts --format esm --dts
```

Result: exit 0. The JavaScript and declaration builds passed.

The final Primary type check used this command from `apps/primary-advantage`:

```bash
node ../../node_modules/typescript/bin/tsc --noEmit --pretty false
```

Result: exit 0 with no diagnostics.

`git diff --check` passed.

A root-level mixed test invocation failed because it bypassed package test environments and aliases. The package-scoped reruns above passed.

## Changed files

- `packages/auth-client/src/context.ts`
- `packages/auth-client/src/provider.tsx`
- `packages/auth-client/src/__tests__/hooks.test.tsx`
- `apps/primary-advantage/actions/classroom.ts`
- `apps/primary-advantage/actions/__tests__/classroom.authorization.test.ts`
- `apps/primary-advantage/app/[locale]/(student)/student/read/[articleId]/page.tsx`
- `apps/primary-advantage/app/[locale]/(student)/student/reports/page.tsx`
- `apps/primary-advantage/app/[locale]/system/test/page.tsx`
- `apps/primary-advantage/app/[locale]/teacher/student-progress/[id]/page.tsx`
- `apps/primary-advantage/components/__tests__/authoritative-session-refresh.test.ts`
- `apps/primary-advantage/components/articles/article-select.tsx`
- `apps/primary-advantage/components/articles/questions/mc-question-card.tsx`
- `apps/primary-advantage/components/articles/questions/sa-question-content.tsx`
- `apps/primary-advantage/components/dashboard/user-reading-chart.tsx`
- `apps/primary-advantage/components/flashcards/flashcard-game.tsx`
- `apps/primary-advantage/components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-sentence-matching.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-vocabulary-flashcard-card.tsx`
- `apps/primary-advantage/components/lesson/games/lesson-vocabulary-matching.tsx`
- `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx`
- `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx`
- `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx`
- `apps/primary-advantage/components/manage-tab.tsx`
- `apps/primary-advantage/components/nav/user-account-nav.tsx`
- `apps/primary-advantage/components/pratice/__tests__/order-words-game.completion.test.tsx`
- `apps/primary-advantage/components/pratice/cloze-test-game.tsx`
- `apps/primary-advantage/components/pratice/matching-game.tsx`
- `apps/primary-advantage/components/pratice/order-sentences-game.tsx`
- `apps/primary-advantage/components/pratice/order-words-game.tsx`
- `apps/primary-advantage/components/school/school-detail.tsx`
- `apps/primary-advantage/components/school/school-profile-form.tsx`
- `apps/primary-advantage/components/shared/app-layout.tsx`
- `apps/primary-advantage/components/student-assignment-table.tsx`
- `apps/primary-advantage/components/system/edit-license-form.tsx`
- `apps/primary-advantage/components/teacher/my-students.tsx`
- `apps/primary-advantage/lib/test.ts` (removed)
- `apps/primary-advantage/types/index.d.ts`
- `apps/primary-advantage/server/models/classroomModel.ts`
- `apps/primary-advantage/server/models/__tests__/classroomModel.authorization.test.ts`
- `apps/primary-advantage/app/api/upload/csv/route.ts`

Root must update `graph.db` for these structural edits.

## Remaining diagnostic groups

No Primary TypeScript diagnostic remains.

Known repository work still includes the Reading Advantage failures listed in the review report.
