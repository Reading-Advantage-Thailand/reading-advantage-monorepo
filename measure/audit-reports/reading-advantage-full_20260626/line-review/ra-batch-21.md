# Line-by-Line Review: Reading Advantage — Batch 21

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-21`  
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Current HEAD:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Review Date:** 2026-06-27  
**Reviewer Role:** A — Correctness and Architecture

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/dashboard/user-activity-heatmap.tsx` | 1–72 (entire file) |
| 2 | `apps/reading-advantage/components/dashboard/user-level-indicator.tsx` | 1–68 (entire file) |
| 3 | `apps/reading-advantage/components/dashboard/user-reading-chart.tsx` | 1–208 (entire file) |
| 4 | `apps/reading-advantage/components/dashboard/user-recent-activity.tsx` | 1–127 (entire file) |
| 5 | `apps/reading-advantage/components/dashboard/user-xpoverall-chart.tsx` | 1–208 (entire file) |
| 6 | `apps/reading-advantage/components/dashboard/widget-shell.tsx` | 1–204 (entire file) |
| 7 | `apps/reading-advantage/components/first-run-level-test.tsx` | 1–371 (entire file) |
| 8 | `apps/reading-advantage/components/flash-card-practice-button.tsx` | 1–256 (entire file) |
| 9 | `apps/reading-advantage/components/flash-card.tsx` | 1–301 (entire file) |
| 10 | `apps/reading-advantage/components/flashcards/deck-view.tsx` | 1–584 (entire file) |
| 11 | `apps/reading-advantage/components/flashcards/empty-deck.tsx` | 1–310 (entire file) |
| 12 | `apps/reading-advantage/components/flashcards/flashcard-dashboard.tsx` | 1–190 (entire file) |
| 13 | `apps/reading-advantage/components/flashcards/flashcard-game.tsx` | 1–723 (entire file) |
| 14 | `apps/reading-advantage/components/flashcards/index.ts` | 1–4 (entire file) |
| 15 | `apps/reading-advantage/components/flip-card-button.tsx` | 1–26 (entire file) |
| 16 | `apps/reading-advantage/components/footer.tsx` | 1–112 (entire file) |
| 17 | `apps/reading-advantage/components/games/game/Enemy.test.tsx` | 1–25 (entire file) |
| 18 | `apps/reading-advantage/components/games/game/Enemy.tsx` | 1–81 (entire file) |
| 19 | `apps/reading-advantage/components/games/game/Explosion.test.tsx` | 1–38 (entire file) |
| 20 | `apps/reading-advantage/components/games/game/Explosion.tsx` | 1–38 (entire file) |

**No file was partially reviewed.**

---

## Executive Summary

This batch covers four feature areas in `apps/reading-advantage`: student dashboard charts/activity widgets, the first-run placement test, the flashcard/FSRS study flow, and a small set of vocabulary-game animation components.

The most severe correctness issue is in `first-run-level-test.tsx`, where the scoring logic assumes the correct answer for **every question is the option keyed `"A"`** (line 78). The component shuffles option labels before presenting them, so the UI works today only because correctness is compared by text value after the fact. If the seed data ever changes key ordering, or if the shuffle logic is modified, every question will be graded incorrectly. This is a hidden contract with the data source that is not validated anywhere in the call chain.

Architecture findings are concentrated in the flashcard components: `flash-card.tsx` falls back to a **direct Google Cloud Storage URL** for audio (line 254), bypassing the storage adapter required by `AGENTS.md` §Storage, and uses `key={uuidv4()}` (line 245) which forces React remounts on every render. The new deck-based flashcard UI (`deck-view.tsx`, `flashcard-game.tsx`, `empty-deck.tsx`, `flashcard-dashboard.tsx`) contains extensive hardcoded English marketing and instructional copy that bypasses the i18n system.

The dashboard chart components are mostly presentation code, but they share type-safety regressions (`as any` casts, `Function` typed props, typos in exported names) and several hardcoded English strings in empty-state and selector UI.

The two game component tests are shallow: they verify render output but do not exercise animation completion callbacks or state transitions.

---

## Findings

### Critical / High

