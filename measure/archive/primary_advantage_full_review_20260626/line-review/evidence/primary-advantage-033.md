# Line Review Evidence: primary-advantage-033

Reviewer: coder-minimax-m3/primary-advantage-033
Files assigned: 1
Lines assigned: 741

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx` | 1-741 | reviewed | 10 |

## Findings

### LR-primary-advantage-033-001 — `update({ user: { ...session?.user } })` references undeclared `session`; runtime ReferenceError blocks completion

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:230-234`
- Evidence: Inside `handleCardRating` (line 184) the success branch (line 216) calls `update({ user: { ...session?.user } })` on lines 230-234. The `useSession()` import on line 68 is destructured as `const { user } = useSession();` on line 137 — `session` is **never** declared in this component's scope. The `useSession()` return type in `apps/primary-advantage/node_modules/@reading-advantage/auth-client/dist/index.d.ts:47-51` is `{ user: AuthUser | null; isAuthenticated: boolean; isLoading: boolean }` (no `session` field). The optional-chained `session?.user` is a JavaScript ReferenceError, not a TypeScript no-op — `session` is undeclared, so any attempt to read it throws `ReferenceError: session is not defined`. This same anti-pattern is duplicated across 7 sibling files in `apps/primary-advantage/components/lesson/games/`: `lesson-vocabulary-flashcard-card.tsx:238`, `lesson-sentence-order.tsx:306`, `lesson-sentence-order-word.tsx:288`, `lesson-sentence-matching.tsx:219`, `lesson-vocabulary-matching.tsx:217`, `lesson-sentence-cloze-test.tsx:526`. This is a fork-specific pattern: the prior Reading Advantage implementation likely used an `useSession()` that returned `{ session, ... }` (the auth-client provider code at `node_modules/@reading-advantage/auth-client/dist/index.js:36-37` previously read `data.session?.user` from a fetch response). The fork's lesson-games components were never updated to the slimmed-down `useSession` shape.
- Impact: Critical. The success path of the final card's rating handler is unreachable in a working state — the ReferenceError thrown by `update({...})` aborts the surrounding `startTransition` callback, so `setGameState(GameState.COMPLETED)` on line 244 still runs (it's outside the transition), but the XP/activity logging already completed on lines 218-229 will have its effect obscured by the JS exception, and the user sees the completion screen with the wrong XP if any. More importantly, the prior context (line 202 `setPaused(true)`, line 217 `setSessionComplete(true)`) is left in a half-applied state because the exception propagates through the transition.
- Recommendation: Replace `update({ user: { ...session?.user } })` with either (a) `update({ user })` — the `useSession()` return value is the correct source and the action surface should accept it, or (b) delete the call entirely and rely on the `updateUserActivity` server action (line 218) for the authoritative state update. The auth-client package should be expanded to expose an `update()` action (or the call removed) so the surrounding 7 files can be patched in one mechanical change. Track this under a new `primary_advantage_session_update_bug_<date>` Measure track for a sweep across all 7 files.

