# ra-batch-29 — Line-by-Line Review

Track: `reading_advantage_full_review_20260626`
Batch: `ra-batch-29`
Scope: 20 files under `apps/reading-advantage/components/...`
Reviewer: line-by-line read-only audit. No app code modified.

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `apps/reading-advantage/components/models/article-model.ts` | 165 |
| 2 | `apps/reading-advantage/components/models/questions-model.ts` | 70 |
| 3 | `apps/reading-advantage/components/models/user-activity-log-model.ts` | 78 |
| 4 | `apps/reading-advantage/components/pie-chart.tsx` | 69 |
| 5 | `apps/reading-advantage/components/practic/cloze-test-game.tsx` | 1350 |
| 6 | `apps/reading-advantage/components/practic/cloze-test-page.tsx` | 72 |
| 7 | `apps/reading-advantage/components/practic/order-sentences-game.tsx` | 1070 |
| 8 | `apps/reading-advantage/components/practic/order-sentences-page.tsx` | 69 |
| 9 | `apps/reading-advantage/components/practic/order-words-game.tsx` | 1087 |
| 10 | `apps/reading-advantage/components/practic/order-words-page.tsx` | 69 |
| 11 | `apps/reading-advantage/components/practic/quote-item.tsx` | 180 |
| 12 | `apps/reading-advantage/components/practic/quote-list.tsx` | 199 |
| 13 | `apps/reading-advantage/components/practic/reorder.ts` | 16 |
| 14 | `apps/reading-advantage/components/practic/types.ts` | 64 |
| 15 | `apps/reading-advantage/components/progress-bar-xp.tsx` | 148 |
| 16 | `apps/reading-advantage/components/providers/locale-provider.tsx` | 16 |
| 17 | `apps/reading-advantage/components/providers/theme-provider.tsx` | 8 |
| 18 | `apps/reading-advantage/components/providers/trpc-provider.tsx` | 35 |
| 19 | `apps/reading-advantage/components/questions/laq-question-card.tsx` | 677 |
| 20 | `apps/reading-advantage/components/questions/mc-question-card.tsx` | 981 |

---

## Findings

### 1. `apps/reading-advantage/components/models/article-model.ts` (lines 1–165)

**Severity: Medium** — `article-model.ts:1` — Import pulls `StoryBible` from a deeply nested page module (`@/app/[locale]/(student)/student/stories/[storyId]/page`). This is a circular / upward dependency risk: a model file consumes a Next.js page module. Page files commonly import React Server Components, server actions, and route params; importing from them in a shared model can cause the page module to be loaded by client bundles that only need the type, and will break if the page module later depends on server-only APIs. Should be hoisted to a shared types module.

**Severity: Low** — `article-model.ts:2` — `import { string } from "zod"` is imported but never referenced anywhere in the file (no Zod schemas defined). Dead import.

**Severity: Low** — `article-model.ts:8-9` — `ra_level?: string` and `cefrLevel?: string` are redundant with the snake_case `cefr_level` field (line 6). Three overlapping fields (`average_rating`/`averageRating`, `cefr_level`/`cefrLevel`, `ra_level` no camelCase counterpart) inside `ArticleShowcase` create ambiguity for downstream consumers about which to read.

**Severity: Medium** — `article-model.ts:24-60` — `StoryChapter` interface declares `chapterNumber: string` (line 25) while the embedded `chapter` object uses numeric ids and counts elsewhere (e.g., `chapter.id: string`, `chapterNumber: number` in `Chapter` at line 65). Mixed types between sibling types.

**Severity: Low** — `article-model.ts:47` — `targetWordsUsed: []` is an untyped empty-tuple array. Not assignable to any object/value — should be `targetWordsUsed: string[]` or similar.

**Severity: Low** — `article-model.ts:49` — `grammarStructures: []` — same issue: untyped empty array literal.

**Severity: Medium** — `article-model.ts:52-57` — `questions[].options: string[]` plus `answer: string` is declared for the nested chapter questions, but elsewhere (questions-model.ts, saq/mc components) the answer field is more complex. Mismatched schema with downstream consumers.

**Severity: Medium** — `article-model.ts:71-129` — `Chapter` interface declares nested `chapter` object but does not export the inner shape; consumers must restate it. Also `chapter.sentences[].markName` (line 106) and `words[].markName` (line 111) are audio timing marks; consistent field naming ok but no validation.

**Severity: Low** — `article-model.ts:122` — `questions: any` defeats TypeScript strictness. Should be a typed array of MCQ/SAQ/LAQ per `questions-model.ts`.

**Severity: Low** — `article-model.ts:155-156` — `translatedPassage` / `translatedSummary` typed as `Record<string, string[]> | null` for the article but as object literals with named locales (`cn/en/th/tw/vi`) in `Chapter` (lines 81-96). Inconsistent typing strategy.

**Severity: Low** — `article-model.ts:158-165` — `Article.translatedPassage` field shape (`string[]`) does not match `Chapter.translatedPassage` (`string[]` per locale OK actually) but `Article.translatedSummary` (line 156) is declared as `string[]` while `Chapter.translatedSummary` (line 81-88) is `string`. Inconsistent typing of the same conceptual field across interfaces.

### 2. `apps/reading-advantage/components/models/questions-model.ts` (lines 1–70)

**Severity: Low** — `questions-model.ts:28-39` — `AnswerStatus` and `QuestionState` enums use numeric values starting at 0/1/2, mirroring Firestore ordinals. The comment on line 1 says "Firebase Firestore data model" but the same file also defines "Web data model" (line 49) reusing the same enum values. Two enums (`QuestionState` here vs. `QuestionState` re-declared inside `laq-question-card.tsx` line 81) — see finding 19.2.

**Severity: Medium** — `questions-model.ts:47` — `QuizStatus` enum includes `UNRATED = 4` but `LARecord` (line 24-26) has no rating field. The progression `READ → COMPLETED_MCQ → COMPLETED_SAQ → COMPLETED_LAQ → UNRATED` implies LAQ must be rated, but `LARecord` lacks rating fields.

**Severity: Medium** — `questions-model.ts:50-53` — `Questions` interface declares `mcqs: MultipleChoiceQuestion[]` and `shortAnswer: ShortAnswerQuestion` (singular), implying one SAQ but multiple MCQs. The `QuestionsRecord` Firestore model above (line 2-6) suggests multiple SAQs (`short_answer_questions: SARecord[]`). Shape mismatch between Firestore record and web model.

**Severity: Low** — `questions-model.ts:55-60` — `MultipleChoiceQuestion` interface lacks a `correctAnswer` field. Consumers must look it up separately (see mc-question-card.tsx line 731: `setCorrectAnswer(data.correctAnswer || "")`). The model implies correctness is server-side only, which is fine for client but consumers cannot statically reason about it.

### 3. `apps/reading-advantage/components/models/user-activity-log-model.ts` (lines 1–78)

**Severity: Low** — `user-activity-log-model.ts:6-7` — `activityType: string` and `targetId: string` are free-form strings. The `ActivityType` enum (lines 51-73) exists but is not referenced in the interface; consumers must cast.

**Severity: Medium** — `user-activity-log-model.ts:20-31` — `details` is typed as an object with `articleId`, `contentId`, `subgenre`, `subGenre` (both! lines 26 and 27) — duplicate casing variants. Either is acceptable but both should not coexist.

**Severity: Low** — `user-activity-log-model.ts:34-49` — `UserXpEarned` enum values are duplicated with `ActivityType` enum names (e.g., `Vocabulary_Flashcards = 15` and `VocabularyFlashcards = "vocabulary_flashcards"`). Drift risk if XP values change without updating enums in lockstep.

**Severity: Low** — `user-activity-log-model.ts:78` — `ActivityStatus` enum ends without trailing comma / newline (line 78 is `}`). Stylistic only.

### 4. `apps/reading-advantage/components/pie-chart.tsx` (lines 1–69)

**Severity: Medium** — `pie-chart.tsx:19` — `export const description = "A pie chart with a legend";` is exported as a top-level binding but not consumed by the component (no `description` rendered in JSX, no metadata). Likely intended for shadcn CLI-generated dashboard pages but here it is dangling. Either wire to `<ChartDescription>` or remove.

**Severity: Low** — `pie-chart.tsx:30-37` — `chartData` is rebuilt on every render (no `useMemo`). With React 19 strict mode, the array identity changes each render causing `Pie`/`PieChart` to re-reconcile. Negligible perf impact but wasteful.

**Severity: Low** — `pie-chart.tsx:40-42` — `chartConfig.value.label = "Visitors"` is the legacy root field from shadcn chart default; this chart shows license counts not visitors. Mislabeled config field.

