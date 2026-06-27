# Line-by-Line Review: Reading Advantage — Batch 28

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-28`  
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`  
**Current HEAD:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`  
**Review Date:** 2026-06-27  
**Reviewer Role:** A — correctness / architecture / anti-patterns

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-28` were read end-to-end and reviewed line-by-line. No application code was edited.

| # | File | Lines Reviewed | Bytes / Lines |
|---|------|----------------|---------------|
| 1 | `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx` | 1–502 | 502 |
| 2 | `apps/reading-advantage/components/lesson/phases/phase13-language-questions.tsx` | 1–73 | 73 |
| 3 | `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx` | 1–540 | 540 |
| 4 | `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx` | 1–531 | 531 |
| 5 | `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx` | 1–751 | 751 |
| 6 | `apps/reading-advantage/components/lesson/phases/phase4-vocabulary-collection.tsx` | 1–510 | 510 |
| 7 | `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx` | 1–720 | 720 |
| 8 | `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx` | 1–960 | 960 |
| 9 | `apps/reading-advantage/components/lesson/phases/phase7-multiple-choice.tsx` | 1–62 | 62 |
| 10 | `apps/reading-advantage/components/lesson/phases/phase8-short-answer.tsx` | 1–62 | 62 |
| 11 | `apps/reading-advantage/components/lesson/phases/phase9-vocabulary-flashcards.tsx` | 1–55 | 55 |
| 12 | `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx` | 1–618 | 618 |
| 13 | `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx` | 1–546 | 546 |
| 14 | `apps/reading-advantage/components/level-test-chat.tsx` | 1–670 | 670 |
| 15 | `apps/reading-advantage/components/license-usage-list.tsx` | 1–262 | 262 |
| 16 | `apps/reading-advantage/components/line-chart.tsx` | 1–260 | 260 |
| 17 | `apps/reading-advantage/components/main-navbar.tsx` | 1–61 | 61 |
| 18 | `apps/reading-advantage/components/manage-tab.tsx` | 1–425 | 425 |
| 19 | `apps/reading-advantage/components/matching.tsx` | 1–286 | 286 |
| 20 | `apps/reading-advantage/components/mobile-navbar.tsx` | 1–45 | 45 |

**Total lines reviewed:** 7,939  
**No file was partially reviewed.**  
**No app code was modified.**

---

## Executive Summary

This batch is heavily concentrated on the lesson UI phase components (12–14, 2–9) and the practice components they mount (`lesson-mcq`, `lesson-saq`), plus the supporting pieces `level-test-chat`, `line-chart`, `license-usage-list`, `manage-tab`, `matching`, and the two navbars. The code base is a "use client" React 18 + TypeScript stack that is functionally rich but **completely transport-coupled**: every backend interaction is a raw `fetch()` call with no shared client, no Zod validation, and no error contract. There is no domain/adapter abstraction in this batch at all.

The most severe issues observed in this batch are:

1. **Wrong component identity / export name in `phase5-deep-reading.tsx`**: the file declares `const Phase3FirstReading: React.FC<...>` and `export default Phase3FirstReading` (lines 48, 719, 720) — every importer is therefore actually using the Phase-3 component re-labeled as Phase 5.
2. **`phase6-sentence-collection.tsx:108` contains `article.passage.split("\\n")`**: in a JS string literal, `"\\n"` is a literal backslash followed by `n`, **not** a newline. The fallback `paragraphs` array is therefore always a single-element array containing the entire passage with embedded `\n` text — the paragraph-rendering fallback at lines 845–858 never groups correctly.
3. **`lesson-mcq.tsx:419–425` calls `setState`/`onCompleteChange` directly inside the render function**, which is a React anti-pattern (state update during render) that will re-trigger itself if `state` doesn't stabilize.
4. **Hardcoded Google Cloud Storage base URL is repeated in five files** (`phase2`, `phase4`, `phase3`, `phase5`, plus `lesson-vocabulary-flash-card` from the prior batch), violating the `AGENTS.md` provider-neutrality and storage-adapter rules.
5. **`useQuestionStore` is imported but unused** in both `lesson-mcq.tsx:24` and `lesson-saq.tsx:33`, indicating dead imports or partially-removed wiring.
6. **Several fetch calls omit the `Content-Type` header** (`lesson-saq.tsx:319, 322, 360, 363`; `level-test-chat.tsx:417`; `manage-tab.tsx:127, 137, 290`; `matching.tsx:80`).
7. **No tests exist for any of the 20 files** — `apps/reading-advantage/components/lesson/**/*.test.*` glob returned no matches.

---

## Findings

### Critical / High

#### H-01 — `phase5-deep-reading.tsx` declares and exports the wrong component name
- **File:** `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx`
- **Lines:** 24 (interface `Phase3FirstReadingProps`), 48 (function declaration `const Phase3FirstReading`), 719 (`Phase3FirstReading.displayName = "Phase3FirstReading"`), 720 (`export default Phase3FirstReading`)
- **Severity:** High
- **Evidence:** Every type and identifier in the file is named after Phase 3, but the file path and the wrapper around it are Phase 5. Phase 13's wrapper passes `locale` and `article` into this component. The component renders the Phase-5 header (`t("phase5Title")` at line 352) and includes Phase-5-only features (translation toggle at 463–482), but is exported as `Phase3FirstReading`. Consumers therefore receive a component called `Phase3FirstReading` even though it is wired into Phase 5.
- **Impact:** Source-level confusion, hard-to-trace runtime issues if any consumer inspects `displayName`, React DevTools shows the wrong label, and any code that imports this file expecting the file name will get the wrong default export symbol.
- **Fix:** Rename the local function, displayName, and default export to `Phase5DeepReading` (or a name consistent with the file path), and rename the interface to `Phase5DeepReadingProps`.

