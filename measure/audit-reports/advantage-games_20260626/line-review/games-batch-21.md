# Line-by-Line Review — games-batch-21

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-21`
**Scope source:** `/tmp/opencode/games-batch-21` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is the **page/route shell + page-test layer** for 14 advantage-games (11 sentence games + 3 vocabulary games), plus 6 Jest page tests. Game canvas components (`@/components/games/...`) and `/api/v1/games/...` route handlers are out-of-batch and were only spot-checked read-only to validate claims.
**Finding ID scheme:** `F-GAMES-B21-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Game | Type |
|---|------|------|------|
| 1 | `sentence/griffin-sky-joust/page.tsx` | griffin-sky-joust | page shell |
| 2 | `sentence/gryphon-patrol/page.tsx` | gryphon-patrol | page shell (tabs + rankings) |
| 3 | `sentence/haunted-library/page.tsx` | haunted-library | page shell |
| 4 | `sentence/labyrinth-goblin-king/page.tsx` | labyrinth-goblin-king | page shell |
| 5 | `sentence/potion-rush/page.test.tsx` | potion-rush | page test |
| 6 | `sentence/potion-rush/page.tsx` | potion-rush | page shell (tabs + rankings) |
| 7 | `sentence/realm-carver/page.tsx` | realm-carver | page shell |
| 8 | `sentence/rune-forge-chamber/page.test.tsx` | rune-forge-chamber | page test |
| 9 | `sentence/rune-forge-chamber/page.tsx` | rune-forge-chamber | page shell |
| 10 | `sentence/shadow-gate-dungeon/page.test.tsx` | shadow-gate-dungeon | page test |
| 11 | `sentence/shadow-gate-dungeon/page.tsx` | shadow-gate-dungeon | page shell |
| 12 | `sentence/spellweavers-run/page.tsx` | spellweavers-run | page shell |
| 13 | `sentence/storm-castle-tower/page.tsx` | storm-castle-tower | page shell |
| 14 | `sentence/village-guardian/page.tsx` | village-guardian | page shell |
| 15 | `vocabulary/alchemists-synthesis/page.test.tsx` | alchemists-synthesis | page test |
| 16 | `vocabulary/alchemists-synthesis/page.tsx` | alchemists-synthesis | page shell |
| 17 | `vocabulary/archers-revenge/page.tsx` | archers-revenge | page shell |
| 18 | `vocabulary/dragon-flight/page.test.tsx` | dragon-flight | page test |
| 19 | `vocabulary/dragon-flight/page.tsx` | dragon-flight | page shell |
| 20 | `vocabulary/dragon-rider/page.test.tsx` | dragon-rider | page test (page.tsx NOT in batch) |

These pages share a near-identical lifecycle: client component → `dynamic(..., { ssr: false })` import of a Konva canvas game → `fetch` sentences/vocabulary on mount → render loading / warning / game → on completion POST results to a per-game `/complete` route. The recurring divergences across the 14 pages (hardcoded vs i18n strings, inconsistent scoring contracts, mixed back-link hrefs) are the core risk surface.

---

## Cross-Cutting Verification Performed (read-only)

- `@/store/useGameStore` exports `VocabularyItem`, `setVocabulary`, `setLastResult` — confirmed (`useGameStore.ts:3,32,38,98`). There is **no** `SentenceItem` type in the shared store; sentence pages import a per-game `SentenceItem` from `@/lib/games/<game>` or fall back to inline `{ term; translation }` literals.
- Registry entries exist in `src/lib/gameCards.ts` for all 14 games (lines 22–234). Cover naming is **inconsistent** in the registry itself: some `cover-<id>.png`, some `<id>-cover.png`, and `labyrinth-goblin-king`/`storm-castle-tower` have no `cover:` field shown.
- Route dirs confirmed: `gryphon-patrol/{complete,ranking,sentences}`, `realm-carver/{complete,sentences}` (no `ranking`), `alchemists-synthesis/{complete,vocabulary}`, `archers-revenge/{complete,vocabulary}`.
- Test runner is **Jest** (`package.json:10 "test": "jest"`, `jest.config.ts` via `next/jest`). All `page.test.tsx` use Jest APIs — consistent with app convention (legacy Jest, not Vitest).
- `dragon-rider/page.tsx` exists in the repo but is **not** in this batch; only its test (file 20) is. The test is reviewed; the page it exercises is out-of-scope and unverified here.

