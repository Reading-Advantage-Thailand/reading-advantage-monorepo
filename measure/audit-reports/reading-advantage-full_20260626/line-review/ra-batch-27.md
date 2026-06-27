# Line-by-Line Review: Reading Advantage — Batch 27

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-27`  
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Current HEAD:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Review Date:** 2026-06-27  
**Reviewer Role:** A — correctness / architecture / anti-patterns

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/lesson/lesson-introduction.tsx` | 1–71 |
| 2 | `apps/reading-advantage/components/lesson/lesson-language-question.tsx` | 1–327 |
| 3 | `apps/reading-advantage/components/lesson/lesson-matching-word.tsx` | 1–399 |
| 4 | `apps/reading-advantage/components/lesson/lesson-order-sentence.tsx` | 1–1169 |
| 5 | `apps/reading-advantage/components/lesson/lesson-order-word.tsx` | 1–928 |
| 6 | `apps/reading-advantage/components/lesson/lesson-progress-bar.tsx` | 1–869 |
| 7 | `apps/reading-advantage/components/lesson/lesson-sentence-flashcard-game.tsx` | 1–788 |
| 8 | `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx` | 1–678 |
| 9 | `apps/reading-advantage/components/lesson/lesson-sentense-flash-card.tsx` | 1–340 |
| 10 | `apps/reading-advantage/components/lesson/lesson-summary.tsx` | 1–293 |
| 11 | `apps/reading-advantage/components/lesson/lesson-vocabulary-activity-choice.tsx` | 1–377 |
| 12 | `apps/reading-advantage/components/lesson/lesson-vocabulary-collection.tsx` | 1–424 |
| 13 | `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card-button.tsx` | 1–171 |
| 14 | `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card.tsx` | 1–379 |
| 15 | `apps/reading-advantage/components/lesson/lesson-vocabulary-flashcard-game.tsx` | 1–955 |
| 16 | `apps/reading-advantage/components/lesson/lesson-vocabulary-preview.tsx` | 1–255 |
| 17 | `apps/reading-advantage/components/lesson/phases/index.ts` | 1–15 |
| 18 | `apps/reading-advantage/components/lesson/phases/phase1-introduction.tsx` | 1–134 |
| 19 | `apps/reading-advantage/components/lesson/phases/phase10-vocabulary-matching.tsx` | 1–519 |
| 20 | `apps/reading-advantage/components/lesson/phases/phase11-sentence-flashcards.tsx` | 1–51 |

**Total lines reviewed:** 9,142  
**No file was partially reviewed.**

---

## Executive Summary

This batch covers the student lesson UI: phase orchestration (`lesson-progress-bar.tsx`), phase wrappers in `phases/`, and the activity components they mount (vocabulary preview/collection, sentence preview/collection, matching, ordering, flashcards, language questions, summary). These files are deeply coupled to Google Cloud Storage URLs, contain many hardcoded English strings, and implement learning-state transitions through direct `fetch` calls rather than through any shared backend/domain adapter.

The most severe correctness issues are:

1. **Broken translation button rendering** in `lesson-sentence-preview.tsx` due to operator-precedence (`phase5 || phase6 && …`), so phase-6 students cannot open translations.
2. **Incorrect FSRS scheduling** in `lesson-vocabulary-flash-card-button.tsx`: `fsrs.repeat(card, card.due)` passes the due date where the current review date is required.
3. **Likely missed XP backfill** in `lesson-vocabulary-flash-card.tsx`: it filters `data.sentences` for overdue cards, but the `/api/v1/users/wordlist/...` endpoint returns words under `data.word`.
4. **Double/dropped lesson-completion logging** in `lesson-progress-bar.tsx`: phase 13 logs on "Next", phase 14 logs in a `useEffect`, and `skipPhase` fires a log without awaiting the response.
5. **Provider-locked storage URLs** hardcoded in many components, violating `AGENTS.md` provider-neutrality and the storage-adapter rule.

No tests were found for any of these 20 components, so the findings below are based entirely on static analysis.

---

## Findings

### Critical / High

