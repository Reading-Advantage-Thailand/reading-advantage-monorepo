# Line-by-Line Review: Reading Advantage — Batch 03

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-03`  
**Baseline SHA:** `6921fda0ee45012232bdd71c444d4e9523a10ab6`  
**Current HEAD:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Review Date:** 2026-06-27  
**Reviewer Role:** A — correctness / product behavior / anti-patterns  

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line. `git diff` against the baseline SHA produced zero changes for every file, so this report reviews the code as it exists at HEAD.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx` | 1–294 (entire file) |
| 2 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/magic-defense/page.test.tsx` | 1–37 (entire file) |
| 3 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/magic-defense/page.tsx` | 1–144 (entire file) |
| 4 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.test.tsx` | 1–73 (entire file) |
| 5 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx` | 1–628 (entire file) |
| 6 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rune-match/page.test.tsx` | 1–62 (entire file) |
| 7 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rune-match/page.tsx` | 1–113 (entire file) |
| 8 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.test.tsx` | 1–46 (entire file) |
| 9 | `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx` | 1–159 (entire file) |
| 10 | `apps/reading-advantage/app/[locale]/(student)/student/goals/page.tsx` | 1–46 (entire file) |
| 11 | `apps/reading-advantage/app/[locale]/(student)/student/history/loading.tsx` | 1–11 (entire file) |
| 12 | `apps/reading-advantage/app/[locale]/(student)/student/history/page.tsx` | 1–69 (entire file) |
| 13 | `apps/reading-advantage/app/[locale]/(student)/student/layout.tsx` | 1–34 (entire file) |
| 14 | `apps/reading-advantage/app/[locale]/(student)/student/lesson/[articleId]/custom-error.tsx` | 1–28 (entire file) |
| 15 | `apps/reading-advantage/app/[locale]/(student)/student/lesson/[articleId]/error.tsx` | 1–35 (entire file) |
| 16 | `apps/reading-advantage/app/[locale]/(student)/student/lesson/[articleId]/loading.tsx` | 1–35 (entire file) |
| 17 | `apps/reading-advantage/app/[locale]/(student)/student/lesson/[articleId]/page.tsx` | 1–67 (entire file) |
| 18 | `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/custom-error.tsx` | 1–28 (entire file) |
| 19 | `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/error.tsx` | 1–35 (entire file) |
| 20 | `apps/reading-advantage/app/[locale]/(student)/student/read/[articleId]/loading.tsx` | 1–35 (entire file) |

**No file was partially reviewed.**

---

## Executive Summary

This batch covers five student vocabulary game pages, their shallow unit tests, and the student layout plus history, goals, lesson, and read page shells. The game pages are thin API consumers on the surface, but `rpg-battle/page.tsx` embeds a full battle loop (damage calculation, turn management, TTS, XP scaling, floating text) directly in the page component, making it a poster case for the AGENTS.md backend-as-code violation. The other game pages all call internal `/api/v1/games/...` endpoints without response schema validation and without gracefully degrading when the API returns non-JSON or network errors.

The most severe correctness issue is in `enchanted-library/page.tsx`, where the game-result payload is computed with `results.xp / results.accuracy` and `results.xp / results.accuracy / results.accuracy`; if `accuracy` is `0`, these expressions produce `NaN` or `Infinity`, which are then `JSON.stringify`-ed and sent to the server. On the test side, all four game page test suites fail at runtime because they mock the visual game component but not `fetch`, so the `useEffect` that loads vocabulary throws "fetch is not defined" in jsdom.

---

## Findings

### Critical / High

#### H-01 — `enchanted-library/page.tsx` divides by zero when computing result payload
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/enchanted-library/page.tsx`
- **Lines:** 108–117
- **Severity:** High
- **Evidence:**
  ```tsx
  correctAnswers: Math.floor(results.xp / results.accuracy),
  totalAttempts: Math.floor(
    results.xp / results.accuracy / results.accuracy,
  ),
  ```
  `results.accuracy` is typed as `number` and is not guarded. A player can finish with `accuracy: 0` (no correct answers). `0 / 0` yields `NaN`; `Math.floor(NaN)` yields `NaN`; the body is then serialized as `"correctAnswers":null` (or `Infinity` if `xp > 0`). The downstream `complete` endpoint receives invalid data.