---

## Findings

### File 1 — `griffin-sky-joust/page.tsx`

**F-GAMES-B21-001 · High · page.tsx:81-103, 94-95**
`handleComplete` fabricates progress data: `correctAnswers: Math.floor(results.accuracy * 10)` and `totalAttempts: 10` are hardcoded. The game reports real `xp`/`accuracy` but the per-question counts sent to the `/complete` route are synthetic. Any server-side progress/mastery tracking, leaderboards, or analytics built on `correctAnswers`/`totalAttempts` will be wrong. This pattern recurs in 8 of the 11 sentence pages (B21-006, -008, -017, -021, -025, -028, -031) and is a systemic scoring/progress-integrity defect.

**F-GAMES-B21-002 · Medium · page.tsx:41-44, 8, 42**
`t` (i18n) and `session` are both fetched then suppressed with `eslint-disable @typescript-eslint/no-unused-vars`. All player-facing copy on this page ("Back to Games", "Loading Griffin...", header heading/text, the entire NO/INSUFFICIENT warning block) is hardcoded English literals (lines 111, 118, 152-194, 215-216). For an app whose default locale is Thai (see B21-004), this page is **not localized** despite importing the i18n hook. Importability into Reading/Primary (which are multilingual) is blocked until strings are externalized.

**F-GAMES-B21-003 · Low · page.tsx:13-23**
`import { Button }`, `ChevronLeft`, `Bird`, and `Header` are placed **after** the `dynamic()` call (lines 21-23), splitting imports around executable code. Lint/style inconsistency; harmless but signals copy-paste scaffolding rather than reviewed code.

### File 2 — `gryphon-patrol/page.tsx`

**F-GAMES-B21-004 · High · page.tsx:131-132**
The scoring contract is incoherent and self-documented as guesswork: `correctAnswers: results.xp` and `totalAttempts: results.xp + 2` with inline comments `// Adjust as needed`. XP is being passed as a correct-answer count, and total-attempts is XP+2 — a meaningless ratio. Accuracy submitted to the leaderboard/progress route is therefore corrupt. This is shipped code with TODO-grade logic.

**F-GAMES-B21-005 · Medium · page.tsx:151, 56-57**
Loading text is the hardcoded Thai literal `"กำลังโหลด"` while `t = useScopedI18n("games")` is imported and suppressed as unused. Mixed-language hardcoding: this page hardcodes Thai, while griffin-sky-joust (B21-002) hardcodes English. No single locale is correct for both. The rankings tab (lines 308-310, 356) hardcodes English "Leaderboards"/"No records found". Inconsistent i18n strategy across sibling games.

**F-GAMES-B21-006 · Medium · page.tsx:114-143**
`handleComplete` has no `setLastResult` call (unlike the single-result pages), so the shared `useGameStore` lastResult is never updated for this game — divergent state-management behavior versus the other sentence games. Combined with B21-004, the completion path is unreliable.

**F-GAMES-B21-007 · Low · page.tsx:32-37, 49**
`RankingEntry.image` is typed and fetched but never rendered (avatar omitted in the leaderboard row, lines 328-352). Dead field; either the UI is incomplete or the contract is over-broad. Minor, but the leaderboard is a stated review focus.

### File 3 — `haunted-library/page.tsx`

