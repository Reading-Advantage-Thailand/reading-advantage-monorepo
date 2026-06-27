# Line Review Evidence: primary-advantage-036

Reviewer: coder-xiaomi-mimo-v2-5-pro/primary-advantage-036
Files assigned: 1
Lines assigned: 1036

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx` | 1-1036 | reviewed | 8 |

## Findings

### LR-036-001 — Undefined `update` and `session` variables cause runtime crash on game completion

- Severity: Critical
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:304-308`
- Evidence: At line 114, `const { user } = useSession()` destructures only `user`. At lines 304-308, `update({ user: { ...session?.user } })` is called — but neither `update` nor `session` is defined in scope. `useSession()` from `@reading-advantage/auth-client` likely returns `{ user, session, update }`, but only `user` was destructured. This produces a `ReferenceError` at runtime when `handleNext` fires after completing the last sentence group (line 293 `setGameComplete(true)` is reached, then line 304 crashes).
- Impact: The game completion flow is broken. Users who finish all sentence groups will see a runtime error instead of the completion screen. For primary students, this is especially disruptive — they complete the task successfully but get an error.
- Recommendation: Destructure `update` and `session` from `useSession()` at line 114: `const { user, session, update } = useSession()`. If `update` is not needed (the call appears to be a no-op sync of the session object), remove lines 304-308 entirely.

### LR-036-002 — Hardcoded English strings break i18n for multilingual primary students

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:420,435,464,524,527,709,917`
- Evidence: Seven hardcoded English strings exist while the rest of the component uses `t()` from `next-intl`:
  - Line 420: `toast.success("Playing correct order audio sequence 🔊")`
  - Line 435: `toast.error("No sentences found for audio playback")`
  - Line 464: `toast.error("Audio data not available for playback")`
  - Line 524: `toast.success("Audio sequence completed! 🎵")`
  - Line 527: `toast.error("Failed to play hint audio")`
  - Line 709: `Loading next challenge...` (JSX text node)
  - Line 917: `✓ Correct` (JSX text node in Badge)
- Impact: Primary students using Thai, Chinese, Vietnamese, or Traditional Chinese locales will see English fallback text in hint audio toasts and the correct-position badge. This is inconsistent with the fully-localized game instructions and button labels.
- Recommendation: Replace all 7 instances with `t()` calls using existing or new keys in the `SentencesPage.sentenceOrder` namespace.

### LR-036-003 — Debug console.log/console.error left in production code

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:138,432,444-456,526`
- Evidence: Four locations emit to browser console in production:
  - Line 138: `console.error("Error loading sentences:", error)` — exposes error objects to end users
  - Line 432: `console.log("correctOrderSentences", correctOrderSentences)` — dumps full sentence data including translations and audio URLs
  - Lines 444-456: `console.log("📊 Debug - Playing continuous audio:", { firstSentence, lastSentence, totalSentences })` — dumps audio metadata with timestamps
  - Line 526: `console.error("Error playing hint audio:", error)` — exposes error objects
- Impact: Debug logging leaks application data (sentence content, audio URLs, translations) into browser developer tools. While not a security vulnerability per se, it violates the structured-logging expectation from AGENTS.md and exposes internal data structures.
- Recommendation: Remove all `console.log` statements. Replace `console.error` calls with structured error handling or remove them if `toast.error` already surfaces the error to the user (which it does in all four cases).

### LR-036-004 — HTML5 drag-and-drop has no touch/tablet support

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:843-848`
- Evidence: The drag-and-drop implementation uses the HTML5 Drag and Drop API exclusively (`draggable`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`). Lines 843-848 attach these handlers to each sentence card. No touch event handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) or pointer event handlers are present. No drag-and-drop library (e.g., `@dnd-kit`) is imported.
- Impact: Primary students commonly use tablets in classroom settings. The HTML5 drag-and-drop API has limited or no support on mobile/tablet browsers (iOS Safari, Chrome for Android). The game becomes effectively unusable on these devices — students cannot reorder sentences.
- Recommendation: Migrate to `@dnd-kit/core` (already available in the monorepo via shadcn/ui patterns) or add touch-event fallback handlers. This is a product-blocking issue for tablet-based classrooms.