**Severity: Low** — `pie-chart.tsx:54` — `<CardContent>` is used as the outer wrapper but no surrounding `<Card>` is provided. The component renders a `<CardContent>` fragment directly; consumers must wrap with `<Card>` themselves. This is by design but the lone `<CardContent>` usage at line 54 is inconsistent with sibling Card-wrapped components.

### 5. `apps/reading-advantage/components/practic/cloze-test-game.tsx` (lines 1–1350)

**Severity: High** — `cloze-test-game.tsx:144-273` — `generateBlanksForSentence` performs client-side blank generation including `correctAnswer` determination. The "correct" answer is derived from `sentenceData.words` which is fetched from the backend API at `/api/v1/flashcard/decks/${deckId}/sentences-for-cloze` (line 311). Because the correct answer word is shipped to the client in the `words` array (line 154: `wordObj.word`), a user can read `words[*].word` to trivially fill the blanks. This defeats the practice purpose of the cloze test and constitutes a security/cheating vector.

**Severity: High** — `clogo-test-game.tsx:232, 249, 255` — Three separate uses of `Math.random()` for `sort` (a biased, non-uniform Fisher-Yates alternative). The sort comparator must return a stable negative/positive; `Math.random() - 0.5` is biassed and varies per browser. The shuffle is non-deterministic and not uniform — tests cannot reliably reproduce orderings.

**Severity: High** — `cloze-test-game.tsx:237` — `sentenceData.sentence.indexOf(wordObj.word)` returns the index of the FIRST occurrence of the word; if the word appears multiple times the wrong position is used as the blank position, leading to incorrect rendering and broken `renderSentenceWithBlanks` logic at lines 744-822.

**Severity: High** — `cloze-test-game.tsx:240-252` — Distractor selection filters by word length ±2 from `wordObj.word` — when the deck contains short or specialized words the `allWords.filter(...)` may return fewer than 3 distractors, producing options arrays of 1–3 entries instead of 4 (1 correct + 3 distractors). The `<Select>` then renders a dropdown with too few items, skewing difficulty.

**Severity: High** — `cloze-test-game.tsx:758-763` — `renderSentenceWithBlanks` builds placeholder string `<BLANK_${blank.id}>` and replaces via `sentence.slice(0, blank.position)` and `sentence.slice(blank.position + blank.correctAnswer.length)`. This silently mutates `sentence` across iterations using the SAME `sentence` variable (left-to-right offsets); after the first replacement subsequent blanks are placed against an already-modified string, drifting the visible blanks to wrong positions. The intent is reverse-iteration but the code sorts blanks by `b.position - a.position` (line 749, descending), then iterates without re-finding offsets in the modified string. Bug: blanks render in incorrect character positions when more than one blank exists.

**Severity: High** — `cloze-test-game.tsx:309-335` — `loadSentencesFromDeck` calls `fetch('/api/v1/flashcard/decks/${deckId}/sentences-for-cloze')` with no error response validation beyond `response.ok`. The JSON shape `data.clozeTests` is trusted without a schema; if the backend changes shape the client crashes silently and only sets `rawSentenceData([])`.

**Severity: High** — `cloze-test-game.tsx:354-362` — Effect resets state on `currentSentence?.id` change but the dependency array only contains `currentSentence?.id` (a primitive), which is correct. However, the dependency list at lines 396-401 for the answer-completion effect omits `currentSentence` itself and references only `currentSentence?.blanks.length`, while reading `currentSentence.blanks.length` inside (line 370, 377). Because `blanks.length` is a primitive, this works, but `setShowResult(true)` (line 380) and toast (line 384-393) inside an effect that re-runs whenever `userAnswers` length changes will re-trigger toasts on every change. Repeated toasts spam user.

**Severity: High** — `cloze-test-game.tsx:382-393` — On perfect answer, score increments via `setScore((prev) => prev + 1)`. Then on `userAnswers` change (which this effect reacts to), the same effect re-runs but is gated by `isCompleted` (line 371). Net effect OK, but the toast is fired inside an effect, which is anti-pattern — toasts should be fired from event handlers.

**Severity: High** — `cloze-test-game.tsx:436-461` — `saveSentenceResult` calls `setGameResults(prev => [...prev, ...])` (line 451) but is called from `handleNext` (line 537) after the `userAnswers` are reset by line 354-362 effect when `currentSentence?.id` changes. Because `handleNext` awaits `saveSentenceResult`, and the effect on line 285-296 also reacts to dependency changes that happen concurrently, the order of state updates is fragile. The closure captures `currentSentence` and `userAnswers` via `useCallback` deps — but `useCallback` deps at line 461 are `[currentSentence, userAnswers]`. If `userAnswers` changes between when the callback was created and when invoked, stale closure.

**Severity: High** — `cloze-test-game.tsx:436-461` — `saveSentenceResult` is declared with `useCallback` and `async` but does not `await` anything internally; the `try/catch` is for sync code only. Asynchronous result accumulation is unnecessary; the `await` at line 537 in `handleNext` blocks progress.

**Severity: High** — `cloze-test-game.tsx:463-525` — `saveGameResults` posts to `/api/v1/flashcard/cloze-test/results` with body containing `timeTaken: timer / Math.max(gameResults.length, 1)` (line 473). This is **wrong**: it averages total time across all sentences rather than sending per-sentence timings. Server-side analytics will compute incorrect per-question time.

**Severity: High** — `cloze-test-game.tsx:473` — `timeTaken: timer / Math.max(gameResults.length, 1)` divides by `gameResults.length`, but the field is also assigned `timeTaken: timer` at line 483 (the field appears twice in the same object — `allResults` line 473 and outer object line 483). The outer `finalGameResults.timeTaken: timer` (line 483) wins; line 473 `timeTaken` is on the per-result object, not the outer. Naming is confusing and the per-result value is total/avg.

**Severity: Medium** — `cloze-test-game.tsx:619-715` — `playAudio` constructs a new `Audio()` object inline with `loadeddata` / `seeked` / `timeupdate` / `ended` / `error` listeners. The listeners are added but if the user navigates away (component unmount), listeners remain attached because cleanup is inside the promise only. Memory leak / state-update-after-unmount risk.

**Severity: Medium** — `cloze-test-game.tsx:629-699` — The promise resolves on `handleTimeUpdate` when `audio.currentTime >= endTime`, but `timeupdate` event fires every ~250ms so resolution latency is up to 250ms — fine. However, the fallback `setTimeout` at line 691-694 resolves after 10s with `void 0` regardless of whether the audio finished; this can cause `setIsPlayingAudio(false)` and "Audio completed!" toast (line 701-704) even when audio actually errored mid-play.

**Severity: Medium** — `cloze-test-game.tsx:284-296` — Effect that updates `activeSentences` from `activeSentencesWithBlanks` has `activeSentencesWithBlanks` in the dependency array (line 296) but the setter `setActiveSentences(activeSentencesWithBlanks)` writes to the state that this very effect then triggers another re-render because `activeSentences` is consumed elsewhere (line 337-340). Potential infinite update loop on mount when `rawSentenceData` is non-empty (the first effect run sets state, which triggers re-memo of `currentSentence`, which is read by other effects).

**Severity: Medium** — `cloze-test-game.tsx:1004-1007` — Difficulty selector `onValueChange` sets `setActiveSentences([])` (line 1006), which clears sentences. The Start button (line 1073-1099) then re-loads via `loadSentencesFromDeck` (line 1076). But the user has to click Start after each difficulty change — there is no auto-reload on difficulty change, only an empty-state.

**Severity: Medium** — `cloze-test-game.tsx:1062-1072` — Commented-out Start button block (lines 1062-1072) is dead code. Should be deleted.

**Severity: Medium** — `cloze-test-game.tsx:1339-1343` — `handleNext` button shows "Finish Game" when on the last sentence, but in `handleNext` line 540-547 the "Finish Game" path calls `await saveGameResults()` then sets `setGameComplete(true)`. The button itself does not visually disable while awaiting. Users can double-click and trigger duplicate submissions.

**Severity: Low** — `cloze-test-game.tsx:79-104` — `AVAILABLE_LANGUAGES` constant is declared but never referenced after declaration. The interface `ClozeTestData.translation` (lines 56-61) is also unused in JSX. Dead data structures.

**Severity: Low** — `cloze-test-game.tsx:735-741` — `toggleAudioHints` only flips state without any side-effect toast or audio gating logic; functionally a no-op aside from state.

**Severity: Low** — `cloze-test-game.tsx:118-120` — `selectedDifficulty` state is declared with initial `"medium"`, but the difficulty affects `generateBlanksForSentence` indirectly via the dropdown; no explanation of how difficulty changes affect an in-progress game.