#### H-01 — Hardcoded Google Cloud Storage URLs violate provider-neutrality
- **Files:**
  - `lesson-introduction.tsx:60`
  - `lesson-order-sentence.tsx:206`
  - `lesson-sentence-preview.tsx:142–143`
  - `lesson-sentense-flash-card.tsx:285`
  - `lesson-vocabulary-collection.tsx:172,189,205,220`
  - `lesson-vocabulary-flash-card.tsx:325`
  - `lesson-vocabulary-flashcard-game.tsx:795`
  - `lesson-vocabulary-preview.tsx:100,118,134,150`
  - `phases/phase1-introduction.tsx:59`
- **Severity:** High
- **Evidence:** Every image/audio asset is constructed as `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/...`.
- **Impact:** Direct coupling to GCS violates `AGENTS.md` §Provider Neutrality Rule ("Application code must not directly call storage provider SDKs" and the storage adapter must expose `storage.get()` / `storage.getSignedUrl()`). If the bucket changes, the app breaks in many places. If the app is deployed to an environment without GCS access, media fails.
- **Fix:** Route media through the shared storage adapter or an internal media route. At minimum centralize the base URL and make the provider configurable.

#### H-02 — `lesson-progress-bar.tsx` can double-log or lose lesson-completion activity
- **File:** `apps/reading-advantage/components/lesson/lesson-progress-bar.tsx`
- **Lines:** 180–205 (`useEffect` on `currentPhase === 14`), 301–319 (`nextPhase` when `Phase === 13`), 571–606 (`skipPhase`)
- **Severity:** High
- **Evidence:**
  - Lines 180–205 log `ActivityType.LessonRead` when `currentPhase` becomes 14.
  - Lines 301–319 log the same activity when the user clicks "Next" from phase 13.
  - Lines 571–606 log the same activity in `skipPhase(13)` and then fire-and-forget the `/api/v1/lesson/...` PUT.
- **Impact:** A student who clicks "Next" from phase 13 then reaches phase 14 triggers two `LessonRead` logs. A student who skips phase 13 logs the activity but the phase PUT is not awaited, so a failure silently leaves the server on phase 13 while the client shows phase 14. This corrupts progress and XP accounting.
- **Fix:** Have a single source of truth for "lesson completed" (e.g., derive it from the lesson-state API or a single effect). Await the completion PUT and surface errors.

#### H-03 — Phase-6 translation button never renders due to operator-precedence bug
- **File:** `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx`
- **Lines:** 514–529
- **Severity:** High
- **Evidence:** `{phase === "phase5" || (phase === "phase6" && (...))}` is missing parentheses around the `||` operands. Because `&&` binds tighter than `||`, the expression is equivalent to `phase === "phase5" || (phase === "phase6" && ...)`; the right-hand `&&` clause only affects the second button, not the whole render block. The intended `(phase === "phase5" || phase === "phase6") && (...)` is not what is evaluated.
- **Impact:** In phase 6 the translation button is not rendered at all, so students cannot translate sentences while collecting them.
- **Fix:** Wrap the phase check in parentheses: `{(phase === "phase5" || phase === "phase6") && (...)}`.

#### H-04 — `lesson-vocabulary-flash-card.tsx` likely misses overdue-card XP backfill
- **File:** `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card.tsx`
- **Lines:** 123–135
- **Severity:** High
- **Evidence:** After fetching the word list, the code runs `filter(data.sentences, (param) => { ... })`. The endpoint is `/api/v1/users/wordlist/${userId}?articleId=${articleId}` and the same file later reads `data.word` (line 106). The word-list endpoint returns words under `data.word`, not `data.sentences`, so `data.sentences` is likely `undefined` and the filter returns nothing.
- **Impact:** Overdue vocabulary cards that should have triggered an `update_score` backfill and XP award are skipped. Progress/XP state drifts.
- **Fix:** Filter `data.word` (or whatever field the API actually returns) and add unit tests for the backfill path.

#### H-05 — Incorrect FSRS review date passed to `fsrs.repeat`
- **File:** `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card-button.tsx`
- **Lines:** 51–53
- **Severity:** High
- **Evidence:** `const scheduling_cards: any = fnFsrs.repeat(preCard, preCard.due);` The second argument to `repeat` is the date the card is being reviewed (now), not the card's scheduled due date.
- **Impact:** FSRS computes intervals and state transitions relative to the wrong review date. Schedules become inaccurate, leading to cards shown too early or too late.
- **Fix:** Pass `new Date()` (or the actual review timestamp) instead of `preCard.due`.