**F-GAMES-B21-008 · Medium · page.tsx:73-101**
This page passes **real** `correctAnswers`/`totalAttempts` from the game results (lines 91-92) and includes `userId: session?.user?.id` (line 93). This is the *correct* contract — and it directly contradicts the hardcoded `Math.floor(accuracy*10)/10` pattern in the majority of sibling pages (B21-001 et al.). The inconsistency means the `/complete` routes across games cannot share a single validated input schema; importability into Reading/Primary requires one canonical contract.

**F-GAMES-B21-009 · Medium · page.tsx:38, 111**
`t('loading')` is used with a `|| 'Searching the Restricted Section...'` fallback (line 111) — partial i18n — but the warning card (lines 131-139) and headings are fully hardcoded English. Half-localized. Also, on warning, the "Back to Dashboard" button links to `/` (line 144) whereas every other page links to `/student/games`; inconsistent navigation target leaves the player stranded relative to siblings.

**F-GAMES-B21-010 · Low · page.tsx:154**
Game container background is `bg-slate-950` (dark) but the success-path `<main>` in other sibling pages uses `text-slate-900` on an implicitly light background (e.g., B21-001 line 206). Visual theme is not standardized across games; minor UX cohesion issue for a unified games hub.

### File 4 — `labyrinth-goblin-king/page.tsx`

**F-GAMES-B21-011 · Medium · page.tsx:42, 41-44**
`useScopedI18n("labyrinth-goblin-king")` is called with a scope key that does not match the `pages.student.gamesPage.*` namespace used by most other games, then suppressed as unused. All copy is hardcoded **Thai** (lines 111, 130, 144-186, 202). Same hardcoded-Thai vs hardcoded-English split as B21-005; non-localizable.

**F-GAMES-B21-012 · High · page.tsx:81-103, 94-95**
Same synthetic-progress defect as B21-001 (`correctAnswers: Math.floor(accuracy*10)`, `totalAttempts: 10`). Carried here for per-file traceability.

**F-GAMES-B21-013 · Low · page.tsx:13-23**
Imports split around the `dynamic()` call (lines 21-23), same scaffolding smell as B21-003.

### File 5 — `potion-rush/page.test.tsx`

**F-GAMES-B21-014 · Medium · page.test.tsx:6-18, 50-62**
`next/dynamic` is globally mocked to a stub that ignores the real import path, and `fetch` is mocked to always return one sentence. The test therefore never exercises the actual dynamic import, the real game component, or the `/complete` POST. It asserts UI scaffolding (difficulty buttons, tab switch) only. No assertion verifies the `handleComplete` payload — so the B21-019 scoring bug below would pass these tests undetected. Test quality: shallow; gives false confidence on the riskiest (scoring) path.

**F-GAMES-B21-015 · Low · page.test.tsx:116**
The "no sentences" assertion matches `heading { name: /noSentences$/i }` — i.e., it asserts the **raw i18n key** `noSentences` renders, because `useScopedI18n` is mocked to echo keys (line 29). This locks the test to the mock's identity behavior and would not catch a missing/incorrect translation. Tests the plumbing, not the user-visible string.

**F-GAMES-B21-016 · Info · page.test.tsx:20-25**
`next/navigation` `useRouter` is mocked but the page (file 6) never imports `useRouter`. Dead mock — copy-paste residue from another game's test.

### File 6 — `potion-rush/page.tsx`

**F-GAMES-B21-017 · Medium · page.tsx:129-130**
`correctAnswers: Math.floor(results.score / 10)` and `totalAttempts: Math.floor(results.score/10) + 2` — like gryphon-patrol (B21-004), derives answer counts from a score heuristic rather than real gameplay counts. The `+2` denominator fudge means accuracy persisted server-side is fabricated. Scoring/progress integrity defect.

**F-GAMES-B21-018 · Low · page.tsx:30 vs gryphon-patrol:30**
`Difficulty = "easy" | "normal" | "hard" | "extreme"` here, but gryphon-patrol uses `"easy" | "medium" | "hard" | "extreme"` (file 2, line 30). The difficulty taxonomy is not standardized across games sharing the same rankings/leaderboard UI, so leaderboard keys (`rankings[dif]`) will not align cross-game — a real difficulty/leaderboard portability bug.