- **Impact:** Server-side result recording can store nonsensical values, corrupt leaderboards, or throw validation errors silently because the page only logs `console.error` on network failure.
- **Fix:** Guard `accuracy` before division. Compute `correctAnswers` and `totalAttempts` from actual game state (e.g., counts passed back by `EnchantedLibraryGame`) rather than deriving them from XP and accuracy.

#### H-02 — Game page tests fail in jsdom because `fetch` is not mocked
- **Files:**
  - `magic-defense/page.test.tsx`
  - `rpg-battle/page.test.tsx`
  - `rune-match/page.test.tsx`
  - `wizard-vs-zombie/page.test.tsx`
- **Severity:** High
- **Evidence:** Executed `pnpm jest --testPathPatterns='games/vocabulary/(magic-defense|rpg-battle|rune-match|wizard-vs-zombie)/page.test.tsx'` from `apps/reading-advantage`. Result:
  - `Test Suites: 4 failed, 4 total`
  - `Tests: 11 failed, 1 passed, 12 total`
  Every failure trace ends with `fetch is not defined` or a `waitFor` timeout caused by the vocabulary fetch throwing.
- **Impact:** These tests do not protect the pages. They are false negatives in CI and give the impression of coverage while actually failing. This directly relates to Measure anti-pattern **A5 — false-claim text vs test reality**: the test files exist and describe page behavior, but the claimed behavior is not verified because the suite exits red.
- **Fix:** Either (a) mock `global.fetch` in each test and assert the request body/response handling, or (b) abstract the fetch into a vocabulary service and mock that service. Also add tests for the error and loading states.

#### H-03 — `rpg-battle/page.tsx` contains domain/business logic that belongs in backend modules
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx`
- **Lines:** 47–51 (constants), 88–434 (state + effects + handlers)
- **Severity:** High
- **Evidence:** The page defines battle constants (`ACTION_COUNT`, `BASIC_DAMAGE`, `POWER_DAMAGE`, `MAX_TURNS`), manages turn state, computes damage (`handleSubmit` lines 351–415), scales XP (`scaleBattleXp` imported from lib but orchestrated here), rolls enemy damage (`rollEnemyDamage`), handles crit chance (`Math.random() > 0.8`), and drives TTS. It also directly POSTs to `/api/v1/games/rpg-battle/complete`.
- **Impact:** Business rules live in a React component, making them hard to unit test, impossible to reuse, and subject to client tampering. The page also bypasses any shared `packages/domain` game abstraction.
- **Fix:** Extract the battle engine into `packages/domain` or at minimum into `lib/games/rpg-battle/engine.ts` with pure functions and explicit tests. The page should only render and forward events.

#### H-04 — `history/page.tsx` and `lesson/[articleId]/page.tsx` forward raw request headers to internal API calls
- **Files:**
  - `history/page.tsx` line 18 (via `fetchData`, which forwards `headers()`)
  - `lesson/[articleId]/page.tsx` lines 39–46 (manual `headers()` forward)
- **Severity:** High
- **Evidence:** `utils/fetch-data.ts` does `headers: headersList` (all incoming headers). `lesson/page.tsx` does the same explicitly. This forwards cookies (needed for auth) but also arbitrary client headers to the internal `NEXT_PUBLIC_BASE_URL` endpoint.
- **Impact:** Header injection risk; forwarding unexpected headers (`x-forwarded-host`, `content-length`, `connection`, etc.) can confuse the internal API or leak information. It also couples the page tightly to the internal request shape.
- **Fix:** Construct a minimal, explicit header bag for internal calls (e.g., only `cookie` and `content-type`), or better, call domain functions directly instead of making an HTTP round-trip to the same app.

### Medium

#### M-01 — `magic-defense/page.tsx` stale-closure / missing dependency on `t`
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/magic-defense/page.tsx`
- **Lines:** 21–50
- **Severity:** Medium
- **Evidence:** The `useEffect` at line 21 uses `t("notEnoughWords", { count: "10" })` at line 37, but its dependency array at line 50 is `[setVocabulary]`. The `t` function from `useScopedI18n` is omitted.
- **Impact:** If the locale changes after mount, the error message will be rendered with a stale `t` reference. This is an exhaustive-deps bug that `react-hooks/exhaustive-deps` would flag.
- **Fix:** Add `t` to the dependency array, or move the fallback message construction outside the effect.

