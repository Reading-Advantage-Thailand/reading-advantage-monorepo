# Line Review: sa-batch-08

**Track:** `science_advantage_review_20260626`
**Batch:** `sa-batch-08`
**Reviewer:** DeepSeek V4 Flash
**Date:** 2026-06-27
**Scope:** 20 files — student-facing UI components (quiz, mastery profile, classes, gamification dashboard)
**Mode:** Read-only; no app code edited.

---

## Summary

20 files reviewed across 5 component groups (gamification dashboard, mastery profile, quiz player/question types, class enrollment, assignments). 20 findings: **0 CRITICAL, 2 HIGH, 8 MEDIUM, 10 LOW**. The dominant themes are: (a) systemic absence of JSDoc on all exported components, violating the monorepo documentation standard, (b) several large monolithic components (especially `quiz-player.tsx` at 689 lines) that mix data-fetching, state orchestration, and rendering beyond single-responsibility guidelines, (c) business logic (data fetching, effect-driven initialization) embedded in client components rather than called through backend domain modules, and (d) stale-closure hazards in the mastery-profile polling pattern.

---

## Files Reviewed

| # | File | Lines | Type |
|---|------|-------|------|
| 1 | `apps/science-advantage/components/features/student/gamification-dashboard-card.tsx` | 211 | Client component |
| 2 | `apps/science-advantage/components/features/student/join-class-form.tsx` | 190 | Client component |
| 3 | `apps/science-advantage/components/features/student/lesson-viewer.tsx` | 455 | Client component |
| 4 | `apps/science-advantage/components/features/student/mastery-profile/mastery-profile-hero.tsx` | 67 | Presentational component |
| 5 | `apps/science-advantage/components/features/student/mastery-profile/mastery-profile-skeleton.tsx` | 72 | Skeleton component |
| 6 | `apps/science-advantage/components/features/student/mastery-profile/mastery-progress-display.tsx` | 82 | Presentational component |
| 7 | `apps/science-advantage/components/features/student/mastery-profile/mastery-strands-list.tsx` | 206 | Client component |
| 8 | `apps/science-advantage/components/features/student/mastery-profile/student-badges-section.tsx` | 165 | Client component |
| 9 | `apps/science-advantage/components/features/student/mastery-profile/student-mastery-profile.tsx` | 240 | Client component |
| 10 | `apps/science-advantage/components/features/student/quiz-player.tsx` | 689 | Client component |
| 11 | `apps/science-advantage/components/features/student/quiz-questions/fill-in-blank-question.tsx` | 35 | Presentational component |
| 12 | `apps/science-advantage/components/features/student/quiz-questions/multiple-choice-question.tsx` | 45 | Presentational component |
| 13 | `apps/science-advantage/components/features/student/quiz-questions/multiple-select-question.tsx` | 54 | Presentational component |
| 14 | `apps/science-advantage/components/features/student/quiz-questions/true-false-question.tsx` | 52 | Presentational component |
| 15 | `apps/science-advantage/components/features/student/quiz-questions/types.ts` | 35 | Types/constants |
| 16 | `apps/science-advantage/components/features/student/quiz-questions/vocabulary-match-question.tsx` | 86 | Presentational component |
| 17 | `apps/science-advantage/components/features/student/student-assignments-card.tsx` | 134 | Client component |
| 18 | `apps/science-advantage/components/features/student/student-class-card-skeleton.tsx` | 21 | Skeleton component |
| 19 | `apps/science-advantage/components/features/student/student-class-card.tsx` | 54 | Presentational component |
| 20 | `apps/science-advantage/components/features/student/student-classes-section.tsx` | 166 | Client component |

---

## Findings

### F-SA-B08-001 — HIGH — Systemic absence of JSDoc on all exported components

**Files:** All 20 files in this batch

**Severity:** HIGH — violates AGENTS.md documentation standard which states "Every exported function, class, interface, and type alias must have a JSDoc comment."

Every single exported component in this batch lacks a JSDoc comment. Examples among the most critical:

- `export function GamificationDashboardCard` — `gamification-dashboard-card.tsx` line 83
- `export function JoinClassForm` — `join-class-form.tsx` line 73
- `export function LessonViewer` — `lesson-viewer.tsx` line 175
- `export function QuizPlayer` — `quiz-player.tsx` line 92
- `export function StudentMasteryProfile` — `student-mastery-profile.tsx` line 59
- `export function StudentClassesSection` — `student-classes-section.tsx` line 18