#### H-06 — Matching games can be unwinnable but still attempt completion scoring
- **Files:**
  - `lesson-matching-word.tsx:83–85, 158–162, 244–248`
  - `lesson-vocabulary-activity-choice.tsx:77–81, 158–162, 227–231`
- **Severity:** High
- **Evidence:** Both components slice to at most 5 items (`initialWords.length > 5 ? initialWords.slice(0, 5) : initialWords`) and then wait for `correctMatches.length === 10` (5 pairs). If the user has saved fewer than 5 items, `correctMatches.length === 10` is impossible.
- **Impact:** Students with 1–4 saved sentences/words see the "Need More" UI, but the effect that checks `correctMatches.length === 10` still runs and never completes. The phase cannot be progressed without collecting more items, which may be confusing or block the lesson.
- **Fix:** Use the actual item count to determine the win condition, or gate the activity more clearly when the minimum is not met.

#### H-07 — `lesson-order-sentence.tsx` generates overlapping sentence groups
- **File:** `apps/reading-advantage/components/lesson/lesson-order-sentence.tsx`
- **Lines:** 184–220
- **Severity:** High
- **Evidence:** The loop creates up to 3 groups by picking a random `startIndex` each iteration. The same sentence can appear in multiple groups because there is no deduplication of selected ranges.
- **Impact:** The same sentence may be ordered multiple times in one session, making the activity repetitive and the score/scaling inconsistent.
- **Fix:** Track used indices and ensure each group uses a non-overlapping window of 5 consecutive sentences, or sample without replacement.

### Medium

#### M-01 — Widespread hardcoded English UI strings bypass i18n
- **Files:** All lesson activity components except `lesson-progress-bar.tsx` (sidebar strings) and `phases/index.ts`.
- **Severity:** Medium
- **Evidence:** Examples include "AI Reading Assistant" (`lesson-language-question.tsx:150`), "Ready to help with your questions" (`151`), "Start the conversation!" (`169`), "Loading conversation..." (`135`), "Sentence Matching Practice" (`lesson-matching-word.tsx:256`), "Perfect Score!" (`376`), "Word Matching Practice" (`lesson-vocabulary-activity-choice.tsx:239`), "Already Completed!" (`355`), "Ready to Start?" (`lesson-order-sentence.tsx:838`), "Arrange sentences in the correct chronological order" (`840`), "Vocabulary Flashcards" (`lesson-vocabulary-flashcard-game.tsx:694`), "Sentence Flashcards" (`lesson-sentence-flashcard-game.tsx:563`), etc.
- **Impact:** The apps support `en/th/cn/tw/vi`, but lesson activity UI is mostly English-only. This breaks localization for student-facing content.
- **Fix:** Replace hardcoded strings with `useScopedI18n` keys.

#### M-02 — `lesson-progress-bar.tsx` re-creates the phase switch on every render
- **File:** `apps/reading-advantage/components/lesson/lesson-progress-bar.tsx`
- **Lines:** 435–569
- **Severity:** Medium
- **Evidence:** `getPhaseComponent` is a plain function defined inside the component. It returns JSX with child components and is called on every render.
- **Impact:** Each render rebuilds the switch and the element tree, making React reconciliation less stable and contributing to the already-complex render behavior in this component.
- **Fix:** Memoize with `useMemo` keyed on `currentPhase`, or split into smaller phase-route components.

#### M-03 — Score decrement on restart uses stale closure value
- **Files:**
  - `lesson-order-sentence.tsx:474–477`
  - `lesson-order-word.tsx:441–449`
- **Severity:** Medium
- **Evidence:** Both `handleRestart` callbacks read `score` from the closure at creation time. Because `setScore` is async, the closure `score` may not reflect the latest value, and `Math.max(0, prev - 1)` inside `setScore` is the correct pattern but is mixed with a direct `score > 0` check.
- **Impact:** Restarting can decrement based on an old score or skip decrementing when it should.
- **Fix:** Use only the functional updater form and remove the closure read.