#### M-02 — `rune-match/page.tsx` imports `useRouter` but never uses it
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rune-match/page.tsx`
- **Line:** 5
- **Severity:** Medium
- **Evidence:** `import { useRouter } from "next/navigation";` is present; `router` is never referenced. A commented-out `router.push('/')` remains at line 83.
- **Impact:** Dead import; lint should catch it, but it is still noise and suggests incomplete cleanup.
- **Fix:** Remove the import and the commented line.

#### M-03 — `wizard-vs-zombie/page.tsx` imports `dynamic` but never uses it
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx`
- **Line:** 3
- **Severity:** Medium
- **Evidence:** `import dynamic from "next/dynamic";` is unused. `WizardZombieGame` is imported statically at line 9.
- **Impact:** Dead import.
- **Fix:** Remove the import.

#### M-04 — `wizard-vs-zombie/page.tsx` multiplies `accuracy` by 100 before sending, unlike other games
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx`
- **Line:** 79
- **Severity:** Medium
- **Evidence:** `accuracy: results.accuracy * 100`. The other three game pages in this batch send `accuracy` as a 0–1 decimal.
- **Impact:** The backend `complete` endpoint must special-case this game or risk storing inconsistent values across the leaderboard/XP pipeline.
- **Fix:** Standardize on one accuracy representation (recommend 0–1) across all game pages.

#### M-05 — `lesson/[articleId]/page.tsx` displays raw API response in `CustomError`
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/lesson/[articleId]/page.tsx`
- **Lines:** 34–37
- **Severity:** Medium
- **Evidence:** Returns `<CustomError message={articleResponse.message} resp={articleResponse} />`. `custom-error.tsx` then does `Invalids: {JSON.stringify(resp)}`.
- **Impact:** Potential information disclosure if `resp` contains stack traces, internal IDs, or other data meant for logs only.
- **Fix:** Show a user-safe message and log the full response server-side. Avoid `JSON.stringify` of arbitrary API responses in UI.

#### M-06 — `lesson/[articleId]/page.tsx` and `history/page.tsx` use `any` for transformed records
- **Files:**
  - `history/page.tsx` lines 33, 42, 47 (`record: any`, `article: any`)
  - `lesson/[articleId]/page.tsx` line 61 (`as Article`)
- **Severity:** Medium
- **Evidence:** TypeScript is effectively disabled for these data transformations.
- **Impact:** Runtime shape mismatches are not caught at build time. `ignoreBuildErrors: true` in `next.config.mjs` already masks type errors, so local `any` compounds the problem.
- **Fix:** Define Zod or TS types for API responses and transform with typed functions.

#### M-07 — `layout.tsx` function name is `SettingsPageLayout` but it is the student layout
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/layout.tsx`
- **Line:** 8
- **Severity:** Medium
- **Evidence:** `export default async function SettingsPageLayout({...})`. The file is `student/layout.tsx` and configures `studentPageConfig`.
- **Impact:** Misleading for maintainers; search/replace and debugging confusion.
- **Fix:** Rename to `StudentLayout`.

#### M-08 — `layout.tsx` expired-date comparison can behave unexpectedly with empty string
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/layout.tsx`
- **Line:** 21
- **Severity:** Medium
- **Evidence:** `new Date(user?.expired_date) < new Date()`. If `expired_date` is `""`, `new Date("")` is Invalid Date; comparisons with Invalid Date always return `false`.
- **Impact:** An empty `expired_date` does not redirect to `/contact`, which may be intended, but the behavior is implicit and fragile.
- **Fix:** Parse/normalize `expired_date` explicitly before comparison, or use a nullable Date type from `sessionUserSchema`.