**Severity: Low** — `cloze-test-game.tsx:299` — `console.log("ClozeTestGame mounted with deckId:", deckId)` and 14 other `console.log` calls (lines 307, 313, 316, 464, 487, 496, 499, 507) are debug statements left in production code.

### 6. `apps/reading-advantage/components/practic/cloze-test-page.tsx` (lines 1–72)

**Severity: Medium** — `cloze-test-page.tsx:17-30` — `fetchDeckId` does not check `response.ok` before `await response.json()`. A 404 or 500 response from `/api/v1/flashcard/deck-id` will throw on `.json()` if the body is not JSON, caught by the catch block as "Failed to load flashcard deck" — losing error context.

**Severity: Medium** — `cloze-test-page.tsx:20-24` — Trusts `deckResult.success` and `deckResult.deckId` shape without runtime validation. If the backend returns a different shape the code falls through silently to error state.

**Severity: Low** — `cloze-test-page.tsx:35-49` — Loading skeleton is a fixed h-32 rectangle; no skeletons for cards/sentences. UX polish only.

### 7. `apps/reading-advantage/components/practic/order-sentences-game.tsx` (lines 1–1070)

**Severity: High** — `order-sentences-game.tsx:184` — Draggable IDs are constructed as `` `${sentence.id}-shuffled-${Date.now()}-${index}` ``. The `Date.now()` makes the IDs non-deterministic across renders; if React re-renders for any reason (e.g., parent state update), every draggable's key changes, forcing the entire `<Draggable>` subtree to remount. State inside `Draggable` items can be lost.

**Severity: High** — `order-sentences-game.tsx:222-225` — Correctness check uses `JSON.stringify` to compare two arrays of strings: `JSON.stringify(userSentenceOrder) === JSON.stringify(currentSentenceGroup.correctOrder)`. This is order-sensitive but assumes the arrays contain primitives with stable `toString()` — works for strings. However, if either array has trailing whitespace or casing differences the comparison fails silently. No normalization step.

**Severity: High** — `order-sentences-game.tsx:304-321` — `handleNext` when `isCompleted === false` (line 306) records `isCorrect: false` in `sentenceResults`. This conflates "user gave up" with "user got it wrong" — affects scoring analytics.

**Severity: High** — `order-sentences-game.tsx:323-354` — `saveGameResults` posts `difficulty: 'medium'` as a hard-coded string (line 336) regardless of actual difficulty. The `OrderSentenceData` interface (line 51) declares difficulty as a field on each sentence, but this hardcoded value is sent.

**Severity: High** — `order-sentences-game.tsx:323-354` — `saveGameResults` posts `sentenceResults: sentenceResults` (line 338), but `sentenceResults` only includes the LATEST result per sentence if the same sentence group is retried — duplicate pushes happen because `setSentenceResults(prev => [...prev, ...])` is called from multiple code paths (lines 231-234, 307-310, 383-386, 393-396) without dedup. Server-side analytics receive duplicate entries.

**Severity: High** — `order-sentences-game.tsx:497-557` — `playHintAudio` iterates over `correctOrderSentences` and for each plays the audio segment. The `setTimeout` fallback at line 553-556 resolves after 10s regardless of playback state. If `canplaythrough` fires after the timeout (e.g., slow network), `cleanup()` is called twice (line 555 + line 510) and the promise resolves with `void 0`, but the audio may still be playing in the background because `audio.pause()` is not called in cleanup at lines 509-516.

**Severity: High** — `order-sentences-game.tsx:506-557` — The `for` loop awaits each sentence's audio sequentially with a 500ms delay between (line 560-562). With many sentences this is acceptable, but if a sentence has no `audioUrl` or `startTime`/`endTime`, the `if` (line 500) is skipped silently and no indication given to user.

**Severity: Medium** — `order-sentences-game.tsx:145-149` — Effect that calls `loadSentencesFromDeck` depends on `deckId`, `sentences.length`, `hasLoadedFromDeck`, `loadSentencesFromDeck`. The `loadSentencesFromDeck` is wrapped in `useCallback` with deps `[deckId, isLoading, hasLoadedFromDeck]` (line 143), but the effect uses `[..., loadSentencesFromDeck]` (line 149) — every render of `loadSentencesFromDeck` re-runs the effect. With `setHasLoadedFromDeck` mutating inside the callback, this can re-trigger.

**Severity: Medium** — `order-sentences-game.tsx:168-195` — `shuffleSentences` uses Fisher-Yates (correct) but maps IDs via `Date.now()` which is mentioned in finding 7.1 above.

**Severity: Medium** — `order-sentences-game.tsx:472-583` — `playHintAudio` function is large (110+ lines), reads `currentSentenceGroup` via closure but is wrapped in `useCallback` with deps `[currentSentenceGroup, isPlayingHintAudio]` (line 583) — the callback identity changes whenever `currentSentenceGroup` changes, re-triggering any consumer effects.

**Severity: Medium** — `order-sentences-game.tsx:198-206` — Effect that re-shuffles on `currentSentenceGroup?.id` change has `shuffleSentences` in deps (line 206). Because `shuffleSentences` recreates a new array each call via `useCallback` (deps `[]`), but inside calls `Math.random()`, the function is referentially stable but its output is not. The effect will not re-run due to `shuffleSentences` reference equality, but only due to `currentSentenceGroup?.id` — which is correct.

**Severity: Medium** — `order-sentences-game.tsx:209-247` — Auto-complete effect uses `JSON.stringify` for equality (line 223). When user correctly orders, fires `setCompleted(true)`, `setShowResult(true)`, `setScore(prev => prev + 1)`, then pushes to `sentenceResults` and toasts. If `correctOrder` is missing or empty, the JSON comparison `[].toString() === [].toString()` is true (empty == empty) which would mark an undefined correctOrder as "correct" — but the early return at line 210 (`userOrder.length === 0`) prevents this.

**Severity: Medium** — `order-sentences-game.tsx:209-247` — Dependency array at lines 241-247 includes `currentSentenceGroup?.correctOrder`, `currentSentenceGroup?.id`. Reading `currentSentenceGroup.correctOrder` inside (line 224) without optional chaining is safe because the early return at line 210 guards it.

**Severity: Medium** — `order-sentences-game.tsx:911` — `<div ... onDragOver={(e) => handleDragOver(e, index)} ...>` HTML5 drag-and-drop is not mobile/touch-friendly. No fallback for touch devices.

**Severity: Medium** — `order-sentences-game.tsx:993-1011` — When `showCorrectOrder === true`, the correct order is rendered as a list (lines 998-1009) but each `key={index}` — if React reorders the array, items will not preserve identity. Minor.

**Severity: Medium** — `order-sentences-game.tsx:1199` — `disabled={isLoading}` — but isLoading is a state of `loadSentencesFromDeck`, not the button-click action. UX confusion.

**Severity: Medium** — `order-sentences-game.tsx:325-354` — `gameSession: sentence-ordering-${Date.now()}` is a client-generated string. Server cannot verify session continuity across submissions. Idempotency token only.

**Severity: Low** — `order-sentences-game.tsx:16-29` — Multiple icon imports that are unused in JSX (e.g., `Languages` line 16, `Badge` via `import { Badge }` line 8 actually IS used at line 924, OK). Verify each.

**Severity: Low** — `order-sentences-game.tsx:23` — `Shuffle` imported and used at line 1029.

**Severity: Low** — `order-sentences-game.tsx:464-469` — `toggleAudioHints` only flips state without side-effect toast — minor UX inconsistency.

### 8. `apps/reading-advantage/components/practic/order-sentences-page.tsx` (lines 1–69)

**Severity: Medium** — `order-sentences-page.tsx:17-35` — `fetchDeckId` does not check `response.ok`; assumes `/api/v1/flashcard/deck-info` always returns JSON. Errors swallowed.

**Severity: Medium** — `order-sentences-page.tsx:20-32` — Trusts `data.success`, `data.deckId`, `data.error` from the API without runtime validation. If API returns `{ok: true, deckId: "..."}` the code silently fails because `deckResult.success` is undefined.

**Severity: Low** — `order-sentences-page.tsx:37-46` — Loading state shows only a small loader, no skeleton; UX polish.

### 9. `apps/reading-advantage/components/practic/order-words-game.tsx` (lines 1–1087)

**Severity: High** — `order-words-game.tsx:118-122` — Effect `useEffect(() => { if (deckId && sentences.length === 0) { loadSentencesFromDeck(); } }, [deckId])` lists only `[deckId]` but reads `sentences.length` and `loadSentencesFromDeck` (line 120). React lint rule `react-hooks/exhaustive-deps` will warn. ESLint must be configured to allow this, or the effect is buggy.

