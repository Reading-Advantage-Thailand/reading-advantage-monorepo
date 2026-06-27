# Line Review Evidence: primary-advantage-026

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-026
Files assigned: 7
Lines assigned: 1112

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/articles/article-showcase-card.tsx` | 1-160 | reviewed | 0 |
| `apps/primary-advantage/components/articles/questions/la-question-card.tsx` | 1-90 | reviewed | 0 |
| `apps/primary-advantage/components/articles/questions/la-question-content.tsx` | 1-369 | reviewed | 7 |
| `apps/primary-advantage/components/articles/questions/mc-question-card.tsx` | 1-112 | reviewed | 2 |
| `apps/primary-advantage/components/articles/questions/mc-question-content.tsx` | 1-251 | reviewed | 4 |
| `apps/primary-advantage/components/articles/questions/question-header.tsx` | 1-71 | reviewed | 3 |
| `apps/primary-advantage/components/articles/questions/retake-button.tsx` | 1-59 | reviewed | 0 |

## Findings

### LR-026-001 — Unsafe type cast on question data

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:70`
- Evidence: `questions={questionsData.questions as LAQuestion}` — unsafe cast from the question response to `LAQuestion` type without runtime validation. If the server returns malformed data, the component will crash at render time with no error boundary.
- Impact: Runtime crash if server data shape changes or is corrupted. No graceful degradation.
- Recommendation: Add Zod validation or at minimum a null/shape check before casting.

### LR-026-002 — Level-based validation fragile with undefined/zero level

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:91-96`
- Evidence: `min((user?.level as number) * 30, ...)` — if `user?.level` is undefined, the cast yields NaN and the `min()` validation fails silently (NaN comparisons return false). If level is 0, minimum length is 0 characters, bypassing meaningful validation. Hardcoded English error message `"Please Enter minimum ${...} character..."` also not internationalized.
- Impact: Primary students could submit empty or trivially short answers without validation feedback, or see raw NaN in error messages.
- Recommendation: Add a fallback default level, guard against undefined/0, and use `t()` for the error message string.

### LR-026-003 — Hardcoded English strings bypass i18n system

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:92-96,143,215-217`
- Evidence: Multiple hardcoded English strings: line 92-94 `"Please Enter minimum ${...} character..."`, line 96 `"Answer must be less than 2000 characters..."`, line 143 `"Quiz finished"`, lines 215-217 `"Feedback and your score"` / `"Final Feedback and your score"`. The app supports 5 locales (en, th, cn, tw, vi) via next-intl, but these strings are not in translation files.
- Impact: Non-English primary students see English error and success messages mixed with localized UI, breaking the immersion for young learners.
- Recommendation: Move these strings to the translation JSON files under appropriate keys.

### LR-026-004 — AI feedback content rendered without sanitization (XSS risk)

- Severity: Critical
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/la-question-content.tsx:280-314`
- Evidence: Lines 287-289, 293, 298, 303-306 render `feedback?.detailedFeedback[selectedCategory]?.areasForImprovement`, `?.examples`, `?.strengths`, `?.suggestions` directly into JSX. These are AI-generated strings from `getFeedback()` server action. While React auto-escapes JSX text content (preventing HTML injection), the content is untrusted AI output displayed to primary-age students without length limits, content filtering, or profanity screening.
- Impact: AI-generated feedback could contain inappropriate, misleading, or excessively long content for primary students. No content moderation layer exists between AI generation and display.
- Recommendation: Add content length truncation and consider a content safety filter before rendering AI feedback to primary-age users.

### LR-026-005 — Commented-out activity logging and unused props in QuestionHeader

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/questions/question-header.tsx:12-21,23-25,35-53`
- Evidence: Props type defines `userId` and `articleId` (lines 19-20) that are never used. Lines 37-52 contain commented-out activity logging code that was removed during a refactor but not cleaned up. Line 23-25 defines a local `ActivityType` that is unused. The function `onButtonClick` is declared `async` but performs no async work.
- Impact: Dead code increases maintenance burden and misleads reviewers about intended functionality.
- Recommendation: Remove unused props, commented code, and unused type. Change `onButtonClick` to synchronous.