#### H-02 — `phase6-sentence-collection.tsx:108` splits on the literal text `\n` instead of newline
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 108 (definition) and the fallback path at 845–858 that consumes `paragraphs`.
- **Severity:** High
- **Evidence:** `const paragraphs = article.passage.split("\\n").filter((p) => p.trim());` — In a JavaScript string literal, `"\\n"` is the two-character sequence backslash + `n`, not a newline (`"\n"`). `Array.prototype.split("\\n")` will therefore split the passage only if the passage literally contains the characters `\` and `n` in sequence; the common case (`passage` containing real `\n` characters) yields a single-element array where the only element is the entire passage with embedded `\` `n` characters.
- **Impact:** The paragraph-rendering fallback (lines 845–858) for "no timepoints" never groups paragraphs; the user sees a single `<p>` containing the full passage with literal `\n` characters visible. Note that this only affects the fallback path — the primary rendering path at lines 712–842 derives `sentences` from `timepoints` (line 96–106), so the bug is masked whenever `timepoints` is non-empty.
- **Fix:** Use a real newline literal: `article.passage.split("\n").filter((p) => p.trim())`.

#### H-03 — `lesson-mcq.tsx` calls `setState` and `onCompleteChange` during render
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 419–425
- **Severity:** High
- **Evidence:**
  ```ts
  if (
    state === QuestionState.INCOMPLETE &&
    data.state === QuestionState.COMPLETED
  ) {
    setState(QuestionState.COMPLETED);
    onCompleteChange(true);
  }
  ```
  This block sits between the `currentQuestion` constant declaration (line 416) and the `return ( ... )` (line 427). Calling `setState` during render in React is permitted only when guarded by an `if` that flips the rendering output (e.g., `if (ready) return <ActualUI />`); otherwise it triggers a re-render and re-execution of the side-effect block, which can loop until `state` changes. Because the call is unconditional inside that branch and both `setState` and `onCompleteChange` are stable for the same `data.state`, in practice it converges after one re-render — but the pattern is fragile and the side-effect fires from every render that lands in the `INCOMPLETE` state.
- **Impact:** Side-effect during render is a React anti-pattern and may log warnings in concurrent rendering. It can also call `onCompleteChange(true)` repeatedly while `data.state` stays `COMPLETED`, inflating phase-completion telemetry on the parent.
- **Fix:** Move the reconciliation into a `useEffect([state, data.state, onCompleteChange])` and remove the in-render side-effect.

#### H-04 — Hardcoded Google Cloud Storage base URL violates provider-neutrality
- **Files / Lines:**
  - `phase2-vocabulary-preview.tsx:300, 304, 327`
  - `phase3-first-reading.tsx:132`
  - `phase4-vocabulary-collection.tsx:145, 396`
  - `phase5-deep-reading.tsx:162`
  - `phase6-sentence-collection.tsx` (no GCS URL but calls the translate API that may share the bucket; see H-05 for related transport issue)
- **Severity:** High
- **Evidence:** Every occurrence is of the form `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL or AUDIO_URL}/${articleId}.mp3`. None of these URLs go through the project's `storage` adapter; the storage adapter is not called at all in this batch.
- **Impact:** Violates `AGENTS.md` Provider-Neutrality Rule and the storage-adapter contract. If the bucket is renamed, moved, or replaced (S3 / R2 / MinIO), every media URL must be updated in many components. The URLs are also not signed, so anyone with the URL can access the asset.
- **Fix:** Route media through a `storage.getSignedUrl()` adapter, or at minimum centralize the base URL in a single config module and inject it.

#### H-05 — Missing `Content-Type: application/json` on JSON POSTs
- **Files / Lines:**
  - `lesson-saq.tsx:319, 322, 360, 363`
  - `level-test-chat.tsx:417` (body line 417–435)
  - `manage-tab.tsx:127, 137, 290`
  - `matching.tsx:80`
- **Severity:** High
- **Evidence:** All of these calls do `body: JSON.stringify({ ... })` without a `headers: { "Content-Type": "application/json" }`. The default for `fetch` is `text/plain;charset=UTF-8`, which many Express/Next API routes reject (e.g., with a Zod validator returning 415). In particular, `lesson-saq.tsx:319` posts the user's SAQ answer and `level-test-chat.tsx:417` posts the level-test activity log — both affect XP/state on the server.
- **Impact:** Silent 4xx errors that may be ignored by client-side `catch` blocks; XP and progress not saved; level-test assessment silently dropped.
- **Fix:** Add `headers: { "Content-Type": "application/json" }` to every JSON POST.

#### H-06 — `level-test-chat.tsx:437` only treats `200` as success
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 437–449
- **Severity:** High
- **Evidence:** `if (updateResult.status === 200) { ... } else { console.error("Update Failed"); toast(...); }`. Several API endpoints in this codebase (e.g., `manage-tab.tsx:152` checks `=== 201`) return `201 Created`. The level-test POST `/api/v1/users/${userId}/activitylog` may return `201` for a new activity log row; this client would treat that as a failure and keep the button visible ("Retry Save & Continue", line 540).
- **Impact:** The "Continue" button may be permanently broken after a successful first-attempt save if the endpoint returns 201; the user sees a destructive toast even though the save succeeded.
- **Fix:** Use a range check (`status >= 200 && status < 300`) instead of strict `=== 200`.

#### H-07 — Wrong `displayName` / identifier copy in `phase5-deep-reading.tsx`
- (Subsumed by H-01; included here for completeness.)

#### H-08 — `lesson-saq.tsx:330–349` retry path can double-submit
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 312–353
- **Severity:** Medium-High
- **Evidence:** `onSubmitted` first POSTs to `/api/v1/articles/${articleId}/questions/sa/${resp.result.id}`. If it throws, it retries the same endpoint with the same payload, in a synchronous `try { ... } catch { try { ... } catch {} }` block. The `try` doesn't inspect HTTP status — it treats `await fetch().json()` as success if it resolves. If the original POST actually succeeded but threw during `.json()` (e.g., empty body), the retry will submit a second answer, which on the server typically stores two `AnswerResponse` rows and may double-award XP.
- **Impact:** Possible duplicate answer / XP records; user-facing `toast` shows the rating prompt even though the retry re-ran.
- **Fix:** Inspect `response.ok` (and not `res.json()` throwing) to decide whether to retry; use an idempotency key.

#### H-09 — `lesson-mcq.tsx:419–425` unconditional `onCompleteChange(true)` while `state === INCOMPLETE`
- (Subsumed by H-03.)

#### H-10 — `lesson-mcq.tsx:99–101` cache-buster timestamp on every fetch
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 99, 225, 256
- **Severity:** Medium
- **Evidence:** `_t=${new Date().getTime()}` is appended on every GET to `/api/v1/articles/${articleId}/questions/mcq`. This defeats any HTTP caching (CDN, browser, Next.js `fetch` cache) and makes the server treat the request as new on every call. The same pattern is used at line 225 (`handleNext`) and 256 (`handleRetake`).
- **Impact:** Wasted bandwidth, increased server load, and disabled caching. Worse: this prevents the Next.js fetch cache from kicking in for the same articleId.
- **Fix:** Remove the cache-buster, or use it only in `handleRetake`.

#### H-11 — `lesson-saq.tsx:434–450` `DialogTrigger asChild` wraps a `type="submit"` button
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 434–450
- **Severity:** Medium
- **Evidence:**
  ```tsx
  <Dialog>
    <DialogTrigger asChild>
      <Button type="submit" size="lg" ...>{t("submitButton")}</Button>
    </DialogTrigger>
    {!isLoading && data.suggested_answer && (
      <DialogContent ...>
  ```
  `DialogTrigger asChild` clones its child and adds an `onClick` that opens the dialog. A `type="submit"` button inside a `<form>` submits the form on click *and* opens the dialog. This produces a race: the form's `onSubmit` handler (line 387) fires before the dialog has a chance to evaluate its `open` state. The `{!isLoading && data.suggested_answer && ...}` guard means the dialog only opens after the response — so the user sees a brief click flash, the network request fires, and then the dialog opens.
- **Impact:** The submit button visibly re-renders the form before opening the dialog. If the parent form ever wraps the button in a way that captures `submit` events differently, double-fire is possible. The UX is also confusing because the button label is "submitButton" but the click also opens a modal.
- **Fix:** Move the trigger out of the form, or split into two buttons (a regular submit button + an external "Show feedback" trigger).

#### H-12 — `lesson-mcq.tsx:419–425` and `lesson-mcq.tsx:616–618` provider-in-provider nesting
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 612–618 (default export)
- **Severity:** Medium
- **Evidence:** The default export wraps `LessonMCQContent` in `<QuizContextProvider>` at line 614. But the content itself uses `useContext(QuizContext)` (line 90). If any consumer ever wraps this default export in another `<QuizContextProvider>`, the timer will be split. This is fine in isolation but easy to misuse. Compare to `lesson-saq.tsx` which only wraps the `INCOMPLETE` branch (line 122) — the two files implement different provider scoping for the same component pair.
- **Impact:** Inconsistent provider scopes; risk of double-providers when the lesson page wraps phases in a parent provider.
- **Fix:** Document the contract; either both files should always provide a fresh provider, or both should assume one is provided.

#### H-13 — `lesson-mcq.tsx:24` and `lesson-saq.tsx:33` import `useQuestionStore` but never read it
- **Files / Lines:**
  - `lesson-mcq.tsx:24` — `import { useQuestionStore } from "@/store/question-store";` (no usage anywhere in the file)
  - `lesson-saq.tsx:33` — same import; used only as `useQuestionStore.setState({ saQuestion: data })` at lines 89, 103 (i.e., only the setter is used, never the hook subscription)
- **Severity:** Medium
- **Evidence:** A grep of `useQuestionStore` shows it is used as a subscriber elsewhere (`mc-question-card.tsx`, `sa-question-card.tsx`, `laq-question-card.tsx`, `chatbot-floating-button.tsx`). `lesson-mcq.tsx` imports it but never references it.
- **Impact:** Dead import / lint noise / future confusion about why the store isn't updated here. The store is updated from `lesson-saq.tsx` (via `setState`) but not from `lesson-mcq.tsx`, so the chatbot sidebar shows stale MCQ state.
- **Fix:** Either subscribe and read the state where appropriate (chatbot integration), or remove the dead import. The MCQ side should call `useQuestionStore.getState().setMCQuestion(...)` after each fetch to keep the store in sync.

---

### Medium

#### M-01 — `phase14-lesson-summary.tsx` uses array-index as React `key`
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 472–481 (word cards) and 504–513 (sentence cards)
- **Severity:** Medium
- **Evidence:** `wordList.slice(0, 8).map((word, index) => <div key={index} ...>)` and `sentenceList.slice(0, 3).map((sentence, index) => <div key={index} ...>)`. Using `index` as `key` is fine when the list is read-only (which it is here — these are summary tiles), but if the data ever becomes mutable or sortable, this becomes a correctness bug. The word has a stable identity (`word.vocabulary`) and the sentence has a stable identity (`sentence.sentence`).
- **Fix:** Use `word.vocabulary` and `sentence.sentence` (or `${index}-${word.vocabulary}`) as keys.

#### M-02 — `phase14-lesson-summary.tsx:81–95` hardcoded 1..5 score thresholds
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 81–95, 387–412, 425–449
- **Severity:** Medium
- **Evidence:** `mcqFeedback` and `saqFeedback` are objects with keys `1..5`. The XP calculation `Math.round((quizScores.mcqScore || 0) * 20)` (line 399) and progress bar `value={(quizScores.mcqScore || 0) * 20}` (line 403) both assume `mcqScore` is out of 5. The default `data.total || 5` in `lesson-mcq.tsx:80, 196, 276, 450, 591` also assumes 5.
- **Impact:** If the backend ever returns a 10-question MCQ, the summary will say "Score: 8/5" and the percentage will be capped or wrong (because the multiplication `* 20` and `* 5` no longer match).
- **Fix:** Source the total from the API response (which already exists as `data.total` in MCQ); for SAQ the API should return a total too.

#### M-03 — `phase14-lesson-summary.tsx:411` index access with `as keyof typeof` cast
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 411 and 449
- **Severity:** Medium
- **Evidence:** `mcqFeedback[quizScores.mcqScore as keyof typeof mcqFeedback]` — the cast suppresses type checking but does not validate that the score is actually 1–5. If `quizScores.mcqScore === 0`, the access yields `undefined` and the component renders an empty `<p>` (line 410) instead of skipping the feedback block (the surrounding `quizScores.mcqScore !== undefined` check only excludes `undefined`, not `0`).
- **Impact:** A score of 0 silently renders empty feedback.
- **Fix:** Use a numeric range guard: `quizScores.mcqScore >= 1 && quizScores.mcqScore <= 5`.

#### M-04 — `phase3-first-reading.tsx:339–349` division by `audioRef.current.duration`
- **File:** `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx`
- **Lines:** 339–349
- **Severity:** Medium
- **Evidence:** `if (duration - currentTime <= 0.5 || currentTime / duration >= 0.95)`. `audio.duration` is `NaN` until metadata loads; dividing `currentTime / NaN` is `NaN`, and `NaN >= 0.95` is `false`, so the comparison silently never triggers if duration never loads. The `retryCount` state (line 57) is set up but the `retryAudioLoad` function (line 357) only re-runs the load effect via `retryCount` change — there is no actual `setAudioSrc` change, so retries may do nothing useful.
- **Impact:** Completion detection can stall on long-loading audio; on flaky networks the user may never see the reading-complete state.
- **Fix:** Guard with `Number.isFinite(duration)` and trigger completion only when duration is positive.

#### M-05 — `phase3-first-reading.tsx:313–323` stacks `onended` handlers
- **File:** `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx`
- **Lines:** 313–323, 325–328, 330–332, 334–351
- **Severity:** Medium
- **Evidence:** `audioRef.current.onended = ...`, `audioRef.current.onpause = ...`, `audioRef.current.onplay = ...`, `audioRef.current.ontimeupdate = ...` — assigning to these properties overrides previous handlers, but `startTimeTracking` is called from `handlePlayPause` (line 247), which means every time the user clicks play/pause, the handlers are reassigned. There is also a separate `useEffect` at lines 211–234 that polls the same state on a 100ms interval using `setInterval`. The two paths (interval-based and `ontimeupdate`-based) can race — both call `setCurrentSentence` and both check `currentSentence >= sentences.length - 1` and call `markReadingComplete`. With `react 18` strict mode, dev-mode double-render can register these twice.
- **Impact:** Duplicate completion calls; potential UI flicker between sentence indices as both sources update state.
- **Fix:** Pick one timing source (the `ontimeupdate` path is cleaner) and remove the `setInterval` block. Make sure handler registration happens in `useEffect` cleanup, not via property assignment.

#### M-06 — `phase3-first-reading.tsx:319` reads stale `currentSentence` in `onended`
- **File:** `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx`
- **Lines:** 314–323
- **Severity:** Medium
- **Evidence:** `if (currentSentence >= sentences.length - 1) { ... markReadingComplete(); }` — `currentSentence` is the closure variable from the render in which `startTimeTracking` was called. If the user pauses mid-sentence, then resumes and listens to the end, the closure may have a stale value (the audio's natural `ended` event fires but the latest `currentSentence` is not visible).
- **Impact:** The completion check can be wrong, missing the "reach the last sentence" condition.
- **Fix:** Use a `currentSentenceRef` (mirroring the pattern in `phase5-deep-reading.tsx:73`) and read from it.

#### M-07 — `phase4-vocabulary-collection.tsx:81, 89` duplicate `onCompleteChange` calls
- **File:** `apps/reading-advantage/components/lesson/phases/phase4-vocabulary-collection.tsx`
- **Lines:** 76–84 (form watch effect) and 87–90 (savedWords effect)
- **Severity:** Medium
- **Evidence:** Two `useEffect`s both call `onCompleteChange(savedWords.length >= 5)`. The first also calls `setSelectedCount(...)`. On initial mount both run, both call `onCompleteChange(false)` (since `savedWords.length` is 0). Each subsequent render where `savedWords.length` changes will fire `onCompleteChange` once from the watch effect and once from the savedWords effect. The form-watch subscription is unsubscribed on unmount, but `onCompleteChange` is a stable prop from the parent, so the lint rule `react-hooks/exhaustive-deps` would flag the dep.
- **Impact:** Double `onCompleteChange` invocations, slight noise in parent completion logging.
- **Fix:** Collapse to a single effect on `[savedWords.length, onCompleteChange]`.

#### M-08 — `phase4-vocabulary-collection.tsx:169–227` posts `card: FsrsCard` and `articleId` in one body
- **File:** `apps/reading-advantage/components/lesson/phases/phase4-vocabulary-collection.tsx`
- **Lines:** 172–199
- **Severity:** Medium
- **Evidence:** `let card: FsrsCard = createEmptyCard(); ... const param = { ...card, articleId, saveToFlashcard: true, foundWordsList };` — this is a composite payload mixing FSRS card fields (`due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, etc., which an empty card will not have but the spread assumes) with article/word data. The endpoint `/api/v1/users/wordlist/${userId}` POST then has to parse a non-standard shape. There is no schema in this file, no validation, and no logging.
- **Impact:** Server contract is implicit and undocumented; small schema drift will silently lose data.
- **Fix:** Define a Zod contract for the request body in the API route, and use it here.

#### M-09 — `phase4-vocabulary-collection.tsx:312–419` nested `FormField`
- **File:** `apps/reading-advantage/components/lesson/phases/phase4-vocabulary-collection.tsx`
- **Lines:** 313–419
- **Severity:** Medium
- **Evidence:** Outer `<FormField control={form.control} name="items" render={() => <FormItem>...</FormItem>}>` at 313, then inside its children, an inner per-word `<FormField control={form.control} name="items" render={({ field }) => ...}>` at 320–415. Both register against the same `form.control` and same `name="items"`. This works with react-hook-form (every inner `FormField` updates the same `items` array) but is hard to read and easy to mis-edit. The inner `FormItem` at line 325 holds the entire card UI (checkbox + word + audio + definition), making the `FormItem` boundary confusing.
- **Impact:** Maintenance hazard; future refactors may break field wiring.
- **Fix:** Use a single `useFieldArray` (`useFieldArray({ name: "items" })`) and `Controller` to manage per-row state.

#### M-10 — `phase4-vocabulary-collection.tsx:214` unconditionally `onCompleteChange(true)`
- **File:** `apps/reading-advantage/components/lesson/phases/phase4-vocabulary-collection.tsx`
- **Lines:** 201–214
- **Severity:** Medium
- **Evidence:** On line 214, after a successful save, the code calls `onCompleteChange(true)` even if `savedWords.length` was already ≥5 (which the effect at line 81 also enforces). This is consistent, but if the server returned 200 OK without actually persisting (e.g., idempotent no-op), the parent will mark the phase complete prematurely.
- **Fix:** Verify `foundWordsList.length > 0` before claiming completion.

#### M-11 — `phase6-sentence-collection.tsx:142–152` O(N×M) duplicate detection
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 142–152
- **Severity:** Medium
- **Evidence:** For each sentence in `sentences`, the code does `allCollectedSentences.some(...)` which is O(N×M). With 100+ sentences per article and 1000+ historical sentences per user, this is fine but borderline. More importantly, `existingSentencesForThisArticle` (line 131) is computed but never used.
- **Impact:** Dead variable; perf risk only if the dataset grows.
- **Fix:** Build a `Set` of lowercased trimmed sentences once: `const collectedSet = new Set(allCollectedSentences.map(s => s.sentence.trim().toLowerCase()));`.

#### M-12 — `phase6-sentence-collection.tsx:130–134` unused `existingSentencesForThisArticle`
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 130–134
- **Severity:** Low-Medium
- **Evidence:** The variable is assigned but never used.
- **Fix:** Remove.

#### M-13 — `phase6-sentence-collection.tsx:316–363` race condition when translations are missing
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 326–363
- **Severity:** Medium
- **Evidence:** If the article has no `translatedPassage.th`, the code POSTs to `/api/v1/assistant/translate/${articleId}`, then GETs `/api/articles/${articleId}` to fetch the updated article. There is no retry/poll loop — if the translation is async on the server side and not done by the time the GET fires, the code falls back to the original (empty) `articleTranslations`. Then `Promise.all(savePromises)` (line 448) sends sentence-save requests with empty translation objects, which on the server may either silently store empty translations or fail validation.
- **Impact:** Sentences saved without translations; users see no localized UI in their target language.
- **Fix:** Either await a translation-complete event from the server, or re-check `articleTranslations.th.length > 0` before sending saves.

#### M-14 — `phase6-sentence-collection.tsx:457, 464` double `onCompleteChange(true)`
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 457, 464
- **Severity:** Medium
- **Evidence:** `onCompleteChange(true)` is called once after `Promise.all(savePromises)` resolves, then again on line 464 "to keep completion status as true". The first call is sufficient.
- **Impact:** Double parent callback. If the parent logs phase completions, this duplicates the entry.
- **Fix:** Remove the second call.

#### M-15 — `phase6-sentence-collection.tsx:621` progress bar uses saved count, not selected count
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 612–624
- **Severity:** Medium
- **Evidence:** `width: \`${Math.min((disabledSentences.size / Math.max(5)) * 100, 100)}%\`` — the bar represents "saved" sentences, but the visual treatment (gradient from teal to cyan) and the surrounding status message imply it represents progress toward 5, which mixes the two. If the user has 5 disabled (saved) sentences, the bar shows 100% regardless of selection state.
- **Impact:** Confusing UX: a user who has selected 4 sentences (not yet saved) sees a progress bar that ignores their selection.
- **Fix:** Decide on a single metric (saved OR selected-up-to-cap) and label the bar accordingly.

#### M-16 — `phase5-deep-reading.tsx:665` progress bar weirdly forces 100% when paused
- **File:** `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx`
- **Lines:** 660–667
- **Severity:** Medium
- **Evidence:** `width: \`${sentences.length > 0 ? Math.max(((currentSentence + 1) / sentences.length) * 100, isPlaying ? ((currentSentence + 1) / sentences.length) * 100 : 100) : 0}%\``. When `isPlaying` is `false`, the width is `100` regardless of `currentSentence`. So pausing on the first sentence shows a full progress bar; resuming continues from that bar.
- **Impact:** Visual lie — the bar says 100% but only 1 sentence has been read.
- **Fix:** `width: \`${((currentSentence + 1) / Math.max(1, sentences.length)) * 100}%\`` and clamp to 0–100.

#### M-17 — `phase5-deep-reading.tsx:269–271` `onCompleteChange(true)` always fires
- **File:** `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx`
- **Lines:** 269–271
- **Severity:** Medium
- **Evidence:** `useEffect(() => { onCompleteChange(true); }, [onCompleteChange]);` — this is the only completion logic in the entire Phase-5 file. The phase is marked complete as soon as the component mounts (or whenever `onCompleteChange` identity changes). A student who opens the page and immediately navigates away counts as having completed the phase.
- **Impact:** Phase-5 completion telemetry is meaningless; XP awarded for "deep reading" is given for free.
- **Fix:** Wire completion to a real condition (e.g., reaching the last sentence or pressing a "I'm done" button), and remove this `useEffect`.

#### M-18 — `phase5-deep-reading.tsx:24` interface name copied from Phase 3
- **File:** `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx`
- **Lines:** 24–30
- **Severity:** Medium
- **Evidence:** `interface Phase3FirstReadingProps { ... }` — this is the Phase-5 component's props. Other types in this file are not renamed either (`Phase5FirstReadingProps` does not exist). Phase 13's wrapper imports this file via `LessonLanguageQuestion` and provides `article, onCompleteChange, skipPhase` — but the wrapper in `phase13` does not pass `article` to a component expecting `Phase3FirstReadingProps`. Note that the imports in this file are correct; only the type name is misleading.
- **Impact:** Source confusion.
- **Fix:** Rename to `Phase5DeepReadingProps`.

#### M-19 — `phase5-deep-reading.tsx:484` missing closing tag in JSX
- **File:** `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx`
- **Lines:** 484 (inside controls panel) and around 540 (translation overlay)
- **Severity:** Medium
- **Evidence:** Line 484 closes `</div>` of the controls flex container, but reading carefully the JSX at lines 410–484 has mismatched nesting of `<div>` blocks. The current code compiles in TypeScript and renders, so the parser is forgiving, but the indentation and structure is hard to follow. In particular, the `</div>` at 484 closes the controls, but the wrapping `<div className="bg-zinc-200...">` at line 410 is closed at line 484, after which the `<div className="bg-zinc-200...overflow-hidden relative">` at line 487 begins — this is correct.
- **Impact:** Cosmetic; the JSX is correct but error-prone to edit.
- **Fix:** Add a JSX formatter to the project.

#### M-20 — `phase2-vocabulary-preview.tsx:82–91, 116–127, 168–189` `audio` cast to `any`
- **File:** `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx`
- **Lines:** 82–91, 116–127, 168–189, 195–200
- **Severity:** Medium
- **Evidence:** `(audio as any).stopTimeout`, `(audio as any).timeUpdateHandler` — three places store DOM-handle references on the `Audio` object using type erasure. There's no type-level discipline preventing collisions with future browser properties.
- **Impact:** Hidden coupling; potential confusion if browsers ever add a `stopTimeout` getter/setter.
- **Fix:** Use a `WeakMap<HTMLAudioElement, { stopTimeout?: number; timeUpdateHandler?: () => void }>`.

#### M-21 — `phase2-vocabulary-preview.tsx:247, 248` duplicate i18n scopes
- **File:** `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx`
- **Lines:** 247–248
- **Severity:** Low-Medium
- **Evidence:** `const t = useScopedI18n("pages.student.lessonPage");` and `const lt = useScopedI18n("pages.student.lessonPage");` — both refer to the same scope, and the file uses them interchangeably (e.g., `t("phase2Title")` at 411 and `lt("definition")` at 478). Two aliases for one scope is a code smell.
- **Fix:** Use one identifier.

#### M-22 — `phase2-vocabulary-preview.tsx:515` `lt as any`
- **File:** `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx`
- **Lines:** 515
- **Severity:** Medium
- **Evidence:** `(lt as any)("wordsToLearn", { count: wordList.length })` — type erasure to call the scoped translator with an interpolated argument. The typed variant `t("wordsToLearn", { count })` would compile if `wordsToLearn` is declared in the dictionary with `count`.
- **Fix:** Drop the cast; ensure `wordsToLearn` is declared in the locale dictionary with a `count` placeholder.

#### M-23 — `phase2-vocabulary-preview.tsx:282–340` two response-shape branches with different normalization
- **File:** `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx`
- **Lines:** 282–341
- **Severity:** Medium
- **Evidence:** The code branches on `Array.isArray(data)` vs `data?.timepoints`. In the array branch, `word.audioUrl` is used directly with a fallback. In the timepoints branch, `word_list` is consulted for vocabulary. The two branches produce differently-shaped `WordList` records — the array branch spreads `...word` (preserving whatever the API returned) while the timepoints branch constructs from scratch. If the API returns both shapes interleaved or returns one with extra fields, downstream consumers (`AudioButton`) will see inconsistent data.
- **Impact:** Inconsistent `WordList` records; subtle bugs in audio playback when the API shape changes.
- **Fix:** Normalize to a single shape (e.g., `NormalizedWord[]`) immediately after the fetch.

#### M-24 — `phase12-sentence-activities.tsx:117–121` filter on `activity.details?.articleId`
- **File:** `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx`
- **Lines:** 117–121
- **Severity:** Medium
- **Evidence:** `phase12Activities = activities.filter((activity) => activity.details?.articleId === articleId && activity.completed && [...].includes(activity.activityType.toUpperCase()))`. The `UserActivityLog` model (apps/reading-advantage/components/models/user-activity-log-model.ts) lists `details.articleId` as a possible field (line 28), but the four Phase-12 activity types (`SENTENCE_ORDERING`, `SENTENCE_CLOZE_TEST`, `SENTENCE_WORD_ORDERING`, `SENTENCE_MATCHING`) are not in the `ActivityType` enum (lines 51–73) — those enum entries are `SentenceOrdering`, `SentenceMatching`, `SentenceWordOrdering`, `SentenceClozeTest` (lowercase strings). The `.toUpperCase()` on line 120 is therefore comparing against strings that no server endpoint emits.
- **Impact:** The "completed activity" detection almost certainly never matches anything, so the "✓" completion badge and auto-select-on-resume (lines 142–144, 231–245, 270–274, 309–313, 348–352) are dead.
- **Fix:** Either update the enum/activity-type strings to match (and emit them from the server), or compare against the actual lowercase values.

#### M-25 — `phase12-sentence-activities.tsx:154` `setSentenceActivity` in `useEffect` deps
- **File:** `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx`
- **Lines:** 108–154
- **Severity:** Medium
- **Evidence:** The `useEffect` at line 108 depends on `sentenceActivity` and `setSentenceActivity` (line 154). The effect's body also calls `setSentenceActivity(completed[0])` (line 143). On mount, the effect runs, sees `sentenceActivity === "none"`, sets it to a real value, which causes a re-render, which causes the effect to run again (because `sentenceActivity` is in deps). This is not an infinite loop because the next run sees `sentenceActivity !== "none"`, but it does cause a redundant fetch to `/api/v1/users/${userId}/activity-data` on every state change.
- **Impact:** Extra network traffic on every selection change; minor.
- **Fix:** Read the previous value with a ref to avoid the dep.

#### M-26 — `phase12-sentence-activities.tsx:197` `window.location.reload()` on translation error
- **File:** `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx`
- **Lines:** 196–201
- **Severity:** Medium
- **Evidence:** `onClick={() => window.location.reload()}` — a hard reload after a translation failure discards all in-memory state (selected activities, completion, etc.) and forces the user back to the top of the phase.
- **Impact:** UX regression for a recoverable error.
- **Fix:** Trigger a refetch instead, or just hide the error and let the user retry the activity.

#### M-27 — `phase12-sentence-activities.tsx:71–93` calls translate API for a single article unconditionally
- **File:** `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx`
- **Lines:** 71–93
- **Severity:** Medium
- **Evidence:** When `missingTranslation` is true, the code POSTs `/api/v1/assistant/translate/${articleId}` with `targetLanguage: "th"` and a comment "Start with Thai, the API will handle all languages". This couples client and server on a specific API contract. There is no debounce, no idempotency key, and no way for the client to know whether the translate endpoint is idempotent or will re-translate on every call. The two `useEffect`s (lines 44 and 108) both fetch on mount — the translate POST and the activity-log GET — without coordination.
- **Impact:** On a slow connection, the user sees the loading spinner for the duration of two independent fetches.
- **Fix:** Sequence the fetches; cache the result by `${userId}-${articleId}`.

#### M-28 — `phase14-lesson-summary.tsx:104` `data.word.map((entry: any) => entry.word)`
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 104
- **Severity:** Medium
- **Evidence:** The fetch returns `data.word` (line 99), then maps `entry.word`. The component state at line 72 is typed `WordList[]` (lines 39–52) but the assignment at line 105 `setWordList(extractedWords)` (where `extractedWords` is `entry.word` per word, i.e., a string) assigns an array of strings to `WordList[]`. The summary UI at line 478 then accesses `word.vocabulary`, which is `undefined` because `word` is a string.
- **Impact:** Phase-14 summary renders empty vocab cards (`.vocabulary` is undefined).
- **Fix:** Map to `entry` (the whole record) and use `entry.vocabulary` in the UI. This finding should be cross-referenced with H-04 from batch 27, where the same endpoint shape was the cause of a different bug.

#### M-29 — `phase14-lesson-summary.tsx:122` `setSentenceList(data.sentences)`
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 122
- **Severity:** Medium
- **Evidence:** `data.sentences` is assigned without `Array.isArray` check. If the API returns `{ sentences: null }` or `{ sentences: undefined }`, the UI at line 341 `sentenceList.length` will throw.
- **Fix:** Default to `[]`: `setSentenceList(Array.isArray(data.sentences) ? data.sentences : [])`.

#### M-30 — `phase14-lesson-summary.tsx:135–137` `setTotalXp(data.total_xp)`
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 137
- **Severity:** Medium
- **Evidence:** `data.total_xp` may be undefined; `setTotalXp(undefined)` would set state to `undefined`, and the UI at line 283 displays `+{totalXp} XP Earned!` — rendering `+undefined XP Earned!`.
- **Fix:** `setTotalXp(typeof data.total_xp === "number" ? data.total_xp : 0)`.

#### M-31 — `lesson-mcq.tsx:280–282` mixed source of truth for summary
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 278–282
- **Severity:** Medium
- **Evidence:** `const correctCount = data.summary?.correctAnswers ?? progress.filter(...).length;` — when the API returns a `summary`, it is used; otherwise `progress` is filtered. But `progress` may not have been updated for the latest question if `handleNext` (line 187) hasn't run yet. This causes the "completed" screen to show `correctCount = 5` only after the next button is clicked, not immediately when `state === COMPLETED`.
- **Impact:** The "Completed" view can show stale stats for one render.
- **Fix:** Derive `correctCount` from the API `summary` exclusively when present, otherwise recompute `progress` from local state but only after `setProgress` has run.

#### M-32 — `lesson-mcq.tsx:415–425` side-effect during render (already H-03)
- (Subsumed.)

#### M-33 — `lesson-mcq.tsx:149, 159` `selectedAnswer.replace(/^\d+\.\s*/, "")`
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 149, 159
- **Severity:** Medium
- **Evidence:** The client strips a `"1. "`-style prefix from the selected answer before submitting and before comparing to `result.correctAnswer`. The API is therefore expected to return `correctAnswer` without the prefix, but the client's `options` array (line 523) does include the prefix. If the server stores/returns the answer with the prefix, this code will silently mark all answers wrong.
- **Impact:** False-negative scoring.
- **Fix:** Normalize both sides on the server and on the client; or remove the prefix from `options` before display.

#### M-34 — `lesson-mcq.tsx:544` `isCorrect && selectedOption >= 0`
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 540–545
- **Severity:** Medium
- **Evidence:** The "correct" highlight on a button is `isCorrect && selectedOption >= 0`, where `isCorrect = correctAnswer === option` (line 527). `correctAnswer` is set on line 160 from the API response. If the API doesn't return `correctAnswer` (e.g., 204 No Content), the highlight never appears even though `selectedOption >= 0`.
- **Impact:** No visual feedback when the API doesn't echo back the correct answer.
- **Fix:** Track correctness locally from the response status (`response.ok` + `selectedAnswer === correctAnswer`).

#### M-35 — `lesson-saq.tsx:89, 103` writes to global `useQuestionStore` without re-rendering
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 89, 103
- **Severity:** Medium
- **Evidence:** `useQuestionStore.setState({ saQuestion: data })` — Zustand-style direct setter. This is fine, but the type `SAQuestionResponse` imported from `mc-question-card.tsx` (re-exported from `@/components/questions/sa-question-card`) is `QuestionResponse = { result: ShortAnswerQuestion; suggested_answer: string; state: QuestionState; answer: string }`. The local `QuestionResponse` in this file (line 45) has the same shape. So no mismatch, but note that the SAQ store field never includes a `total` or `score`, so a subscriber cannot compute percentage.
- **Impact:** Inability to show "X out of Y" in subscribers (e.g., chatbot sidebar).
- **Fix:** Extend the store schema with `score`/`total` if needed.

#### M-36 — `lesson-saq.tsx:254–259` `countWords` helper duplicates logic that could use Intl.Segmenter
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 254–259
- **Severity:** Low-Medium
- **Evidence:** `text.trim().split(/\s+/).filter((word) => word.length > 0).length` — does not handle CJK, Thai, or other scriptio-continua languages correctly. `Intl.Segmenter` would be more accurate.
- **Impact:** Misleading word counts for non-space-separated languages.
- **Fix:** Use `Intl.Segmenter` with `granularity: "word"`.

#### M-37 — `lesson-saq.tsx:519–524` Rating button calls `setIsCompleted(true)` and `onRating()` without guarding
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 519–534
- **Severity:** Medium
- **Evidence:** The "rateButton" calls `setIsCompleted(true)` and `onRating()` in the same handler. `onRating` POSTs to the rate endpoint and then calls `router.refresh()`. If the rate endpoint fails (e.g., 500), `isCompleted` is still `true` so the textarea is disabled on next render (line 407), and `router.refresh()` triggers a server-component re-render that may re-fetch the SAQ question.
- **Impact:** Once the user clicks "rate", they cannot edit their answer even on failure.
- **Fix:** Only set `isCompleted` after the rate POST succeeds.

#### M-38 — `lesson-saq.tsx:84, 98` no error handling on `fetch`
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 84, 98
- **Severity:** Medium
- **Evidence:** `fetch('/api/v1/articles/${articleId}/questions/sa').then((res) => res.json())` — no `.ok` check; if the server returns 4xx/5xx with a non-JSON body, `.json()` throws but the only catch is the generic one that sets `QuestionState.ERROR`. The user sees the error screen but doesn't know what failed.
- **Fix:** Check `res.ok` and pass a useful error message to `LessonSAQError`.

#### M-39 — `lesson-saq.tsx:172, 180` `LessonSAQError` references `t("title")` and `t("descriptionFailure", ...)`
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 171–189
- **Severity:** Medium
- **Evidence:** The error component uses `t("title")` and `t("descriptionFailure", { error: "Failed to load question" })`. The `t` is `useScopedI18n("pages.student.lessonPage")`. There is no key `title` in that namespace; the error screen will render `t("title")` which may resolve to a generic page title and is misleading.
- **Impact:** Confusing error message on failure.
- **Fix:** Use a dedicated i18n key under `components.rate` or similar.

#### M-40 — `level-test-chat.tsx:17` `levelCalculation` imported from `@/lib/utils`
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 17, 414, 500
- **Severity:** Medium
- **Evidence:** `levelCalculation` is used to compute the RA level from XP. The same helper is imported and used in `lesson-vocabulary-flash-card.tsx`, `lesson-vocabulary-flashcard-game.tsx`, `matching.tsx`, `manage-tab.tsx`, etc. There is no Zod schema for `Assessment.level`/`sublevel` (the AI may return any string), and the helper may produce different outputs for the same XP if `lib/utils` is changed.
- **Impact:** Cross-component consistency risk.
- **Fix:** Document the contract in `lib/utils` and add a unit test for `levelCalculation`.

#### M-41 — `level-test-chat.tsx:55–92` `cefrToSystemXp` lookup silently returns 0 for unknown levels
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 55–92
- **Severity:** Medium
- **Evidence:** If the AI returns `level = "PRE_A1"` (a hypothetical new level), the function returns `0` and assigns `A1-` XP, which is the minimum. The user is silently downgraded.
- **Fix:** Log a warning when the lookup fails; consider clamping to the nearest valid level and surfacing the fallback to the user.

#### M-42 — `level-test-chat.tsx:82` `cefrXpMap[cefrKey]` is falsy when the value is `0`
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 80–83
- **Severity:** Medium
- **Evidence:** `if (cefrXpMap[cefrKey]) { return cefrXpMap[cefrKey]; }` — `cefrXpMap["A1-"]` is `0`, which is falsy, so the lookup falls through to the next branch and returns `cefrXpMap["A1-"]` again (also `0`). The behavior is correct here only by accident; the `if` should be `in cefrXpMap`.
- **Fix:** `if (cefrKey in cefrXpMap)`.

#### M-43 — `level-test-chat.tsx:504` `window.innerWidth/Height` accessed during render
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 504
- **Severity:** Medium
- **Evidence:** `<Confetti width={window.innerWidth} height={window.innerHeight} />` — `window` is not defined on the server. This file has `"use client"` at line 1, so it should not run on the server, but if the page is rendered on the server (e.g., during `router.refresh()` or `getStaticProps`-like fallback), this will throw `ReferenceError: window is not defined`.
- **Fix:** Use `useEffect` + `useState` to read `window.innerWidth/Height` after mount.

#### M-44 — `level-test-chat.tsx:540` hardcoded English `"Retry Save & Continue"`
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 540–541
- **Severity:** Medium
- **Evidence:** Hardcoded English string. The rest of the component uses `t(...)` for localization.
- **Fix:** Add `t("retrySaveButton")` to the locale dictionary.

#### M-45 — `level-test-chat.tsx:119–150` skip timer `useEffect` always clears
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 124–150
- **Severity:** Medium
- **Evidence:** The effect clears the existing timer (line 127) and sets `showSkipButton(false)` (line 130) on every `messages` change, even if a skip button is already showing. The cleanup function on line 145–149 runs both on re-render and on unmount; the latter is fine, but the former causes the timer to be cancelled and restarted on every bot message, which is the intent. However, when the user sends a message (line 207), `messages` changes; the effect clears the timer. Then `sendMessage` sets `isLoading=true` and on response sets it back to false; another `messages` change triggers the effect again, restarting the 15-second timer. This works but the timer is reset every time the user sends a message, which is the desired behavior. Note: if the test ends mid-message, `testFinished` becomes true; the next effect run will not start a timer because `lastMessage?.sender === "bot"` is false (the new message is the assessment bot message). OK, but fragile.
- **Impact:** Behavior is correct, but the dual-purpose useEffect mixes UI state (`showSkipButton`) with timer lifecycle.
- **Fix:** Split into two effects.

#### M-46 — `level-test-chat.tsx:464–469` `eslint-disable-next-line react-hooks/exhaustive-deps`
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 464–469
- **Severity:** Medium
- **Evidence:** The auto-save effect deliberately omits `saveAssessmentToDb` and `isSaving` from the deps to avoid re-firing the save when the function identity changes. This is correct for one-time auto-save, but if `assessment` updates from `null` to a value, the effect fires once. If the user submits another assessment (e.g., after retake), the effect will not re-fire because `assessment` is unchanged.
- **Fix:** Use a `useRef` to capture `saveAssessmentToDb` so the effect's deps can include it.

#### M-47 — `license-usage-list.tsx:91` `accessorKey: "AvailableLicenes"` is a calculated column but uses the wrong accessor pattern
- **File:** `apps/reading-advantage/components/license-usage-list.tsx`
- **Lines:** 90–100
- **Severity:** Low-Medium
- **Evidence:** TanStack Table's `accessorKey` is used for both display and sorting/filtering. A column that is purely calculated (no underlying field) should use `id: "available"` plus `accessorFn`, or `header: () => <div>...</div>` without `accessorKey`. As written, the column tries to look up `row.getValue("AvailableLicenes")` which doesn't exist; the `cell` function reaches into `maxUsers` and `usedLicenses` instead. This works because `cell` is the only consumer, but if any future code uses `column.getFilterValue()` for this column it will silently fail.
- **Fix:** `id: "available"` + `accessorFn: (row) => row.maxUsers - row.usedLicenses`.

#### M-48 — `license-usage-list.tsx:95–99` division by zero in `UtilizationRate`
- **File:** `apps/reading-advantage/components/license-usage-list.tsx`
- **Lines:** 95–100, 106–115
- **Severity:** Medium
- **Evidence:** `(Number(row.getValue("usedLicenses")) / Number(row.getValue("maxUsers"))) * 100` — if `maxUsers` is `0` (a school with no licenses), `UtilizationRate` is `NaN`. `Number.isNaN(NaN)` is true; `NaN.toFixed(2)` is `"NaN"`.
- **Fix:** Default to `0` when `maxUsers === 0`.

#### M-49 — `license-usage-list.tsx:120` function name typo `LicesneUsageList`
- **File:** `apps/reading-advantage/components/license-usage-list.tsx`
- **Lines:** 120
- **Severity:** Low-Medium
- **Evidence:** Default export is named `LicesneUsageList` (transposed letters). Other files importing this default will get this name.
- **Fix:** Rename to `LicenseUsageList`.

#### M-50 — `license-usage-list.tsx:149` `//This line` orphan comment
- **File:** `apps/reading-advantage/components/license-usage-list.tsx`
- **Lines:** 149
- **Severity:** Low
- **Evidence:** A bare `//This line` comment with no context. Likely a leftover marker.
- **Fix:** Remove.

#### M-51 — `line-chart.tsx:30` `import { number } from "zod";` unused
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 30
- **Severity:** Low
- **Evidence:** `number` is imported from `zod` but never used in this file.
- **Fix:** Remove the import.

#### M-52 — `line-chart.tsx:47–67` `CEFR_LEVEL_MAP` and `line-chart.tsx:69–89` `REVERSE_CEFR_LEVEL_MAP` mismatch
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 47–89
- **Severity:** Medium
- **Evidence:** `CEFR_LEVEL_MAP` starts at `"A0-"` (0), while `level-test-chat.tsx:56–75` `cefrXpMap` starts at `"A1-"`. Different projects use different level sets. The line chart therefore can render a value `0` (A0-), which the level test never produces. The Y-axis ticks at line 245 (`[0, 3, 6, 9, 12, 15, 18]`) match `CEFR_LEVEL_MAP`, but the underlying data is sourced from `activity.details.cefr_level`, which is set by `levelCalculation` — and `levelCalculation` may emit strings not in this map (e.g., `"A0"` without `+`/`-`).
- **Impact:** Chart drops data points whose CEFR level is not in `CEFR_LEVEL_MAP`.
- **Fix:** Source `CEFR_LEVEL_MAP` from a shared constants file.

#### M-53 — `line-chart.tsx:139` `getMonthName` re-computes the locale string each call
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 33–35, 139
- **Severity:** Low
- **Evidence:** `getMonthName(new Date(item.timestamp))` calls `toLocaleString("default", { month: "long" })` for every activity. With many activities this is O(N×log N) on locale lookups.
- **Fix:** Precompute a `Map<number, string>` from `monthIndex` to `monthName` once.

#### M-54 — `line-chart.tsx:97–98` mutates `sixMonthsAgo`
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 97–98
- **Severity:** Low
- **Evidence:** `const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - lastmonth);` — mutates the `Date` instance after assignment; future calls (if any) would not re-init. The parameter `lastmonth` is passed `5` from line 199, so the function looks back 5 months and is misnamed (it should be `lastMonths` or accept an inclusive bound). The hardcoded `5` (line 199) and the function-internal `6` (line 40) are inconsistent.
- **Fix:** Pass a `monthCount` parameter and remove the mutation.

#### M-55 — `line-chart.tsx:183–196` `CustomTooltip` types as `any`
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 183–196
- **Severity:** Low
- **Evidence:** `({ active, payload, label, nameKey }: any) => { ... }` — recharts provides proper types for these props.
- **Fix:** Import `TooltipProps` from recharts and type the parameters.

#### M-56 — `line-chart.tsx:248` `nameKey="Average CEFR Level"`
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 248
- **Severity:** Low
- **Evidence:** The `nameKey` is a hardcoded English string used in the tooltip. `chartConfig.number.label` at line 173 is also `"Average CEFR Level"`. Both should be sourced from the i18n catalog.
- **Fix:** Use `t(...)` from the locale dictionary.

#### M-57 — `main-navbar.tsx:38` `item.href.startsWith(`/${segment}`)`
- **File:** `apps/reading-advantage/components/main-navbar.tsx`
- **Lines:** 38
- **Severity:** Medium
- **Evidence:** `useSelectedLayoutSegment()` can return `null` (e.g., at the root). `"/" + null` is `"/null"`, which never matches any real href. The active-link highlighting is therefore broken at the root or on segments the navbar doesn't list.
- **Fix:** `const seg = segment ?? ""; item.href.startsWith(`/${seg}`)`.

#### M-58 — `manage-tab.tsx:200–204` `row.getValue("due")` under header "Date"
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 189–205
- **Severity:** Medium
- **Evidence:** The column's `accessorKey` is `"createdAt"` (line 190) but the `cell` reads `row.getValue("due")` (line 201). This displays the `due` value (the FSRS due date) under a column labeled "Date" (createdAt). Either the column or the cell is wrong.
- **Fix:** Use `"createdAt"` consistently, or rename the header to "Due".

#### M-59 — `manage-tab.tsx:283–285` `handleNavigateToArticle` defined after first use
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 178–187 (first use) and 283–285 (definition)
- **Severity:** Medium
- **Evidence:** `columns` (an array of column defs) is constructed at line 176 and references `handleNavigateToArticle` inside the `cell` function at line 183. `handleNavigateToArticle` is defined as a `const` arrow function at line 283 — declared after the column array but referenced inside a closure that runs only on render. This works because by the time `cell` is invoked, the closure has already captured the binding (and `handleNavigateToArticle` is hoisted at runtime via `const` initialisation). However, during the first render before `handleNavigateToArticle` is initialised (which is impossible because `columns` is constructed in the same render pass after the const is initialised), `cell` would throw. Actually, `handleNavigateToArticle` is defined at 283, after `columns` (176) but before `return` (320). The `cell` callback at 183 is only invoked when the table is rendered, which happens after the entire function body has executed. So this is fine.
- **Fix:** Move the function definition above `columns` for readability.

#### M-60 — `manage-tab.tsx:159` `router.refresh()` inside a `for` loop
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 119–166
- **Severity:** Medium
- **Evidence:** If `filterDataUpdateScore.length > 1`, the loop calls `router.refresh()` after each successful update (line 159). Each `router.refresh()` triggers a Next.js server-component re-render, which is expensive and may interrupt the loop iteration.
- **Impact:** Performance: many full server re-renders in quick succession.
- **Fix:** Call `router.refresh()` once after the loop completes.

#### M-61 — `manage-tab.tsx:152` only treats `201` as success
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 152
- **Severity:** Medium
- **Evidence:** `if (updateScrore?.status === 201)` — same issue as H-06.
- **Fix:** `status >= 200 && status < 300`.

#### M-62 — `manage-tab.tsx:288–294` `DELETE` with a JSON body
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 287–294
- **Severity:** Medium
- **Evidence:** `fetch(..., { method: "DELETE", body: JSON.stringify({ id }) })` — DELETE with a body is allowed by the Fetch spec but discouraged; some proxies strip the body. Also missing `Content-Type` header.
- **Fix:** Move `id` into the URL path: `/api/v1/users/sentences/${id}`.

#### M-63 — `matching.tsx:2` `"use client"` directive is commented out
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 2
- **Severity:** Medium
- **Evidence:** `// "use client";` — the directive is commented out. The component uses `useState`, `useEffect`, `useRouter`, `dayjs`, etc., all of which require a client environment. Without `"use client"`, this component must be invoked from within another client tree. Many consumers likely already provide that boundary, but if any page renders `<Matching />` directly in a server component, the build will fail with "useState only works in client components".
- **Fix:** Uncomment the directive.

#### M-64 — `matching.tsx:4` `useRouter` imported but never used
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 4, 94
- **Severity:** Low
- **Evidence:** `useRouter` is imported (line 4) but only `router.refresh()` is called at line 94; `router` is `const router = useRouter();` at line 45. So `useRouter` IS used. The finding is wrong; no issue here.
- (Self-correction: this is not a finding. Removing from the list.)

#### M-65 — `matching.tsx:76` hardcoded `correctMatches.length === 10`
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 76, 192, 272
- **Severity:** Medium
- **Evidence:** The code waits for 10 correct matches (5 pairs × 2 cards) but the input is capped at 5 sentences (line 138). If the user saves fewer than 5 sentences, `articleMatching.length` is <5 and line 229 shows the "minSentencesAlert" — but if the user saves 5 sentences, then completes the round, `correctMatches.length === 10` is correct. However, if `articleMatching.length` is between 1 and 4, line 229 displays the alert (so the game is blocked). If 5, the game proceeds. OK behavior, but the magic number 10 should be `articleMatching.length * 2`.
- **Fix:** Compute `expectedMatches = articleMatching.length * 2`.

#### M-66 — `matching.tsx:15` `import { Sentence } from "./practic/types"` typo in path
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 15
- **Severity:** Low-Medium
- **Evidence:** The import path is `./practic/types` — missing the trailing `s`. If the actual directory is `./practices/types` (which is what `lesson-saq.tsx:15` would import), then this import works only if a separate `./practic/types` file exists, or if `./practic` is a symlink. Worth verifying on the file system.
- **Fix:** Standardize the path.

#### M-67 — `matching.tsx:138` limits to 5 sentences
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 137–139
- **Severity:** Medium
- **Evidence:** `initialWords.length > 5 ? initialWords.slice(0, 5) : initialWords` — hardcoded 5. Combined with M-65, the matching game only ever shows 5 pairs. If the user has 10 sentences due, 5 are dropped silently.
- **Fix:** Make the limit configurable, or use `Math.min(5, initialWords.length)` (current behavior) but expose the cap to the user.

#### M-68 — `matching.tsx:229` `articleMatching.length == 5` double-equals
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 229
- **Severity:** Low
- **Evidence:** `articleMatching.length == 5` uses `==`. ESLint with the `eqeqeq` rule will flag this. Functionally equivalent to `===` here.
- **Fix:** `===`.

#### M-69 — `mobile-navbar.tsx:21` `h-[calc(100vh-4rem)]` hardcoded
- **File:** `apps/reading-advantage/components/mobile-navbar.tsx`
- **Lines:** 21
- **Severity:** Low
- **Evidence:** Hardcoded `4rem` (assumed to be the navbar height). If the navbar height changes, this breaks.
- **Fix:** Read the actual height from a CSS variable.

---

### Low

#### L-01 — `phase12-sentence-activities.tsx:170` `t("translatingContent") || "กำลังแปลเนื้อหา..."` non-idiomatic fallback
- **File:** `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx`
- **Lines:** 170, 191, 200
- **Severity:** Low
- **Evidence:** Hardcoded Thai string as a fallback for a missing i18n key. The locale dictionary should always have the key.
- **Fix:** Add the key to the dictionary.

#### L-02 — `phase14-lesson-summary.tsx:532` `t("readPageButton") || t("continueReading")` non-idiomatic
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 532
- **Severity:** Low
- **Evidence:** Falls back to another key. Should resolve to one.
- **Fix:** Decide on a single key.

#### L-03 — `phase3-first-reading.tsx:498` `"🔆"` / `"🔅"` emojis as labels
- **File:** `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx`
- **Lines:** 499, 500
- **Severity:** Low
- **Evidence:** Emojis are used to decorate the highlight toggle. They bypass the i18n system.
- **Impact:** Inconsistent rendering on platforms where the emoji is rendered differently.
- **Fix:** Use a Lucide icon (`<Sun />` / `<SunDim />`).

#### L-04 — `lesson-mcq.tsx:340–341` 🎉 emoji repeated
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 337–339
- **Severity:** Low
- **Evidence:** Two 🎉 emojis wrap the title text on lines 337, 339.
- **Fix:** Single emoji or replace with a Lucide icon.

#### L-05 — `phase14-lesson-summary.tsx:252–264` decorative emojis outside i18n
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 252–264 (⭐, 🎉, ✨, 🏆)
- **Severity:** Low
- **Evidence:** Decorative emoji are scattered around the celebration header.
- **Fix:** Use Lucide icons.

#### L-06 — `phase12-sentence-activities.tsx:6–9` imports `LessonOrderSentences`, `LessonClozeTest`, etc.
- **File:** `apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx`
- **Lines:** 6–9
- **Severity:** Low
- **Evidence:** These imports resolve to files outside the audit batch (e.g., `../lesson-order-sentence`). Not reviewed in this batch. Worth noting that the `phase12` orchestration depends on files reviewed in the prior batch.
- **Impact:** Cross-batch coupling; refer to batch 27 findings.

#### L-07 — `phase9-vocabulary-flashcards.tsx:18, 19` `showVocabularyButton` and `setShowVocabularyButton` declared but unused
- **File:** `apps/reading-advantage/components/lesson/phases/phase9-vocabulary-flashcards.tsx`
- **Lines:** 8–21, 43–47
- **Severity:** Low
- **Evidence:** The interface declares these props, and the function destructures them (line 19–20), but they are not passed to `LessonVocabularyFlashcardGame` and not used elsewhere.
- **Fix:** Remove if truly unused, or pass them through.

#### L-08 — `manage-tab.tsx:39–43` dayjs plugins extended in module scope
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 23–25, 48–50
- **Severity:** Low
- **Evidence:** `dayjs.extend(...)` runs at module load. If the file is imported in a server context, `dayjs` may not be in the bundle and the extend call is a no-op.
- **Fix:** Move the extend calls into a `useEffect` or a dedicated dayjs setup file.

#### L-09 — `manage-tab.tsx:9` `useRouter` imported, used, but `useState` is imported as `React.useState`
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 2, 84–91
- **Severity:** Low
- **Evidence:** Inconsistent import style — `React.useState` vs `React.useEffect` is fine, but mixing with bare `useRouter` is.
- **Fix:** Pick one style.

#### L-10 — `lesson-saq.tsx:24` `TextareaAutosize` from `react-textarea-autosize`
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 24
- **Severity:** Low
- **Evidence:** `react-textarea-autosize` is a third-party dependency that has not been audited in this batch.
- **Fix:** Verify the package is up to date.

#### L-11 — `lesson-saq.tsx:25` `Rating` from `@mui/material`
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 25
- **Severity:** Low-Medium
- **Evidence:** Material UI is imported into a Tailwind project. Mixing two design systems causes CSS specificity collisions and bundle bloat. The project already has shadcn/ui components for similar purposes.
- **Fix:** Replace with shadcn rating or a custom component.

#### L-12 — `line-chart.tsx:218–220` `chartData` filters but doesn't preserve order
- **File:** `apps/reading-advantage/components/line-chart.tsx`
- **Lines:** 218–220
- **Severity:** Low
- **Evidence:** `formattedData.filter((item) => item.number !== null)` — this preserves the array order, so OK. But the filtered data is used at line 227 directly; if `formattedData` had any out-of-order months, the filter would maintain that order. Not a bug here, but worth a comment.

#### L-13 — `phase4-vocabulary-collection.tsx:22` `import { filter, includes } from "lodash"`
- **File:** `apps/reading-advantage/components/lesson/phases/phase4-vocabulary-collection.tsx`
- **Lines:** 22
- **Severity:** Low
- **Evidence:** `lodash` is a heavy dependency for two helpers that have native equivalents (`Array.prototype.filter`, `Array.prototype.includes`).
- **Fix:** Drop lodash and use the native methods.

#### L-14 — `phase5-deep-reading.tsx:48–52` props passed but `userId` is unused in the body
- **File:** `apps/reading-advantage/components/lesson/phases/phase5-deep-reading.tsx`
- **Lines:** 48–52
- **Severity:** Low
- **Evidence:** `Phase3FirstReading` accepts `userId` in props but never references it in the body of the function. The audio-related fetches don't include `userId` (no `/api/v1/users/${userId}/...` is called from this file).
- **Fix:** Remove unused prop.

#### L-15 — `phase2-vocabulary-preview.tsx:255–257` `onCompleteChange(true)` always fires
- **File:** `apps/reading-advantage/components/lesson/phases/phase2-vocabulary-preview.tsx`
- **Lines:** 255–257
- **Severity:** Low-Medium
- **Evidence:** `useEffect(() => { onCompleteChange(true); }, [onCompleteChange]);` — same anti-pattern as phase5. Phase 2 (vocabulary preview) is marked complete on mount.
- **Fix:** Wire to a real condition.

#### L-16 — `matching.tsx:121` `data.sentences.sort(...)` mutates API response
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 121–123
- **Severity:** Low
- **Evidence:** `const matching = data.sentences.sort(...)` — `Array.prototype.sort` sorts in place. If the caller relies on the original order (unlikely here, but still), this is a side effect.
- **Fix:** `[...data.sentences].sort(...)`.

#### L-17 — `manage-tab.tsx:289` `body: JSON.stringify({ id })` is unused
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 289–294
- **Severity:** Low
- **Evidence:** The DELETE body contains `{ id }` but the URL already has `id`. The server likely reads from the URL, so the body is dead data.

#### L-18 — `phase6-sentence-collection.tsx:393–399` `languageMapping` is hardcoded
- **File:** `apps/reading-advantage/components/lesson/phases/phase6-sentence-collection.tsx`
- **Lines:** 393–399
- **Severity:** Low
- **Evidence:** `"zh-CN": "cn"`, `"zh-TW": "tw"` — but the locale used in the app is `"cn"` and `"tw"` (per `Article` interface at `article-model.ts:91`). The mapping is from one set of keys (used by the translate API?) to another (used by the app). If the API emits `"zh-CN"`, the mapping converts to `"cn"`, which is fine. If it emits `"cn"`, the fallback `mappedLangCode = languageMapping[langCode] || langCode` passes through unchanged.
- **Impact:** Hardcoded coupling between two API key conventions.

#### L-19 — `level-test-chat.tsx:264–347` skip count is local state; not persisted
- **File:** `apps/reading-advantage/components/level-test-chat.tsx`
- **Lines:** 108, 264–347
- **Severity:** Low-Medium
- **Evidence:** `skipCount` is in component state. If the user navigates away and back, the count resets, so a user could skip indefinitely by leaving and returning.
- **Fix:** Persist to localStorage or sessionStorage.

#### L-20 — `matching.tsx:245` `new RegExp(/^[a-zA-Z\s,.']+$/)` reconstructs regex each render
- **File:** `apps/reading-advantage/components/matching.tsx`
- **Lines:** 245
- **Severity:** Low
- **Evidence:** The RegExp literal is inside `.test(...)`. JS treats this as a literal each time but the engine optimizes; minor perf nit.
- **Fix:** Move outside the component.

#### L-21 — `phase3-first-reading.tsx:69` `paragraphs` computed but never used in primary path
- **File:** `apps/reading-advantage/components/lesson/phases/phase3-first-reading.tsx`
- **Lines:** 70
- **Severity:** Low
- **Evidence:** `const paragraphs = article.passage.split("\n").filter((p) => p.trim());` — only used in the fallback render at lines 615–627. Dead in primary path.
- **Fix:** Memoize.

#### L-22 — `lesson-mcq.tsx:174–177` swallows session-storage errors
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-mcq.tsx`
- **Lines:** 169–177
- **Severity:** Low
- **Evidence:** `try { sessionStorage.setItem(...) } catch (e) { console.error(...) }` — silent on quota exceeded.
- **Fix:** Show a user-visible warning.

#### L-23 — `lesson-mcq.tsx:419–425` (already H-03)
- (Subsumed.)

#### L-24 — `lesson-saq.tsx:300–303` `watch` returned from `useForm` without subscribing
- **File:** `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx`
- **Lines:** 300–310
- **Severity:** Low
- **Evidence:** `const { register, handleSubmit, watch } = useForm<FormData>(...)`. `watch` is called every render and triggers a re-render on every keystroke. This is normal for react-hook-form but the `useEffect` on line 308 also re-runs on every change, which is fine.
- **Fix:** Use `useWatch` for the specific field to avoid form-wide re-renders.

#### L-25 — `manage-tab.tsx:154` `tUpdateScore` scope mismatch
- **File:** `apps/reading-advantage/components/manage-tab.tsx`
- **Lines:** 79–81, 154–157
- **Severity:** Low
- **Evidence:** `tUpdateScore = useScopedI18n("pages.student.practicePage.flashcardPractice")` — but the toast text uses `tUpdateScore("yourXp", { xp })`. If `yourXp` is in a deeper scope, this call resolves to the parent scope, which may render the wrong key.

#### L-26 — `phase14-lesson-summary.tsx:170–186` `Promise.all` swallows individual errors
- **File:** `apps/reading-advantage/components/lesson/phases/phase14-lesson-summary.tsx`
- **Lines:** 174–185
- **Severity:** Medium
- **Evidence:** `await Promise.all([fetchWordList(), fetchSentence(), fetchXp(), fetchQuizScores()]);` — each fetch has its own `try/catch` and shows a toast, but `Promise.all` rejects on the first rejection. Since each fetch internally catches, `Promise.all` should not reject. However, if any `fetch` throws synchronously (e.g., a bug in the URL builder), the rejection propagates and the outer `catch (err) { console.error(err); }` (line 181) only logs. The user sees the loading spinner disappear but no toast.
- **Fix:** Use `Promise.allSettled` and inspect individual results.

---

### Test gaps

This batch has **zero test coverage** for any of the 20 files:

| Concern | File(s) | Tests found | Required tests |
|---------|---------|-------------|----------------|
| Phase-12 activity orchestration | `phase12-sentence-activities.tsx` | 0 | Activity-type mapping, completion detection, translation retry |
| Phase-13 wrapper | `phase13-language-questions.tsx` | 0 | Trivial — passthrough only |
| Phase-14 summary | `phase14-lesson-summary.tsx` | 0 | XP math, score badge, word/sentence rendering |
| Phase-2 vocabulary preview | `phase2-vocabulary-preview.tsx` | 0 | Audio playback lifecycle, audio error handling |
| Phase-3 first reading | `phase3-first-reading.tsx` | 0 | Sentence tracking, completion detection, localStorage write/read |
| Phase-4 vocabulary collection | `phase4-vocabulary-collection.tsx` | 0 | Form validation, save flow, completion at 5 words |
| Phase-5 deep reading | `phase5-deep-reading.tsx` | 0 | Translation overlay, sentence tracking with refs |
| Phase-6 sentence collection | `phase6-sentence-collection.tsx` | 0 | Sentence selection, translation mapping, save flow |
| Phase-7/8/9 wrappers | `phase7/8/9-*.tsx` | 0 | Trivial |
| MCQ practice | `lesson-mcq.tsx` | 0 | Answer submit, retake, completion |
| SAQ practice | `lesson-saq.tsx` | 0 | Rating flow, retry logic |
| Level test chat | `level-test-chat.tsx` | 0 | Skip count, CEFR-to-XP mapping |
| License usage list | `license-usage-list.tsx` | 0 | Column sorting, pagination |
| Line chart | `line-chart.tsx` | 0 | CEFR mapping, monthly aggregation |
| Main / mobile navbars | `main-navbar.tsx`, `mobile-navbar.tsx` | 0 | Trivial |
| Manage tab | `manage-tab.tsx` | 0 | Sentence list, delete, XP backfill loop |
| Matching | `matching.tsx` | 0 | Card matching, win condition |

`glob 'apps/reading-advantage/components/lesson/**/*.test.*'` returns no files. `glob 'apps/reading-advantage/**/*.test.ts*'` returns mostly games, hooks, and stores — none of which cover the lesson UI.

`measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-27.md` correctly noted that "No tests were found for any of these 20 components, so the findings below are based entirely on static analysis." That observation applies to this batch as well.

---

### Incomplete disclosures / cross-batch dependencies

The following files import from outside the batch and were not re-audited here:

- `phase12-sentence-activities.tsx:6–9` → `../lesson-order-sentence`, `../lesson-cloze-test`, `../lesson-order-word`, `../lesson-matching-word` — covered in batch 27.
- `phase13-language-questions.tsx:4` → `../lesson-language-question` — covered in batch 27.
- `phase14-lesson-summary.tsx` (no direct sibling imports).
- `phase2-vocabulary-preview.tsx:9` → `@/server/constants` (AUDIO_WORDS_URL).
- `phase3-first-reading.tsx:22` → `@/server/constants` (AUDIO_URL).
- `phase4-vocabulary-collection.tsx:16` → `../../audio-img`.
- `phase5-deep-reading.tsx` — same as phase3 plus `lesson-language-question`.
- `phase6-sentence-collection.tsx` — no direct sibling imports.
- `phase7-multiple-choice.tsx:10` → `../practics/lesson-mcq` (reviewed in this batch).
- `phase8-short-answer.tsx:10` → `../practics/lesson-saq` (reviewed in this batch).
- `phase9-vocabulary-flashcards.tsx:4` → `../lesson-vocabulary-flashcard-game` — covered in batch 27.
- `lesson-mcq.tsx:18, 23–24` → `@/contexts/quiz-context`, `@/lib/utils`, `@/components/icons`, `@/components/ui/use-toast`, `@/store/question-store` — `quiz-context.tsx` reviewed briefly here (60 lines), the rest are shared.
- `lesson-saq.tsx:23–35` — same as above plus `@/components/models/questions-model`, `react-textarea-autosize`, `@mui/material`.
- `level-test-chat.tsx:17, 18` → `@/lib/utils`, `./models/user-activity-log-model` (reviewed here).
- `license-usage-list.tsx` — depends only on `@/components/ui/*`.
- `line-chart.tsx:29` → `./models/user-activity-log-model` (reviewed here).
- `main-navbar.tsx:7` → `./mobile-navbar` (reviewed in this batch).
- `manage-tab.tsx:36` → `@/components/header`.
- `matching.tsx:15–17` → `./practic/types`, `./audio-button` — `audio-button.tsx` not reviewed in this batch.
- `mobile-navbar.tsx:4` → `@/hooks/use-lock-body` — not reviewed in this batch.

---

## Summary

**Files changed:** 0 (review-only).
**Commands run:** `read` of all 20 files; `wc -l` for line counts; `glob` for tests; `grep` for cross-batch imports; `git log` / `git status` for repo context.
**Verification status:** All 20 files were read end-to-end (no skipping). No app code was edited. No build / typecheck / test was run, per the task scope ("Do not edit app code").

**Residual risk (highest priority items to address in a follow-up track):**

1. **H-01 / H-18** — `phase5-deep-reading.tsx` ships as `Phase3FirstReading` (component name, displayName, default export, interface name all mislabeled). Rename the file's identifiers to match the file path.
2. **H-02** — `phase6-sentence-collection.tsx:108` uses `"\\n"` instead of `"\n"`, breaking the paragraph-rendering fallback.
3. **H-03 / H-32 / L-23** — `lesson-mcq.tsx:419–425` calls `setState` and `onCompleteChange` during render.
4. **H-04** — Hardcoded GCS URLs across `phase2`, `phase3`, `phase4`, `phase5` violate provider-neutrality.
5. **H-05** — Missing `Content-Type: application/json` on POSTs in `lesson-saq`, `level-test-chat`, `manage-tab`, `matching`.
6. **H-06 / M-61** — Strict status checks (`=== 200` / `=== 201`) instead of `status >= 200 && status < 300`.
7. **H-08** — SAQ retry path can double-submit answers.
8. **H-11** — `lesson-saq.tsx:434–450` mixes `type="submit"` with `DialogTrigger asChild`.
9. **H-13** — `lesson-mcq.tsx` imports `useQuestionStore` but never reads/writes it.
10. **M-24** — `phase12-sentence-activities.tsx:117–121` compares against activity-type strings that no server emits (`SENTENCE_ORDERING` uppercase vs `SentenceOrdering` lowercase in the enum).
11. **M-28** — `phase14-lesson-summary.tsx:104` extracts `entry.word` (a string) into a `WordList[]` slot, then dereferences `.vocabulary` in the UI (which is undefined).
12. **M-58** — `manage-tab.tsx:201` reads `row.getValue("due")` under a column whose `accessorKey` is `"createdAt"`.

**Test gaps:** zero tests exist for any of the 20 files in this batch; every finding above is based on static analysis and would benefit from unit tests at minimum for: activity-type mapping (`phase12`), sentence-tracking completion (`phase3`, `phase5`), XP math (`phase14`), form submission (`phase4`, `phase6`), retry logic (`lesson-saq`), CEFR-to-XP lookup (`level-test-chat`), column key mismatch (`manage-tab`).

**Deferred:** A complete re-architecture of the lesson UI behind a domain/backend-as-code abstraction (per `AGENTS.md` §"Backend Module Pattern" and "tRPC Policy") is out of scope for this line-by-line review. All transport-coupled `fetch` calls would need to migrate to backend module functions, and all hardcoded URLs would need to route through the storage adapter.

MEASURE_AGENT_RESULT: REVIEW_ONLY_NO_EDITS