**Severity: High** — `order-words-game.tsx:124-150` — `loadSentencesFromDeck` is declared as a plain `async` function (not `useCallback`) so each render creates a new reference. Combined with the effect above, can cause redundant calls in concurrent mode.

**Severity: High** — `order-words-game.tsx:184` — Same `Date.now()`-based ID generation as in order-sentences-game.tsx. Non-deterministic, forces remount on re-render.

**Severity: High** — `order-words-game.tsx:267-325` — `handleNext` builds `sentenceResults` (line 273-276) where each entry is `{ sentenceId, isCorrect: index < score }`. This is a **fabricated approximation** that does not reflect actual per-sentence correctness — the comment even says "Simple approximation - could be improved". Server receives inaccurate analytics.

**Severity: High** — `order-words-game.tsx:267-325` — `handleNext` posts `difficulty: "medium"` hardcoded (line 282) regardless of actual difficulty.

**Severity: High** — `order-words-game.tsx:267-325` — `gameSession: word-ordering-${Date.now()}` is client-generated; not server-validated.

**Severity: High** — `order-words-game.tsx:411-417` — `isCorrect` memo compares arrays via JSON.stringify. Same issues as order-sentences-game.tsx finding 7.2.

**Severity: High** — `order-words-game.tsx:451-562` — `playHintAudio` uses 5s timeout fallback (line 528-531) without calling `audio.pause()` in cleanup (lines 481-489). Audio continues to play in background after promise resolves.

**Severity: High** — `order-words-game.tsx:476-536` — The new Audio() is created per word per playback; no cleanup if component unmounts during long audio sequence.

**Severity: High** — `order-words-game.tsx:206-241` — Auto-complete effect fires on `hasUserInteracted === true && selectedWords.length === currentSentence.words.length`. The toast (line 230-233) only fires on correct completion; if incorrect, no toast is fired — inconsistent UX.

**Severity: High** — `order-words-game.tsx:341-366` — `handleCheckAnswer` mutates state then sets `isCompleted` (line 349). If user clicks "Check Answer" twice quickly, second click sees `isCompleted === true` and the gate at line 1034 `!isCompleted` prevents duplicate rendering. OK in UI but `setIsCompleted` is called regardless.

**Severity: High** — `order-words-game.tsx:569-576` — `getWordTranslation` returns `null` always (line 573) with comment "disabled for word ordering game". Dead function. Used in JSX at lines 888, 980 — both render nothing.

**Severity: High** — `order-words-game.tsx:578-584` — `getSentenceTranslation` looks up `currentSentence.sentenceTranslations[selectedLanguage]`. Returns `null` if missing. JSX at line 905 renders "No translation available" as fallback. UX is acceptable but the `selectedLanguage` state (line 113) default `"th"` may not match user's actual locale.

**Severity: Medium** — `order-words-game.tsx:250-257` — `handleSelectedWordClick` adds back to availableWords via `setAvailableWords((prev) => [...prev, word])` — appends to end of available list. Re-clicking does not restore original position. Order semantics lost.

**Severity: Medium** — `order-words-game.tsx:244-248` — `handleWordClick` removes from available but if user clicks an already-selected word (different id), it's removed from available. OK.

**Severity: Medium** — `order-words-game.tsx:419-441` — `isInCorrectPosition` and `shouldHighlightAvailableWord` use `currentSentence.correctOrder[index]` and `currentSentence.correctOrder[nextPosition]` for highlighting. Works only when `correctOrder` is an array of unique text values matching the word text exactly.

**Severity: Medium** — `order-words-game.tsx:865-895` — Sentence formation area renders selected words but no `aria-label` for screen readers on the buttons (line 877). Accessibility issue.

**Severity: Medium** — `order-words-game.tsx:962-989` — Available words buttons also lack `aria-label`; only `title` attribute (line 976) which screen readers may not announce consistently.

**Severity: Medium** — `order-words-game.tsx:81-88` — `SUPPORTED_LANGUAGES` constant hardcodes 4 languages but the `selectedLanguage` state can be set to anything via the Select. No validation.

**Severity: Medium** — `order-words-game.tsx:259-265` — `handleStartGame` triggers a toast announcing language; the language is selected via `<Select>` (lines 763-777) before starting. If user never selects, defaults to `"th"` — Thai. User may not realize.

**Severity: Medium** — `order-words-game.tsx:391-397` — `handleLanguageChange` toasts on every change including the initial set; can be noisy.

**Severity: Medium** — `order-words-game.tsx:746-751` — "How to Play" instructions list "Translations will be shown below each word" (line 749) but `getWordTranslation` returns `null` (line 573). Instructions lie to users.

**Severity: Low** — `order-words-game.tsx:15-29` — Several icon imports (e.g., `Plus`, `Type`, `Languages`) used appropriately.

**Severity: Low** — `order-words-game.tsx:267-325` — `handleNext` does not reset `selectedWords`/`availableWords` on completion; relying on the line 196-206 effect to do it on next sentence index change.

**Severity: Low** — `order-words-game.tsx:267-325` — `console.log("Order words API response:", result)` at line 297 left in production code.

**Severity: Low** — `order-words-game.tsx:566` — `formedSentence` is computed via `useMemo` but never rendered in JSX (line 565 returns the string but no `<p>{formedSentence}</p>` exists). Dead computed state.

### 10. `apps/reading-advantage/components/practic/order-words-page.tsx` (lines 1–69)

**Severity: Medium** — `order-words-page.tsx:17-35` — Same `fetchDeckId` issue: no `response.ok` check, no runtime validation of `data` shape. Identical problem to order-sentences-page.tsx finding 8.1.

**Severity: Medium** — `order-words-page.tsx:48-66` — Error UI renders the `deckResult?.error` string verbatim — could be HTML-injected if backend ever returns untrusted content (currently the backend controls this, so likely safe, but no escaping).

**Severity: Low** — `order-words-page.tsx:37-46` — Loading state minimal.

### 11. `apps/reading-advantage/components/practic/quote-item.tsx` (lines 1–180)

**Severity: Medium** — `quote-item.tsx:39` — `border-color: getBorderColor;` references an undefined function `getBorderColor`. Either the function was deleted or never defined. This CSS line is invalid and will cause the styled component to render with no border. Should be `border-color: ${(props) => getBorderColor(props.isDragging, props.isGroupedOver)};` to match the pattern at line 40-41.

**Severity: High** — `quote-item.tsx:130-137` — `checkOrder` compares `articleBeforeRandom[dataIndex] === randomText` where `dataIndex` is the current `index` prop. If `articleBeforeRandom` is shorter than the current index (or undefined), this throws `TypeError: Cannot read properties of undefined (reading '...')`. The function does not guard against out-of-bounds.

**Severity: Medium** — `quote-item.tsx:149` — `data-testid={quote}` — `quote` is a `Quote` object (line 5). React will coerce it via `toString()` (most likely `[object Object]`). Not a useful test id.

**Severity: Medium** — `quote-item.tsx:118-178` — Component is not memoized effectively: receives `articleBeforeRandom: any` (line 16) which is an array; React.memo default shallow comparison still re-renders when array reference changes. The `React.memo` at line 180 doesn't help unless parent stabilizes the prop.

**Severity: Medium** — `quote-item.tsx:159, 170` — `alt="Malcolm X"` for both correct and wrong icons — misleading alt text; should be `alt="Correct"` / `alt="Incorrect"`.

**Severity: Medium** — `quote-item.tsx:153` — `<p>{String(quote)}</p>` renders the Quote object via `String(quote)` which produces `[object Object]`. The `quote` is the entire object, not the text. Should be `{quote.text}` (matching `Quote.text: string` in types.ts line 29).

**Severity: Medium** — `quote-item.tsx:118` — Props include `isClone?: boolean` (line 12) and `isGroupedOver?: boolean` (line 13) but neither is used in the JSX. Dead props.

**Severity: Low** — `quote-item.tsx:39` — `border: 2px solid transparent;` at line 38 then `border-color: getBorderColor;` at line 39 — the second overrides the first color. With `getBorderColor` undefined, the border color is invalid CSS, falling back to default browser behavior.

**Severity: Low** — `quote-item.tsx:36` — Renders `<Container ...>` as an anchor `<a>` (because `styled.a`). Has `href` not set, so it's not actually clickable. May be intended for `<NextLink>` integration but `NextLink` is not imported.

**Severity: Low** — `quote-item.tsx:13-17` — `useState` import (line 1) is imported but not used in the file.

### 12. `apps/reading-advantage/components/practic/quote-list.tsx` (lines 1–199)

**Severity: Medium** — `quote-list.tsx:103-104` — `<Draggable key={index}>` uses `index` as key. When items reorder, React's reconciliation cannot preserve identity of moved items, causing `<Draggable>` state to reset and visual glitches.