**F-GAMES-B21-019 · Info · page.tsx:252-253, 286**
Positive note: this page is the **best-localized and most a11y-aware** of the batch — uses `t(...)` throughout, and adds `min-w-[44px] min-h-[44px]` touch targets on difficulty/tab buttons (WCAG target-size). It should be the template the others converge to. Conversely it highlights how far the hardcoded siblings lag.

### File 7 — `realm-carver/page.tsx`

**F-GAMES-B21-020 · High · page.tsx:45-51**
The page fetches sentences then takes **only `data.sentences[0]`** and splits it into words (`sentence.text.split(" ")`), mapping each word to `{ term: word, translation: word }`. Two problems: (1) translation == term means no real translation is surfaced; (2) it assumes a `.text` field, whereas every other sentence game expects `{ term, translation }` objects — divergent API contract. If the route returns the common shape, `sentence.text` is `undefined` and `.split` throws (uncaught inside try, but yields empty words). Fragile and contract-incoherent.

**F-GAMES-B21-021 · Medium · page.tsx:68-82**
`handleComplete` POSTs the raw `results` object (`JSON.stringify(results)`) — only `{ xp, accuracy }` — so `correctAnswers`/`totalAttempts` are never sent at all here, unlike siblings. Yet another distinct `/complete` payload shape (fourth variant in this batch). No shared contract.

**F-GAMES-B21-022 · Low · page.tsx:27-29, 30**
Uses `use(params)` to read `locale` from props (Next 15 async params) — correct and modern — but `currentLocale = useCurrentLocale()` (line 29) is also fetched and unused, and `locale` from params (not `currentLocale`) is used in the fetch URL (line 42). Two locale sources in one component; pick one. Minor but confusing.

### File 8 — `rune-forge-chamber/page.test.tsx`

**F-GAMES-B21-023 · Low · page.test.tsx:90-107**
The INSUFFICIENT_SENTENCES test asserts `getByText('5')` and `getByText('2')` — bare numbers. These match the count `<span>`s, but the assertion is brittle (any "5"/"2" anywhere passes) and does not verify the surrounding sentence or that the correct count maps to the correct label. Weak assertion on a numeric-display path.

**F-GAMES-B21-024 · Info · page.test.tsx:44-49**
`fetch` mock returns `{ ok: true, json: ... }` but the page (file 9) never checks `res.ok` — it only reads `data.warning`/`data.sentences`. Test models a contract the page ignores; harmless but indicates test/page drift.

### File 9 — `rune-forge-chamber/page.tsx`

**F-GAMES-B21-025 · High · page.tsx:83-106, 96-97**
Same synthetic-progress defect (`correctAnswers: Math.floor(accuracy*10)`, `totalAttempts: 10`), but here `userId` is also included (line 98) — so this is a *third* `/complete` payload variant (xp/accuracy + synthetic counts + userId). Scoring integrity + contract fragmentation.

**F-GAMES-B21-026 · Medium · page.tsx:42-46, 147-148**
`t = useScopedI18n("runeForgeChamber")` is wired and `pageTitle = t("title") || "..."` is used for the heading (good), but the loading text (`"กำลังโหลด"`, line 114), warning headings/body (Thai literals lines 147-189) are hardcoded. Partial i18n — the title is translatable but the error/loading UX is not. Inconsistent with its own pattern.

### File 10 — `shadow-gate-dungeon/page.test.tsx`

**F-GAMES-B21-027 · Low · page.test.tsx:43-49, 81-97**
Test asserts hardcoded Thai strings (`/ไม่พบประโยค/`, `/ประโยคที่บันทึกไว้ไม่เพียงพอ/`) because the page hardcodes Thai (file 11). The test thus *encodes* the localization defect as expected behavior — if someone fixes i18n, this test breaks. Tests should not pin hardcoded-language regressions as the contract.