### LR-026-006 — Extensive `any` types in MC question content

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:27-28,51`
- Evidence: Line 27: `const [activeQuestion, setActiveQuestion] = useState(null) as any` — explicit `any` cast bypassing TypeScript. Line 28: `const [responses, setResponses] = useState<any[]>([])` — untyped response array. Line 51: `const shuffleArray = (array: any[])` — generic any array parameter.
- Impact: Loss of type safety for quiz response data. Errors in response shape won't be caught at compile time, increasing risk of runtime failures for primary students during quizzes.
- Recommendation: Define proper types for `activeQuestion` (string | null), `responses` (array of `{question: string, answer: string, isCorrect: string}`), and `shuffleArray` parameter.

### LR-026-007 — Hardcoded question total of 5 in MC quiz

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/questions/mc-question-card.tsx:102`
- Evidence: `<p className="inline font-bold text-green-500 dark:text-green-400">{t("descriptionSuccess2", { score: correct ?? 0, total: 5 })}</p>` — hardcoded `total: 5` does not match actual question count. The quiz content component uses `questions.length` dynamically (line 176-177 of mc-question-content.tsx), but the completion card always shows "out of 5".
- Impact: If question count changes from 5, the completion score display will be incorrect, confusing primary students about their performance.
- Recommendation: Pass actual question count from `questionsData.questions.length` or use a constant.

### LR-026-008 — Duplicate ActivityType import sources in MCQuestionCard

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/articles/questions/mc-question-card.tsx:3,14`
- Evidence: Line 3 imports `AnswerStatus, QuestionState` from `@/types/enum` (local types). Line 14 imports `activityType as ActivityType` from `@reading-advantage/db` (Drizzle package). Two different ActivityType sources exist in the same file — the local enum and the DB enum. The local one is used for `AnswerStatus` and `QuestionState`, but `ActivityType` comes from the DB package.
- Impact: If the DB enum and local enum diverge, quiz type routing could silently break. Mixed import sources confuse maintainers.
- Recommendation: Consolidate to a single ActivityType source (prefer the DB enum since it's the source of truth).

### LR-026-009 — Missing error/loading handling in MC quiz finish submission

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:122-152`
- Evidence: `handleFinishQuiz()` calls `finishQuiz()` server action with no error boundary or user-facing error state. On failure (line 143-146), only a generic toast `"Failed to finish quiz"` is shown with destructive styling — no retry mechanism, no error details logged, and the quiz state remains paused (`setPaused(true)` called at line 123) with no way to unpause.
- Impact: If the server action fails, the quiz is stuck in a paused state. Primary students have no way to retry or recover without navigating away and back.
- Recommendation: Reset paused state on error and provide a retry button in the error toast.

### LR-026-010 — Unsafe type cast on question data in MCQuestionCard

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/articles/questions/mc-question-card.tsx:82`
- Evidence: `questions={questionsData.questions as MCQuestion[]}` — unsafe cast from the question response to `MCQuestion[]` type without runtime validation. No length check or shape validation before rendering.
- Impact: Runtime crash if server returns unexpected data shape. No error boundary catches this.
- Recommendation: Add Zod validation or minimum array length check before passing to child component.

### LR-026-011 — Hardcoded English strings in MC quiz component

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:136-148,184-189,224-228,234-238`
- Evidence: Lines 136-140: `"Quiz finished successfully"` hardcoded English toast. Lines 143-147: `"Failed to finish quiz"` hardcoded English toast. Lines 184-189: `"Feedback: "` hardcoded label. Lines 224-228 and 234-238: `"Please select an option to continue"` hardcoded English toast. All bypass the next-intl translation system.
- Impact: Non-English primary students see English messages during quiz interactions, breaking localization for young learners who may not read English.
- Recommendation: Replace all hardcoded strings with `t()` translation calls.

## No-Finding Notes

- `apps/primary-advantage/components/articles/article-showcase-card.tsx`: reviewed line-by-line; no findings. Well-structured component using `forwardRef`, `memo`, i18n translations, and responsive image loading. Uses `@/i18n/navigation` router correctly.
- `apps/primary-advantage/components/articles/questions/la-question-card.tsx`: reviewed line-by-line; no findings. Clean server component with proper state machine pattern (ERROR/LOADING/INCOMPLETE/COMPLETED). Uses server-side translations correctly.
- `apps/primary-advantage/components/articles/questions/retake-button.tsx`: reviewed line-by-line; no findings. Clean client component with proper Dialog confirmation, i18n, and router refresh. No issues found.