### LR-primary-advantage-033-002 — Dead `safeCompletionData` object: built on lines 260-266 but never read in completion JSX

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:258-330`
- Evidence: When `shouldShowCompletion` is true (line 258), the code constructs a `safeCompletionData` fallback (lines 260-266) with `xpEarned: 20`, `timeTaken: 0`, default `sessionStats`, and `completionDate`. However, the completion JSX on lines 268-330 never references `safeCompletionData`. Instead, the rendered values are: `UserXpEarned.SENTENCE_FLASHCARDS` literal (line 300), `formatTime(timer)` from the QuizContext (line 308), and `completedCards}/{words.length}` (line 316). The `completionData` state (declared on line 120) is similarly never assigned anywhere in the file — `setCompletionData` is never called. The `safeCompletionData` is a defensive scaffold with no consumer.
- Impact: High. The completion screen always shows the static `UserXpEarned.SENTENCE_FLASHCARDS` enum value as the XP, regardless of what XP was actually earned via the rating flow. For a primary-student app, the completion screen is a key motivation loop (badge for finishing the activity). Showing a static value, plus a wall-clock from the QuizContext timer (which keeps running if `setPaused(true)` is racy, see finding 005), creates an inaccurate "you earned X XP" feedback. The user has no real completion record because `setCompletionData` is never invoked from the rating handler either.
- Recommendation: Either (a) actually wire `setCompletionData({ xpEarned: UserXpEarned.SENTENCE_FLASHCARDS, timeTaken: timer, sessionStats, isExistingCompletion: false, completionDate: new Date().toISOString() })` inside the success branch of the transition (line 217), or (b) refactor the JSX to read the in-scope values directly (line 300 → computed `xpEarned` from the transition result, line 308 → capture `elapsedTime` at completion time, line 316 → derive from the same captured snapshot). Delete the unused `safeCompletionData` literal once a real source is in place.

### LR-primary-advantage-033-003 — Type-safety violation: `flipped: false` set on `FlashcardWord` object, but `FlashcardWord` interface has no `flipped` field

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:193-197`
- Evidence: The `FlashcardWord` interface (lines 94-102) declares fields: `id`, `sentence`, `translation`, `state`, `startTime?`, `endTime?`, `audioUrl?` — no `flipped` property. However, in `handleCardRating` (line 184) the `setWords` call on lines 193-197 maps over the array and sets `{ ...card, flipped: false }` on the next card. TypeScript with `strict: true` and the AGENTS.md "TypeScript strictness" rule should reject this assignment, but the project may be running with `noImplicitAny: false` or a similar looser setting (verified by the fact that the `as FlashcardWord[]` cast on line 168 already suppresses stricter checks). The downstream code on lines 567-590 then reads `currentCard.state` and never reads `.flipped`, so the property is dead — it is set on every rating but never consulted.
- Impact: Medium. The `flipped` field is dead state written on every card advance (line 195). It is a leftover from an earlier version of the component where the card itself tracked a `flipped` boolean for the question/answer transition. The current implementation uses the `showAnswer` state on line 114 for that purpose. The dead `flipped` write also forces a re-render of the entire `words` array (since `setWords` is called with a new array reference) on every rating, which is unnecessary because the consumers don't read `flipped`.
- Recommendation: Remove lines 193-197 entirely — the `setWords` call has no purpose if `flipped` is not read anywhere. If a future feature does need per-card `flipped` state, add it to the `FlashcardWord` interface (line 94-102) first so the type contract is explicit, and audit the codebase for read sites before re-adding the write.

### LR-primary-advantage-033-004 — Stale closure: `finalCompleted` reads `completedCards` from before the current setState takes effect

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:199-202`
- Evidence: In `handleCardRating`, when the last card is being rated (line 199 else branch), the code reads `const finalCompleted = completedCards + 1;` on line 200. The `completedCards` value here is the React state value captured at the closure where this rating call was created — i.e. it does not include the `+1` from `setCompletedCards((prev) => prev + 1)` on line 191 in a prior iteration. The very next line (201) calls `setCompletedCards(finalCompleted)` with a non-functional setter, which sets state to the stale value + 1, but React batches updates so a subsequent read of `completedCards` will see the value at the time of the next render. The whole pattern of using a non-functional setState to compute the next value from a stale closure is the bug the functional form `setCompletedCards((prev) => prev + 1)` (used on line 191) was designed to prevent.
- Impact: Medium. On the last card, the displayed `completedCards` after completion is `previousValue + 1`, not `(previousValue + 1)` from the prior `setCompletedCards` callback. If the rating handler is invoked multiple times in rapid succession (e.g. user clicks two rating buttons in quick succession), the second invocation's read of `completedCards` is still the original, leading to `finalCompleted` collisions and the progress bar / completion screen showing off-by-one counts. For a primary-student flashcard activity the bug is silent and rarely noticed.
- Recommendation: Replace lines 200-201 with `setCompletedCards((prev) => prev + 1);` to use the functional form consistently with line 191. Delete the `const finalCompleted` line — it is not used anywhere else in the function. Better: since `finalCompleted` is not referenced after the assignment, just remove both lines and rely on the final `setCompletedCards((prev) => prev + 1)` inside the transition's success path (move the increment to after the `allSuccess` check so the count reflects reality).

### LR-primary-advantage-033-005 — `setGameState(GameState.COMPLETED)` runs synchronously before the async transition resolves; UI shows "completed" while the rating save is in-flight

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:202-245`
- Evidence: `handleCardRating`'s final-card branch (line 199 onward) calls `setPaused(true)` on line 202, then `startTransition(async () => { ... })` on lines 203-242. Inside the transition, the rating reviews are dispatched (line 212), checked for success (line 214), and only on success does `updateUserActivity` run (line 218). The very last line of the else branch, line 244, calls `setGameState(GameState.COMPLETED)` **outside and after** the transition. Because `startTransition` is non-blocking — the callback runs async, but line 244 executes immediately on the same microtask — the component re-renders into the `GameState.COMPLETED` branch (line 255) before the transition's `updateUserActivity` call resolves. If the transition throws, the `try/catch` on lines 204/238 swallows it, the `setSessionComplete(true)` on line 217 is never set, and the user is shown the completion celebration screen anyway.
- Impact: High. A primary-student user who fails the last rating (server returns `success: false`) sees the same celebration UI as a successful pass. The activity log on the server may not record the completion, but the client treats it as completed. This decouples the perceived success from the actual persisted state, which violates the AGENTS.md "Auth/session/role/tenant boundaries" principle (the UI claims an outcome the system did not record).
- Recommendation: Move `setGameState(GameState.COMPLETED)` from line 244 into the transition's success branch (after `setSessionComplete(true)` on line 217, before the `else { toast.error(...) }` on line 236). On the failure branch, stay in the current state so the user can retry. If the goal is to show the celebration regardless, render a separate "in-flight" UI until the transition resolves.