**Severity: Medium** — `quote-list.tsx:112` — `<QuoteItem key={index}>` — same issue: array index as key.

**Severity: Medium** — `quote-list.tsx:171-172` — `<Droppable droppableId={`droppable-${sectionIndex}`}>` — relies on `sectionIndex` being a number; if `undefined`, `droppableId="droppable-undefined"`.

**Severity: Medium** — `quote-list.tsx:188-194` — `InnerList` receives `sectionIndex as number` (line 192) casting, but if `sectionIndex` is actually `undefined` the cast lies to TypeScript.

**Severity: Medium** — `quote-list.tsx:87-89` — `Props` interface declares `articleBeforeRandom: any`. This is the same `any` typed array passed down to `QuoteItem` (line 118) where it is dereferenced unsafely.

**Severity: Medium** — `quote-list.tsx:157-167` — `listType`, `style`, `isCombineEnabled` are destructured from props but not all used (e.g., `listType` is destructured but the Droppable `type` prop is commented out at line 172).

**Severity: Medium** — `quote-list.tsx:99-100` — `<>` fragment wraps `<Draggable>` elements but no `<Droppable>` here — this `InnerQuoteList` is rendered inside `InnerList`'s `DropZone` (line 143-150) which is the Droppable's `innerRef`. So the `Droppable` is in the parent `QuoteList`, not here. This nesting is correct but the structure is confusing.

**Severity: Medium** — `quote-list.tsx:48-57` — `DropZone` styled div applies `min-height: 250px` to prevent collapse when empty. Hardcoded `scrollContainerHeight = 250` (line 46) is also used in `Wrapper` (no, not actually used in Wrapper). Dead constant — only `min-height: ${scrollContainerHeight}px` at line 50 references it.

**Severity: Low** — `quote-list.tsx:32-44` — `Wrapper` styled.div with `isDropDisabled` and `isDraggingOver` props.

**Severity: Low** — `quote-list.tsx:67-71` — `Title` styled.h4 with focus styles; but the actual `<h4>` is not rendered in the `InnerList` (lines 142-153) — `title` prop is destructured (line 138) but never rendered. Dead destructured prop.

### 13. `apps/reading-advantage/components/practic/reorder.ts` (lines 1–16)

**Severity: Low** — `reorder.ts:7` — `console.log("list : ", list);` left in production code. Logs every call to the function — high-volume noise in dev console.

**Severity: Low** — `reorder.ts:2-13` — The `reorder` function uses `splice` to remove and re-insert. Correct but lacks input validation (negative indices, indices beyond length). Default export name `reorder` is fine but the file name is `reorder.ts` — circular naming pattern.

**Severity: Low** — `reorder.ts:16` — File ends without trailing newline.

### 14. `apps/reading-advantage/components/practic/types.ts` (lines 1–64)

**Severity: Medium** — `types.ts:7-18` — `Sentence` interface declares `createdAt: { _seconds: number; _nanoseconds: number }` (Firestore timestamp shape). Models should not embed Firestore-specific shapes; should be a generic ISO string or `Date`.

**Severity: Medium** — `types.ts:14` — `translation: { th: string }` — only Thai is defined but other locales (cn, tw, vi) are referenced in game components (e.g., `cloze-test-game.tsx:56-61`). Missing locales.

**Severity: Medium** — `types.ts:36-39` — `Dragging` interface is declared but appears unused anywhere in the batch (no `grep Dragging` matches outside the type). May be used elsewhere in repo.

**Severity: Medium** — `types.ts:45-48` — `Task` interface declared with `id: Id` and `content: string`; appears unused.

**Severity: Medium** — `types.ts:50-54` — `WrapperProps` is declared but `quote-list.tsx:26-30` declares its own identical `WrapperProps` interface. Duplicate declaration risk — one should be re-exported.

**Severity: Medium** — `types.ts:56-60` — `InnerListProps` declared with `listType: string | undefined | null` but quote-list.tsx InnerList at line 129-135 declares its own with `sectionIndex: number` and `articleBeforeRandom: any`. Different shapes; both dead-end.

**Severity: Medium** — `types.ts:62-64` — `QuoteListProps` only has `quotes: Quote[]` but quote-list.tsx's `QuoteListProps` (line 91-96) includes `title`, `sectionIndex`, `articleBeforeRandom`. Inconsistent.

**Severity: Low** — `types.ts:27-34` — `Quote` interface has `correctOrder?: boolean` which is never read by any code in the batch (used only via the `articleBeforeRandom` indirection in `quote-item.tsx`).

**Severity: Low** — `types.ts:7-18` — `Sentence.due: string` — should be a Date or ISO timestamp, not free-form string.

### 15. `apps/reading-advantage/components/progress-bar-xp.tsx` (lines 1–148)

**Severity: High** — `progress-bar-xp.tsx:51-57` — `for (let level of levels)` iterates levels and computes `percentage`. If progress is between levels (e.g., progress = 4900 which is below all `min` thresholds except 0), `percentage` remains 0 from initial declaration (line 49) — but if `progress > 242999` (the max in the table), the loop never finds a matching level and `percentage` is 0. Maximum XP handling broken.

**Severity: High** — `progress-bar-xp.tsx:64-68` — `xp.find((xp) => progress <= xp)` — at the maximum level (`max: 243000`), there is no matching `xp` entry because the `xp` array (line 60-62) caps at `242999`. Returns `undefined` for users at C2 level, falling back to `maxProgress = progress` which can be any large number — corrupting downstream progress calculations.

**Severity: High** — `progress-bar-xp.tsx:64` — Variable shadowing: outer `let maxProgress = ...` shadows the inner parameter `xp` in the `.find` callback `(xp) => progress <= xp`. Confusing and error-prone.

**Severity: High** — `progress-bar-xp.tsx:70-80` — `useEffect` checks `level > previousLevel && percentage > 0 && percentage <= 15`. The hard-coded `15` magic number (line 72) is documented at line 73 as "based on max userXpEarned in activity". Brittle assumption: if max XP per activity increases beyond 15 the dialog never triggers; if decreases, the dialog triggers too aggressively.

**Severity: High** — `progress-bar-xp.tsx:70-80` — When level changes but percentage is NOT in (0, 15] range, the effect falls through to the `else if` branch (line 76) which silently updates `previousLevel` without showing dialog. Users who level up at a non-early position see no celebration.

**Severity: Medium** — `progress-bar-xp.tsx:84-95` — Inline `<style>` tag with `dangerouslySetInnerHTML`-like behavior (template literal injected). React may warn about hydration mismatch if SSR generates a different percentage than client.

**Severity: Medium** — `progress-bar-xp.tsx:120-143` — Dialog overlay is a custom div (line 124) rather than a portal; `Dialog` from `@/components/ui/dialog` already wraps in its own overlay. Nested overlay divs may z-index conflict.

**Severity: Medium** — `progress-bar-xp.tsx:127` — `<Confetti className="absolute w-[500px] h-[200px]" />` — fixed-size confetti at top-left of dialog content; will not cover the full viewport as confetti typically does.

**Severity: Medium** — `progress-bar-xp.tsx:17-21` — `levelCalResult = levelCalculation(progress)` is computed but only used at line 121 (`levelCalResult.cefrLevel !== ""`). The `levelCalculation` function (imported from `@/lib/utils`) is the canonical computation but the local `levels` array at lines 27-47 also computes the same mapping — duplicate logic.

**Severity: Medium** — `progress-bar-xp.tsx:120-123` — `progress >= 0` is always true for `progress: number` (number type). Redundant condition.

**Severity: Medium** — `progress-bar-xp.tsx:123` — `level !== 0` — gates level-0 users out of the dialog. Edge case for users who haven't started.

**Severity: Medium** — `progress-bar-xp.tsx:138` — `<Button onClick={closeDialog}>Close</Button>` — uses English literal `Close` instead of i18n `t("close")`. Inconsistent with other strings in the component that use `t(...)`.

**Severity: Low** — `progress-bar-xp.tsx:14` — `import React from "react"` not used (no `React.something` references).

**Severity: Low** — `progress-bar-xp.tsx:118` — `<p>{t("level", { level })} </p>` has trailing space inside the JSX expression; minor.

**Severity: Low** — `progress-bar-xp.tsx:99-117` — Animated progress bar uses CSS `animation-fill-mode: forwards` and `width: ${percentage}%`. If `percentage` changes after mount (e.g., on XP update), the `animationName` does not retrigger because the keyframe is set once. Bar will animate to old percentage and stop.

### 16. `apps/reading-advantage/components/providers/locale-provider.tsx` (lines 1–16)

