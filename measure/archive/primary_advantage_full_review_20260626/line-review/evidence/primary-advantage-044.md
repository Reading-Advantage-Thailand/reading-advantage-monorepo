# Line Review Evidence: primary-advantage-044

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-044
Files assigned: 4
Lines assigned: 1068

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx | 1-476 | reviewed | 5 |
| apps/primary-advantage/components/lesson/task/task-multiple-choice.tsx | 1-35 | reviewed | 1 |
| apps/primary-advantage/components/lesson/task/task-preview-vocabulary.tsx | 1-186 | reviewed | 2 |
| apps/primary-advantage/components/lesson/task/task-sentence-activities.tsx | 1-371 | reviewed | 2 |

## Findings

### LR-primary-advantage-044-001 — `update()` and `session` are undefined references (compile/runtime error)

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:80-84`
- Evidence: Line 62 destructures only `const { user } = useSession();`. The verified contract of `useSession()` in `packages/auth-client/src/index.ts:16-23` returns exactly `{ user, isAuthenticated, isLoading }` — there is no `update` function and no `session` object. Yet lines 80-84 call `update({ user: { ...session?.user } })`, referencing two identifiers that are never defined in scope.
- Impact: This is a `ReferenceError` at runtime (and a TypeScript "cannot find name 'update'/'session'" compile error). On the success path of `fetchData()` (line 76, when summary data loads) the effect throws, which is swallowed by the catch at line 86 and surfaced to the student as a misleading generic `toast.error(t("toast.failed"))` even though the data loaded successfully. The session is never refreshed with newly-earned XP. This is a clear remnant of the Reading Advantage NextAuth pattern (`const { data: session, update } = useSession()`) that was not updated when this fork migrated to `@reading-advantage/auth-client`, whose `useSession` exposes neither member.
- Recommendation: Remove the `update(...)`/`session?.user` block, or replace it with the fork's supported session-refresh mechanism. Add a unit/type test asserting `useSession()` consumers only use `{ user, isAuthenticated, isLoading }`.

### LR-primary-advantage-044-002 — Unguarded `.length` access on possibly-undefined word/sentence lists

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:56-59`
- Evidence: `wordList` (lines 56-57) and `sentenceList` (lines 58-59) are read via optional chaining from `article?.sentencsAndWordsForFlashcard?.[0]?.words` / `?.sentence` and cast with `as WordList[]` / `as Sentence[]`. If `sentencsAndWordsForFlashcard` is empty or the first element lacks `words`/`sentence`, the value is `undefined`, but the cast hides this from the type system. These values are then dereferenced unconditionally at line 255 (`wordList.length`), line 274 (`sentenceList.length`), line 401 (`wordList.length > 0`), and line 432 (`sentenceList.length > 0`).
- Impact: When an article has no flashcard word/sentence payload (a realistic empty-state for newly generated content), the component throws `Cannot read properties of undefined (reading 'length')` and the entire lesson-summary screen white-screens after the loading skeleton. The casting pattern is inherited from the Reading Advantage summary screen.
- Recommendation: Default to empty arrays (`?? []`) when deriving `wordList`/`sentenceList`, or guard each `.length` access. Add a test rendering the summary with an empty flashcard payload.

### LR-primary-advantage-044-003 — Feedback lookup table omits score 0 and out-of-range scores

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:104-118`
- Evidence: `mcqFeedback`/`saqFeedback` are keyed only `1..5` (lines 104-118). The render guard at line 346 (`quizScores.mcqScore !== undefined`) and line 388 admits `0` because `0 !== undefined` is true, and the lookups `mcqFeedback[quizScores.mcqScore as keyof typeof mcqFeedback]` (line 348) / `saqFeedback[...]` (line 390) have no entry for key `0`. The default state for these scores is `0` (lines 51-54).
- Impact: A student who scores `0` (or any score outside 1-5) sees an empty italic feedback paragraph instead of encouraging guidance — the opposite of the intended supportive UX for a primary-age audience. The 1-5 feedback map is copied from Reading Advantage without a 0/fallback case.
- Recommendation: Add a `0` (or default) feedback entry, or render fallback copy when the score key is missing.

### LR-primary-advantage-044-004 — Hardcoded English performance-badge labels bypass i18n

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:130-148`
- Evidence: Every other string in this component is localized via `t(...)`, but `getPerformanceBadge` returns hardcoded English `label` values `"Excellent"`, `"Good"`, and `"Needs Practice"` (lines 133, 139, 144), rendered at lines 320-322 and 362-364.
- Impact: Primary-advantage serves young and multilingual (th/cn/tw/vi) learners; surfacing untranslated English performance labels on the celebratory summary screen is an adaptation/accessibility gap for the target age group, and breaks the otherwise-complete localization of this screen.
- Recommendation: Move the three labels into the `Lesson.Summary` message namespace and resolve them through `t(...)`.