### LR-primary-advantage-033-006 — Six dead `useState` hooks: `isSubmitting`, `isDeleting`, `elapsedTime`, `startTime`, `isTimerRunning`, `sessionComplete`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:115-119,132,123-128,217`
- Evidence: Six `useState` declarations are present but their setters are never invoked in the component:
  - `isSubmitting`, `setIsSubmitting` (line 115) — declared, never read or written.
  - `isDeleting`, `setIsDeleting` (line 116) — declared, never read or written.
  - `elapsedTime`, `setElapsedTime` (line 117) — declared, never read or written.
  - `startTime`, `setStartTime` (line 118) — declared, never written. `startTime` is **read** on line 605 as `currentCard.startTime` (a different `startTime`, an `AudioButton` prop derived from the current card), but the `useState` itself is dead.
  - `isTimerRunning`, `setIsTimerRunning` (line 119) — declared, never written. The timer is read from `useContext(QuizContext).timer` on line 136, not from local state.
  - `sessionComplete`, `setSessionComplete` (line 132) — `setSessionComplete(true)` is called once on line 217 inside the transition, but the value `sessionComplete` is never read in any conditional or render path. The `setSessionComplete` is a write-only no-op.
  - `sessionStats`, `setSessionStats` (lines 123-128) — `setSessionStats` is never called; the initial value is only referenced as a default inside `safeCompletionData` (line 263) which itself is unused (see finding 002).
- Impact: Low. Six state slots are allocated, each triggering a no-op React internal subscription. Bundle size and React reconciler work are minor but real. The dead state indicates the component was partially refactored from an earlier skeleton (the comment on line 253 says "for debugging" — a stale debug comment). Future maintainers will assume these are part of the contract and may add writes that never propagate, or reads from `sessionStats` that always return zero.
- Recommendation: Delete lines 115-119, 123-128, 132, and the `setSessionComplete(true)` call on line 217. Also delete the "for debugging" comment on line 253. If `isSubmitting` was meant to drive the `setIsSubmitting` write during the transition, replace it with `useTransition`'s `isPending` (already available on line 130) and gate the rating buttons on `disabled={isPending}` (already done on lines 634, 645, 656, 667).