#### M-09 — Game pages hardcode English fallback text and error copy
- **Files:**
  - `enchanted-library/page.tsx` lines 162–171 (error state)
  - `magic-defense/page.tsx` lines 41–42 (fallback error string)
  - `rpg-battle/page.tsx` line 377 (`utterance.lang = "en-US"`)
  - `rune-match/page.tsx` lines 41–47 (fallback comment is English)
  - `wizard-vs-zombie/page.tsx` lines 37–54 (fallback vocabulary)
- **Severity:** Medium
- **Evidence:** Strings are not routed through `next-intl`. The app supports Thai (`th`) and other locales; hardcoded English breaks localization.
- **Impact:** Mixed-language UX for non-English users.
- **Fix:** Move all user-facing strings to the translation files and use `useScopedI18n` / `getScopedI18n`.

#### M-10 — `rpg-battle/page.tsx` `ActionMenu` receives `menuActions` without translation
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx`
- **Lines:** 313–321, 573–578
- **Severity:** Medium
- **Evidence:** `menuActions` maps each action to `{ id, label: action.term, power }`. The `translation` field is stripped. The player must type the translation (line 354 `action.translation.toLowerCase() === normalized`), but the UI only shows `term`.
- **Impact:** Either the player cannot see what to type, or `ActionMenu` internally re-fetches the translation. Either way, the contract is unclear and untested.
- **Fix:** Pass the full action object (term + translation) to `ActionMenu` and document what the player is expected to type.

### Low

#### L-01 — `goals/page.tsx` ignores locale and hardcodes English metadata/heading
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/goals/page.tsx`
- **Lines:** 7–10, 22–25
- **Severity:** Low
- **Evidence:** `metadata` and the `<h1>`/`<p>` are English literals. The page accepts no `params` despite being under `[locale]`.
- **Impact:** i18n gap.
- **Fix:** Accept `params` and use `getScopedI18n` for metadata and headings.

#### L-02 — `lesson/[articleId]/custom-error.tsx` and `read/[articleId]/custom-error.tsx` are duplicates
- **Files:**
  - `lesson/[articleId]/custom-error.tsx`
  - `read/[articleId]/custom-error.tsx`
- **Severity:** Low
- **Evidence:** Files are byte-identical.
- **Impact:** Duplicated maintenance; any fix must be applied twice.
- **Fix:** Move to a shared `components/errors/custom-error.tsx`.

#### L-03 — `lesson/[articleId]/error.tsx` and `read/[articleId]/error.tsx` are duplicates
- **Files:**
  - `lesson/[articleId]/error.tsx`
  - `read/[articleId]/error.tsx`
- **Severity:** Low
- **Evidence:** Files are byte-identical.
- **Fix:** Share a single error boundary component.

#### L-04 — `lesson/[articleId]/loading.tsx` and `read/[articleId]/loading.tsx` are duplicates
- **Files:**
  - `lesson/[articleId]/loading.tsx`
  - `read/[articleId]/loading.tsx`
- **Severity:** Low
- **Evidence:** Files are byte-identical.
- **Fix:** Share a single loading skeleton.

#### L-05 — `history/loading.tsx` uses fixed pixel widths that may overflow on small screens
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/history/loading.tsx`
- **Lines:** 6–8
- **Severity:** Low
- **Evidence:** `w-[400px]`, `w-[500px]` without max-width or responsive classes.
- **Impact:** Horizontal scroll on mobile.
- **Fix:** Use `max-w-full` or percentage widths.

#### L-06 — Game pages use `console.log`/`console.error` instead of structured logging
- **Files:** All five game pages
- **Severity:** Low
- **Evidence:** Examples: `enchanted-library/page.tsx` lines 70, 91, 124, 135; `magic-defense/page.tsx` lines 40, 81, 83, 86; `rpg-battle/page.tsx` lines 160, 246, 249, 252; `rune-match/page.tsx` lines 42, 46, 79; `wizard-vs-zombie/page.tsx` lines 46, 84.
- **Impact:** Free-form logs are lost in production (Next.js may strip them) and are not structured or correlated.
- **Fix:** Route errors through the app's error-reporting/observability adapter.

#### L-07 — `rpg-battle/page.tsx` hardcodes TTS language to "en-US"
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx`
- **Lines:** 375–379
- **Severity:** Low
- **Evidence:** `utterance.lang = "en-US"; // Assume English terms for now`
- **Impact:** Non-English terms are mispronounced.
- **Fix:** Derive TTS locale from the current `locale` param or term metadata.

