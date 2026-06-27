# Line Review Evidence: primary-advantage-041

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-041
Files assigned: 2
Lines assigned: 682

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx` | 1-668 | reviewed | 10 |
| `apps/primary-advantage/components/lesson/task/index.ts` | 1-14 | reviewed | 0 |

## Findings

### LR-primary-advantage-041-001 — `previousTask` never persists regressed progress to the server; refresh reverts to the old phase

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:260-291`
- Evidence: `previousTask` (line 260) sets `currentTask` to `newPhase` (line 278) to update the UI, but unlike `nextTask` which calls `POST /api/lessons/${article?.id}` (line 219), `previousTask` never issues a fetch to persist the regressed progress. The server-side progress remains at the old higher value. On page refresh, `fetchCurrentPhase` (lines 72-118) reads from the API and restores the higher task number, silently reverting the user's navigation. The asymmetry is clear: `nextTask` has a full fetch-POST-update cycle (lines 219-243), while `previousTask` only has local state updates (lines 278-282) with no API call.
- Impact: High. A primary-student who navigates backward through the lesson and refreshes the page loses their position and is fast-forwarded to a later phase. The user may be confused by seeing content they haven't reached in their current navigation flow. This is especially problematic for younger students who may accidentally navigate away or whose browser refreshes.
- Recommendation: Add a `POST /api/lessons/${article?.id}` call inside `previousTask` with `progress: Math.round((newPhase / 14) * 100)` and `timeSpent: timer`, matching the pattern used in `nextTask`. Alternatively, if backward navigation should not persist (intentional design), add a comment explaining the decision and document it for the fork-divergence audit.

### LR-primary-advantage-041-002 — `nextTask` captures stale `timer` closure for `timeSpent`; timer continues ticking between function invocation and POST

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:191,224`
- Evidence: `nextTask` is declared as `async (Task: number, elapsedTime: number)` on line 191, but the `elapsedTime` parameter is never used — instead, line 224 reads `timer` from the component closure: `timeSpent: timer`. The `timer` value is captured from QuizContext at the time `nextTask` begins executing. Between the function call and the `await fetch(...)` on line 219, 200ms of animation delay elapses (line 207), during which the timer continues ticking. The `setPaused(true)` call on line 199 is a React state update that takes effect asynchronously, so the timer tick may not have stopped by the time the POST is sent. The `elapsedTime` parameter suggests an earlier intent to pass the current timer value from the caller, but it was never wired in.
- Impact: Medium. The `timeSpent` value sent to the server is up to ~200ms behind the actual elapsed time on every phase transition. Over 14 phases this accumulates to ~2.8 seconds of lost time tracking. For a primary-student educational app where time-on-task is a metric, this is a measurable but minor data accuracy issue. The bigger concern is the unused `elapsedTime` parameter, which suggests incomplete refactoring.
- Recommendation: Either (a) use the `elapsedTime` parameter in the POST body instead of `timer`, and pass `timer` from the call site on line 498, or (b) remove the `elapsedTime` parameter and document that `timer` from QuizContext is the intended source. For exact timing, capture `const capturedTimer = timer` immediately after `setPaused(true)` and before the animation delay.

### LR-primary-advantage-041-003 — `startLesson` unconditionally resets `timeSpent` to 0; discards any previously accumulated lesson time

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:149-156`
- Evidence: The `startLesson` function (line 133) calls `POST /api/lessons/${article?.id}` with `timeSpent: 0` hardcoded on line 155. However, the initial `fetchCurrentPhase` (line 72) may have loaded a non-zero `timeSpent` from the server and set it via `setTimer(data.userLessonProgress.timeSpent as number)` on line 93. If a user had previously spent time in the lesson (e.g., 120 seconds), navigated back to the introduction screen, and clicked "Start Lesson" again, the server's `timeSpent` is overwritten with 0. The timer value from QuizContext is available but unused.
- Impact: Medium. A primary-student who restarts a lesson loses all prior time-on-task data. For reporting dashboards (teacher views at `app/[locale]/teacher/reports/page.tsx` and `components/teacher/reports.tsx`), the accumulated time resets to zero, understating the student's engagement. This is a fork-specific regression because the "Start Lesson" button is only visible at task 1 (line 427), and the prior Reading Advantage flow may not have had a restart path.
- Recommendation: Replace `timeSpent: 0` with `timeSpent: timer` to preserve the accumulated time, or add `timeSpent: 0` only if this is a deliberate "fresh start" action (document the intent with a comment).

