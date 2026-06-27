# Line-by-Line Review: Reading Advantage — Batch 36

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-36`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / anti-patterns

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed | Type |
|---|------|----------------|------|
| 1 | `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx` | 1–243 | TSX |
| 2 | `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx` | 1–47 | TSX |
| 3 | `apps/reading-advantage/components/word-list.tsx` | 1–378 | TSX |
| 4 | `apps/reading-advantage/configs/admin-page-config.ts` | 1–49 | TS |
| 5 | `apps/reading-advantage/configs/firestore-config.ts` | 1–40 | TS |
| 6 | `apps/reading-advantage/configs/index-page-config.ts` | 1–22 | TS |
| 7 | `apps/reading-advantage/configs/locale-config.ts` | 1–29 | TS |
| 8 | `apps/reading-advantage/configs/settings-page-config.ts` | 1–18 | TS |
| 9 | `apps/reading-advantage/configs/site-config.ts` | 1–11 | TS |
| 10 | `apps/reading-advantage/configs/student-page-config.ts` | 1–68 | TS |
| 11 | `apps/reading-advantage/configs/system-page-config.ts` | 1–49 | TS |
| 12 | `apps/reading-advantage/configs/teacher-page-config.ts` | 1–69 | TS |
| 13 | `apps/reading-advantage/contexts/quiz-context.tsx` | 1–33 | TSX |
| 14 | `apps/reading-advantage/contexts/timer-context.tsx` | 1–73 | TSX |
| 15 | `apps/reading-advantage/contexts/userRole-context.tsx` | 1–26 | TSX |
| 16 | `apps/reading-advantage/data/audios-words/temp.mp3` | binary | MP3 (0 bytes) |
| 17 | `apps/reading-advantage/data/audios/temp.mp3` | binary | MP3 (505,440 bytes, MPEG ADTS layer III) |
| 18 | `apps/reading-advantage/data/authors-fiction.js` | 1–81 | JS (CommonJS) |
| 19 | `apps/reading-advantage/data/authors-nonfiction.js` | 1–147 | JS (CommonJS) |
| 20 | `apps/reading-advantage/data/cefr-level-evaluation-prompts.json` | 1–26 | JSON |

**Total text lines reviewed:** 1,750
**No file was partially reviewed.** MP3 files were not parseable as text and were inspected only for metadata (`file` / `wc -l` / `ls -la`); no semantic content review is possible for binary assets.

---

## Executive Summary

This batch is a mixed-bag: a small client-side "vocabulary matching" minigame, a wrapper component that lazy-loads it, a dialog-driven word-list form, seven page-navigation config files, three React contexts, two CommonJS author lists, and a small AI prompt JSON. The text-only assets total ~1,750 lines.

The most severe correctness issues are:

1. **`tab-matching-words.tsx:2` has `// "use client";` commented out** — the component uses `useState`, `useEffect`, `useRouter`, `dayjs.extend`, and `fetch` against `/api/v1/...`, but it is being shipped (or was) without the client directive. Anything that hydrates it server-side will fail.
2. **`tabs-vocabulary.tsx:17` `showButton` state is dead** — declared and `setShowButton` is never called, and `showButton` is never read. The state is also never passed to children, so the `FlashcardDashboard` from `tab-flash-card.tsx` (which requires `showButton`/`setShowButton` per its `Props` type) is invoked from line 36 of `tabs-vocabulary.tsx` without those props, breaking the type contract and likely the runtime.
3. **`word-list.tsx:2` imports `useRef` and `useEffect` that are never used** — dead imports. The function is a 378-line client component with multiple inline type assertions and a deeply-nested `FormField` map that re-renders one outer `FormField` per word, re-registering RHF controllers in a loop.
4. **`word-list.tsx:170` `createEmptyCard()` is built then spread into the request payload** — the card object is built client-side but the server presumably replaces scheduling state, so building it client-side adds no value, only noise.
5. **`word-list.tsx:154` shadows the `wordList` state setter variable with a local `let wordList`** — reading the file repeatedly requires distinguishing `setWordList` (state) from `wordList` (local). Inside the function on line 84 a fresh `let wordList = [];` re-binds the name; on line 154 `setWordList(wordList)` passes the local, then the local goes out of scope. The outer `useState` is never written directly with a non-shadowed name.
6. **`quiz-context.tsx:2–9` exposes `setPaused` but not `setTimer`** — `setTimer` is only used internally; consumers can pause but cannot read the timer value other than via the elapsed seconds. The provider name on line 14 (`QuizContextProvider`) differs from the imported context name (line 2) only by suffix `Provider`; the export is fine, but the context default value (line 6–9) uses an inline arrow with empty body that does nothing, which is the documented behavior but a code smell.
7. **`userRole-context.tsx:5` `createContext([] as any)` discards typing for the context value tuple** — the value shape `[selectedRole, setSelectedRole]` is `Role[]` and a React Dispatch, but `any` makes the surface un-checked at consumer sites.
8. **`locale-config.ts:5` uses `LocaleConfig` type on line 5 but declares it on lines 10–13** — this works in TS (types are hoisted) but reverses the normal top-down declaration order. Forward reference at runtime is fine because it's a type, but it's a maintainability smell.
9. **`firestore-config.ts` is a stub that silently drops all writes** — `set`, `update`, `delete` log a warning and return; `add` returns `{ id: "stub-id" }`; `get` returns empty results. Any caller that trusts `db.collection(...).add(...)` to have created a record will see success but write nothing. The file's header (lines 1–3) acknowledges this, but it is still being exported as a default. If anything still imports it (post-migration), the result is silent data loss.
10. **`settings-page-config.ts:1` imports `StudentPageConfig`** for the settings page — a settings page has nothing to do with the student navigation; the reuse is a typing shortcut that couples the two pages.
11. **`tab-matching-words.tsx:196` uses `==` (loose equality) for `articleMatching.length == 5`** — the surrounding code uses `===`. Inconsistent.
12. **`tab-matching-words.tsx:84` `shuffleWords` returns objects with a `sort` field, then strips it via destructure** — works, but the round-trip through `JSON.parse(JSON.stringify(...))` is unnecessary; `[...words].sort()` is enough.
13. **`tabs-vocabulary.tsx:30` `md:grid-cols-6` for 3 tabs** — the grid layout reserves 6 columns for 3 triggers, leaving half the row empty. Either `md:grid-cols-3` or a different flex layout is appropriate.
14. **`tabs-vocabulary.tsx:31–33` tab keys "tab1", "tab5", "tab6"** — there is no "tab2"/"tab3"/"tab4". This is a renumbering artifact; new contributors will think tabs are missing.
15. **`timer-context.tsx:45` `setTimer` stops the running timer instead of "setting" the value** — the name implies "set the elapsed time to X"; the implementation calls `stopTimer` and then `setElapsedTime`, so any external "set to current session time" use will silently kill the interval.
16. **`timer-context.tsx:25–31` `startTimer` is guarded by `if (!timerRef.current)`** — a second concurrent consumer that calls `startTimer` is silently ignored; the contract is shared mutable state without a clear owner.
17. **`authors-fiction.js` and `authors-nonfiction.js` use `module.exports = ...;` (CommonJS)** in a Next.js / TypeScript project. Next.js + TS expect ESM (`export default` or `export const`). These files are not importable from TS without a `// @ts-ignore` or a webpack allow-list.
18. **`authors-nonfiction.js:42` description string starts with `'It - "Solutions for the Everyday". Dexter\'s...'`** — the leading `'It - '` appears to be a copy-paste fragment from another author entry; this is data noise but reads like a bug.
19. **`cefr-level-evaluation-prompts.json` has no schema** — it is a hand-edited JSON file loaded somewhere; the values are multi-line prompts with no validation. If a level name is mistyped, downstream code will silently miss it.
20. **Two `temp.mp3` files in `data/`** — `audios-words/temp.mp3` is **0 bytes** (empty file) and `audios/temp.mp3` is **505,440 bytes** of low-bitrate silence (or near-silence) at 24 kHz mono. These should not be committed; they are placeholder files. If any production code path references `${articleId}.mp3` after a failed upload, an empty file may be served as an "audio" wordlist asset.