### File 11 — `shadow-gate-dungeon/page.tsx`

**F-GAMES-B21-028 · High · page.tsx:79-101, 92-93**
Same synthetic-progress defect as B21-001. The `t` scope here is `pages.student.gamesPage.shadowGateDungeon` (line 32) yet, like its siblings, none of the warning/loading copy uses it (Thai literals lines 109, 142-184). Scoring + i18n defects compounded.

### File 12 — `spellweavers-run/page.tsx`

**F-GAMES-B21-029 · Medium · page.tsx:78-101, 92-93**
Synthetic `correctAnswers`/`totalAttempts` again, but this page additionally forwards `difficulty: results.difficulty` (line 90) — so the `handleComplete` result type (line 79) includes `difficulty` that several sibling games omit. The completion result type is non-uniform across sentence games, blocking a shared `onComplete` interface and a shared route schema.

**F-GAMES-B21-030 · Low · page.tsx:33, 12, 8**
Imports a per-game `SentenceItem` from `@/lib/games/spellweaversRun` for state typing, while peers (griffin-sky-joust, storm-castle-tower) use inline `{ term; translation }[]`. No shared sentence type exists in the store, so each game re-invents the shape — a concrete cross-app contract risk for Reading/Primary import.

### File 13 — `storm-castle-tower/page.tsx`

**F-GAMES-B21-031 · High · page.tsx:81-103, 94-95**
Synthetic-progress defect (identical to B21-001). All copy hardcoded English (lines 111, 130, 144-208) with `t` suppressed as unused (lines 41-42). Note registry (`gameCards.ts:158-162`) shows no `cover:` line for this id in the grep slice — asset readiness should be confirmed by the asset audit.

### File 14 — `village-guardian/page.tsx`

**F-GAMES-B21-032 · Medium · page.tsx:41-42**
`useScopedI18n("pages.student.gamesPage.villageGuardian")` and `useSession()` are called purely for side-effect (no binding, no `eslint-disable`), then all copy is hardcoded Thai (lines 109, 142-184). Calling hooks only to discard them is wasteful and misleading; the i18n hook return is thrown away.

**F-GAMES-B21-033 · High · page.tsx:79-101, 92-93**
Synthetic-progress defect (identical to B21-001).

### File 15 — `alchemists-synthesis/page.test.tsx`

**F-GAMES-B21-034 · Medium · page.test.tsx:74-77, 80-88**
Test asserts `fetch` called with `/api/v1/games/alchemists-synthesis/vocabulary` and that a network failure falls back to the game render — but the fallback path (file 16, lines 38-47) silently substitutes 5 hardcoded English/Spanish words. The test *validates* a hidden fallback that masks a broken vocabulary API in production (see B21-036). It confirms graceful degradation but does not flag that students could be served placeholder vocab without any error UX.

**F-GAMES-B21-035 · Low · page.test.tsx:54-57, 99**
Asserts raw i18n keys (`pages.student.gamesPage.games.alchemistsSynthesis.title`, `...backToGames`) because the locale hook is mocked to echo keys. Same key-echo brittleness as B21-015; no real string coverage.

### File 16 — `alchemists-synthesis/page.tsx`

**F-GAMES-B21-036 · High · page.tsx:22-50**
On empty results *or* fetch failure, the page silently injects 5 hardcoded fallback words (Run/Jump/Eat/Sleep/Play with Spanish translations) — duplicated in both the empty branch (30-36) and the catch branch (40-46). Problems: (1) Spanish translations are wrong for a Thai-default app; (2) there is **no** NO_SENTENCES / INSUFFICIENT warning UX like every sentence game has, so students with no saved vocab silently play placeholder content and earn XP on words they never studied — corrupting progress/mastery; (3) no `locale` is sent to the vocabulary endpoint (line 25), unlike sentence games. Significant readiness + progress-integrity defect.