### LR-primary-advantage-033-007 — Ten unused imports from `lucide-react` and `next-intl`; bundle-size and maintenance debt

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:15-42`
- Evidence: The import block on lines 15-42 imports 26 named exports from `lucide-react` (Trophy, Clock, Play, Pause, RotateCcw, Eye, Volume2, ThumbsUp, ThumbsDown, AlertTriangle, Zap, SkipForward, Target, Brain, Lightbulb, GraduationCap, Sparkles, Star, CheckCircle, BookOpen, AlertCircle, RefreshCw, Languages, RefreshCcwIcon, Loader2) and `useLocale` from `next-intl` (line 42). A scope-confined grep of the file shows the following 10 symbols are imported but never used in the component body:
  - `Play` (line 18) — unused
  - `Pause` (line 19) — unused
  - `Volume2` (line 22) — unused
  - `SkipForward` (line 27) — unused
  - `CheckCircle` (line 34) — unused
  - `BookOpen` (line 35) — unused
  - `AlertCircle` (line 36) — unused
  - `Loader2` (line 40) — unused
  - `RefreshCcw` (line 38) — unused (note: `RefreshCcwIcon` on line 39 **is** used on line 588)
  - `useLocale` (line 42) — unused
- Impact: Low. Each unused import adds bytes to the client bundle (lucide-react tree-shakes per-symbol but still has to scan the module graph). More importantly, it is a maintenance signal: the component was scaffolded from a template that included the full icon palette, and the cleanup was missed. Future icon additions follow the same pattern, so the gap will grow.
- Recommendation: Remove lines 18, 19, 22, 27, 34, 35, 36, 38, 40, and 42. Verify the build (`pnpm --filter primary-advantage build`) still passes after the change. Add a lint rule (`no-unused-vars` from ESLint with TypeScript's `noUnusedLocals: true`) if not already enabled — the AGENTS.md "TypeScript strictness" rule implies this should be on.

### LR-primary-advantage-033-008 — Hardcoded `"th"` default language for sentence translation; primary-students on `cn`/`tw`/`vi` see a Thai translation on first load

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:129,440-466,620`
- Evidence: The state initializer on line 129 is `useState<string>("th")` — Thai is the default regardless of the user's locale. The `SENTENCE_LANGUAGES` map (line 411, imported from `../../flashcards/deck-view`) supports `th`, `cn`, `tw`, `vi`, and `en`. The translation is read on line 620 as `currentCard.translation[selectedLanguage]` — so for a user whose `next-intl` locale is `cn` (Simplified Chinese), the card is loaded and the user must manually switch to Chinese in the start-game picker (lines 433-487) before answering. There is no `useLocale()`-driven default. The `useLocale` import on line 42 is unused (see finding 007), so the intent to drive the default from the active locale was likely abandoned mid-refactor.
- Impact: Medium. Primary-student adaptation risk. A 7-year-old student on the `cn` or `tw` locale who clicks through the "show answer" reveal (line 685) sees a Thai translation as the answer. They have to scroll up to the language picker (which is on the start screen, not the playing screen) and... actually they can't change it once playing because the picker is only rendered in `GameState.START_GAME` (line 413). They would have to navigate back, switch, and restart. The first-encounter UX is broken for non-Thai locales.
- Recommendation: Replace line 129 with `useState<string>(useLocale() ?? "th")` (and use the `useLocale` import on line 42 that is currently dead — see finding 007). Add a fallback chain: `useLocale() ?? "en"` if no app locale is set. Verify the `SENTENCE_LANGUAGES` map keys include the `useLocale()` value for all 5 supported locales (`th`, `cn`, `tw`, `vi`, `en`).