#### H-01 — Placement-test scoring hardcodes the correct answer as option `"A"`
- **File:** `apps/reading-advantage/components/first-run-level-test.tsx:70–83`
- **Severity:** High
- **Evidence:** `getCorrectAnswer` pushes `language_placement_test[i].questions[j].options["A"]` into the `correctAnswer` array for every question. It is called after `handleQuestions` shuffles the option labels, so the check on line 148 (`correctAnswer.includes(selectedAnswer)`) happens to work by comparing the original `"A"` text against the selected text. There is no validation that the incoming data actually places the correct answer at key `"A"`.
- **Impact:** A content change that reorders options in the seed/JSON source will cause the test to grade every question wrong. The XP/CEFR result shown to the student will be incorrect, and the level assigned to new students will be wrong.
- **Fix:** Add an explicit `correctAnswer` field to the `levelTest`/`Question` type and have the data source declare the correct key. Alternatively, change `levelTest.questions` so that each question carries its own `correctOptionKey` or `correctAnswerText`. Do not derive correctness from positional key `"A"`.

#### H-02 — Direct Google Cloud Storage URL bypasses storage adapter
- **File:** `apps/reading-advantage/components/first-run-level-test.tsx`
- **Severity:** High
- **Evidence:** `AudioButton` is given `audioUrl` from `sentence.audioUrl` if present; otherwise the component falls back to `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${sentence.articleId}.mp3` (line 254). This is a raw public GCS URL, not a signed URL from `@reading-advantage/storage`.
- **Impact:** Violates `AGENTS.md` §Provider Neutrality Rule and §Storage. If the bucket is moved to R2, MinIO, or another provider, this URL breaks. It also exposes bucket naming in the UI layer.
- **Fix:** Remove the fallback URL from the component. The API that returns `sentence.audioUrl` should always provide a storage-adapter-resolved URL (signed or public-through-adapter).

#### H-03 — `key={uuidv4()}` forces remount of flashcard controls on every render
- **File:** `apps/reading-advantage/components/flash-card.tsx:245`
- **Severity:** High
- **Evidence:** The wrapper around the current card's action buttons uses `key={uuidv4()}`. Because `uuidv4()` returns a new value on every render, React unmounts and remounts the entire control subtree each time the parent re-renders (including on every `currentCardIndex` change and every `setState`).
- **Impact:** Loses focus, animation state, and event handlers; causes unnecessary DOM churn; can break accessibility and performance.
- **Fix:** Use a stable key such as `sentence.id` or `currentCardIndex`.

#### H-04 — Hardcoded English strings bypass i18n in user-facing flashcard and dashboard UI
- **Files:**
  - `first-run-level-test.tsx:296` — `"Please wait..."`
  - `first-run-level-test.tsx:364` — last-page button label `"Next"` instead of a localized finish label
  - `user-reading-chart.tsx:144` — selector label `"Selected"`
  - `user-reading-chart.tsx:145` — placeholder `"Type"`
  - `user-reading-chart.tsx:160–163` — empty-state `"No reading data available"`, `"Start reading articles to see your reading statistics"`
  - `user-recent-activity.tsx:57` — sr-only text `"Expaned"`
  - `widget-shell.tsx:121` — fallback `"No data available"`
  - `deck-view.tsx` — alert copy `"Need more cards to start studying"`, `"All caught up!"`, `"Ready to study!"`, `"Learning Progress"`, `"New"`, `"Learning"`, `"Review"`, `"Translation Language"`, `"Start Studying"`, `"All Caught Up!"`, `"Read Articles to Add Cards"`, `"Refresh Data"`, `"Add More Cards"`, and many substrings
  - `empty-deck.tsx` — all hero, how-it-works, feature-grid, and CTA copy
  - `flashcard-dashboard.tsx:104–111` — `"Flashcard Dashboard"`, type descriptions, tab labels `"Vocabulary"`, `"Sentences"`
  - `flashcard-game.tsx` — `"Study Session Complete!"`, `"+X XP Earned!"`, `"Correct"`, `"Incorrect"`, `"Time"`, `"Show Answer"`, `"Skip"`, `"Again"`, `"Hard"`, `"Good"`, `"Easy"`, `"Definition"`, `"Example"`, `"Translation"`, `"NEW"`, `"LEARNING"`, `"REVIEW"`, `"No Cards Available"`, `"Back to Dashboard"`, `"Complete Session"`, `"Progress"`, `"Card X of Y"`, and many more