### LR-036-005 — Division by zero in accuracy calculation

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:552`
- Evidence: `const accuracy = Math.round((score / activeSentences.length) * 100)` — if `activeSentences.length` is 0, this produces `NaN` which would render as "NaN%" in the completion screen. While the start button is disabled when `activeSentences.length === 0` (line 691), the `gameComplete` state could theoretically be reached via `handleNext` if `activeSentences` is cleared between game start and completion.
- Impact: Edge case displays "NaN%" to primary students in the accuracy stat card, which is confusing and unprofessional.
- Recommendation: Add a guard: `const accuracy = activeSentences.length > 0 ? Math.round((score / activeSentences.length) * 100) : 0`.

### LR-036-006 — Missing exhaustive-deps in useEffect and useCallback hooks

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:122-126,289-310`
- Evidence:
  - Lines 122-126: `useEffect` calls `loadSentencesFromDeck()` (defined at line 128) but does not include it in the dependency array. The function captures `setIsLoading`, `setActiveSentences`, `toast`, and `t` via closure. While the current behavior is correct (the effect should only re-run when `articleId` changes), the ESLint `react-hooks/exhaustive-deps` rule would flag this.
  - Lines 289-310: `handleNext` useCallback references `articleId`, `timer`, `updateUserActivity`, `ActivityType`, `UserXpEarned`, `update`, and `session` — none listed in deps (only `currentIndex` and `activeSentences.length`). If `articleId` or `timer` change between renders, the callback captures stale values.
- Impact: Stale closure risk. `handleNext` could submit incorrect timer values to `updateUserActivity` if the timer changes between when the callback was memoized and when it fires.
- Recommendation: Either include all referenced variables in the dependency arrays or use `useRef` for values that should not trigger re-memoization. For `handleNext`, at minimum add `articleId` and `timer` to the deps.

### LR-036-007 — No error boundary for primary-student UX

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx` (entire component)
- Evidence: The `LessonSentenceOrder` component has no React error boundary wrapping it. If any rendering error occurs (e.g., from the undefined `update`/`session` in Finding 001, or from unexpected data shapes), the entire page crashes with an unhandled error. No fallback UI is provided for primary students.
- Impact: Primary students would see a raw React error overlay or a blank page, with no way to recover or understand what happened. This is especially problematic for young learners who may not be able to articulate the error to their teacher.
- Recommendation: Wrap the component in a React error boundary that displays a child-friendly error message with a "Try Again" button. Consider using Next.js `error.tsx` at the route level (which exists at `app/[locale]/(student)/student/read/[articleId]/error.tsx` but not for the sentence ordering route).

### LR-036-008 — Timer continues counting when browser tab is hidden

- Severity: Low
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:151-159`
- Evidence: The timer uses `setInterval` at 1000ms (line 154). Modern browsers throttle `setInterval` in background tabs but do not stop it entirely. The timer state keeps incrementing even when the student switches to another tab or app. No `visibilitychange` event listener or `document.hidden` check is present.
- Impact: Primary students frequently switch tabs or apps during classroom activities. The reported "total time" at game completion (line 599) will include time spent away from the game, producing inaccurate time tracking that could mislead teachers assessing student engagement.
- Recommendation: Add a `document.addEventListener("visibilitychange", ...)` handler that pauses/resumes the timer when the tab is hidden/visible, or use `performance.now()` to calculate elapsed time more accurately.

## No-Finding Notes

- Lines 1-8: Standard React imports, no issues.
- Lines 9-31: UI component imports from shadcn/ui and lucide-react, appropriate for the component's visual complexity.
- Lines 32-41: i18n, toast, router, and action imports — correctly using the app's established patterns.
- Lines 43-87: TypeScript interfaces for `OrderSentenceData`, `OrderSentenceGameProps`, and `DraggableSentence` — well-structured with appropriate optional fields for translations and audio.
- Lines 89-117: Component state declarations — appropriate use of `useState` for game state management. The state variables are well-named and serve clear purposes.
- Lines 162-189: Fisher-Yates shuffle implementation — correct algorithm, properly creates a copy before shuffling, maps to draggable format with unique IDs using `Date.now()`.
- Lines 192-200: Effect to initialize shuffled sentences on group change — correctly resets game state.
- Lines 203-232: Auto-check answer effect — properly guarded by `hasUserInteracted` flag to prevent false positives on initial render.
- Lines 235-283: Drag handlers — standard HTML5 DnD implementation, correctly manages drag state and reorders array.
- Lines 324-342: Manual check answer handler — correct logic with appropriate user feedback.
- Lines 344-356: Restart and show answer handlers — simple state resets, correct.
- Lines 365-369: Time formatting utility — correct implementation.
- Lines 371-383: Progress and correctness memoization — correct use of `useMemo`.
- Lines 385-408: Hint toggle functions — simple state toggles, correct.
- Lines 411-531: Hint audio playback — complex but functional audio sequencing logic with proper cleanup and timeout fallback.
- Lines 534-548: Loading state render — appropriate loading spinner with localized text.
- Lines 550-618: Game complete screen — well-designed with stats grid, localized except for the division-by-zero edge case noted above.
- Lines 620-701: Start screen — good UX with game stats, instructions, and localized content.
- Lines 704-713: Fallback loading state — correct defensive rendering.
- Lines 715-1035: Main game render — well-structured JSX with progress bar, hint controls, drag-and-drop area, result display, and action buttons. Correct use of `cn()` for conditional styling.