### LR-primary-advantage-041-004 — `previousTask` does not pause or manage the timer; inconsistent with `nextTask`'s timer management

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:260-291`
- Evidence: `nextTask` (line 191) calls `setPaused(true)` on line 199 before the phase transition, and conditionally calls `setPaused(false)` in the `finally` block on line 255 if not on task 14. In contrast, `previousTask` (line 260) never calls `setPaused` at all. The timer continues ticking during the backward navigation animation (200ms delay on line 275) and after the phase change. This means the timer runs during the back-navigation transition but is paused during forward-navigation transitions, creating an asymmetric UX.
- Impact: Medium. The timer behavior is inconsistent between forward and backward navigation. For primary students, this asymmetry may be confusing — the timer pauses when moving forward (correct behavior for a transition) but keeps running when moving backward. The time spent during the back-navigation animation is not captured in the server POST (because there is no POST — see finding 001), so it becomes phantom time that is counted locally but never persisted.
- Recommendation: Add `setPaused(true)` at the start of `previousTask` (after line 267) and `setPaused(false)` in the `finally` block (before line 289), matching the pattern in `nextTask`. If backward navigation should not affect the timer (intentional design), document this as an intentional product divergence.

### LR-primary-advantage-041-005 — `LessonTimer` defined inside component body; `React.memo()` is defeated on every parent re-render

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:384-391`
- Evidence: `LessonTimer` is declared as `const LessonTimer = React.memo(() => { ... })` on line 384, inside the `StandaloneLessonProgressBar` function body. Because the component function re-executes on every render, a new `LessonTimer` component identity is created each time, discarding the `React.memo()` wrapper's shallow-comparison cache. The `displayName` assignment on line 391 confirms the intent was to use memo for performance, but the placement defeats it. This pattern (defining memoized child components inside the parent) is a common React anti-pattern found across the Reading Advantage codebase.
- Impact: Low. The `LessonTimer` renders a simple string (`${Math.floor(timer / 60)}m ${timer % 60}s`) so the performance cost of re-creation is negligible. However, the anti-pattern signals a misunderstanding of React.memo's behavior and may be copied to more complex child components where the cost would be significant.
- Recommendation: Move `LessonTimer` outside the `StandaloneLessonProgressBar` component, or remove the `React.memo()` wrapper since it provides no benefit in this position. If the parent needs to pass `timer` as a prop, define `LessonTimer` at module scope and pass `timer` as a prop: `const LessonTimer = React.memo(({ timer }: { timer: number }) => ...)`.

### LR-primary-advantage-041-006 — Magic number `14` (total task count) used in 10+ locations without a named constant

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:85,87,95,153,211,215,223,254,457,540-544,559,594,632`
- Evidence: The literal `14` appears on lines 85 (`100 / 14`), 87 (`progress / taskWidth`), 95 (`taskNumber === 14`), 153 (`1 / 14`), 211 (`newTask === 7` — a related magic number for flashcard save trigger), 215 (`newTask === 14`), 223 (`newTask / 14`), 254 (`Task + 1 !== 14`), 457 (`currentTask < 14`), 540-544 (`total: 14`), 559 (`currentTask / 14`), 594 (`length: 14`), 632 (`length: 14`). These represent the total number of lesson phases. The `getTaskComponent` switch (lines 294-329) and `getTaskDisplayName` switch (lines 331-376) each have 14 cases, implicitly defining the phase count. No `TOTAL_TASKS` or `TOTAL_PHASES` constant exists.
- Impact: Low. If the lesson structure changes (e.g., a 15th phase is added), all 13+ locations must be updated in lockstep. Missing one creates a silent off-by-one in progress calculation or display. For a primary-student app, the progress bar showing "Task 15 of 14" or a progress percentage exceeding 100% would be confusing.
- Recommendation: Define `const TOTAL_TASKS = 14;` at module scope (or import from a shared config) and replace all `14` literals with the constant. Similarly, `7` on line 211 (flashcard save trigger) should be a named constant like `FLASHCARD_SAVE_PHASE`.

### LR-primary-advantage-041-007 — `console.error` used in production code instead of structured logging

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:108,169-173,180,235-239,245,284`
- Evidence: Six `console.error` calls are used for error handling: line 108 (fetch phase error), lines 169-173 (start lesson response not ok), line 180 (start lesson catch), lines 235-239 (next task response not ok), line 245 (next task catch), line 284 (previous task catch). The AGENTS.md "Observability" section requires structured logging in production code. The app has `apps/primary-advantage/server/utils/logging.ts` (38 lines) but it is server-side only; no client-side structured logging adapter exists. This is the same pattern found across the Reading Advantage codebase — client components use `console.error` as a de-facto standard.
- Impact: Low. Client-side errors are not captured in any structured log pipeline. For a primary-student app, errors during lesson transitions (API failures, network issues) are silently logged to the browser console where no monitoring tool can see them. Teacher dashboards cannot surface these errors.
- Recommendation: Create a client-side structured logging utility (e.g., `lib/client-logger.ts`) that wraps `console.error` with structured metadata (component name, article ID, user ID, timestamp). Replace all `console.error` calls with the structured logger. This is a cross-cutting concern that should be tracked as a separate monorepo-level chore.