- **Severity:** High (for a product serving Thai and other locales)
- **Evidence:** `useScopedI18n` and `useCurrentLocale` are used elsewhere in the same files, confirming localization is intended. `deck-view.tsx` even lets the user pick a translation language, yet all instructional copy is English.
- **Impact:** Students and teachers in non-English locales see a mix of translated and English text. This undermines the localized experience and is a regression against the i18n migration track.
- **Fix:** Route all user-facing strings through `t()`/`useScopedI18n`. For status enums (`NEW`, `LEARNING`, `REVIEW`) add a localized mapping function.

#### H-05 — Last page of placement test shows `"Next"` but finishes the test
- **File:** `apps/reading-advantage/components/first-run-level-test.tsx:356–366`
- **Severity:** High
- **Evidence:** When `currentPage === shuffledQuestions.length - 1`, the button `onClick` calls `onFinishTest`, but the label is still the hardcoded string `"Next"` (line 364) instead of a finish/complete label.
- **Impact:** Misleading UX: the student expects another section but is suddenly dropped into the completion screen.
- **Fix:** Use a conditional label such as `t("finishButton")` / `t("nextButton")` based on page position.

### Medium

#### M-01 — Silent error handling with `console.error`/`console.log` only
- **Files:**
  - `first-run-level-test.tsx:201–202, 264, 268` — placement test fetch errors logged only
  - `flash-card.tsx:147–153` — flashcard update / XP posting errors logged only
  - `flashcard-dashboard.tsx:49, 52` — deck fetch errors logged only
  - `deck-view.tsx:191` — card load error does toast, but other paths log only
  - `user-xpoverall-chart.tsx` — no error boundary or user-facing error state for chart data
- **Severity:** Medium
- **Evidence:** Multiple components catch rejected promises and write to `console.error` or `console.log` without surfacing the failure to the user. Some components (e.g., `deck-view.tsx`) do use `useToast` in a few paths, but the pattern is inconsistent.
- **Impact:** Users cannot tell when a network or server failure has occurred. Actions may appear to succeed when they did not.
- **Fix:** Standardize on `useToast` for all async write and fetch failures in these components.

#### M-02 — `first-run-level-test.tsx` shuffles arrays in place and awaits non-promises
- **File:** `apps/reading-advantage/components/first-run-level-test.tsx:75–129`
- **Severity:** Medium
- **Evidence:**
  - `shuffleArray` mutates the array it receives and returns the same reference (line 97–103).
  - `handleQuestions` does `let initialShuffledQuestions = [...language_placement_test]` but then maps over `section.questions` and calls `shuffleArray(section.questions)` on the nested array, mutating the copied section's question array.
  - Line 81: `const filteredData = await data.sentences.filter(...)` — `Array.prototype.filter` returns an array, not a Promise; `await` is a no-op but is confusing.
- **Impact:** Mutation makes the function harder to reason about and can cause unintended side effects if the prop is reused. The `await` does not break anything but signals a misunderstanding of the data flow.
- **Fix:** Make `shuffleArray` return a new shuffled copy. Remove `await` from synchronous array operations.

#### M-03 — FSRS `repeat` is called with the card's due date instead of the current time
- **File:** `apps/reading-advantage/components/flash-card-practice-button.tsx:144–146`
- **Severity:** Medium
- **Evidence:** `fnFsrs.repeat(preCard, preCard.due)` passes `preCard.due` as the "now" argument. If the card is overdue, `due` is in the past, which causes FSRS to compute intervals relative to the old due date rather than the actual review moment.
- **Impact:** Spaced-repetition scheduling will be incorrect for overdue cards; intervals may be shorter or longer than intended.
- **Fix:** Pass `new Date()` (or the actual review timestamp) as the second argument to `repeat`.