**Severity: Low** — `locale-provider.tsx:11-15` — `NextIntlClientProvider` receives only `locale` but no `messages`. Without messages prop, translations will fall through to default (empty strings) — likely missing translations across the app.

**Severity: Low** — `locale-provider.tsx:5-8` — `LocaleProviderProps` lacks `messages: Record<string, any>` (or similar) which `NextIntlClientProvider` typically requires. Either missing prop or messages are loaded elsewhere via `getMessages()`.

### 17. `apps/reading-advantage/components/providers/theme-provider.tsx` (lines 1–8)

**Severity: Medium** — `theme-provider.tsx:4` — `import { ThemeProviderProps } from "next-themes/dist/types"` — importing from `next-themes/dist/types` is an internal path that may not be part of the public API. Will break on `next-themes` minor version bumps.

**Severity: Low** — `theme-provider.tsx:1` — `"use client"` directive is fine.

**Severity: Low** — `theme-provider.tsx:6-7` — Spreads `...props` to `NextThemesProvider`. Fine.

### 18. `apps/reading-advantage/components/providers/trpc-provider.tsx` (lines 1–35)

**Severity: High** — `trpc-provider.tsx:11` — `getBaseUrl` returns `http://localhost:${process.env.PORT ?? 3000}` on server. In SSR/RSC contexts, this hardcodes `localhost` even when running in production (Docker, Cloud Run). Should use the request host or `NEXT_PUBLIC_APP_URL`.

**Severity: High** — `trpc-provider.tsx:9-12` — `getBaseUrl` does not handle the case where `process.env.PORT` is set but the service is deployed behind a reverse proxy / load balancer. Calls to `/api/trpc` will go to `localhost:PORT` instead of the public hostname.

**Severity: High** — `trpc-provider.tsx:15` — `new QueryClient()` is created in `useState` initializer — ensures single instance per provider mount. Good.

**Severity: High** — `trpc-provider.tsx:23` — `credentials: "same-origin"` for tRPC fetch. If the API is on a different origin (e.g., separate backend service in monorepo), requests will not include auth cookies. Likely bug if backend is split.

**Severity: Medium** — `trpc-provider.tsx:14` — `TRPCProvider` has no error boundary, no Suspense. tRPC client initialization errors will propagate up.

**Severity: Medium** — `trpc-provider.tsx:7` — `import { trpc } from "@/lib/trpc"` — relies on a singleton `trpc` client being created elsewhere; if `lib/trpc.ts` is missing or misconfigured this provider will fail at import time.

**Severity: Low** — `trpc-provider.tsx:31-33` — Provider nesting order: `trpc.Provider > QueryClientProvider > children`. tRPC v11+ expects QueryClientProvider outside trpc.Provider (this is correct here).

### 19. `apps/reading-advantage/components/questions/laq-question-card.tsx` (lines 1–677)

**Severity: High** — `laq-question-card.tsx:81-86` — `enum QuestionState` re-declared locally inside this file, shadowing the `QuestionState` imported from `@/components/models/questions-model` (line 18 imports it). TypeScript will resolve the local one inside this file. The local declaration has the same values (LOADING=0, INCOMPLETE=1, COMPLETED=2, ERROR=3) so behaviorally identical, but two sources of truth.

**Severity: High** — `laq-question-card.tsx:108-123` — `useEffect` fetches `/api/v1/articles/${articleId}/questions/laq` and trusts `data.state` and `data.result` shape without runtime validation. If backend returns unexpected shape the component crashes silently via try/catch.

**Severity: High** — `laq-question-card.tsx:75` — `nextSteps: []` — empty tuple type, same issue as article-model.ts finding 1.6. In `AnswerResponse.result.nextSteps: []` (line 75) and rendered at line 644 `data.result?.nextSteps.map(...)`. The `[]` literal type means `nextSteps` is `never[]` — `.map()` on `never[]` would yield `never[]`. TypeScript should have caught this; perhaps the strictness is low.

**Severity: High** — `laq-question-card.tsx:351-404` — `onSubmitted` posts to feedback endpoint with `{answer, preferredLanguage}` (lines 360-365). No CSRF token, no auth header. Cookies expected to be sent (same-origin). If same-site cookie is set, this works.

**Severity: High** — `laq-question-card.tsx:374-393` — After feedback, posts to `/api/v1/articles/${articleId}/questions/laq/${resp.result.id}` with `{answer, feedback: feedback.result, timeRecorded: timer}`. Trusting `feedback.result` shape — no runtime validation. `feedback.result` could be `undefined` causing a server-side crash.

**Severity: High** — `laq-question-card.tsx:392` — `setRating(finalFeedback.sumScores)` — references `sumScores` on `finalFeedback` which is typed as `any` (line 386: `const finalFeedback = await submitAnswer.json();`). No type safety.

**Severity: High** — `laq-question-card.tsx:406-440` — `onGetExp` posts rating to `/getxp` endpoint, then calls `handleCompleted()` and `router.refresh()`. No idempotency — if user clicks twice, two XP awards.

**Severity: High** — `laq-question-card.tsx:251` — `isLocked = userLicenseLevel !== LicenseType.ENTERPRISE` — disables the question UI for non-enterprise users. The button (line 475-477) is always visible; the actual gating relies on `QuestionHeader` reading `isLocked` prop. Without inspecting `QuestionHeader`, the gate is implicit.

**Severity: High** — `laq-question-card.tsx:328-337` — `longAnswerSchema` defines `answer.min(minimumCharacters, ...)` where `minimumCharacters = 30 * (userLevel + 1)` (line 326). For level 0 users minimum is 30 chars, level 5 is 180 chars. This is dynamic but `setValue` / `getValues` may not re-validate when `userLevel` changes.

**Severity: High** — `laq-question-card.tsx:481-491` — `<Button type="submit" {...register("method")} onClick={() => { ... setValue("method", "feedback"); }}>` — the `register("method")` is applied to a submit button. RHF does not expect `register` on a button. This is a misuse of `register`. The intended pattern is `setValue` only.

**Severity: Medium** — `laq-question-card.tsx:122-123` — Comment "// ลบ `state` ออกจาก dependency เพื่อป้องกัน fetch loop" (Thai: "Remove state from dependency to prevent fetch loop") — comment is a code smell indicating a workaround. Better to refactor with a `useRef` flag or different state machine.

**Severity: Medium** — `laq-question-card.tsx:125-133` — `handleCompleted` and `handleCancel` directly set state without any guard. If `handleCompleted` is called twice (e.g., from two event handlers), the parent re-renders trigger fetch loops are possible.

**Severity: Medium** — `laq-question-card.tsx:135-147` — Effect that calls `checkAndNotifyCompletion` runs when state changes to COMPLETED. `useArticleCompletion()` returns a stable function but it depends on auth/session context; if the hook reads current user, calling it twice may produce duplicate completion notifications.

**Severity: Medium** — `laq-question-card.tsx:175-190` — `QuestionCardError` displays `t("descriptionFailure")` followed by raw `error` string (line 185). XSS risk if error contains user-controlled content.

**Severity: Medium** — `laq-question-card.tsx:308-318` — `data` state initialized with `nextSteps: []` — empty tuple.

**Severity: Medium** — `laq-question-card.tsx:362` — `preferredLanguage: feedbackLanguage[currentLocale]` — assumes `currentLocale` is a valid key in `feedbackLanguage`. If not, returns `undefined`.

**Severity: Medium** — `laq-question-card.tsx:507-673` — `Dialog` renders `DialogTrigger asChild` with empty children (line 508). The trigger is decorative; the dialog is opened via `setOpenModal(true)`. Pattern is acceptable but the `DialogTrigger` is dead.

**Severity: Medium** — `laq-question-card.tsx:585-615` — `data.result?.detailedFeedback[selectedCategory]?.*` chains — if the backend returns `detailedFeedback` as `{}`, all four fields render `undefined` (no error, just empty). Cosmetic.

**Severity: Medium** — `laq-question-card.tsx:630` — `{data.result?.overallImpression}` renders empty if undefined; OK.

**Severity: Medium** — `laq-question-card.tsx:644` — `data.result?.nextSteps.map((item, index) => ...)` — empty tuple type means this may never type-check.

**Severity: Low** — `laq-question-card.tsx:37` — `useArticleCompletion` imported from `@/lib/use-article-completion` — custom hook, dependency not in package.json locally visible.

**Severity: Low** — `laq-question-card.tsx:38` — `LicenseType` imported from `@/lib/enums`.

**Severity: Low** — `laq-question-card.tsx:296` — `articleLevel` prop is received but never used in `LAQuestion` JSX. Dead prop.

**Severity: Low** — `laq-question-card.tsx:300` — `articleTitle` prop received but not used in `LAQuestion` JSX. Dead prop.

