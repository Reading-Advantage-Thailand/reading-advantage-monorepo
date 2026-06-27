# Line Review Evidence: primary-advantage-040

Reviewer: coder-deepseek-v4-flash/primary-advantage-040
Files assigned: 3
Lines assigned: 916

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx` | 1-552 | reviewed | 4 |
| `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx` | 1-297 | reviewed | 3 |
| `apps/primary-advantage/components/lesson/standalone-lesson-card.tsx` | 1-67 | reviewed | 1 |

## Findings

### LR-primary-advantage-040-001 — `lesson-task-mcq.tsx` references undefined `update` and `session` variables (ReferenceError)

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:208-210`
- Evidence: Line 50 destructures `const { user } = useSession();`. The hook `useSession()` from `@reading-advantage/auth-client` returns `{ user, isAuthenticated, isLoading }` (confirmed at `packages/auth-client/src/index.ts:16-23`). It does NOT return `session` or `update`. Lines 208-210 call `update({ user: { ...session?.user } })`, referencing two identifiers that are not in scope. Both `update` and `session` will be `ReferenceError` at runtime. This same broken pattern appears across at least 10 other lesson components (lesson-sentence-cloze-test, lesson-sentence-flashcard, lesson-vocabulary-flashcard-card, lesson-sentence-matching, lesson-sentence-order-word, lesson-sentence-order, lesson-vocabulary-matching, task-lesson-summary, and this file's sibling lesson-task-saq.tsx), indicating a systematic migration artifact: the code was written for NextAuth.js's `useSession()` (which returns `{ data: { user, session }, update }`) and was never adapted to the shared auth-client's `useSession()` API.
- Impact: The `handleFinishQuiz` callback on line 193-217 calls this code path. When a student completes the MCQ quiz and clicks "Finish Quiz", the `startTransition` callback fires `update(...)` on line 208. This will throw a `ReferenceError`, preventing `state` from being set to `QuestionState.COMPLETED` on line 207. The UI will remain stuck in the in-progress state, and the score will never be persisted or displayed. This is a fork-specific regression because the shared auth-client replaced NextAuth.js but these components were not updated to match the new hook API.
- Recommendation: Replace the broken `update({ user: { ...session?.user } })` call with either `updateUserSession()` from the auth-client's actions, or remove it entirely since `finishQuiz` already persists the score server-side. The client-side session cache update is redundant for quiz completion. If a cache update is truly needed, use `useAuth()` from `@reading-advantage/auth-client` which returns the full `AuthContextValue` including auth actions.

### LR-primary-advantage-040-002 — `lesson-task-mcq.tsx` contains large commented-out dead code blocks

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:33-37,85-121`
- Evidence: Lines 33-37 contain a commented-out results/progress/total/state/summary object. Lines 85-121 contain a fully commented-out `fetchQuizData` effect function (37 lines) that was replaced by the client-side `useEffect` on lines 52-61 that pulls questions from `article.multipleChoiceQuestions`. The `fetchQuizData` code would have fetched from `/api/articles/questions/${articleId}?questionType=...`, which is the older API-driven approach.
- Impact: Dead code increases cognitive load during maintenance. The commented-out path also documents a design alternative (server-fetched vs. props-driven quiz) that may confuse future developers. No runtime impact.
- Recommendation: Remove the commented-out blocks. If the API-driven approach is ever needed again, it belongs in source control history.

### LR-primary-advantage-040-003 — `lesson-task-mcq.tsx` uses `as any` type escapes on state variables

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:47-48`
- Evidence: Line 47 declares `const [activeQuestion, setActiveQuestion] = useState(null) as any;` and line 48 declares `const [responses, setResponses] = useState<any[]>([]);`. Both defeat TypeScript type checking. The `responses` array is later populated with objects having `{ question, answer, isCorrect }` shape (lines 126-130) but no interface or type guard enforces this shape. The `activeQuestion` state is typed as `any` and compared against option strings on lines 449-456.
- Impact: Any code modification that changes the shape of response objects or options will not be caught by the type checker. Low severity because the code is functionally correct within the current component boundary.
- Recommendation: Define `interface QuizResponse { question: string; answer: string; isCorrect: string; }` and type `responses` as `QuizResponse[]`. Type `activeQuestion` as `string | null` instead of `null as any`.

### LR-primary-advantage-040-004 — `lesson-task-mcq.tsx` renders `<div>` inside `<p>` (invalid HTML)

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-mcq.tsx:504`
- Evidence: Line 479 opens `<p className="flex w-full items-center space-x-3">` and line 480 contains `<div className="flex items-center space-x-2">` as a direct child. HTML spec forbids block-level elements (`<div>`) inside `<p>` — browsers implicitly close the `<p>` before the `<div>`, breaking the layout intent. The `<p>` on line 479 should be a `<div>`.
- Impact: In some rendering contexts (SSR hydration, React 19 strict mode, HTML validators), the `<p>` auto-closes, causing the flex layout at line 479 to have no visible effect. The options list buttons inside may lose their intended `flex` alignment. Low severity because React's client-side DOM reconciliation usually masks this in practice.
- Recommendation: Replace `<p>` on line 479 with `<div>`.

### LR-primary-advantage-040-005 — `lesson-task-saq.tsx` references undefined `update` and `session` variables (same ReferenceError as 040-001)

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:100-105`
- Evidence: Line 44 destructures `const { user } = useSession();`. The shared auth-client's `useSession()` returns `{ user, isAuthenticated, isLoading }` only. Lines 100-105 call `update({ user: { ...session?.user } })` inside the `onSubmitted` callback. `update` and `session` are not in scope and will throw a `ReferenceError` when the student submits the short-answer question and the AI feedback is returned. Identical pattern and root cause as finding LR-primary-advantage-040-001.
- Impact: When a primary student completes the short-answer task, the `onSubmitted` handler (line 70) fires `getFeedback(...)` then calls `update({ user: { ...session?.user } })`. This will throw a `ReferenceError`, preventing `state` from being set to `QuestionState.COMPLETED` (line 100 — this line will never be reached if the error is uncaught). The student will see a spinner or loading state indefinitely. The `finishQuiz` action on line 97 will have already persisted the score server-side, so the data is saved, but the UI will never transition to the completed feedback view. Same severity and root-cause as 040-001.
- Recommendation: Remove the broken `update(...)` call, or replace it with the auth-client's session-refresh mechanism if one exists. Since `finishQuiz` already commits data server-side, the client-side update is unnecessary.

### LR-primary-advantage-040-006 — `lesson-task-saq.tsx` destructures unused `user` from `useSession()`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:44`
- Evidence: Line 44: `const { user } = useSession();`. The variable `user` is never referenced in the rest of the function body — not for authorization, not for user-dependent rendering, not for logging. The only auth-related code is the broken `update`/`session` call on lines 100-105 (finding 040-005). The `useSession` call itself triggers a subscription to the auth context; the `user` destructure is unnecessary.
- Impact: Minimal. The hook subscription is still active, so there is a tiny performance cost from the context subscription. The dead `user` variable creates a misleading signal that the component is checking authentication when it is not. No security impact because the component performs no authorization.
- Recommendation: Either remove `const { user } = useSession();` entirely if no auth functionality is needed, or replace it with a proper authorization check if the SAQ should be gated by authentication.

### LR-primary-advantage-040-007 — `lesson-task-saq.tsx:82` hardcodes `preferredLanguage: "en"` instead of using dynamic locale

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/pratice/lesson-task-saq.tsx:82`
- Evidence: The AI feedback `getFeedback` call on lines 76-85 passes `preferredLanguage: "en"` as a hardcoded literal. The app uses `next-intl` for i18n (supported locales: `en`, `th`, `cn`, `tw`, `vi`). The parent page (not shown in this batch) likely has access to the user's preferred locale via `useLocale()` from `next-intl`, but this component does not import or use it. The AI feedback endpoint presumably uses `preferredLanguage` to generate feedback in the user's language, and this hardcoded `"en"` means students in Thai, Chinese, or Vietnamese locales will receive English-language feedback.
- Impact: For a primary-student audience where language comprehension may already be a challenge, receiving AI-generated feedback in English when the user's interface is in Thai or Chinese degrades the learning experience and may confuse younger students. If the AI endpoint ignores this field and always returns English feedback, the impact is reduced but the field becomes misleading.
- Recommendation: Import `useLocale()` from `next-intl` and pass `preferredLanguage: useLocale()` instead of the hardcoded `"en"`. Ensure the AI feedback endpoint actually uses this language preference to generate localized responses.

### LR-primary-advantage-040-008 — `standalone-lesson-card.tsx` has no error handling for missing article and uses unsafe `as unknown as` type cast

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/standalone-lesson-card.tsx:15,63`
- Evidence: Line 15 calls `const article = await getArticleForLesson(articleId)` without any try/catch or null check. If `articleId` is invalid, the article doesn't exist, or the database query fails, `article` will be `null` or `undefined`. Line 49 safely uses optional chaining (`article?.title`), but line 63 passes `article as unknown as Article` to `<StandaloneLessonProgressBar>`. The double cast (`as unknown as Article`) forcefully widens then narrows the type, which means `StandaloneLessonProgressBar` receives `null | undefined | Article` but is typed to receive `Article`. This will cause a runtime error (cannot read properties of null/undefined) inside the progress bar component.
- Impact: Navigating to a standalone lesson page with an invalid or deleted article ID causes a 500 error page or white screen, rather than a graceful "article not found" message. For primary students and teachers who may follow stale links, this is a frustrating error experience. The double cast also masks a genuine type mismatch between `getArticleForLesson`'s return type and the `Article` type expected by `StandaloneLessonProgressBar`.
- Recommendation: Add an early return with an error/not-found component when `article` is null/undefined. Replace `article as unknown as Article` with a proper type alignment between the server model and the component prop type. Ideally, `getArticleForLesson` and the `Article` type should share a common Zod schema or Drizzle select type.

## No-Finding Notes

- All three files reviewed line-by-line. No additional issues found beyond the 8 findings documented above.