#### M-04 — CEFR gauge divides by hardcoded `18` and has no unknown-level fallback
- **File:** `apps/reading-advantage/components/dashboard/user-level-indicator.tsx:19–67`
- **Severity:** Medium
- **Evidence:** `percent={levels.indexOf(currentLevel) / 18}` hardcodes the denominator. The `levels` array has 19 entries (indices 0–18), so the math is correct today, but adding or removing a level silently breaks the gauge. If `currentLevel` is not in the array, `indexOf` returns `-1`, producing a negative percent.
- **Impact:** Gauge will render incorrectly when the level set changes or when an unexpected level string arrives.
- **Fix:** Use `levels.length - 1` as the denominator and clamp/validate `currentLevel` before computing the percent.

#### M-05 — `levelCalculation` is called with per-activity XP instead of total user XP
- **File:** `apps/reading-advantage/components/flashcards/flashcard-game.tsx:199`
- **Severity:** Medium
- **Evidence:** `cefr_level: levelCalculation(xpAmount).cefrLevel` where `xpAmount` is `UserXpEarned.Vocabulary_Flashcards` or `UserXpEarned.Sentence_Flashcards` (a small fixed amount for the session).
- **Impact:** The CEFR level recorded in the activity log is computed from a single session's XP, not the user's cumulative XP. This produces a meaningless CEFR label on the activity record.
- **Fix:** Either compute the user's cumulative XP before the call or remove `cefr_level` from per-activity details if it is not meaningful at this granularity.

#### M-06 — `user-reading-chart.tsx` uses unsafe `as any` casts and hardcoded selector labels
- **File:** `apps/reading-advantage/components/dashboard/user-reading-chart.tsx:51–145`
- **Severity:** Medium
- **Evidence:** Multiple `(item as any)` and `(item.details as any)` casts (lines 71–75, 95–108). The `SelectTrigger` contains a hardcoded `<CardTitle>Selected</CardTitle>` and a placeholder `"Type"`. The empty-state JSX is hardcoded English.
- **Impact:** Type safety is bypassed for the article/category extraction logic. UI copy is not localizable.
- **Fix:** Define a typed `details` shape (or use `z.infer` from the activity-log schema) and remove the `as any` casts. Localize the selector and empty state.

#### M-07 — `footer.tsx` contains placeholder contact information and an outdated third-party link
- **File:** `apps/reading-advantage/components/footer.tsx:13–85`
- **Severity:** Medium
- **Evidence:**
  - Line 28: `Phone: +1 (123) 456-7890` is a placeholder/fake number.
  - Line 80–85: Copyright reads `"© 2024"` and links to `https://flowbite.com/`.
  - Line 48: Footer logo `<a>` has no `href`.
- **Impact:** Exposes placeholder data to production users and links to an unrelated site in the copyright line.
- **Fix:** Replace the phone number with the real contact number or remove it. Update copyright year and link to the Reading Advantage site. Add `href="/"` to the logo link.

#### M-08 — `widget-shell.tsx` footer rendering can swallow falsy React nodes
- **File:** `apps/reading-advantage/components/dashboard/widget-shell.tsx:127–143`
- **Severity:** Medium
- **Evidence:** `{(footer || onViewAll) && !loading && !error && (<CardFooter>{footer || (onViewAll && <Button ... />)}</CardFooter>)}`. The inner `footer || (...)` will evaluate the right side if `footer` is any falsy value, including `0`, `''`, or `false`.
- **Impact:** A caller passing `footer={0}` or an empty string could unexpectedly see the "View All" button.
- **Fix:** Use explicit ternary checks: `footer ? footer : (onViewAll ? <Button ... /> : null)`.

#### M-09 — `deck-view.tsx` progress formula conflates "due" with "not mastered"
- **File:** `apps/reading-advantage/components/flashcards/deck-view.tsx:225–228`
- **Severity:** Medium
- **Evidence:** `progressPercentage = ((deck.totalCards - deck.dueCards) / deck.totalCards) * 100`. The UI labels this "Complete" and "mastered", but `dueCards` is the count of cards ready for review, which includes new cards that have never been studied.
- **Impact:** A brand-new deck with 10 new cards shows 0% complete even though the user has not had a chance to study them; a deck where every card is in relearning will show high "complete" percentage.
- **Fix:** Use `masteredCards` (present in `DeckViewProps`) for the progress numerator, or rename the label to reflect "cards not due" rather than "mastered".