#### L-08 — `rpg-battle/page.tsx` crit chance uses unseeded `Math.random()`
- **File:** `apps/reading-advantage/app/[locale]/(student)/student/games/vocabulary/rpg-battle/page.tsx`
- **Lines:** 386–390
- **Severity:** Low
- **Evidence:** `if (Math.random() > 0.8) { spawnFloatingText("CRITICAL!", ...) }`
- **Impact:** Not testable; game balance cannot be verified deterministically.
- **Fix:** Inject a random source or move crit determination into the battle engine.

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A3 | Digit-only as a "labeled count" | No | No bare-digit regex assertions in the 20 files. |
| A4 | Vacuous-pass on nothing-done | Partial | The game page tests mock visual output but do not exercise the API contract or failure paths; however, they fail rather than pass vacuously, so the more precise failure class is **A5**. |
| A5 | False-claim text vs test reality | **Yes** | The four game page `.test.tsx` files describe rendering, vocabulary loading, and store behavior, but 11 of 12 tests fail with `fetch is not defined`. The existence of the test files implies coverage that is not actually green. |
| A6 | Registry-note overstatement | No | No track registry claims were reviewed in this batch. |
| A9 | Pre-existing test references archived track paths | No | No references to `measure/tracks/` found in the 20 files. |
| A11 | Executed review track left fully blocked | No | The parent track plan is already marked complete. |

---

## Test / Coverage Observations

1. **Executed tests:** `pnpm jest --testPathPatterns='games/vocabulary/(magic-defense|rpg-battle|rune-match|wizard-vs-zombie)/page.test.tsx'` from `apps/reading-advantage` produced `Test Suites: 4 failed, 4 total; Tests: 11 failed, 1 passed, 12 total`.
2. **Root cause:** `fetch` is not globally available in the Jest jsdom environment, and the tests mock only the visual game component, not the vocabulary fetch.
3. **No tests exist** for `goals/page.tsx`, `history/page.tsx`, `layout.tsx`, `lesson/[articleId]/page.tsx`, or the `read/[articleId]/` shell files.
4. **Shallow coverage:** The existing game page tests assert static text and mocked component presence. They do not cover:
   - Vocabulary fetch success/error/loading states
   - Game completion payload shape
   - Difficulty selection
   - Rankings fetch
   - Redirects or unauthenticated states

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. **Fix the division-by-zero bug** in `enchanted-library/page.tsx` (H-01) before any leaderboard/XP work proceeds.
2. **Make the four game page tests pass** by mocking `fetch` (or a vocabulary service) and adding error-state assertions (H-02).
3. **Move the RPG battle engine** out of `rpg-battle/page.tsx` into a tested module under `lib/games/` or `packages/domain/` (H-03).
4. **Stop forwarding all request headers** in `fetchData` and `lesson/page.tsx`; pass only the headers required for internal auth (H-04).
5. **Add `t` to the dependency array** in `magic-defense/page.tsx` (M-01), remove dead imports (M-02, M-03), and standardize accuracy representation across games (M-04).
6. **Deduplicate** the `custom-error.tsx`, `error.tsx`, and `loading.tsx` files under `lesson/` and `read/` (L-02–L-04).
7. **Add scoped i18n keys** for all hardcoded English strings in the game error/fallback states (M-09).

---

*End of line-review report for batch 03.*