### LR-primary-advantage-033-009 — `if (gameState === GameState.COMPLETED) return;` on line 161 is dead: the preceding line 155 just set state to LOADING

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:153-177`
- Evidence: `loadGameData` is declared on line 153 as `async () => {`. The first executable line inside the `try` block is `setGameState(GameState.LOADING);` (line 155). The next conditional on line 161 is `if (gameState === GameState.COMPLETED) return;`. Because the function just set the state to `LOADING`, the captured `gameState` from the closure (line 161) is the value **before** the `setGameState` call was issued — which is whatever the state was when `loadGameData` was invoked, not the new `LOADING` value (React state updates are async and not visible in the same closure). In normal operation `loadGameData` is only called from: the `useEffect` on line 250 (initial mount, `gameState` is the initial value `LOADING`), the error retry button on line 374 (`gameState` is `ERROR`), and `shouldShowCompletion` does not call `loadGameData`. So the only time the guard could fire is if the function is called while `gameState` is already `COMPLETED` — which never happens in this file because there is no caller that does so. The guard is a leftover from the commented-out `checkExistingCompletion` (line 158) which was supposed to short-circuit reload when the activity was already done.
- Impact: Low. Dead defensive code. The `if` branch never executes, but it misleads readers into thinking the component re-checks the completion state before loading. A future maintainer who wires `loadGameData` into a "restart" flow would expect the guard to short-circuit and be surprised when it doesn't.
- Recommendation: Delete lines 158, 161, and the related `// If already completed, don't load cards` comment on line 160. If the original intent (re-enable `checkExistingCompletion` to short-circuit re-loads) is wanted, the function should read from a server action that returns `isExistingCompletion` and the guard should compare against that result, not against local `gameState` (which is always `LOADING` at the point of check).

### LR-primary-advantage-033-010 — `loadGameData` is called from `useEffect` without dependency tracking; re-mounts do not refetch

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-flashcard.tsx:249-251`
- Evidence: The `useEffect` on lines 249-251 is `useEffect(() => { loadGameData(); }, []);` — empty dependency array. `loadGameData` is declared on line 153 as a regular `async` function inside the component body, so its identity changes on every render. The `[]` dependency array means the effect fires exactly once on mount. If the `articleId` prop changes (e.g. the parent route re-renders with a different article, the user navigates between articles via the lesson sidebar), the effect does not re-fire and the flashcards for the new article are not loaded — the user sees the cards from the previously mounted article. ESLint's `react-hooks/exhaustive-deps` should flag this as a missing dependency on `loadGameData` (and transitively on `articleId` and `getLessonFlashcards`), but the rule may be configured to allow async void-effect patterns.
- Impact: Low. The component is mounted by a parent that likely keys on `articleId` (the wrapper at lines 731-741 is `LessonSentenceFlashcardGame` which takes `articleId` as a prop). If the parent uses `key={articleId}` on the wrapper, React unmounts and remounts the child, which re-fires the `useEffect` correctly. If the parent does **not** re-key, navigating between articles silently shows the old cards. There is no in-file evidence either way — the parent route is in a different batch.
- Recommendation: Change the effect to `useEffect(() => { loadGameData(); }, [articleId]);` so the cards refetch when the article changes. Wrap `loadGameData` in `useCallback` with `[articleId, getLessonFlashcards]` dependencies to make the exhaustive-deps rule happy. Verify the parent route uses `key={articleId}` on the wrapper; if not, add it as a defensive measure.

## No-Finding Notes

- Lines 1-14 (imports of React, Card, Button, Badge, Progress, Separator): clean.
- Lines 43-49 (ts-fsrs imports): clean.
- Lines 50-67 (toast, AudioButton, actions, enums, contexts, Label, cn, useTranslations): all used appropriately.
- Lines 70-77 (`GameState` enum): clean, single source of truth.
- Lines 79-92 (`SessionStats` and `CompletionData` interfaces): clean definitions; `CompletionData` is the only consumer of `SessionStats` and is itself unused (see finding 002).
- Lines 94-102 (`FlashcardWord` interface): clean except for the missing `flipped` field noted in finding 003.
- Lines 139-152 (computed values and `formatTime` / `calculateAccuracy` helpers): clean. `formatTime` is a pure function and is reused on line 308 and 529.
- Lines 179-182 (`handleShowAnswer`): clean trivial setter.
- Lines 268-329 (completion JSX rendering): rendering is well-structured with shadcn primitives; the only issue is the hardcoded XP/timer values from finding 002.
- Lines 332-406 (loading / error / no-card states): clean defensive rendering, all three states have proper icons and copy.
- Lines 408-502 (start-game state with language picker): well-structured, but the hardcoded Thai default from finding 008 undermines the picker.
- Lines 504-728 (playing state with progress, card, answer reveal, rating buttons, and stats footer): clean component structure, accessible rating button grid (lines 631-676), and a working `disabled={isPending}` gate (line 634, 645, 656, 667) tying into the `useTransition` from line 130.
- Lines 731-741 (default export wrapper providing `QuizContextProvider`): clean and minimal.