#### M-10 — Game animation tests are shallow and do not exercise lifecycle callbacks
- **Files:**
  - `apps/reading-advantage/components/games/game/Enemy.test.tsx:6–24`
  - `apps/reading-advantage/components/games/game/Explosion.test.tsx:29–37`
- **Severity:** Medium
- **Evidence:** `Enemy.test.tsx` only verifies the term text and background-image URL. It does not test the `onReachBottom` or `onDeathComplete` callbacks. `Explosion.test.tsx` mocks `framer-motion` to call `onAnimationComplete` synchronously, so it verifies particle count and one callback invocation but not real animation behavior.
- **Impact:** Regressions in animation completion logic (which drive game state transitions) will not be caught by tests.
- **Fix:** Add tests that simulate animation completion for `Enemy` and verify `onReachBottom`/`onDeathComplete` are called with the correct `id`. For `Explosion`, test that `onComplete` is invoked exactly once after all particles finish.

### Low

#### L-01 — Typographic and naming errors in exported identifiers
- **Files:**
  - `user-activity-heatmap.tsx:41` — `converDatetoSting` (should be `convertDateToString`), `dateSrting`
  - `user-activity-heatmap.tsx:48` — `UserActiviryChartProps` (should be `UserActivityChartProps`)
  - `user-reading-chart.tsx:42` — `UserActiviryChartProps`
  - `user-recent-activity.tsx:26` — `UserActiviryChartProps`
  - `user-xpoverall-chart.tsx:111` — `UserActiviryChartProps`
  - `user-xpoverall-chart.tsx:121` — `UserXpOverAllChart` (should be `UserXpOverallChart`)
  - `user-level-indicator.tsx:15` — `Cefrlevel` (should be `CefrLevel`)
  - `user-reading-chart.tsx:48` — `seletedValue` (should be `selectedValue`)
- **Severity:** Low
- **Evidence:** Typo identifiers are used internally and do not leak across file boundaries, but they reduce readability and signal lack of code review.
- **Fix:** Rename the identifiers consistently.

#### L-02 — Unused imports, variables, and commented-out dead code
- **Files:**
  - `first-run-level-test.tsx:12` — `redirect` imported but unused
  - `user-xpoverall-chart.tsx:24` — `useState` imported but unused
  - `user-xpoverall-chart.tsx:25` — `useTheme` / `resolvedTheme` imported but unused (old chart is commented out)
  - `user-xpoverall-chart.tsx:98–109` — `CustomTooltip` defined but unused
  - `user-xpoverall-chart.tsx:123–137` — commented-out date-picker code
  - `user-xpoverall-chart.tsx:178–203` — commented-out old `ResponsiveContainer` chart
  - `flash-card-practice-button.tsx:35–36, 48–142` — `cards`, `logs`, and `columnsCards` defined but unused (DataTable is commented out)
  - `flashcard-game.tsx:11` — `useRouter` imported but only used in an unused path (no navigation occurs)
- **Severity:** Low
- **Impact:** Dead code increases bundle size and maintenance burden.
- **Fix:** Remove unused imports and commented-out code.

#### L-03 — Inconsistent import paths and ESLint suppression
- **Files:**
  - `first-run-level-test.tsx:8–9, 14–15` — uses relative `../components/ui/*` and `../locales/client` imports instead of the `@/components/ui/*` and `@/locales/client` aliases used elsewhere
  - `flash-card.tsx:1` — `/* eslint-disable react-hooks/exhaustive-deps */` at the top of the file
  - `user-level-indicator.tsx:20`, `user-recent-activity.tsx:32`, `widget-shell.tsx:66` — `as any` casts on the i18n hook return
- **Severity:** Low
- **Impact:** Inconsistent aliases make refactors harder. Disabling `exhaustive-deps` hides real dependency issues (e.g., `flash-card.tsx` `useEffect` depends on `currentCardIndex` but the hook re-fetches data on every index change).
- **Fix:** Standardize on `@/*` aliases. Remove the ESLint disable and fix the dependency array, or extract the data fetch to a stable callback.

#### L-04 — `Function` type used for callback props
- **Files:**
  - `flash-card-practice-button.tsx:12, 16`
  - `flip-card-button.tsx:8`