#### M-04 — `lesson-vocabulary-collection.tsx` marks phase complete even when save fails
- **File:** `apps/reading-advantage/components/lesson/lesson-vocabulary-collection.tsx`
- **Lines:** 74–128
- **Severity:** Medium
- **Evidence:** `onCompleteChange(true)` is called in the `finally` block regardless of whether the API call succeeded.
- **Impact:** A failed save still unlocks the next phase, and the student loses their selected words.
- **Fix:** Move `onCompleteChange(true)` into the success branch and show an error toast on failure.

#### M-05 — `lesson-summary.tsx` assumes quiz scores are in 0–5 range without validation
- **File:** `apps/reading-advantage/components/lesson/lesson-summary.tsx`
- **Lines:** 31–35, 49–63, 230–264
- **Severity:** Medium
- **Evidence:** `mcqFeedback` and `saqFeedback` only define messages for scores 1–5, and the progress bars compute width as `score * 20%`. If a score is 0 or greater than 5, the UI either shows no feedback or overflows 100%.
- **Impact:** Edge-case scores produce broken UI or runtime indexing errors (`mcqFeedback[quizeScores.mcqScore]`).
- **Fix:** Clamp or normalize the score before indexing, or define behavior for 0 and out-of-range values.

#### M-06 — `lesson-language-question.tsx` has dead `loadingPage` state
- **File:** `apps/reading-advantage/components/lesson/lesson-language-question.tsx`
- **Lines:** 37, 131–138
- **Severity:** Medium
- **Evidence:** `loadingPage` is initialized to `false` and never set to `true`. The conditional renders a "Loading conversation..." overlay that can never appear.
- **Impact:** Dead code and a misleading loading indicator definition.
- **Fix:** Set `loadingPage` to `true` while the initial bot message is loading, or remove the state.

#### M-07 — Wrapper object types `Number` and `Boolean` used instead of primitives
- **File:** `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx`
- **Lines:** 98–99
- **Severity:** Medium
- **Evidence:** `const [togglePlayer, setTogglePlayer] = useState<Boolean>(true);` and `const [selectedSentence, setSelectedSentence] = React.useState<Number>(-1);`.
- **Impact:** TypeScript best practice is `boolean` and `number`. The wrapper types allow boxed values and can cause subtle type issues.
- **Fix:** Use primitive types.

#### M-08 — `lesson-order-sentence.tsx` and `lesson-order-word.tsx` do not verify HTTP response status before parsing
- **Files:**
  - `lesson-order-sentence.tsx:166–168, 421–444`
  - `lesson-order-word.tsx:150–153, 319–343`
- **Severity:** Medium
- **Evidence:** `const data = await res.json();` is called without checking `res.ok`. Error responses may return HTML or JSON with a different shape, causing `data.article` to be undefined and downstream crashes.
- **Impact:** Failed API calls produce cryptic runtime errors instead of handled error states.
- **Fix:** Check `response.ok` before parsing and show a toast/error UI.

### Low

#### L-01 — Filename typo `sentense` duplicated across components
- **Files:**
  - `apps/reading-advantage/components/lesson/lesson-sentense-flash-card.tsx`
  - `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx` (component is also named `LessonSentensePreview`)
- **Severity:** Low
- **Evidence:** "Sentense" instead of "Sentence" in file names, component names, and prop names (`showSentenseButton`).
- **Impact:** Consistency/readability; new contributors may search for "sentence" and miss these files.
- **Fix:** Rename files and components in a dedicated chore.

#### L-02 — Unused imports throughout the batch
- **Files:** Multiple
- **Severity:** Low
- **Evidence:**
  - `lesson-matching-word.tsx`: `Image`, `AudioButton`, `Skeleton`, `AUDIO_URL` (imports but never uses `Image`/`AudioButton`/`AUDIO_URL`)
  - `lesson-order-sentence.tsx`: `Header`, `splitTextIntoSentences`, `Separator` (some unused)
  - `lesson-order-word.tsx`: `Image`, `ArrowLeft`, `Plus`, `Type`, `Lightbulb`, `Volume2`, `Clock`, `Trophy`, `Target`, `Zap`, `set` from lodash
  - `lesson-sentence-flashcard-game.tsx`: `Grade`, `BookOpen`, `AlertCircle`
  - `lesson-vocabulary-activity-choice.tsx`: `Header`, `Image`, `Skeleton`
  - `lesson-vocabulary-collection.tsx`: `set` from lodash, `playAudioSegment`
  - `lesson-vocabulary-flash-card.tsx`: `uuidv4`, `date_scheduler`, `method` from lodash, `Header`
  - `lesson-vocabulary-flashcard-game.tsx`: `Grade`, `BookOpen`, `AlertCircle`
  - `lesson-vocabulary-preview.tsx`: `playAudioSegment`