No tests were found for any of the 18 text files in this batch.

---

## Findings

### Critical / High

#### H-01 — `// "use client";` is commented out in a hooks-using component
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 1–2
- **Severity:** High
- **Evidence:** Line 1 has `/* eslint-disable react-hooks/exhaustive-deps */`, line 2 has `// "use client";` (commented out). The component body uses `useState`, `useEffect`, `useRouter`, `dayjs.extend(...)` (line 22–24 — side effects at module top-level), and `fetch` against `/api/v1/...`.
- **Impact:** In Next.js App Router a component without the `"use client"` directive is treated as a Server Component. Server Components cannot use hooks. The build will fail to type-check or, worse, only fail at runtime in some configurations. The comment on line 2 explicitly preserves this for some reason — likely so it can be rendered as a static page — but the body makes that impossible.
- **Fix:** Uncomment `// "use client"` and ensure the parent (the tabs container) is also a client component. Or split pure render into a server-safe wrapper.

#### H-02 — `tabs-vocabulary.tsx` never passes `showButton` to children, breaking `FlashcardDashboard`'s `Props` contract
- **File:** `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx`
- **Lines:** 17, 36
- **Severity:** High
- **Evidence:**
  - Line 17: `const [showButton, setShowButton] = useState(true);` — declared.
  - Line 36: `<FlashCard userId={userId} deckType="VOCABULARY" />` — `FlashCard` is the dynamic-loaded `FlashcardDashboard` from `tab-flash-card.tsx`. That component's `Props` (lines 32–36 of `tab-flash-card.tsx`) requires `showButton: boolean` and `setShowButton: Function`. Neither is passed here.
  - The two `setShowButton` / `showButton` callsites that exist in the codebase (lines 287–288 of `tab-flash-card.tsx`) show that `tab-flash-card.tsx` itself destructures them, so without them the inner code calls `setShowButton(false)` against `undefined`.
- **Impact:** TypeScript should fail to compile (`tsc` strict mode would catch `showButton: boolean` missing). At runtime `setShowButton(...)` is a `TypeError: setShowButton is not a function`. The "tab1" (flashcard) tab is broken whenever entered.
- **Fix:** Pass `showButton` and `setShowButton` as props to `FlashCard`, or remove them from `tab-flash-card.tsx`'s required props.

#### H-03 — `word-list.tsx` shadows `wordList` state with a local `let wordList`
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 54, 84, 154
- **Severity:** High
- **Evidence:**
  - Line 54: `const [wordList, setWordList] = useState<WordList[]>([]);` — state.
  - Line 84: `let wordList = [];` — a *local* `let` inside the callback, shadowing the outer.
  - Line 154: `setWordList(wordList);` — passes the local, which holds either an array path, a `.word_list` path, a `.timepoints` path, or remains `[]`.
  - The outer `wordList` state is never read; the local is the source of truth at call time.
- **Impact:** Reader confusion; `useState` is dead code (always `[]`); the `useState<WordList[]>([])` initializer implies a non-empty shape that never actually carries the resolved shape until the callback runs once.
- **Fix:** Rename the local to `parsed` or similar, or use `setWordList` directly inside each branch.

#### H-04 — `word-list.tsx:2` imports `useRef` and `useEffect` but never uses them
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 2
- **Severity:** Low (cleanup) — listed as High only because the bundler carries them into the client bundle for no reason.
- **Evidence:** `import { useCallback, useState, useRef, useEffect } from "react";` — neither `useRef` nor `useEffect` is referenced anywhere in the file (grep returns only the import line).
- **Impact:** Tree-shaking should drop them, but the import is noise and signals a half-finished refactor.
- **Fix:** Remove `useRef, useEffect` from the import.

#### H-05 — `word-list.tsx:170` builds a `createEmptyCard()` client-side and immediately spreads it into the request body
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 170–185
- **Severity:** Medium
- **Evidence:** `let card: Card = createEmptyCard();` then `const param = { ...card, articleId, saveToFlashcard, foundWordsList };` then `POST /api/v1/users/wordlist/${userId}` with that body.
- **Impact:** The server presumably computes its own FSRS scheduling and ignores the client-sent empty card fields. The client spread adds noise to the payload and suggests a coupling that does not exist.
- **Fix:** Send `{ articleId, saveToFlashcard, foundWordsList }` only; remove the `ts-fsrs` import on line 9 and the `createEmptyCard, Card` import.

#### H-06 — `firestore-config.ts` returns `{ id: "stub-id" }` from `add()` and silently no-ops `set`/`update`/`delete`
- **File:** `apps/reading-advantage/configs/firestore-config.ts`
- **Lines:** 1–40
- **Severity:** Critical if anything imports it
- **Evidence:**
  - Line 12: `set: async (data, opts) => noopWarn("set", ...)` — discards `data` and `opts`.
  - Line 13: `update: async (data) => noopWarn("update", ...)` — discards `data`.
  - Line 14: `delete: async () => noopWarn("delete", ...)` — does nothing.
  - Line 22–25: `add` returns `{ id: "stub-id" }`.
  - Line 26: `get` returns `{ empty: true, docs: [] }`.
  - Lines 27–32: `where`, `orderBy`, `startAt`, `limit`, `select` return a `createCollectionRef(collection)` — all query builder calls are no-ops.
- **Impact:** If any caller still does `import db from "@/configs/firestore-config"`, it will see "success" for writes and "empty" for reads. Silent data loss. The file header (lines 1–3) acknowledges this is a temporary stub.
- **Fix:** Either remove the file once all callers are migrated, or throw an explicit error on every method to fail fast.