**Severity: Low** — `laq-question-card.tsx:289-300` — `handleCompleted`, `handleCancel` props received and used; OK.

**Severity: Low** — `laq-question-card.tsx:303` — `setPaused` from `QuizContext`; if context is missing, default may not be safe.

### 20. `apps/reading-advantage/components/questions/mc-question-card.tsx` (lines 1–981)

**Severity: High** — `mc-question-card.tsx:179` — Comment "// à¹ƒà¸Šà¹‰ ERROR à¹à¸—à¸™ LOADING à¹€à¸žà¸·à¹ˆà¸­à¸›à¹‰à¸­à¸‡à¸à¸±à¸™ fetch loop" — appears to be mojibake-encoded Thai text that did not decode properly (expected: "ใช้ ERROR แทน LOADING เพื่อป้องกัน fetch loop" = "Use ERROR instead of LOADING to prevent fetch loop"). Suggests comment was written in Thai and the encoding got mangled. Should be cleaned.

**Severity: High** — `mc-question-card.tsx:267-273` — Comment "// â ERROR during retake:" — same mojibake issue (expected emoji or text).

**Severity: High** — `mc-question-card.tsx:637` — Comment "// ðŸš¨ MCQeustion: Detected suspicious server progress, resetting to unanswered" — emoji `🚨` is mojibake. Should be plain Unicode.

**Severity: High** — `mc-question-card.tsx:217` — Comment "// à¹ƒà¸Šà¹‰ INCOMPLETE à¹\u¸e¹\u¸b9\u¸e48à¸™ LOADING à¹\u¸e0a\u¸e1eà¸·à¹ˆà¸­à¹\u¸e44à¸e21à¹ˆà¹ƒ\u¸e2bà¹\u89e8 trigger fetch loop" — more mojibake Thai comments throughout the file.

**Severity: High** — `mc-question-card.tsx:76-118` — `useEffect` calls `checkAndClearCorruptedData` which reads sessionStorage and may call `sessionStorage.removeItem`. If sessionStorage is unavailable (private mode, SSR), the inner `catch` clears and logs but the outer effect does not abort — continues to second effect (line 120-132) which also reads sessionStorage.

**Severity: High** — `mc-question-card.tsx:134-183` — `useEffect` that fetches `/api/v1/articles/${articleId}/questions/mcq?_t=${timestamp}` uses a timestamp query parameter for cache-busting. The `_t=${Date.now()}` value is generated per mount but is not used by the server to invalidate any cache.

**Severity: High** — `mc-question-card.tsx:185-225` — `handleCompleted` mutates state heavily: `setData`, `setState`, `setHasStarted`, sessionStorage writes. No `useCallback` wrapping, recreated each render. Effect consumers depending on `handleCompleted` (e.g., line 282-294) trigger on every parent render.

**Severity: High** — `mc-question-card.tsx:227-274` — `onRetake` calls `setState(QuestionState.LOADING)`, then DELETE, then GET, then `setState(QuestionState.INCOMPLETE)`. The setTimeout (line 266-268) uses 10ms — arbitrary; should be `await new Promise(r => setTimeout(r, 0))` or moved into a `requestAnimationFrame`.

**Severity: High** — `mc-question-card.tsx:594-695` — `MCQeustion` component's main useEffect (line 615-695) depends on `[resp, articleId]`. Whenever `resp` changes (e.g., from `setCurrentResp` at line 617), the entire effect re-runs including `setProgress(initialProgress)`. If `resp.progress` is updated elsewhere while user is mid-quiz, this wipes their current progress.

**Severity: High** — `mc-question-card.tsx:630-646` — Suspicious-server-progress reset logic duplicates the same check at lines 146-167. Both reset to UNANSWERED. If server legitimately has all 5 correct, the client resets to all unanswered — a UX bug.

**Severity: High** — `mc-question-card.tsx:648-681` — Effect reads `sessionStorage.getItem("quiz_progress_${articleId}")` and on success calls `setProgress(parsedProgress)` (line 664). But the `parsedProgress` array length check (line 657) requires `parsedProgress.length === 5`. If the server's progress is e.g. 3 items (different article variant), this length check fails and falls back to server data — silent override of stored progress.

**Severity: High** — `mc-question-card.tsx:697` — `const activeQuestion = fullResults[currentIndex];` — relies on `currentIndex` being valid for `fullResults.length`. If `fullResults` is empty, `activeQuestion` is `undefined`.

**Severity: High** — `mc-question-card.tsx:700-759` — `onSubmitted` mutates state `setSelectedOption(i)` even if the fetch fails (line 754). On error, `setSelectedOption(i)` is set but `setProgress` is not — UI shows selected but no progress recorded.

**Severity: High** — `mc-question-card.tsx:711-715` — `const originalOptions = currentResp.results[0]?.options || [];` — uses `results[0]` (first question) for all submissions, but the `currentIndex` can be 0-4. Should use `results[currentIndex]?.options`.

**Severity: High** — `mc-question-card.tsx:761-809` — Effect that auto-completes when `completedCount === 5` does `setLoadingAnswer(false)`, `handleCompleted(progress, updatedResp)`, sets global store, clears sessionStorage, shows toast, then `setTimeout(() => router.refresh(), 100)`. The 100ms timeout is fragile — if router.refresh() takes longer, the state is stale.

**Severity: High** — `mc-question-card.tsx:823` — `const effectiveResults = [activeQuestion];` — restricts rendering to a single question. The "next/previous" navigation between questions is implicit via `setCurrentIndex` in `handleNext` (line 811-821), but there is no UI to manually select another question. UI limitation.

**Severity: High** — `mc-question-card.tsx:606-613` — Effect that finds first unanswered question runs whenever `fullResults` or `progress` changes. The `useEffect` dependency `[fullResults, progress]` (line 613) means changing either re-runs the effect, including `setCurrentIndex(firstUnanswered)`. If user is on question 3 answering, then progress updates to "answered" for question 0 (server sync), the user is yanked back to question 0 — UX bug.

**Severity: High** — `mc-question-card.tsx:653-672` — `JSON.parse(savedProgress)` (line 653) without try/catch wrapping the parse itself. The outer try/catch at line 673 catches all errors including the parse failure, falling through to fallback. But the error message is generic "Failed to load progress from sessionStorage".

**Severity: High** — `mc-question-card.tsx:449-572` — `QuestionCardIncomplete` IIFE `hasStartedQuiz = (() => { ... })()` runs on every render. Side effects inside (sessionStorage.removeItem at lines 494-495) happen during render — anti-pattern. Should be in `useEffect`.

**Severity: High** — `mc-question-card.tsx:486-508` — IIFE reads sessionStorage AND mutates it (line 494, 495) — render-time side effects.

**Severity: Medium** — `mc-question-card.tsx:80-99` — `checkAndClearCorruptedData` checks if all progress is CORRECT (line 91-94) and clears storage. This logic appears in multiple places (lines 76-118, 134-183, 282-294, 449-572, 630-646) — duplicate.

**Severity: Medium** — `mc-question-card.tsx:282-294` — Effect that calls `checkAndNotifyCompletion` only on `page === "article"` (line 283). For `page === "lesson"` the `onCompleteChange?.(true)` callback at line 278 is invoked (via the OTHER effect at line 276-280). Two parallel completion-detection paths.

**Severity: Medium** — `mc-question-card.tsx:64-74` — `useQuestionStore.subscribe` returns unsubscribe; cleanup function returned (line 73) — OK.

**Severity: Medium** — `mc-question-card.tsx:227-274` — `onRetake` chain: DELETE → GET → setData. If DELETE succeeds but GET fails, the cache is deleted server-side but client still has stale data. No rollback.

**Severity: Medium** — `mc-question-card.tsx:233, 250, 252` — Empty catch blocks `} catch (e) {}` — swallowing errors silently. At minimum should log.

**Severity: Medium** — `mc-question-card.tsx:332-385` — `QuestionCardComplete` renders different layouts for `page === "article"` vs `page === "lesson"` — duplicated structure.

**Severity: Medium** — `mc-question-card.tsx:283` — `checkAndNotifyCompletion` is called from `useArticleCompletion`; if the hook fires a network request and the user navigates away, the request may complete after unmount. No abort controller.

**Severity: Medium** — `mc-question-card.tsx:474-483` — `getCurrentQuizStartedStatus` reads sessionStorage on every render — wasteful but not buggy.

**Severity: Medium** — `mc-question-card.tsx:511-556` — Three branches for `page === "article" && !hasStartedQuiz`, `page === "article" && hasStartedQuiz`, `page === "lesson"`. The `page === "lesson"` branch at lines 557-569 has no `hasStartedQuiz` gate — uses raw resp.