**F-GAMES-B21-037 · Medium · page.tsx:60-66, 64**
`handleComplete` POSTs `score: results.xp` and `accuracy: results.accuracy * 100` (percent) while sentence games send accuracy as a 0–1 fraction. The accuracy unit (fraction vs percent) is **inconsistent across games**, so any shared aggregation/leaderboard will mis-scale this game by 100×. Concrete scoring-contract bug.

**F-GAMES-B21-038 · Low · page.tsx:18, 14**
`useCurrentLocale()` called with no binding (side-effect only) and the locale is never used in the fetch. Dead hook call.

### File 17 — `archers-revenge/page.tsx`

**F-GAMES-B21-039 · High · page.tsx:101**
Back-link points to `/games` (line 101), but every other page in the batch links to `/student/games`. Under the `[locale]/(student)/student/games/...` route group, `/games` is almost certainly a 404 / wrong route. Broken navigation — readiness defect.

**F-GAMES-B21-040 · Low · page.tsx:64-96, 87**
`handleComplete` logs results to `console.log` ("Game completed! XP earned:", line 87) in production code — violates AGENTS.md "avoid free-form console logging in production." Recurs as `console.log` in dragon-flight (B21-043). Also the result contract here (`score`, `timeTaken`, `difficulty`) is yet another distinct `/complete` shape.

**F-GAMES-B21-041 · Info · page.tsx:28-62, 46**
Positive: uses `hasFetchedRef` to guard double-fetch (StrictMode-safe) and enforces a real `>= 15` vocabulary gate with a localized error via `t("notEnoughWords", { count: "15" })`. This is the correct readiness pattern; contrast with alchemists-synthesis's silent fallback (B21-036).

### File 18 — `dragon-flight/page.test.tsx`

**F-GAMES-B21-042 · Low · page.test.tsx:42-49, 84-96**
Solid test: mocks the game component, drives `onComplete`, and asserts the shared store records `lastXp`/`lastAccuracy`. However it never asserts the `/complete` POST body, so the real network contract (including `dragonCount`, `timeTaken`, `difficulty` in file 19) is untested. Better than the potion-rush test but still leaves the server payload uncovered.

### File 19 — `dragon-flight/page.tsx`

**F-GAMES-B21-043 · Medium · page.tsx:90-100, 94**
Sends real `correctAnswers`/`totalAttempts` (good — matches haunted-library, not the synthetic majority) plus `dragonCount`/`timeTaken`/`difficulty`. But `console.log("Game completed! XP earned:", data.xpEarned)` (line 94) is production logging (same as B21-040). Also `setXpEarned`/`setResults` are stored into state that is immediately discarded (`const [, setXpEarned]`, lines 23-24) — the XP-earned value from the server is captured but never displayed to the student, so the player gets no post-game XP feedback on this path.

**F-GAMES-B21-044 · Low · page.tsx:44, 151**
Gate is `vocabulary.length >= 10` here vs `>= 15` in archers-revenge (B21-041). Per-game thresholds are reasonable, but they are hardcoded magic numbers duplicated in the fetch check and the render guard (drift risk: change one, forget the other).

### File 20 — `dragon-rider/page.test.tsx`

**F-GAMES-B21-045 · Medium · page.test.tsx:7-15**
The test wholesale mocks the `react` module to stub `React.use`, returning `{ locale: "en" }` for any promise. This is a heavy, fragile mock that replaces a core dependency; it can mask real `use(params)` suspense/async behavior and breaks if React internals shift. The corresponding `dragon-rider/page.tsx` is **not in this batch**, so the test's assertions about loading text ("Loading Dragon Rider") and vocab rendering cannot be validated against the actual page here.

**F-GAMES-B21-046 · Low · page.test.tsx:92-94**
Assertion `expect(...vocabulary.length).toBeGreaterThanOrEqual(0)` is a tautology — length is always `>= 0`. This test line verifies nothing. Dead assertion.

---

## Systemic Themes (cross-file)