### LR-primary-advantage-041-008 — `nextTask` response body is discarded; no validation that server accepted the progress update

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:219-243`
- Evidence: The `nextTask` function (line 191) calls `POST /api/lessons/${article?.id}` on line 219 and checks `response.ok` on line 228, but never reads the response body (`response.json()` is never called). The server may return a different progress value than what was sent (e.g., due to server-side validation, race conditions from concurrent tabs, or progress normalization). The client blindly trusts that `currentTask` should be set to `newTask` (line 229) without confirming the server's authoritative state. The same pattern exists in `startLesson` (lines 149-178).
- Impact: Low. In normal single-tab usage, the server accepts the client's progress value. However, if a student opens the lesson in two tabs simultaneously, the second tab's POST may be rejected or normalized by the server (e.g., the server sees progress already at 80% but the client sends 50%), and the client would set an incorrect local state. For primary students, multi-tab usage is unlikely but not impossible (e.g., tablet + phone).
- Recommendation: Read the response body after a successful POST and use the server's returned progress value to set `currentTask`. This ensures the client state is always consistent with the server's authoritative state.

### LR-primary-advantage-041-009 — `fetchCurrentPhase` missing validation on `data.userLessonProgress.progress`; `Math.ceil` can produce out-of-range values

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:82-98`
- Evidence: After fetching the lesson progress (line 77), the code computes `taskNumber` on lines 86-88: `const taskWidth = 100 / 14; const taskNumber = Math.ceil(data.userLessonProgress.progress / taskWidth);`. If the server returns `progress` as a value outside 0-100 (e.g., -5 or 105 due to a bug or data corruption), `Math.ceil` produces values like 0 or 15+. Line 92 handles the 0 case (`taskNumber === 0 ? 1 : taskNumber`), but values > 14 are not clamped. `getTaskComponent` (line 294) returns `null` for unknown task numbers (line 327), which would render an empty content area. The progress bar width (`(currentTask / 14) * 100%` on line 559) would exceed 100%.
- Impact: Low. Requires a server-side bug or data corruption to trigger. For a primary-student app, an out-of-range progress value would show a progress bar exceeding 100% and an empty content area, which is confusing but not harmful.
- Recommendation: Clamp `taskNumber` to the range 1-14: `const clampedTask = Math.max(1, Math.min(14, taskNumber));` and use `clampedTask` instead of `taskNumber`. Add a console warning (or structured log) when the server returns out-of-range progress.

### LR-primary-advantage-041-010 — `getTaskComponent` passes `article` to some tasks and `articleId` to others; inconsistent prop contract

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:294-329`
- Evidence: `getTaskComponent` (line 294) renders 14 task components. Tasks 1-8 and 13-14 receive the full `article` object as a prop (e.g., `<TaskIntroduction article={article} />` on line 298, `<TaskFirstReading article={article} />` on line 303). Tasks 9-12 receive only `articleId={article?.id}` (e.g., `<TaskVocabularyFlashcards articleId={article?.id} />` on line 315, `<TaskSentenceActivities articleId={article?.id} />` on line 321). This split suggests two different component contracts: tasks 1-8/13-14 need the full article (for content rendering), while tasks 9-12 (flashcard/matching activities) only need the ID (to fetch their own data). The inconsistency is not a bug but creates a maintenance risk — a developer adding a new task must know which contract to follow.
- Impact: Low. The split is likely intentional (flashcard activities fetch their own data via separate API routes), but it is undocumented. If a future task needs the full article but follows the `articleId` pattern, it will fail at runtime.
- Recommendation: Document the two prop contracts in a comment above `getTaskComponent` or in the `task/index.ts` barrel file. Consider creating two TypeScript interfaces (`TaskWithArticle` and `TaskWithArticleId`) to make the contract explicit at the type level.

## No-Finding Notes

- `apps/primary-advantage/components/lesson/task/index.ts`: Clean barrel export file. All 14 re-exports match the import list in `standalone-lesson-progress-bar.tsx` (lines 15-29). Default export naming is consistent (PascalCase matching file names). No dead exports, no missing exports, no circular dependency risk.
- Lines 1-36 of `standalone-lesson-progress-bar.tsx` (imports and interface): Clean. All imports are used. `StandaloneLessonProps` interface is minimal and correctly typed.
- Lines 38-66 (state declarations and ref setup): Clean pattern for avoiding stale closures in `useEffect`. The `currentTaskRef` and `isTransitioningRef` refs (lines 52-53) with their sync effects (lines 56-62) are a correct solution for reading current values in async contexts.
- Lines 378-382 (maxHeight effect): Clean accordion animation logic.
- Lines 393-666 (JSX return): Well-structured responsive layout with mobile accordion and desktop sidebar. Tailwind classes are consistent. Dark mode support is present throughout. The `animate-shake` class reference on line 496 suggests a custom animation defined in `globals.css`.