**Severity: Medium** — `mc-question-card.tsx:594-695` — `MCQeustion` initializes `useState(resp.progress || [])` (line 594) but also re-initializes via the effect at line 615 — double initialization is wasteful but consistent.

**Severity: Medium** — `mc-question-card.tsx:802` — `imgSrc: true` passed to `toast()` — toasts typically don't have an `imgSrc` property. Likely a custom toast extension, but if not defined the value is silently dropped.

**Severity: Medium** — `mc-question-card.tsx:803` — Hardcoded XP calculation: `correctCount * 2`. Mirrors `UserXpEarned.MC_Question = 2` from `user-activity-log-model.ts:36`. Duplication; if model changes, this stays stale.

**Severity: Medium** — `mc-question-card.tsx:830-854` — Map renders icons for each progress item with no `aria-label`. Screen-reader inaccessible.

**Severity: Low** — `mc-question-card.tsx:179` — Mojibake comment (see High finding).

**Severity: Low** — `mc-question-card.tsx:709` — `option.replace(/^\d+\.\s*/, "")` strips leading "1. ", "2. ", etc. Assumes options come pre-formatted with a number prefix; brittle.

**Severity: Low** — `mc-question-card.tsx:711` — `const originalOptions = currentResp.results[0]?.options || [];` — uses results[0] but the actual question is `currentIndex` — bug as noted in High finding 20.13.

**Severity: Low** — `mc-question-card.tsx:817-820` — `handleNext` finds `nextUnanswered` but if all are answered, `nextUnanswered === -1` and `setCurrentIndex` is not called — currentIndex stays.

**Severity: Low** — `mc-question-card.tsx:961-978` — `!page` branch renders a button; this is the fallback for when `page` prop is not provided. Tests may exercise this code path.

**Severity: Low** — `mc-question-card.tsx:864-866` — `<span className="hidden">Question ID: {effectiveResults[0]?.id}</span>` — hidden but in DOM; information disclosure via DevTools.

---

## Test Gaps

The following areas lack observable test coverage (no `__tests__` directories were traversed for this batch; coverage is inferred from code shape):

- **`cloze-test-game.tsx`**: Blank-generation logic (`generateBlanksForSentence`) at lines 144-273 — multiple branches (easy/medium/hard), `correctAnswer` derivation, distractor selection, position calculation, no unit tests.
- **`cloze-test-game.tsx:744-822`**: `renderSentenceWithBlanks` — string replacement logic with placeholder swap — no tests for multi-blank sentences.
- **`order-sentences-game.tsx`, `order-words-game.tsx`**: `shuffleSentences` / `shuffleWords` (Fisher-Yates) — no deterministic seed for test reproducibility.
- **`quote-item.tsx:130-137`**: `checkOrder` — out-of-bounds deref; no test for boundary indices.
- **`progress-bar-xp.tsx:51-57`**: Level-band calculation — no edge-case tests for progress above `242999` or below `0`.
- **`progress-bar-xp.tsx:70-80`**: Level-up detection (`percentage > 0 && percentage <= 15`) — no tests for the 15% threshold edge cases.
- **`laq-question-card.tsx` / `mc-question-card.tsx`**: Form validation (`longAnswerSchema`) — no test for `minimumCharacters` per level.
- **`mc-question-card.tsx:649-668`**: sessionStorage round-trip parsing — no tests for corrupted JSON, schema-drift fallback, or partial arrays.
- **`trpc-provider.tsx`**: SSR `getBaseUrl` resolution — no test for production hostname handling.
- **`models/*.ts`**: All type definitions (article-model.ts, questions-model.ts, user-activity-log-model.ts) — no runtime contract tests; consumers can pass malformed data and the compiler will not catch it (e.g., `nextSteps: []` empty tuple).
- **`practic/reorder.ts:7`**: `reorder` function — no unit tests for splice semantics.
- **`practic/types.ts:14`**: `translation: { th: string }` — no locale-completeness validation.

---

## Incomplete Disclosures

The following items are noted but **not exhaustively analyzed** in this review:

1. **Backend API contracts**: The review focused on the client-side files. The APIs consumed (`/api/v1/flashcard/decks/${deckId}/sentences-for-cloze`, `/api/v1/flashcard/decks/${deckId}/sentences-for-ordering`, `/api/v1/flashcard/decks/${deckId}/words-for-ordering`, `/api/v1/flashcard/cloze-test/results`, `/api/v1/flashcard/sentence-ordering`, `/api/v1/flashcard/word-ordering`, `/api/v1/flashcard/deck-id`, `/api/v1/flashcard/deck-info`, `/api/v1/articles/${articleId}/questions/laq`, `/api/v1/articles/${articleId}/questions/laq/${id}/feedback`, `/api/v1/articles/${articleId}/questions/laq/${id}/getxp`, `/api/v1/articles/${articleId}/questions/mcq`, `/api/v1/articles/${articleId}/questions/mcq/${questionId}`) are not in scope. Schemas are inferred from client usage.

2. **`@/lib/utils` (`levelCalculation`)**: Referenced by `progress-bar-xp.tsx:15`. The actual implementation may differ from the local `levels` array in `progress-bar-xp.tsx:27-47`. Without reading `lib/utils`, duplication cannot be confirmed.

3. **`@/lib/use-article-completion`**: Hook used by `laq-question-card.tsx:106` and `mc-question-card.tsx:61`. Internal completion-check logic not reviewed.

4. **`@/contexts/quiz-context`**: Provides `timer`, `setPaused`. Implementation not reviewed; if context defaults are missing, consumers may crash.

5. **`@/store/question-store`**: Zustand-like store used by both LAQ and MCQ cards. Subscription semantics not verified.

6. **`@/lib/enums` (`LicenseType`)**: Referenced in `laq-question-card.tsx:38`. The `ENTERPRISE` enum value gates LAQ features; the values are inferred, not verified.

7. **`@/configs/locale-config` (`feedbackLanguage`, `localeNames`)**: Referenced in `laq-question-card.tsx:31`. Locale mapping not verified.

8. **`next-themes` (`ThemeProviderProps`)**: Imported from `next-themes/dist/types` (theme-provider.tsx:4). The `dist/types` path may be unstable; not confirmed against package version.

9. **`@hello-pangea/dnd`**: Used in `quote-item.tsx`, `quote-list.tsx`, `types.ts`. Library version not verified; the `DraggableProvided` and `DroppableProvided` types are imported from a major-version-sensitive API.

10. **`@tanstack/react-query` and `@trpc/client`**: Versions and API surfaces used in `trpc-provider.tsx` not verified against installed package versions.

11. **`@emotion/styled`**: Used in `quote-item.tsx:2` and `quote-list.tsx:2`. Style fragment renders as raw HTML `<style>` and styled components — not verified against project's CSS-in-JS policy.

12. **`react-confetti`**: Used in `progress-bar-xp.tsx:13`. Performance impact for low-end devices not assessed.

13. **`shadcn/ui` chart components** (`Pie`, `PieChart`, `ChartContainer`, `ChartLegend`, `ChartLegendContent`, `ChartConfig`): Imported in `pie-chart.tsx`. Underlying chart library (recharts) version not verified.

14. **Mojibake comments** (`mc-question-card.tsx:179, 217, 267, 637`): Thai-language developer comments that did not decode properly. The intended messages are inferred from context but not authoritative.

15. **`ClozeTestData` (`cloze-test-game.tsx:39-66`)**: `startTime` / `endTime` are optional (line 63-64), but the audio playback (`playAudio`, lines 619-715) requires them to be defined. Code paths where they are undefined are not gracefully handled.

16. **`order-sentences-game.tsx` `isPlayingHintAudio` cleanup**: If component unmounts mid-playback (lines 472-583), the `audioRef` element persists but the React state setters (e.g., `setIsPlayingHintAudio`) will trigger warnings.

17. **Color-only state encoding** (`mc-question-card.tsx:897-900`, `cloze-test-game.tsx:791-797`): "correct" shown via green background, "incorrect" via red. No `aria-invalid`, `role="alert"`, or text equivalent for color-blind users.

18. **JSDoc**: Per AGENTS.md, every exported function/class/interface should have JSDoc. None of the 20 files contain JSDoc comments for exported declarations. This is a project-wide documentation gap.

19. **`QuizContext` / `QuizContextProvider`**: Imported in `laq-question-card.tsx:22` and `mc-question-card.tsx:11`. Source file `@/contexts/quiz-context` not in batch; the provider's default values not verified.

20. **`QuestionHeader`**: Imported in `laq-question-card.tsx:25` and `mc-question-card.tsx:10`. Not in batch. The `isLocked` prop behavior in `laq-question-card.tsx:262` depends on its implementation.

---

MEASURE_AGENT_RESULT