1. **Scoring/progress integrity (High).** 8+ sentence pages fabricate `correctAnswers`/`totalAttempts` from `accuracy`/`score` heuristics (B21-001, -004, -012, -017, -025, -028, -031, -033). Server-side progress, mastery, and leaderboards built on these fields are unreliable. Reference: haunted-library, dragon-flight, archers-revenge send real counts — these prove the data is available, so the synthetic versions are pure tech debt.

2. **No shared completion contract (High).** At least 5 distinct `/complete` payload shapes observed (xp+synthetic; score+xp-ratio; raw {xp,accuracy}; +userId; +difficulty/timeTaken). Accuracy is sometimes a 0–1 fraction, sometimes ×100 percent (B21-037). This directly blocks the stated "importability into Reading/Primary" goal — no single Zod input schema can validate these routes.

3. **No shared sentence/vocab type (Medium).** Each game re-declares `{ term; translation }` or imports a per-game `SentenceItem` (B21-030); realm-carver expects a `.text` field instead (B21-020). Divergent contracts.

4. **i18n is inconsistent and largely absent (Medium/High).** Pages import `useScopedI18n` then hardcode strings — some English, some Thai — and suppress the unused hook (B21-002, -005, -011, -026, -028, -031, -032). potion-rush (B21-019) is the only fully-localized page. For a multilingual platform this is a portability blocker.

5. **Difficulty taxonomy mismatch (Medium).** `normal` vs `medium` across games sharing the same leaderboard UI (B21-018) — leaderboard keys won't align.

6. **Test quality is shallow (Medium).** Page tests mock `dynamic`/game components and `fetch`, asserting scaffolding and i18n *keys* (not strings) and never the `/complete` payload — so the scoring bugs above are invisible to the suite (B21-014, -015, -034, -042, -046). Some tests pin hardcoded-language regressions as expected (B21-027).

7. **Navigation/readiness regressions (High/Medium).** archers-revenge links to `/games` (B21-039, likely 404); haunted-library warning links to `/` (B21-009); alchemists-synthesis has no insufficient-data UX and silently serves placeholder vocab (B21-036).

8. **Production logging (Low).** `console.log` of XP in archers-revenge and dragon-flight (B21-040, -043) violates AGENTS.md logging guidance.

9. **Accessibility (mixed).** Only potion-rush adds 44px touch targets (B21-019); other pages' difficulty/tab buttons and icon-only back links lack explicit target sizing and `aria-label`s. Konva canvas a11y is out-of-batch (components not reviewed).

---

## Limitations

- **Components & routes out of scope.** Game canvas components (`@/components/games/...`) and all `/api/v1/games/.../{sentences,vocabulary,complete,ranking}` route handlers are not in this batch. Claims about runtime rendering, the *receiving* end of the scoring contract, server-side validation, XP math, and asset loading were spot-checked read-only at most and are otherwise unverified. The scoring-integrity findings describe what the **page sends**; whether the route compensates is not confirmed here.
- **`dragon-rider/page.tsx` absent.** File 20 is a test for a page not included in the batch; its assertions could not be validated against the implementation.
- **Assets/audio/performance/mobile/browser.** Not directly testable from page shells. Cover-image naming inconsistencies were observed in `gameCards.ts` but the actual asset files, audio, frame-rate, and cross-browser/mobile behavior live in the (out-of-batch) components and `public/` and were not exercised. Touch-target observations are static (code-level), not device-tested.
- **i18n correctness.** Whether hardcoded Thai/English literals have corresponding translation keys was not exhaustively cross-referenced against `locales/`; findings are based on the literals present in these files.
- **No build/test execution.** This review did not run `jest`, lint, or typecheck; findings are from static reading plus targeted read-only `grep`/`ls` verification noted above.
- **Severity is reviewer judgment** scoped to game-readiness and cross-app importability; product owners may reprioritize.

---

*This is a line-by-line review report only. It makes no acceptance or closeout determination for the batch or the track; those decisions belong to the track's review/acceptance phase.*