The AGENTS.md requirement reads: "Description: One clear sentence stating what the function does. @param: Describe each parameter's purpose (no types). @returns: Describe the return value (no type)." None of these components satisfy this requirement.

**Recommendation:** Add JSDoc to all exported components. Follow the Google TypeScript style guide: describe the component's purpose, each prop's role, and what it renders.

---

### F-SA-B08-002 — HIGH — Business logic embedded directly in client components instead of backend domain functions

**Files:**
- `gamification-dashboard-card.tsx` lines 90–112 (fetch + effect)
- `lesson-viewer.tsx` lines 197–227 (fetch + effect)
- `student-badges-section.tsx` lines 55–74 (fetch + effect)
- `student-mastery-profile.tsx` lines 69–131 (fetch + effect + polling)
- `student-assignments-card.tsx` lines 53–69 (fetch + effect)
- `student-classes-section.tsx` lines 24–98 (fetch + effect)
- `quiz-player.tsx` lines 118–154 (fetch + effect)
- `join-class-form.tsx` lines 83–142 (fetch + submission)

**Severity:** HIGH — violates AGENTS.md "Keep business logic out of React components" and "Business logic belongs in `/packages/backend`."

Every data-fetching component in this batch directly calls `fetch()` inside `useEffect` or `useTransition`. The monorepo golden-path intends for these calls to delegate to `@reading-advantage/domain` functions (via server actions, server components, or route handlers that themselves delegate to domain modules). The current pattern couples the UI to the API endpoint URL, response shape, and error-handling strategy directly.

For example, `student-mastery-profile.tsx` (lines 69–131) contains a 62-line data-fetching function with polling logic, timeout, error categorization by HTTP status, and state management — all of which should live in a backend module with only the result passed to the component.

**Recommendation:** Move data-fetching orchestration (including polling, timeout, retry) into backend domain modules in `@reading-advantage/domain/students`. Components should receive data via props (server components or `async` component data-loaders) or thin wrappers. At minimum, extract fetch + state management into custom hooks collocated in `lib/hooks/`.

---

### F-SA-B08-003 — MEDIUM — `quiz-player.tsx` is a monolithic 689-line component with excessive responsibility

**File:** `quiz-player.tsx` (689 lines total)

**Severity:** MEDIUM — maintainability concern; violates single-responsibility principle.

The component handles all of the following in a single file:

1. Quiz data fetching (lines 118–154)
2. Answer state management (lines 98–100)
3. Question timing/tracking (lines 157–170)
4. Navigation between questions (lines 173–196)
5. Submission logic with response construction (lines 220–311)
6. Celebration/animation orchestration (confetti, level-up, badge queue) (lines 269–303)
7. Result display with breakdown (lines 355–480)
8. Error, loading, empty states (lines 326–499)
9. Question type dispatching (lines 551–586)
10. Submit confirmation dialog (lines 637–654)

This makes the file difficult to test, reason about, and modify without regression.

**Recommendation:** Decompose into smaller units:
- `useQuizSession` hook for data fetching, timing, answer state
- `QuizResultsPanel` component for the result screen (355 lines alone)
- `QuizNavigation` component for prev/next/submit buttons
- `CelebrationOverlay` component for confetti/level-up/badge animations

---

### F-SA-B08-004 — MEDIUM — Stale closure risk in `StudentMasteryProfile` polling cleanup

**File:** `student-mastery-profile.tsx`, lines 133–143

```ts
useEffect(() => {
  fetchMasteryProfile();
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [studentId]);
```

**Severity:** MEDIUM — the cleanup closure captures `pollingInterval` from the initial render. Since `pollingInterval` is a `useState` value and the effect only depends on `studentId`, when the polling interval is set (line 109: `setPollingInterval(interval)`), the cleanup function still references the original `null` value. The interval is never cleared on unmount, creating a potential memory leak and continued API calls after the component unmounts.

The `eslint-disable-next-line react-hooks/exhaustive-deps` suppresses the warning that would catch this.

**Recommendation:** Use `useRef<number | null>(null)` for the interval ID instead of `useState`. This ensures the cleanup closure always reads the current interval ID. Remove the `eslint-disable` comment. Example:

```ts
const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

Then in the effect: `pollingRef.current = setInterval(...)` and cleanup: `if (pollingRef.current) clearInterval(pollingRef.current)`.

---

### F-SA-B08-005 — MEDIUM — `window.location.reload()` used for quiz retake instead of controlled re-fetch

**File:** `quiz-player.tsx`, line 428

```ts
window.location.reload(); // Reload to fetch new quiz
```

**Severity:** MEDIUM — a full page reload to re-fetch data is a UX degradation and anti-pattern in a SPA context. It discards React state, causes a flash of white, and re-executes all JavaScript bundles. The comment itself (`// Reload to fetch new quiz`) acknowledges this is a workaround rather than a designed behavior.

The intended flow: the user clicks "Retake Quiz" (line 422–429), which resets state variables (`setResult(null)`, `setAnswers({})`, etc.) and then reloads the page. The state reset alone should be sufficient if the quiz data is re-fetched in the `useEffect` on mount. The `window.location.reload()` is redundant if the reset triggers a re-render that goes through the loading state again.

**Recommendation:** Remove `window.location.reload()` and ensure the state reset (lines 422–427) is sufficient to re-trigger the quiz fetch through the existing `useEffect` dependency chain. If the fetch depends on `lessonSlug` (which hasn't changed), consider adding a `retakeToken` state that is incremented and included in the `useEffect` deps.

---

### F-SA-B08-006 — MEDIUM — `studentId` prop declared but not used in `GamificationDashboardCard` and `LessonViewer`

**Files:**
- `gamification-dashboard-card.tsx`, line 32: `studentId` prop declared, fetch URL uses `/api/students/me/gamification` (no `studentId`)
- `lesson-viewer.tsx`, line 53–63: no `studentId` in props, but `classId` and `lessonSlug` are passed

**Severity:** MEDIUM — misleading props create confusion about the intended API contract and may indicate an incomplete migration.

`GamificationDashboardCard` receives `studentId` as a prop (line 32) but fetches from `/api/students/me/gamification` (line 93), which derives the student identity from the session cookie. The `studentId` prop is never rendered or sent to the server. If a parent passes a different student's ID, the card would still show the logged-in user's data — a latent correctness bug for teacher/observer views.

**Recommendation:** Either (a) remove the `studentId` prop if the endpoint always uses the session user, or (b) pass `studentId` in the fetch URL so the component is reusable for non-self views. Add JSDoc clarifying whether the component displays the logged-in user's data or an arbitrary student's data.

---

### F-SA-B08-007 — MEDIUM — `showThai` prop declared but unused in `LessonViewer`

**File:** `lesson-viewer.tsx`, line 60

```ts
/** Show Thai translations when available */
showThai?: boolean;
```

**Severity:** MEDIUM — dead prop that is never referenced in the component body. The `displayPreference` prop (`'en' | 'th' | 'side-by-side'`) serves the same purpose and is actually used. The `showThai` prop was likely a legacy API that was replaced but not removed.

**Recommendation:** Remove the `showThai` prop. If backward compatibility is needed, map it to `displayPreference` internally with a deprecation comment.

---

### F-SA-B08-008 — MEDIUM — `question.options` fallback mismatch between multiple-choice and vocabulary-match question types

**Files:**
- `multiple-choice-question.tsx`, line 19: `Array.isArray(question.options) ? question.options : []`
- `multiple-select-question.tsx`, line 19: identical pattern
- `vocabulary-match-question.tsx`, lines 31–35: `{ terms: [], definitions: [] }` fallback

**Severity:** MEDIUM — the `QuizQuestion.options` type (from `types.ts`) is `QuestionOptions` = `string[] | { terms: string[]; definitions: string[] } | null | undefined`. Both branches handle `null`/`undefined`, but neither logs a warning when the options don't match the expected shape. Silent fallback to empty arrays means a mismatched API response produces a blank UI with no error feedback.

In `vocabulary-match-question.tsx`, the type guard (lines 31–35) uses `'terms' in question.options` and `'definitions' in question.options`, which is correct but would produce `{ terms: [], definitions: [] }` silently if the API sends a structurally invalid but not-null/undefined value.

**Recommendation:** Log a warning via `clientLogger.warn` when options fall back to the default value, so API contract violations are observable without crashing the UI.

---

### F-SA-B08-009 — MEDIUM — `StudentBadgesSection` does not handle HTTP error responses (fetches silently on failure)

**File:** `student-badges-section.tsx`, lines 55–74

```ts
const response = await fetch(`/api/students/${studentId}/achievements`);
if (response.ok) {
  const data: AchievementsResponse = await response.json();
  setAchievements(data.achievements);
}
```

**Severity:** MEDIUM — silent failure. If the API returns 401, 403, 500, etc., the component falls through with an empty achievements array and sets `isLoading` to `false`. The user sees "0/X Badges" with no indication that the data failed to load. Compare with `student-mastery-profile.tsx` which explicitly handles 401/403/404.

**Recommendation:** Add error state handling that distinguishes "no badges earned" from "failed to load." Include a `clientLogger.error` call for non-ok responses and consider showing a small error indicator.

---

### F-SA-B08-010 — MEDIUM — `QuestionOptions` type is overly broad

**File:** `types.ts`, lines 10–17

```ts
export type QuestionOptions =
  | string[]
  | {
    terms: string[];
    definitions: string[];
  }
  | null
  | undefined;
```

**Severity:** MEDIUM — the inclusion of both `null` and `undefined` as separate union members when they are handled identically everywhere creates type-narrowing complexity without benefit. Every question component already guards with runtime fallbacks for both `null` and `undefined`, making the distinction meaningless.

Additionally, the type allows `number[]` through the union implicitly via the `string[]` arm (TypeScript structural compatibility doesn't affect arrays), but `number` values would be accepted at runtime by components expecting strings.

**Recommendation:** Remove `undefined` from the union (prefer `null` for "not set") or use optional on the consuming field (`options?: ...`). Consider using a discriminated union based on `QuizQuestionType` to narrow `options` at the type level per question type.

---

### F-SA-B08-011 — MEDIUM — `'use client'` directive on a types-only file

**File:** `types.ts`, line 1

```ts
"use client";
```

**Severity:** MEDIUM — the `'use client'` directive marks the entire module as a client boundary. Since this file contains only type exports (`QuizQuestionType`, `QuestionOptions`, `QuizQuestion`, `StudentAnswer`), the directive is unnecessary. Types are erased at compile time and have no runtime effect. Adding `'use client'` to a types-only file can cause issues if another server component imports types from this file — it creates an unnecessary client boundary that prevents server-component usage.

**Recommendation:** Remove the `'use client'` directive from `types.ts`. This file should be importable from both client and server components.

---

### F-SA-B08-012 — LOW — Duplicate helper functions across mastery-profile components

**Files:**
- `mastery-profile-hero.tsx`, lines 13–25: `getMasteryBadgeVariant` and `getMasteryLabel`
- `mastery-progress-display.tsx`, lines 11–23: identical `getMasteryBadgeVariant` and `getMasteryLabel`

**Severity:** LOW — code duplication, maintenance hazard.

Four functions are defined identically in two files. Both map mastery level thresholds (0.6 and 0.8) to `'destructive' | 'secondary' | 'default'` badge variants and `'Needs Support' | 'Developing' | 'Proficient'` labels. If the thresholds ever change, one file will inevitably be missed.

**Recommendation:** Extract into a shared helper module, e.g., `lib/gamification/mastery.ts`, and import it in both components.

---

### F-SA-B08-013 — LOW — Emoji in `StudentAssignmentsCard` title violates AGENTS.md

**File:** `student-assignments-card.tsx`, line 82–83

```tsx
<CardTitle className="flex items-center gap-2">
  📝 Upcoming Assignments
</CardTitle>
```

**Severity:** LOW — AGENTS.md states "Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked."

The pencil emoji (`📝`) in the card title is a decoration that should be replaced with an icon from `lucide-react` (e.g., `Calendar` or `ClipboardList`) for consistency with the rest of the component suite. Other cards in this batch use `lucide-react` icons (e.g., `Flame`, `Trophy`, `Star` in `gamification-dashboard-card.tsx`).

**Recommendation:** Replace `📝` with a `lucide-react` icon (e.g., `ClipboardList` or `CalendarCheck`).

---

### F-SA-B08-014 — LOW — `StudentAssignmentsCard` silently catches all errors

**File:** `student-assignments-card.tsx`, lines 61–62

```ts
} catch {
  // Silently handle
}
```

**Severity:** LOW — error invisibility. Every other component in this batch logs errors via `clientLogger.error()`. This component silently swallows all errors, making API failures invisible in observability tooling. A TypeScript `catch` clause without a binding is valid but loses the error object entirely.

**Recommendation:** Log via `clientLogger.error()` and optionally set an `error` state to show a subtle error indicator to the user.

---

### F-SA-B08-015 — LOW — `lesson-viewer.tsx` uses array index as React key for objectives lists

**File:** `lesson-viewer.tsx`, lines 308 and 319

```tsx
{lessonData.lesson.objectives.map((objective, index) => (
  <li key={index} className="text-gray-700">
    {objective}
  </li>
))}
```

**Severity:** LOW — using array index as a key is an anti-pattern for lists that may be reordered or filtered. For learning objectives (which are stable, string-only arrays unlikely to change order), the practical risk is minimal. However, this pattern propagates through the codebase and may be copied into more dynamic contexts.

**Recommendation:** Use the objective text as the key (e.g., `key={objective}`) since objectives are unique within a lesson, or generate a stable hash. At minimum, add a comment noting the index key is safe because the list is static.

---

### F-SA-B08-016 — LOW — `join-class-form.tsx` fetch response parsing double-handles non-JSON responses

**File:** `join-class-form.tsx`, lines 96–103

```ts
try {
  body = (await response.json()) as JoinClassResponse
} catch (parseError) {
  clientLogger.error('student.join-class-form.failed.to.parse.join.class.response', { error: parseError });
  toast.error("Unexpected response from server")
  return
}
```

**Severity:** LOW — the outer `catch` (lines 132–138) also handles `error` generically with `toast.error("Unable to join class", ...)`. The inner try/catch for JSON parsing produces a different error message ("Unexpected response from server") than the outer catch ("Unable to join class"). This is inconsistent: both are network-level failures but produce different user-facing messages.

**Recommendation:** Use a single error handler scope. Either propagate the parse error to the outer catch, or make both messages consistent.

---

### F-SA-B08-017 — LOW — `MasteryProgressDisplay` uses `Math.round(overallAverage * 100)` without bounds clamping

**File:** `mastery-progress-display.tsx`, line 30

```ts
const masteryPercentage = Math.round(overallAverage * 100);
```

**Severity:** LOW — if `overallAverage` is outside 0–1 (e.g., 1.5 from a bug), `masteryPercentage` would be 150, and `Progress` from shadcn/ui would render a bar wider than its container. The `Badge` and `getMasteryLabel` functions would also behave unexpectedly (e.g., label says "Proficient" for `level >= 0.8` which would be true, but the display logic would be wrong).

**Recommendation:** Add `Math.min(1, Math.max(0, overallAverage))` before the percentage calculation, or validate at the API/domain layer that mastery values are in 0–1 range.

---

### F-SA-B08-018 — LOW — `formatRelativeTime` in `mastery-strands-list.tsx` can produce negative values for future dates

**File:** `mastery-strands-list.tsx`, lines 58–69

```ts
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  // ...
}
```

**Severity:** LOW — if `lastAssessedAt` is in the future (clock skew, data bug), `diffMs` is negative, `Math.floor` of a negative number goes more negative, and none of the positive-day conditions match, so the function falls through to the `years ago` branch. A future date would display as "0 years ago" or similar nonsense.

This function is also duplicated logic — `lib/utils/date.ts` likely provides `formatRelativeTime` (imported in `student-class-card.tsx`). Using the shared utility instead would be more consistent.

**Recommendation:** Handle `diffMs < 0` explicitly (return "Just now" or "Today"), or import the shared `formatRelativeTime` from `@/lib/utils/date` if available.

---

### F-SA-B08-019 — LOW — `StudentMasteryProfile` computes `overallAverage` inline instead of receiving from API

**File:** `student-mastery-profile.tsx`, lines 204–208

```ts
overallAverage={
  data.strands.length > 0
    ? data.strands.reduce((sum, s) => sum + s.masteryAverage, 0) /
      data.strands.length
    : 0
}
```

**Severity:** LOW — the `MasteryProfileResponse` type already includes individual strand data, but the overall average is recomputed client-side. This is a simple arithmetic mean that is inexpensive, but if the backend ever adjusts the formula (e.g., weighted average by standard count), the client would diverge.

**Recommendation:** Include `overallAverage` in the `MasteryProfileResponse` API response so the server is the single source of truth. Fall back to the client-side computation only if backward compatibility is needed.

---

### F-SA-B08-020 — LOW — `join-class-form.tsx` uses `form.reset()` before `router.refresh()`

**File:** `join-class-form.tsx`, lines 130–131

```ts
form.reset()
router.refresh()
```

**Severity:** LOW — calling `form.reset()` before `router.refresh()` means the form resets first, then the server component re-renders. If the server component depends on the form's state (it shouldn't, but it's a timing dependency), the order could be surprising. More importantly, after `router.refresh()`, the client-side React state may be stale.

This is a minor timing/ordering concern. The typical pattern is to call `router.refresh()` first, then `form.reset()` in a `useEffect` or after the refresh settles.

**Recommendation:** Swap the order: `router.refresh()` then `form.reset()`. This ensures the server component re-renders before the form resets to a clean state.

---

## Positive Observations

- **ClientLogger usage:** 9 of the 11 data-fetching components correctly log errors via `clientLogger.error()`. Only `student-assignments-card.tsx` swallows errors silently (F-SA-B08-014).
- **AbortController pattern:** `StudentClassesSection` (file 20) correctly uses `AbortController` and `signal` with `return () => controller.abort()` — the gold standard for cancel-safe data fetching in React.
- **Zod boundary validation:** `join-class-form.tsx` uses `zodResolver` for form validation, `student-classes-section.tsx` validates the API response with `studentEnrolledClassesResponseSchema.parse(payload)`. Both follow the contract-driven validation golden path.
- **Input sanitization:** `join-class-form.tsx` sanitizes join code input via `sanitizeJoinCodeInput` and uses `autoCapitalize: "characters"` for UX.
- **ARIA attributes:** Progress bars in `mastery-progress-display.tsx` (line 51) and `mastery-strands-list.tsx` (lines 103, 189–190) include `aria-label`, `aria-valuenow`, and `aria-valuetext`.
- **Error discrimination by HTTP status:** `lesson-viewer.tsx` (lines 205–214), `quiz-player.tsx` (lines 126–139), and `student-mastery-profile.tsx` (lines 76–92) all map HTTP status codes to specific user-facing messages.
- **Clean empty states:** Every component handles the empty/zero-data case: empty arrays, null data, no assignments, no classes.
- **Question type dispatch:** The quiz question type dispatching in `quiz-player.tsx` (lines 551–586) is clean and follows the discriminated union pattern.

---

## Limitations

- **No runtime execution:** All findings are based on static analysis only. Issues related to client-side rendering behavior (e.g., stale closures, stale closure cleanup) could not be verified by execution.
- **No parent-component analysis:** Several components (e.g., `GamificationDashboardCard`, `StudentBadgesSection`) receive `studentId` props. Whether the parent passes the correct value depends on code outside this batch's scope.
- **AGENTS compliance scope:** The finding that components embed business logic (F-SA-B08-002) evaluates against the monorepo AGENTS.md ideal. In practice, this batch contains UI-layer components that conventionally include data-fetching; the degree of "should be in backend" is an architectural judgment call.
- **`formatRelativeTime` duplication:** Finding F-SA-B08-018 flags potential duplication with `@/lib/utils/date`. The shared utility export was consulted (`student-class-card.tsx` line 8 imports it) but whether the same function exists there was not verified — the finding notes the inconsistency.

---

## Unreviewed (out of scope)

- `@reading-advantage/domain/students/*` — backend domain functions
- `lib/hooks/*` — potential hook extraction targets
- `lib/gamification/badges.constants.ts` — reviewed for understanding only
- `lib/config/features.ts` — reviewed for understanding only
- `lib/validations/class.ts` — reviewed for understanding only
- `lib/validations/student-classes.ts` — reviewed for understanding only
- `app/api/*` routes — already covered by batch 04
- Parent components that consume these child components

---

## File-by-File Checklist

| # | File | Findings | Status |
|---|------|----------|--------|
| 1 | `gamification-dashboard-card.tsx` | B08-001 (JSDoc), B08-002 (logic in component), B08-006 (unused studentId) | ✅ |
| 2 | `join-class-form.tsx` | B08-001 (JSDoc), B08-016 (inconsistent error messages), B08-020 (form.reset ordering) | ✅ |
| 3 | `lesson-viewer.tsx` | B08-001 (JSDoc), B08-002 (logic in component), B08-007 (unused showThai), B08-015 (index key) | ✅ |
| 4 | `mastery-profile-hero.tsx` | B08-001 (JSDoc), B08-012 (duplicate helpers) | ✅ |
| 5 | `mastery-profile-skeleton.tsx` | B08-001 (JSDoc) | ✅ |
| 6 | `mastery-progress-display.tsx` | B08-001 (JSDoc), B08-012 (duplicate helpers), B08-017 (no bounds clamp) | ✅ |
| 7 | `mastery-strands-list.tsx` | B08-001 (JSDoc), B08-018 (formatRelativeTime future dates) | ✅ |
| 8 | `student-badges-section.tsx` | B08-001 (JSDoc), B08-002 (logic in component), B08-009 (silent HTTP errors) | ✅ |
| 9 | `student-mastery-profile.tsx` | B08-001 (JSDoc), B08-002 (logic in component), B08-004 (stale closure), B08-019 (client-side average) | ✅ |
| 10 | `quiz-player.tsx` | B08-001 (JSDoc), B08-002 (logic in component), B08-003 (monolithic), B08-005 (window.reload) | ✅ |
| 11 | `fill-in-blank-question.tsx` | B08-001 (JSDoc) | ✅ |
| 12 | `multiple-choice-question.tsx` | B08-001 (JSDoc) | ✅ |
| 13 | `multiple-select-question.tsx` | B08-001 (JSDoc) | ✅ |
| 14 | `true-false-question.tsx` | B08-001 (JSDoc) | ✅ |
| 15 | `types.ts` | B08-001 (JSDoc), B08-010 (overly broad QuestionOptions), B08-011 (unnecessary 'use client') | ✅ |
| 16 | `vocabulary-match-question.tsx` | B08-001 (JSDoc) | ✅ |
| 17 | `student-assignments-card.tsx` | B08-001 (JSDoc), B08-002 (logic in component), B08-013 (emoji), B08-014 (silent catch) | ✅ |
| 18 | `student-class-card-skeleton.tsx` | B08-001 (JSDoc) | ✅ |
| 19 | `student-class-card.tsx` | B08-001 (JSDoc) | ✅ |
| 20 | `student-classes-section.tsx` | B08-001 (JSDoc), B08-002 (logic in component) | ✅ |

---

## Finding ID Index

| ID | Severity | Short Title |
|----|----------|-------------|
| F-SA-B08-001 | HIGH | Systemic absence of JSDoc on all exported components |
| F-SA-B08-002 | HIGH | Business logic embedded in client components (systemic) |
| F-SA-B08-003 | MEDIUM | quiz-player.tsx is a monolithic 689-line component |
| F-SA-B08-004 | MEDIUM | Stale closure risk in StudentMasteryProfile polling cleanup |
| F-SA-B08-005 | MEDIUM | window.location.reload() for quiz retake |
| F-SA-B08-006 | MEDIUM | studentId prop unused in GamificationDashboardCard |
| F-SA-B08-007 | MEDIUM | showThai prop unused in LessonViewer |
| F-SA-B08-008 | MEDIUM | Silent fallback in question options on shape mismatch |
| F-SA-B08-009 | MEDIUM | StudentBadgesSection silent on HTTP error responses |
| F-SA-B08-010 | MEDIUM | QuestionOptions type is overly broad |
| F-SA-B08-011 | MEDIUM | 'use client' on types-only file |
| F-SA-B08-012 | LOW | Duplicate mastery helper functions |
| F-SA-B08-013 | LOW | Emoji in StudentAssignmentsCard title |
| F-SA-B08-014 | LOW | StudentAssignmentsCard silently catches all errors |
| F-SA-B08-015 | LOW | Array index as React key for objectives |
| F-SA-B08-016 | LOW | Inconsistent error messages in join-class-form |
| F-SA-B08-017 | LOW | Mastery percentage not bounds-clamped |
| F-SA-B08-018 | LOW | formatRelativeTime can produce negative for future dates |
| F-SA-B08-019 | LOW | Client-side recomputation of overallAverage |
| F-SA-B08-020 | LOW | form.reset before router.refresh ordering |

---

*End of report. 20 of 20 files reviewed. No acceptance or closeout claims made.*