- **Impact:** Increases bundle size slightly and obscures actual dependencies.
- **Fix:** Remove unused imports and enable `no-unused-vars` / `eslint-plugin-import` consistently.

#### L-03 — `userId` prop accepted but unused in introduction components
- **Files:**
  - `lesson-introduction.tsx:22, 29`
  - `phases/phase1-introduction.tsx:18, 27`
- **Severity:** Low
- **Evidence:** `userId` is in the Props interface and destructured but never referenced.
- **Impact:** Misleading API; callers must pass it for no reason.
- **Fix:** Remove the prop or document why it is required.

#### L-04 — `any` types used for refs and callbacks
- **Files:**
  - `lesson-sentense-flash-card.tsx:73–74` (`useRef<any>`)
  - `lesson-vocabulary-flash-card.tsx:85–86` (`useRef<any>`)
  - `phases/phase10-vocabulary-matching.tsx:45` (`icon: any`)
  - `phases/phase10-vocabulary-matching.tsx:197` (`result: any`)
- **Severity:** Low
- **Evidence:** Refs and callback payloads are typed as `any`.
- **Impact:** Loses type safety for flashcard library integration and game result contracts.
- **Fix:** Add proper types or use `unknown` with runtime guards.

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A3 | Digit-only as a "labeled count" | No | No test files in the batch; no bare-digit assertions found. |
| A4 | Vacuous-pass on nothing-done | Partial | `lesson-vocabulary-preview.tsx:59` and `phases/phase1-introduction.tsx:32` call `onCompleteChange(true)` on mount without verifying that vocabulary/article data loaded. This makes the phase appear complete even if the underlying fetch failed. No "markers consistent" or deliverable-present check was found. |
| A5 | False-claim text vs test reality | No | The track `plan.md` does not contain "all checks pass" or `PASS=N, FAIL=0` claims for this batch. No tests for these components exist to contradict. |

---

## Test / Coverage Observations

1. **No unit or integration tests cover any of the 20 files.** The components directly call `/api/v1/...` endpoints and manage game state entirely in client code, making them high-value candidates for tests but currently unprotected against regression.
2. **Behavior worth testing:**
   - FSRS `repeat` is called with the current review date (H-05).
   - Phase-6 translation button renders (H-03).
   - `lesson-vocabulary-flash-card.tsx` backfill filters the correct API field (H-04).
   - `lesson-progress-bar.tsx` logs completion exactly once and awaits the phase update (H-02).
   - Matching activities handle `< 5` saved items gracefully (H-06).
   - Order-sentence group selection does not overlap (H-07).
3. **No test execution was attempted** because no tests exist for these files and node modules were not installed.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. Fix the phase-6 translation button operator-precedence bug (H-03) — one-line change with high UX impact.
2. Correct `fsrs.repeat(preCard, new Date())` in `lesson-vocabulary-flash-card-button.tsx` (H-05).
3. Investigate and fix the `data.sentences` vs `data.word` mismatch in `lesson-vocabulary-flash-card.tsx` backfill (H-04).
4. Centralize lesson-completion logging in `lesson-progress-bar.tsx` so it runs exactly once and awaits the API response (H-02).
5. Replace hardcoded GCS URLs with a shared storage/media helper (H-01).
6. Make matching-game win conditions derive from the actual item count (H-06).
7. Remove or set the dead `loadingPage` state in `lesson-language-question.tsx` (M-06).
8. Internationalize hardcoded English strings (M-01).
9. Remove unused imports (L-02) as a low-risk cleanup.

---

*End of line-review report for batch 27.*