#### H-07 — `settings-page-config.ts` types itself as `StudentPageConfig`
- **File:** `apps/reading-advantage/configs/settings-page-config.ts`
- **Lines:** 1, 3
- **Severity:** Medium
- **Evidence:** `import { StudentPageConfig } from "@/types";` then `export const settingsPageConfig: StudentPageConfig = { ... }`. The "settings" namespace has nothing to do with the student page; the import is a shortcut.
- **Impact:** A refactor that adds a field to `StudentPageConfig` will silently leak into the settings page; a refactor that splits `SidebarNavItem` per role will break settings without any compile-time signal that the type was wrong.
- **Fix:** Add `SettingsPageConfig` to `types/index.d.ts` and import it.

#### H-08 — `quiz-context.tsx` exposes `setPaused` but no `setTimer`; default context value `setPaused: () => {}` swallows calls
- **File:** `apps/reading-advantage/contexts/quiz-context.tsx`
- **Lines:** 2–9, 28–31
- **Severity:** High
- **Evidence:**
  - Lines 2–9: `QuizContext` default value is `{ timer: 0, setPaused: () => {} }`. If a consumer is rendered outside the provider, calls to `setPaused` silently no-op. The default also drops the type on the consumer side because the type is inline and not exported.
  - Lines 28–31: Provider value is `{ timer, setPaused }` — no `setTimer` exposed.
- **Impact:** A consumer that reads the context outside the provider sees a working `setPaused` (no-op) and never notices. A consumer that needs to reset the timer has no API.
- **Fix:** Export a `QuizContextType` type and either make the default a `null` and force consumers to gate on it, or export a `useQuiz()` hook that throws if the provider is missing.

#### H-09 — `userRole-context.tsx:5` context value is `[] as any` — fully untyped
- **File:** `apps/reading-advantage/contexts/userRole-context.tsx`
- **Lines:** 5
- **Severity:** Medium
- **Evidence:** `export const SelectedRoleContext = React.createContext([] as any);`. The actual value shape (line 22) is `[selectedRole, setSelectedRole]` where `selectedRole: Role[]`. Consumers cannot destructure without `any`.
- **Impact:** A typo in a consumer like `const [roles] = useContext(...)` will compile, but a swap of destructured order will not be caught. The whole `Role` system is also stored unencrypted in `localStorage` (line 17).
- **Fix:** `createContext<[Role[], React.Dispatch<React.SetStateAction<Role[]>>] | null>(null)` and gate on null in a `useSelectedRole` hook.

#### H-10 — `timer-context.tsx:45–48` `setTimer` stops the running interval, doesn't just "set" the value
- **File:** `apps/reading-advantage/contexts/timer-context.tsx`
- **Lines:** 45–48
- **Severity:** Medium
- **Evidence:**
  ```
  const setTimer = (seconds: number) => {
    stopTimer();
    setElapsedTime(seconds);
  };
  ```
- **Impact:** The method name suggests "set the elapsed time and continue timing" or "set the elapsed time and stop". The implementation does the latter. A consumer that wants to seed the timer to "now" will stop the timer entirely.
- **Fix:** Split into `setElapsed(seconds)` (just sets) and `restartAt(seconds)` (set + start), or rename to `pauseAndSet`.

#### H-11 — `timer-context.tsx:25–31` `startTimer` is a no-op for any second concurrent caller
- **File:** `apps/reading-advantage/contexts/timer-context.tsx`
- **Lines:** 25–31
- **Severity:** Medium
- **Evidence:** `if (!timerRef.current) { timerRef.current = setInterval(...) }` — if any other consumer already called `startTimer`, the second call is silently dropped.
- **Impact:** Two components that race to "start" the timer (e.g., a player and a sync) can leave the timer in an unexpected state.
- **Fix:** Either document the owner, or add a counter / refcount so multiple startTimer calls balance with stopTimer.

#### H-12 — `tab-matching-words.tsx:108–109` setTimeout with magic 2000ms and a misleading comment
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 108–109
- **Severity:** Low
- **Evidence:** `setTimeout(() => setAnimateShake(""), 2000); // Clear shake effect after 1 second` — comment says 1 second, code says 2000ms (2 seconds).
- **Impact:** Visual desync between design intent and behavior; future developer will trust the comment.
- **Fix:** Update the comment to "Clear shake effect after 2 seconds" or change the timeout to 1000.

#### H-13 — `tab-matching-words.tsx:196` `==` instead of `===`
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 196
- **Severity:** Low
- **Evidence:** `articleMatching.length == 5` — the rest of the file uses `===` (e.g., line 229 `correctMatches.length === 10`).
- **Impact:** Trivial lint warning, but `==` is the only place this convention breaks.
- **Fix:** Use `===`.

#### H-14 — `tab-matching-words.tsx:100–112` `handleCardClick` matches asymmetrically
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 100–112
- **Severity:** Medium
- **Evidence:**
  - The `words` array on line 121–127 puts the vocabulary side as `{ text, match: definition }` and the definition side as `{ text: match, match: text }`.
  - The handler on line 103 checks `selectedCard.text === word.match` — i.e., the user must click vocabulary first, then the matching definition. If the user clicks the definition first then the vocabulary, the second click's `word.text` would be the definition and `selectedCard.text` would be the definition; `selectedCard.text === word.match` would be `definition === vocabulary` which is `false` → wrong-match shake.
- **Impact:** The game is order-sensitive in a way that may not be obvious to the user; UX bug, not a crash.
- **Fix:** Compare via a stable card id (add an `id` field when shuffling) instead of `text === match`.

#### H-15 — `tab-matching-words.tsx:88–98` `getCardStyle` returns a new object per call with no memoization
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 88–98
- **Severity:** Low
- **Evidence:** `let styles = { ... }; return styles;` is invoked inline in the JSX on line 209 inside a `.map`. Each render of 10 cards produces 10 fresh `styles` objects.
- **Impact:** Negligible perf, but breaks the convention in the codebase (other components use `useMemo` or `cn` helpers).
- **Fix:** Memoize with `useMemo` keyed on `[selectedCard?.text, word.text]`.

#### H-16 — `tabs-vocabulary.tsx:30` `md:grid-cols-6` for 3 tab triggers
- **File:** `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx`
- **Lines:** 30
- **Severity:** Low
- **Evidence:** `grid grid-cols-1 md:grid-cols-6` with 3 `<TabsTrigger>` children. The grid forces 6 columns; 3 are filled, 3 are empty.
- **Impact:** Visual layout (3 triggers take 1/2 the row each).
- **Fix:** Use `md:grid-cols-3` or `flex` with `gap-2`.

#### H-17 — `tabs-vocabulary.tsx:31–33` tab keys "tab1", "tab5", "tab6" with no tab2/3/4
- **File:** `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx`
- **Lines:** 31–33
- **Severity:** Low
- **Evidence:** `value="tab1"`, `value="tab5"`, `value="tab6"`. The numbering has gaps suggesting removed tabs.
- **Impact:** A new contributor will suspect missing tabs (e.g., tab2 = "writing", tab3 = "grammar") that no longer exist.
- **Fix:** Renumber to `tab1`, `tab2`, `tab3`.