- **Severity:** Low
- **Evidence:** Props declare `nextCard: Function`, `setShowButton: Function`, `currentCard: Function`. These provide no type safety for arguments or return values.
- **Fix:** Use precise function types such as `() => void`, `(index: number) => void`, etc.

#### L-05 — `Enemy.tsx` mixes inline styles with Tailwind and redundant absolute positioning
- **File:** `apps/reading-advantage/components/games/game/Enemy.tsx:30–80`
- **Severity:** Low
- **Evidence:** The outer `motion.div` has both `className="absolute ..."` and `style={{ position: 'absolute' }}`. It animates `top`/`left` as motion values while `position: absolute` is also set inline. The inner sprite sets `animationDuration` in the style object, which is not a React CSS property consumed by `framer-motion`.
- **Impact:** Redundant/conflicting styling declarations; the `animationDuration` style likely has no effect.
- **Fix:** Remove redundant `style={{ position: 'absolute' }}` and use Tailwind `absolute`. Move sprite-sheet animation timing to a CSS class or `framer-motion` props.

#### L-06 — `user-recent-activity.tsx` duplicates activity-row JSX
- **File:** `apps/reading-advantage/components/user-recent-activity.tsx:61–122`
- **Severity:** Low
- **Evidence:** The "most recent" row and the mapped "remaining" rows are nearly identical JSX blocks. The only difference is the data source.
- **Impact:** Maintenance cost: any change to the row design must be made in two places.
- **Fix:** Extract an `<ActivityRow activity={...} />` component.

#### L-07 — `user-xpoverall-chart.tsx` hardcodes English month names and 5-month window
- **File:** `apps/reading-advantage/components/dashboard/user-xpoverall-chart.tsx:30–96`
- **Severity:** Low
- **Evidence:** `monthNames` is an English array. `formatDataForDays(data, 5)` hardcodes the lookback window to 5 months.
- **Impact:** Non-English users see English month labels; the chart cannot be configured for other date ranges.
- **Fix:** Use `Intl.DateTimeFormat` with the current locale, and accept the lookback window as a prop or state.

---

## Cross-Cutting Themes

1. **i18n leakage.** Several newer components (`deck-view.tsx`, `flashcard-game.tsx`, `empty-deck.tsx`) were written entirely in English despite the app being localized. This is a regression against the completed `i18n_migration_20260502` track.
2. **Type-safety erosion.** `as any`, `Function` typed props, and disabled ESLint rules appear throughout the batch.
3. **Backend/adapter bypass.** Direct GCS URL in `flash-card.tsx` and direct `fetch` calls to `/api/v1/...` endpoints from components (rather than through typed server actions or domain functions) make the code harder to migrate to the backend-as-code model.
4. **Shallow tests.** The game animation tests verify render but not state-machine behavior. The flashcard components in this batch have no unit tests.

---

## No Acceptance Claims

This review identifies issues in the listed source files. It does not certify that the files are correct, complete, or ready for production. Remediation should be tracked in follow-up Measure tracks.

---

MEASURE_AGENT_RESULT
{
  "track_id": "reading_advantage_full_review_20260626",
  "review_role": "A",
  "batch_id": "ra-batch-21",
  "status": "complete",
  "files_reviewed": 20,
  "lines_reviewed": 3946,
  "findings": {
    "critical": 0,
    "high": 5,
    "medium": 10,
    "low": 7,
    "total": 22
  },
  "finding_ids": [
    "F-RA-B21-001",
    "F-RA-B21-002",
    "F-RA-B21-003",
    "F-RA-B21-004",
    "F-RA-B21-005",
    "F-RA-B21-006",
    "F-RA-B21-007",
    "F-RA-B21-008",
    "F-RA-B21-009",
    "F-RA-B21-010",
    "F-RA-B21-011",
    "F-RA-B21-012",
    "F-RA-B21-013",
    "F-RA-B21-014",
    "F-RA-B21-015",
    "F-RA-B21-016",
    "F-RA-B21-017",
    "F-RA-B21-018",
    "F-RA-B21-019",
    "F-RA-B21-020",
    "F-RA-B21-021",
    "F-RA-B21-022"
  ],
  "report_path": "measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-21.md"
}