### LR-primary-advantage-044-005 — Raw `console.error` in production component path

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-lesson-summary.tsx:87`
- Evidence: The catch block logs `console.error("Error fetching lesson summary data:", error)` directly. Root AGENTS.md ("Observability → Logging") requires structured logging and discourages free-form console logging in production code.
- Impact: Unstructured client logging with no request/user correlation; inconsistent with the repo observability standard. Pattern carried over from Reading Advantage.
- Recommendation: Route through the shared structured logger/error-reporting adapter, or remove once a proper telemetry hook exists.

### LR-primary-advantage-044-006 — Import path references misspelled `pratice/` directory

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-multiple-choice.tsx:6`
- Evidence: `import LessonMCQContent from "../pratice/lesson-task-mcq";` resolves into the misspelled directory `components/lesson/pratice/` (confirmed present alongside `lesson-task-mcq.tsx` and `lesson-task-saq.tsx`). "pratice" should be "practice".
- Impact: No functional break (the directory exists with the typo), but the misspelling propagates through imports and harms maintainability/searchability; it is a naming defect inherited verbatim from the Reading Advantage source tree.
- Recommendation: Rename the directory to `practice/` and update all importers in a dedicated, graph-refreshed change (out of scope for this review-only track).

### LR-primary-advantage-044-007 — Empty `words` array leaves the screen stuck in the loading skeleton

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-preview-vocabulary.tsx:37-61`
- Evidence: `loading` is initialized `true` (line 30). `setLoading(false)` is only ever called *inside* the `words.map(...)` callback (line 48). The effect guard `if (words)` (line 38) treats a non-null empty array as truthy, so when `words` is `[]` the map body never executes, `setLoading(false)` is never reached, and `loading` stays `true` indefinitely. Performing a `setState` side effect inside `Array.prototype.map` (line 48) is also an anti-pattern that fires once per element instead of once.
- Impact: An article whose first flashcard entry has an empty `words` array renders the skeleton loaders forever (lines 85-99), with no error and no empty state — even though an explicit empty state exists at lines 160-165 that is never reachable in this case. This differs from the standard "set loading false in finally/after processing" pattern.
- Recommendation: Move `setLoading(false)` out of the map (call it unconditionally after building `wordList`, or in the effect tail), and handle the empty-array branch.

### LR-primary-advantage-044-008 — Misspelled exported component name `TaskPreviewVocabulaty`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-preview-vocabulary.tsx:23`
- Evidence: `export default function TaskPreviewVocabulaty(...)` — the identifier is misspelled ("Vocabulaty" instead of "Vocabulary"), inconsistent with the file name `task-preview-vocabulary.tsx`.
- Impact: Default export, so it does not break imports, but it pollutes React DevTools component names, stack traces, and code search; a maintainability defect.
- Recommendation: Rename the function to `TaskPreviewVocabulary`.

### LR-primary-advantage-044-009 — Activity fetch has no error handling; failure leaves the screen stuck loading

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-sentence-activities.tsx:37-46`
- Evidence: `fetchCompletedActivities` (lines 38-44) calls `fetch(...)` then `response.json()` with no `try/catch`, no `response.ok` check, and `setIsLoading(false)` (line 43) placed only on the success path. A network error, non-2xx status, or non-JSON body throws before line 43, so `isLoading` stays `true`.
- Impact: On any fetch/parse failure the student is permanently shown the loading header (lines 146-162) with no error message or retry — the four sentence activities never appear. Pattern mirrors the Reading Advantage activity loader.
- Recommendation: Wrap in `try/catch/finally`, check `response.ok`, set `isLoading` false in `finally`, and surface an error/empty state.

### LR-primary-advantage-044-010 — Component fetches a REST API route directly, bypassing the domain/adapter layer and relying on unverified tenant scoping

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-sentence-activities.tsx:39`
- Evidence: The component issues `fetch(\`/api/assignments/activity/${articleId}\`)` directly from client UI. Root AGENTS.md requires business logic and data access to flow through backend modules / server actions and shared adapters, and warns against trusting frontend-supplied identifiers without server-side tenant verification. `articleId` is interpolated straight into the URL with no client-visible authorization context.
- Impact: Couples the UI to a raw legacy REST route (one of the documented 294 legacy API routes), bypassing the domain-function contract, and shifts all tenant/`schoolId` scoping responsibility implicitly onto an unseen route handler. If that handler does not scope by the authenticated user's school, this is an IDOR surface for assignment-activity data. This direct-fetch pattern is inherited from Reading Advantage.
- Recommendation: Replace with a server action / domain query that enforces `schoolId` tenant scoping, and add error handling. Verify the backing route's authorization in a follow-up remediation track.

## No-Finding Notes

- All four assigned files contained at least one finding; no fully clean files in this batch.
- `apps/primary-advantage/components/lesson/task/task-multiple-choice.tsx`: reviewed line-by-line (1-35); aside from LR-044-006 the component is a thin, correctly-localized presentational wrapper with no further issues.