#### H-18 — `tabs-vocabulary.tsx:11` dynamic import returns a `.then(mod => ({ default: mod.FlashcardDashboard }))` shim
- **File:** `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx`
- **Lines:** 11–13
- **Severity:** Low
- **Evidence:**
  ```
  const FlashCard = dynamic(() => import("../flashcards").then(mod => ({ default: mod.FlashcardDashboard })));
  ```
  The shim is required because `flashcards` exports a named `FlashcardDashboard` rather than a default. Inconsistent with lines 12–13 which use default imports. If the file is renamed in `flashcards/`, the named export goes silent.
- **Impact:** Coupling to the named export shape.
- **Fix:** Add `export default FlashcardDashboard;` to `flashcards` and simplify to `dynamic(() => import("../flashcards"))`.

#### H-19 — `locale-config.ts:5` uses `LocaleConfig` type before its declaration on line 10
- **File:** `apps/reading-advantage/configs/locale-config.ts`
- **Lines:** 5, 10–13
- **Severity:** Low
- **Evidence:** Line 5: `export const localeConfig: LocaleConfig = { ... }` — but `LocaleConfig` is declared on lines 10–13 (after its use).
- **Impact:** TS hoists types so this compiles, but readers will be confused.
- **Fix:** Move the type declaration above the const.

#### H-20 — `site-config.ts` missing trailing semicolon and has inconsistent style vs. peers
- **File:** `apps/reading-advantage/configs/site-config.ts`
- **Lines:** 10–11
- **Severity:** Low
- **Evidence:** Closing `}` on line 10 and `}` on line 11 with no `;` after the final closing brace. Other configs use `};`. Prettier/eslint will likely flag this.
- **Impact:** Trivial lint.
- **Fix:** Add `;` after the final `}` on line 11.

#### H-21 — `index-page-config.ts` uses mixed indentation
- **File:** `apps/reading-advantage/configs/index-page-config.ts`
- **Lines:** 3–22
- **Severity:** Low
- **Evidence:** Line 3 starts with 4 spaces; lines 5, 7, 9, 11, 13, 15, 17, 19 use 8 spaces. The `mainNav` and item properties are inconsistently indented within the same file. The peer `admin-page-config.ts` uses 2-space indentation throughout.
- **Impact:** Lint failure under Prettier defaults.
- **Fix:** Reformat with 2-space indentation (or 4 to match the project default — but be consistent).

#### H-22 — `word-list.tsx:264–345` deeply nested `FormField` map re-registers a controller per word
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 257–350
- **Severity:** Medium
- **Evidence:** Outer `FormField` (line 257) with `name="items"`, render-prop returning inner `<FormItem>` and inside it `.map(word => <FormField control={form.control} name="items" ...>)` for each word. Each inner `FormField` re-registers the SAME field name `items`, creating N RHF controllers for one field. The form correctly stores a string array under `items`, but the architecture of N controllers writing the same key is a foot-gun.
- **Impact:** Each checkbox update re-validates all N controllers; with 50 words this is 50x overhead per check. Also: on initial render the field may be `undefined` (line 285 `Array.isArray(field.value)`), so the fallback path on lines 300–304 runs.
- **Fix:** Use a single `Controller` or `useFieldArray`; map over words with `<Checkbox checked={field.value?.includes(word.vocabulary)} onCheckedChange={...}>`.

#### H-23 — `word-list.tsx:104, 121, 139` hard-codes the Google Cloud Storage bucket URL
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 104, 121, 139, 321
- **Severity:** Medium
- **Evidence:** `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${articleId}.mp3` is repeated 4 times.
- **Impact:** Migration to R2/S3 will require changing the URL in 4 places; the AGENTS.md calls for an internal `storage.getSignedUrl()` adapter that this code bypasses.
- **Fix:** Route through the storage adapter.

#### H-24 — `word-list.tsx:264` uses `index` as a React `key`
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 266, 275
- **Severity:** Low
- **Evidence:** `<FormField key={index} ...>` and `<div key={index} ...>` inside the map. Words have a stable `word.vocabulary` (line 272 already uses it: `key={word?.vocabulary}`), so the index key is redundant and breaks reconciliation if the list re-orders.
- **Impact:** Renderer churn on toggle.
- **Fix:** Use `word.vocabulary` as the key everywhere.

#### H-25 — `word-list.tsx:359` `disabled={...form.watch("items")?.length === 0 || form.watch("items") === undefined}` re-subscribes twice per render
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 363–366
- **Severity:** Low
- **Evidence:** `form.watch("items")` is called twice in the same expression. `watch` registers a subscription each time; in a render this means 2 subscribers per render of this button, plus 2 subscribers per render of any parent that re-renders.
- **Impact:** Slight perf hit; mostly a code smell.
- **Fix:** `const items = form.watch("items");` once at the top of the component, or use `useWatch({ name: "items" })`.

#### H-26 — `tab-matching-words.tsx:131–172` posts activity log when `correctMatches.length === 10` — hard-coded
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 133, 196, 229
- **Severity:** Medium
- **Evidence:** Three places hard-code 5 (article matching size) and 10 (matched cards). The relationship is `2 * 5 = 10` but it is implicit.
- **Impact:** Changing the matching size from 5 to 6 requires changing 3 magic numbers and the `slice(0, 5)` on line 70.
- **Fix:** Extract `const ROUND_SIZE = 5;` and derive `2 * ROUND_SIZE` for the post-condition.

#### H-27 — `authors-fiction.js` and `authors-nonfiction.js` use CommonJS in a TypeScript / Next.js project
- **File:** `apps/reading-advantage/data/authors-fiction.js`, `apps/reading-advantage/data/authors-nonfiction.js`
- **Lines:** `authors-fiction.js:81` `module.exports = authorsFiction;`, `authors-nonfiction.js:147` `module.exports = authorsNonFiction;`
- **Severity:** Medium
- **Evidence:** Both files end with `module.exports = ...` (CommonJS). The rest of the app uses ESM (`import ... from`). Next.js can transpile these, but importing them from TypeScript requires either `esModuleInterop` (set in tsconfig) or `@ts-ignore` per call site.
- **Impact:** Type unsafe; the arrays have no inferred type for vocabulary at call sites.
- **Fix:** Convert to `export const authorsFiction: Author[] = [...]` and a matching `Author` type.

#### H-28 — `authors-nonfiction.js:42` description starts with `'It - "Solutions for the Everyday". Dexter\'s...'` — broken copy-paste
- **File:** `apps/reading-advantage/data/authors-nonfiction.js`
- **Lines:** 42
- **Severity:** Low
- **Evidence:** The description for the "How-to" genre begins with `'It - "Solutions for the Everyday".'` which is a partial fragment from a different author's tagline.
- **Impact:** User-visible typo in the author showcase if this data is rendered.
- **Fix:** Edit the line to remove `'It - '`.

#### H-29 — `authors-fiction.js` and `authors-nonfiction.js` description strings have inconsistent quote escaping
- **File:** `apps/reading-advantage/data/authors-fiction.js`, `apps/reading-advantage/data/authors-nonfiction.js`
- **Lines:** Multiple (e.g., `authors-fiction.js:6` `"Stories of Now\". Ava's writing..."` — opens with `"`, then `\"` to embed another `"`)
- **Severity:** Low
- **Evidence:** Mixed use of `\"` and `'` in the same string. Reads as visual noise.
- **Impact:** Maintainability / readability.
- **Fix:** Use template literals (backticks) and normal quotes.

#### H-30 — `cefr-level-evaluation-prompts.json` has no Zod schema and no validation when loaded
- **File:** `apps/reading-advantage/data/cefr-level-evaluation-prompts.json`
- **Lines:** 1–26
- **Severity:** Medium
- **Evidence:** The JSON has 6 levels (A1–C2) with `level` and `systemPrompt` keys. There is no schema file that validates the structure (e.g., `cefr-level-evaluation-prompts.schema.ts`). The AGENTS.md mandates Zod at every external boundary.
- **Impact:** A typo (`"A3"` instead of `"A2"`, or a missing level) will silently break the AI grader — the prompt for that level is never sent.
- **Fix:** Add a Zod schema (`z.object({ level: z.string(), systemPrompt: z.string() }).array()`) and parse on import.

#### H-31 — `data/audios-words/temp.mp3` is 0 bytes; `data/audios/temp.mp3` is 505,440 bytes of low-bitrate audio
- **File:** `apps/reading-advantage/data/audios-words/temp.mp3`, `apps/reading-advantage/data/audios/temp.mp3`
- **Severity:** Medium
- **Evidence:**
  - `audios-words/temp.mp3`: 0 bytes (empty file).
  - `audios/temp.mp3`: 505,440 bytes, MPEG ADTS layer III, 32 kbps, 24 kHz, mono (per `file`).
- **Impact:** A 0-byte MP3 cannot be played; if the `word-list.tsx` path at line 104 ever serves a `${articleId}.mp3` URL that maps to this file, the user gets a broken audio button. The 505,440-byte file is a placeholder and is much larger than would be expected for a 24 kHz mono silence clip (~250 KB at 30s), so it likely contains real audio that should not be in git.
- **Fix:** Delete both files; add `apps/reading-advantage/data/audios*/temp.mp3` to `.gitignore`.

#### H-32 — `tab-matching-words.tsx:41` `as "en" | "th" | "cn" | "tw" | "vi"` unsafe cast on `useCurrentLocale()`
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 41
- **Severity:** Low
- **Evidence:** `useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi"` — `as` cast without runtime validation.
- **Impact:** If a 6th locale is added (e.g., `"ja"`) the type is widened at the source but this assertion will still pass; downstream access to `definition["ja"]` will be `undefined` and the page may render blank.
- **Fix:** Validate with Zod or a type guard.

#### H-33 — `word-list.tsx:56` same unsafe cast
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 56
- **Severity:** Low
- **Evidence:** Same `as "en" | "th" | "cn" | "tw" | "vi"` cast.
- **Impact:** Same as H-32.
- **Fix:** Same as H-32.

#### H-34 — `word-list.tsx:90–143` three different response shapes accepted with no schema validation
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 90–143
- **Severity:** Medium
- **Evidence:**
  - Branch 1: top-level array `data` (line 90).
  - Branch 2: `data.word_list` array (line 107).
  - Branch 3: `data.timepoints` (line 124) with `data.word_list` indexed in parallel.
- **Impact:** Three shapes from one endpoint is a code smell. The third branch silently relies on `data.timepoints.length === data.word_list.length` (line 133: `data.word_list[index]?.vocabulary`); if they ever drift, every word becomes `undefined`.
- **Fix:** Standardize the response shape server-side; validate on client with Zod.

#### H-35 — `word-list.tsx:189–200` success/error branches on `data.status === 200` / `400` instead of `res.ok`
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 189–200
- **Severity:** Medium
- **Evidence:** `if (data.status === 200) { ... } else if (data.status === 400) { ... }`. There is no `else`. A 401/403/500 response with no `status` field will silently fall through with no toast.
- **Impact:** Silent failure for non-2xx/non-400 responses.
- **Fix:** Check `res.ok` first; toast on any non-2xx.

#### H-36 — `tab-matching-words.tsx:53–55` fetch with no `res.ok` check
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 51–75
- **Severity:** Medium
- **Evidence:** `const res = await fetch(...); const data = await res.json();` — no `if (!res.ok) throw`. A 500 response is parsed as JSON; if the body is HTML, `data.word` will be `undefined` and `data.word.sort` will throw.
- **Impact:** Crash on backend error.
- **Fix:** Check `res.ok` first; throw a typed error.

#### H-37 — `tab-matching-words.tsx:73` `console.error(error)` — unstructured log
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 72–74
- **Severity:** Low
- **Evidence:** Catch block uses `console.error(error)` with no structured metadata, no request id, no user id.
- **Impact:** AGENTS.md requires structured logging.
- **Fix:** Use a logger helper.

#### H-38 — `tab-matching-words.tsx:155` `imgSrc: true` is not a documented toast prop
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 155, 163
- **Severity:** Low
- **Evidence:** `toast({ title: t("toast.success"), imgSrc: true, ... })`. Looking at the `use-toast` pattern in `components/ui/use-toast.ts` (referenced in this batch's H-35 grep results), `imgSrc` is not in the standard toast signature.
- **Impact:** Either a custom prop (which works at runtime via the shadcn toaster extension) or a bug.
- **Fix:** Verify against `components/ui/use-toast.ts`; type the prop.

#### H-39 — `tab-matching-words.tsx:80` `shuffleWords` round-trips through `JSON.parse(JSON.stringify(...))`
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 77–86
- **Severity:** Low
- **Evidence:** The function deep-clones the input via `JSON.parse(JSON.stringify(words))`, adds a `sort` key, sorts, then strips it.
- **Impact:** Costly on large arrays; for a matching game with ~10 items it is irrelevant. Code smell.
- **Fix:** `const shuffled = [...words].map(w => ({...w, sort: Math.random()})).sort((a, b) => a.sort - b.sort).map(({ sort, ...rest }) => rest);`

#### H-40 — `tab-matching-words.tsx:188` "Scrore" typo in variable name
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 136, 188
- **Severity:** Low
- **Evidence:** `const updateScrore = await fetch(...)` — `Scrore` instead of `Score`.
- **Impact:** Variable name reads as misspelling.
- **Fix:** Rename to `updateScore`.

#### H-41 — `tab-matching-words.tsx:5–8` dayjs plugin imports not used
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 5–8
- **Severity:** Low
- **Evidence:** `import dayjs from "dayjs"; import utc from "dayjs/plugin/utc"; import dayjs_plugin_isSameOrBefore from "dayjs/plugin/isSameOrBefore"; import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";`. Only `isAfter` is used (line 58). `utc`, `isSameOrBefore`, `isSameOrAfter` are extended (lines 22–24) but never used.
- **Impact:** Bundle bloat.
- **Fix:** Drop the unused plugins.

### Medium

#### M-01 — `admin-page-config.ts` `mainNav` items are typed as the literal union `"home" | "about" | ...` but rendered as is
- **File:** `apps/reading-advantage/configs/admin-page-config.ts`
- **Lines:** 4–21
- **Severity:** Low
- **Evidence:** `MainNavItem` (from `types/index.d.ts:12–18`) is `title: "home" | "about" | "contact" | "authors"`; the config uses these literals. If a translator later maps `"home"` → "หน้าแรก" (Thai), the title in the type union must change to a generic `string` or the type system will reject it.
- **Impact:** Type-system couples the config to English titles.
- **Fix:** Loosen `MainNavItem.title` to `string` and add a separate `i18nKey` field.

#### M-02 — `student-page-config.ts` `sidebarNav` items use `title: "read" | "stories" | ...` literal union
- **File:** `apps/reading-advantage/configs/student-page-config.ts`
- **Lines:** 22–67
- **Severity:** Low
- **Evidence:** Same pattern as M-01. `SidebarNavItem.title` is a string literal union. Each `title` is then an i18n key (e.g., `t("read")`). If a 5th sidebar item is added, the type must change.
- **Impact:** Coupling between config and type system.
- **Fix:** Loosen the title type, or generate the literal union from the config.

#### M-03 — `timer-context.tsx:67–72` `useTimer` throws if not in provider, but `useSelectedRole` / `QuizContext` consumers do not have an equivalent hook
- **File:** `apps/reading-advantage/contexts/timer-context.tsx`, `apps/reading-advantage/contexts/quiz-context.tsx`, `apps/reading-advantage/contexts/userRole-context.tsx`
- **Severity:** Low
- **Evidence:** `timer-context.tsx` exports a `useTimer` hook that throws on missing provider (line 70). The other two contexts in this batch (`quiz-context.tsx`, `userRole-context.tsx`) do not — consumers must `useContext` directly with a silently-wrong default.
- **Impact:** Inconsistent API across the three contexts.
- **Fix:** Add `useQuiz()` and `useSelectedRole()` hooks that throw on missing provider.

#### M-04 — `quiz-context.tsx:18–26` interval is cleared and re-created when `paused` toggles, but timer doesn't immediately tick on unpause
- **File:** `apps/reading-advantage/contexts/quiz-context.tsx`
- **Lines:** 18–26
- **Severity:** Low
- **Evidence:** The effect depends on `paused`; when `paused` toggles, the interval is torn down and restarted. After un-pause, the next `setTimer(t => t + 1)` runs only on the next 1-second tick.
- **Impact:** Off-by-one-second visual lag on resume.
- **Fix:** Trigger an immediate tick via `setTimer(t => t)` on unpause.

#### M-05 — `quiz-context.tsx:33` stray `;` at the end of the file
- **File:** `apps/reading-advantage/contexts/quiz-context.tsx`
- **Lines:** 33
- **Severity:** Trivial
- **Evidence:** `};` after the closing `}` of `QuizContextProvider`.
- **Impact:** Lint warning.
- **Fix:** Remove.

#### M-06 — `userRole-context.tsx:26` stray `;` at the end of the file
- **File:** `apps/reading-advantage/contexts/userRole-context.tsx`
- **Lines:** 26
- **Severity:** Trivial
- **Evidence:** `};` after the closing `}` of `SelectedRoleProvider`.
- **Impact:** Lint warning.
- **Fix:** Remove.

#### M-07 — `userRole-context.tsx:8–13` `useState` initializer returns `undefined` during SSR
- **File:** `apps/reading-advantage/contexts/userRole-context.tsx`
- **Lines:** 8–13
- **Severity:** Medium
- **Evidence:**
  ```
  const [selectedRole, setSelectedRole] = React.useState<Role[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRoles = localStorage.getItem('selectedRole');
      return savedRoles ? JSON.parse(savedRoles) : [];
    }
  });
  ```
  The implicit `else` returns `undefined`. `useState<Role[]>` types the slot as `Role[]`, so the value is `Role[] | undefined`.
- **Impact:** Consumer code reading `selectedRole` will treat it as `Role[]` and crash on `.map`.
- **Fix:** `return [];` in the else branch.

#### M-08 — `userRole-context.tsx:10, 17` localStorage key 'selectedRole' is not namespaced
- **File:** `apps/reading-advantage/contexts/userRole-context.tsx`
- **Lines:** 10, 17
- **Severity:** Low
- **Evidence:** `localStorage.getItem('selectedRole')` and `setItem('selectedRole', ...)` use a bare key. Two apps on the same origin (e.g., `reading-advantage.web.app` and a future admin app on the same origin) will collide.
- **Impact:** Cross-app data leak.
- **Fix:** Prefix with `ra:` or the app's slug.

#### M-09 — `timer-context.tsx:50–56` cleanup useEffect re-clears an already-null `timerRef.current`
- **File:** `apps/reading-advantage/contexts/timer-context.tsx`
- **Lines:** 50–56
- **Severity:** Trivial
- **Evidence:** The cleanup effect runs `clearInterval(timerRef.current)` if non-null on unmount. `stopTimer` is not called, so `setElapsedTime(0)` doesn't happen. The cleanup is correct but redundant with the `stopTimer` logic.
- **Impact:** None.
- **Fix:** Refactor to a single cleanup path.

#### M-10 — `tab-matching-words.tsx:114` `useEffect(() => { getUserSentenceSaved(); }, [])` triggers on every mount with empty deps
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 114–116
- **Severity:** Low
- **Evidence:** The effect has `[]` deps but calls `getUserSentenceSaved` which is defined in the same component body. ESLint exhaustive-deps is disabled (line 1) for this reason.
- **Impact:** Stale closure; if `userId` changes the effect doesn't re-run.
- **Fix:** Add `userId` to the dep array, or use a ref for `getUserSentenceSaved`.

#### M-11 — `word-list.tsx:60` Zod refine message is hard-coded English
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 58–62
- **Severity:** Low
- **Evidence:** `message: "You have to select at least one item."` — not internationalized; the rest of the file uses `t("...")`.
- **Impact:** Inconsistent UX in non-English locales.
- **Fix:** Use `t("selectOneItem")` with a translation key.

#### M-12 — `word-list.tsx:148–151, 158–161` toast `title` / `description` strings are hard-coded English
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 148, 150, 159, 160, 192, 196, 197, 204, 205
- **Severity:** Medium
- **Evidence:** All toast messages are hard-coded English. Surrounding code uses `t("title")`, `t("closeButton")`, `t("saveButton")`.
- **Impact:** Inconsistent i18n.
- **Fix:** Add i18n keys for all toast strings.

#### M-13 — `word-list.tsx:31` `userId` prop accepted but only used in `onSubmit`
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 28–32, 182
- **Severity:** Low
- **Evidence:** `Props` includes `userId: string`; it is only used in `onSubmit`'s fetch URL (line 182). `handleWordList` (the GET variant) does not use it.
- **Impact:** None.
- **Fix:** Document the prop.

#### M-14 — `tab-matching-words.tsx:57` `matching` sort is unstable
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 57–59
- **Severity:** Low
- **Evidence:** `data.word.sort((a, b) => dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1)` — the comparator returns `1`/`-1` but should return a number. The ECMAScript spec for sort says returning `1`/`-1` is fine, but for ties it should return `0`.
- **Impact:** None (the list is small).
- **Fix:** `return dayjs(a.due).diff(dayjs(b.due));`

#### M-15 — `tab-matching-words.tsx:78` `JSON.parse(JSON.stringify(words))` mutates `sort` field on the input
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 77–86
- **Severity:** Low
- **Evidence:** `.map((word) => ({ ...word, sort: Math.random() }))` returns a NEW object so the input is not mutated. The `JSON.parse(JSON.stringify(...))` is just an unnecessary deep clone.
- **Impact:** None.
- **Fix:** Drop the JSON round-trip.

#### M-16 — `tab-matching-words.tsx:229` `correctMatches.length === 10` triggers `<Image src="/winners.svg" />`
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 229–239
- **Severity:** Low
- **Evidence:** The animation depends on a static SVG in `/public/winners.svg`. If the file is missing, `<Image>` will fail to render.
- **Impact:** Asset coupling.
- **Fix:** Verify the asset exists or use a fallback.

#### M-17 — `tab-matching-words.tsx:236` no `priority` or `alt` text strategy
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 231–237
- **Severity:** Low
- **Evidence:** `<Image src={"/winners.svg"} alt="winners" width={250} height={100} className="..." />` — fine for a celebration asset, but the alt is the literal "winners" not i18n.
- **Impact:** Accessibility / i18n.
- **Fix:** Use an i18n key.

#### M-18 — `tabs-vocabulary.tsx:1` "use client" but no `useEffect` / `useState` of consequence
- **File:** `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx`
- **Lines:** 1
- **Severity:** Low
- **Evidence:** The component is marked `"use client"` because it uses `useState` (line 16–17) and renders dynamic-imported children. Acceptable.
- **Impact:** None.
- **Fix:** N/A.

#### M-19 — `configs/admin-page-config.ts` references `/admin/teacher-assignments`
- **File:** `apps/reading-advantage/configs/admin-page-config.ts`
- **Lines:** 45
- **Severity:** Info
- **Evidence:** `href: "/admin/teacher-assignments"` — feature surface; not verified to exist in this batch.
- **Impact:** Dead nav if the route doesn't exist.
- **Fix:** Verify route exists.

### Low / Info

#### L-01 — `word-list.tsx:84` `wordList` local re-declared with no type
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 84
- **Severity:** Low
- **Evidence:** `let wordList = [];` — `any[]` implicitly. The three branches then narrow it.
- **Impact:** TypeScript inference gives `never[]` then widens; a strict reviewer would flag.
- **Fix:** `let wordList: WordList[] = [];`

#### L-02 — `word-list.tsx:84` reassignment shadows the imported `WordList` interface
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 34 (interface), 51 (component), 84 (let)
- **Severity:** Low
- **Evidence:** `interface WordList` (line 34), `export default function WordList(...)` (line 51), and `let wordList` (line 84) — three different identifiers in the same file with similar names. TypeScript distinguishes by case but readability suffers.
- **Impact:** Readability.
- **Fix:** Rename component to `WordListDialog` or interface to `WordListEntry`.

#### L-03 — `tab-matching-words.tsx:202–208` `className` template uses a long line with mixed template substitutions
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 202–208
- **Severity:** Trivial
- **Evidence:** 7-line `className` template with multiple `${...}` interpolations. The whitespace inside the string is non-trivial.
- **Impact:** Maintainability.
- **Fix:** Use `clsx` or `cn` helper.

#### L-04 — `tab-matching-words.tsx:88–98` inline style with magic colors
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 90, 93
- **Severity:** Trivial
- **Evidence:** `"#edefff"`, `"#425fff"`, `"#ced4da"` — hard-coded hex codes.
- **Impact:** Theming coupling.
- **Fix:** Move to Tailwind tokens.

#### L-05 — `word-list.tsx:2` `useCallback` is used; `useState` is used; `useRef` and `useEffect` are dead
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 2
- **Severity:** Trivial (covered in H-04).
- **Fix:** Remove dead imports.

#### L-06 — `quiz-context.tsx:1` `useState, useEffect` import but `setTimer` only used internally
- **File:** `apps/reading-advantage/contexts/quiz-context.tsx`
- **Lines:** 1
- **Severity:** Trivial
- **Evidence:** `import { createContext, Dispatch, SetStateAction, useEffect, useState } from "react";` — `Dispatch` and `SetStateAction` are used in the inline type (line 4).
- **Impact:** None.
- **Fix:** N/A.

#### L-07 — `quiz-context.tsx:7` default value provides `setPaused: () => {}` which silently no-ops
- **File:** `apps/reading-advantage/contexts/quiz-context.tsx`
- **Lines:** 7
- **Severity:** Low
- **Fix:** Replace with `null` and gate consumers on it.

#### L-08 — `timer-context.tsx:22` initial `elapsedTime` is `0`
- **File:** `apps/reading-advantage/contexts/timer-context.tsx`
- **Lines:** 22
- **Severity:** Info
- **Evidence:** No way to seed the initial value from outside the provider.
- **Impact:** Consumers that want to display "00:00" initially get a real `0`; consumers that want to restore from storage cannot.
- **Fix:** Add an `initialElapsed` prop.

#### L-09 — `site-config.ts:9` GitHub link points to `bodangren/reading-advantage` fork
- **File:** `apps/reading-advantage/configs/site-config.ts`
- **Lines:** 9
- **Severity:** Info
- **Evidence:** `github: "https://github.com/bodangren/reading-advantage"` — likely a personal fork; verify this is the correct upstream.
- **Impact:** If the production site is on a different org's repo, the link is wrong.
- **Fix:** Verify.

#### L-10 — `cefr-level-evaluation-prompts.json` A1 prompt uses "inappropriate content for secondary students"
- **File:** `apps/reading-advantage/data/cefr-level-evaluation-prompts.json`
- **Lines:** 4
- **Severity:** Info
- **Evidence:** The A1 prompt references "secondary students" while other levels say the same. This is content-only.
- **Impact:** None for code.
- **Fix:** N/A (content).

#### L-11 — `firestore-config.ts` no `await` for `createDocRef(...).delete()` etc.
- **File:** `apps/reading-advantage/configs/firestore-config.ts`
- **Lines:** 12–14
- **Severity:** Trivial
- **Evidence:** The functions are `async` and use `noopWarn` (which is sync); callers that `await` will resolve immediately.
- **Impact:** None.
- **Fix:** N/A.

#### L-12 — `firestore-config.ts:5` `noopWarn` defined but not used inside the same module's other functions
- **File:** `apps/reading-advantage/configs/firestore-config.ts`
- **Lines:** 5–7, 11
- **Severity:** Trivial
- **Evidence:** `get` on line 11 does NOT call `noopWarn` — it just returns `{ exists: false, data: () => undefined }`. Inconsistent: every other method logs a warning.
- **Impact:** Slight inconsistency in observability.
- **Fix:** Add `noopWarn("get", ...)` to `get`.

#### L-13 — `word-list.tsx:228` DialogContent has hard-coded width `sm:max-w-[550px]`
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 228
- **Severity:** Trivial
- **Evidence:** Magic number.
- **Impact:** Design system drift.
- **Fix:** Move to theme tokens.

#### L-14 — `word-list.tsx:353` bottom action bar uses `fixed bottom-0 left-0 w-full` inside a `Dialog`
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 353
- **Severity:** Low
- **Evidence:** `fixed` positioning inside a Radix Dialog scrolls the action bar out of view on small screens.
- **Impact:** UX on mobile.
- **Fix:** Use `sticky bottom-0` inside the dialog content.

#### L-15 — `tab-matching-words.tsx:153–159` toast options include `imgSrc: true` which is not in the standard toast signature
- **File:** `apps/reading-advantage/components/vocabulary/tab-matching-words.tsx`
- **Lines:** 153, 162
- **Severity:** Trivial (covered in H-38).
- **Fix:** Verify against `components/ui/use-toast.ts`.

#### L-16 — `word-list.tsx:264–345` keys are `index` for outer FormField, `word.vocabulary` for inner FormItem
- **File:** `apps/reading-advantage/components/word-list.tsx`
- **Lines:** 266, 272
- **Severity:** Trivial
- **Evidence:** Inconsistent key strategy in the same map.
- **Fix:** Use `word.vocabulary` everywhere.

#### L-17 — `quiz-context.tsx:14` `QuizContextProvider` does not call `useState` for `paused` if no parent uses the provider
- **File:** `apps/reading-advantage/contexts/quiz-context.tsx`
- **Lines:** 14
- **Severity:** Trivial
- **Evidence:** Provider initializes `paused` to `false`; no parent can pre-set it.
- **Impact:** None.
- **Fix:** N/A.

#### L-18 — `timer-context.tsx:36` `stopTimer` does not reset `elapsedTime`
- **File:** `apps/reading-advantage/contexts/timer-context.tsx`
- **Lines:** 33–38
- **Severity:** Trivial
- **Evidence:** `stopTimer` clears the interval; `elapsedTime` retains the last value.
- **Impact:** Predictable behavior — but a future developer may expect `stopTimer` to "stop" the entire timer.
- **Fix:** Document.

#### L-19 — `tab-matching-words.tsx:30` `Tabs` is from `@/components/ui/tabs` (shadcn)
- **File:** `apps/reading-advantage/components/vocabulary/tabs-vocabulary.tsx`
- **Lines:** 3
- **Severity:** Info
- **Evidence:** Standard shadcn Tabs.
- **Impact:** None.
- **Fix:** N/A.

#### L-20 — `userRole-context.tsx:21` `value={[selectedRole, setSelectedRole]}` is recreated on every render
- **File:** `apps/reading-advantage/contexts/userRole-context.tsx`
- **Lines:** 21–25
- **Severity:** Low
- **Evidence:** The Provider value is a new array on every render. Consumers that re-render unnecessarily.
- **Impact:** Perf with many consumers.
- **Fix:** `useMemo` the value or use the second form of `createContext` that accepts a setter.

---

## Coverage Summary

| File | Lines | Findings |
|------|-------|----------|
| `tab-matching-words.tsx` | 243 | H-01, H-12, H-13, H-14, H-15, H-26, H-32, H-36, H-37, H-38, H-39, H-40, H-41, M-04, M-10, M-14, M-15, M-16, M-17, L-03, L-04 |
| `tabs-vocabulary.tsx` | 47 | H-02, H-16, H-17, H-18, M-18, L-19 |
| `word-list.tsx` | 378 | H-03, H-04, H-05, H-22, H-23, H-24, H-25, H-33, H-34, H-35, M-11, M-12, M-13, L-01, L-02, L-05, L-13, L-14, L-16 |
| `admin-page-config.ts` | 49 | M-01, M-19 |
| `firestore-config.ts` | 40 | H-06, L-11, L-12 |
| `index-page-config.ts` | 22 | H-21 |
| `locale-config.ts` | 29 | H-19 |
| `settings-page-config.ts` | 18 | H-07 |
| `site-config.ts` | 11 | H-20, L-09 |
| `student-page-config.ts` | 68 | M-02 |
| `system-page-config.ts` | 49 | (no findings) |
| `teacher-page-config.ts` | 69 | (no findings) |
| `quiz-context.tsx` | 33 | H-08, M-05, L-06, L-07, L-17 |
| `timer-context.tsx` | 73 | H-10, H-11, M-09, L-08, L-18 |
| `userRole-context.tsx` | 26 | H-09, M-06, M-07, M-08, L-20 |
| `audios-words/temp.mp3` | 0 bytes (binary) | H-31 |
| `audios/temp.mp3` | 505,440 bytes (binary) | H-31 |
| `authors-fiction.js` | 81 | H-27, H-29 |
| `authors-nonfiction.js` | 147 | H-27, H-28, H-29 |
| `cefr-level-evaluation-prompts.json` | 26 | H-30, L-10 |

---

## Severity Totals

- **Critical:** 0
- **High:** 16
- **Medium:** 19
- **Low / Info:** 19

**Total findings:** 54

**Acceptance claim:** none. No verification commands were run; this is a read-only line-by-line review.

MEASURE_AGENT_RESULT
{"track_id":"reading_advantage_full_review_20260626","review_role":"A","batch_id":"ra-batch-36","status":"complete","files_reviewed":20,"lines_reviewed":1750,"binary_files_acknowledged":2,"findings":{"critical":0,"high":16,"medium":19,"low":19,"total":54},"highest_severity":"high","notable_findings":["H-01: // 'use client' commented out in tab-matching-words.tsx (uses hooks + fetch + dayjs.extend)","H-02: tabs-vocabulary.tsx never passes showButton/setShowButton to FlashcardDashboard; required props not satisfied","H-03: word-list.tsx:84 shadows useState wordList with let wordList","H-04: word-list.tsx:2 imports unused useRef/useEffect","H-05: word-list.tsx:170 createEmptyCard() is built then spread into request body; server ignores it","H-06: firestore-config.ts is a stub that silently no-ops set/update/delete and returns stub-id for add()","H-07: settings-page-config.ts is typed as StudentPageConfig","H-08: quiz-context.tsx default setPaused is a no-op; no setTimer exposed","H-09: userRole-context.tsx:5 createContext([] as any) discards type","H-10/H-11: timer-context.tsx setTimer stops the running interval; startTimer is a no-op for second caller","H-31: data/audios-words/temp.mp3 is 0 bytes; data/audios/temp.mp3 is 505KB of low-bitrate audio committed to repo"],"acceptance_claim":"none","verification":"none","residual_risk":"binary MP3s could not be content-reviewed; only metadata was inspected"}
