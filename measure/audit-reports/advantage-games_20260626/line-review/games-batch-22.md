# Line-by-Line Review — games-batch-22

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-22`
**Scope source:** `/tmp/opencode/games-batch-22` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is a mix of vocabulary game **pages** (`page.tsx`), their **page tests** (`page.test.tsx`), the local **leaderboard page**, the `[locale]` **layout**, and four **API route** files (`abyssal-well`, `alchemists-synthesis`, `archers-revenge`). Supporting files (`@/lib/games/api/*`, `useSession`, `useLeaderboard`, `useCurrentLocale`, route directories) were inspected read-only to verify claims.
**Finding ID scheme:** `F-GAMES-B22-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `.../games/vocabulary/dragon-rider/page.tsx` | game page |
| 2 | `.../games/vocabulary/enchanted-library/page.test.tsx` | page test |
| 3 | `.../games/vocabulary/enchanted-library/page.tsx` | game page |
| 4 | `.../games/vocabulary/magic-defense/page.test.tsx` | page test |
| 5 | `.../games/vocabulary/magic-defense/page.tsx` | game page |
| 6 | `.../games/vocabulary/paladins-twin-soul/page.tsx` | game page |
| 7 | `.../games/vocabulary/rpg-battle/page.test.tsx` | page test |
| 8 | `.../games/vocabulary/rpg-battle/page.tsx` | game page |
| 9 | `.../games/vocabulary/rune-match/page.test.tsx` | page test |
| 10 | `.../games/vocabulary/rune-match/page.tsx` | game page |
| 11 | `.../games/vocabulary/wizard-vs-zombie/page.test.tsx` | page test |
| 12 | `.../games/vocabulary/wizard-vs-zombie/page.tsx` | game page |
| 13 | `.../student/leaderboard/page.tsx` | leaderboard page |
| 14 | `.../[locale]/layout.tsx` | locale layout |
| 15 | `.../api/v1/games/abyssal-well/complete/route.ts` | API route |
| 16 | `.../api/v1/games/abyssal-well/sentences/route.ts` | API route |
| 17 | `.../api/v1/games/alchemists-synthesis/complete/route.ts` | API route |
| 18 | `.../api/v1/games/alchemists-synthesis/vocabulary/route.ts` | API route |
| 19 | `.../api/v1/games/archers-revenge/complete/route.test.ts` | route test |
| 20 | `.../api/v1/games/archers-revenge/complete/route.ts` | API route |

---

## Cross-Batch Verification Performed (read-only)

- `@/lib/games/api/{completeRoute,vocabularyRoute,sentencesRoute,types}.ts` inspected — confirms the shared factory contract used by files 15–20. Confirmed.
- `createCompleteRoute` is a **mock**: returns `mock-activity-${Date.now()}`, no DB write, no auth (`completeRoute.ts:4-24`). Confirmed.
- `useSession` (`src/hooks/useSession.ts:1-16`) is a **hard-coded mock** returning `mock-user-id`, `xp:0`, always `authenticated`. No real auth anywhere in this app. Confirmed.
- `enchanted-library` route directory contains only `vocabulary/` and `complete/` — **no `ranking/` route** exists, but `page.tsx:89,132` fetch `/api/v1/games/enchanted-library/ranking`. Confirmed missing.
- `dragon-rider` route dir has `vocabulary/` + `complete/`; page references match. Confirmed.
- `useLeaderboard` is **localStorage-only** (`useLeaderboard.ts:14-28`); leaderboard page reads it but no game page in this batch calls `recordSession`. Confirmed.
- `force-static` is set on every API route (files 15–20) — dynamic per-user data cannot be served from these endpoints. Confirmed.

---

## Findings

### File 1 — `dragon-rider/page.tsx`

**F-GAMES-B22-001 · High · page.tsx:99-100,113**
Back links are hard-coded to `/en/student/games` (absolute, locale-pinned to `en`) in both the error state and the main view, even though the page computes `pageLocale` (line 19) and is rendered under `[locale]`. A non-`en` user (e.g. `th`) is bounced to the English route. Every other page in this batch uses locale-relative `/student/games`; this file is the outlier and breaks i18n navigation/importability into Reading/Primary where locale routing matters.

**F-GAMES-B22-002 · Medium · page.tsx:36-46**
Vocabulary success path is gated on `vocabRes.ok && vocabData.vocabulary`, but the shared `createVocabularyRoute` returns `warning: NO_VOCABULARY/INSUFFICIENT_VOCABULARY` **with HTTP 200 and an empty/short `vocabulary` array** (`vocabularyRoute.ts:14-30`). The warning branch is handled, but a short-but-nonzero list (1–4 words, `INSUFFICIENT_VOCABULARY`) sets `error` correctly only because the factory emits the warning — there is no client-side minimum-count guard. If the factory contract ever drops the warning, the game launches with too few words. No defense-in-depth on word count.

**F-GAMES-B22-003 · Low · page.tsx:61-75**
`handleComplete` POSTs `{ xp, accuracy }` to `/complete`, but the shared route reads `correctAnswers, totalAttempts, xp` (`completeRoute.ts:9`). `accuracy` is ignored server-side and `correctAnswers/totalAttempts` are `undefined` → server `accuracy=0`. XP is preserved only because the client supplies `xp`. Scoring contract between page and route is loosely coupled and undocumented.

### File 2 — `enchanted-library/page.test.tsx`

**F-GAMES-B22-004 · Medium · page.test.tsx:6-14**
`jest.mock("react", ...)` globally overrides `React.use` for the whole test file. This is brittle: it short-circuits Suspense/`use()` semantics and any other consumer of `React.use`, and the mock returns a fixed `{locale:'en'}` regardless of the promise passed in (line 70 passes a real promise that is ignored). Tests pass without exercising the actual param-resolution path.

**F-GAMES-B22-005 · Medium · page.test.tsx:74,88,101**
The loading assertion waits for Thai text `/กำลังโหลดคำศัพท์/i` to disappear. The page's loading copy (`page.tsx:152`) is a hard-coded Thai string `"กำลังโหลดคำศัพท์"` — see B22-008. The test enshrines an i18n bug as expected behavior, coupling an English-locale test to a Thai literal.

**F-GAMES-B22-006 · Low · page.test.tsx:18-29**
`next/dynamic` is mocked to a no-op component, so the test never verifies the real dynamic import path, `ssr:false` behavior, or that the Konva game mounts. Combined with the store mock (lines 51-56) returning a fixed `{vocabulary:[], setVocabulary}` that omits `setLastResult`, the test surface is shallow — it asserts headings/links but not game wiring.

### File 3 — `enchanted-library/page.tsx`

**F-GAMES-B22-007 · High · page.tsx:89,131-133**
Page fetches `/api/v1/games/enchanted-library/ranking` on mount and again after completion, but **no `ranking` route exists** (only `vocabulary/` and `complete/`). The fetch 404s; `data.rankings` is undefined so the catch/guard silently leaves rankings empty. The entire Rankings tab and post-game leaderboard refresh (lines 130-137) are dead — leaderboard feature is non-functional. Directly impacts the scoring/leaderboard focus area.

**F-GAMES-B22-008 · Medium · page.tsx:152**
Loading message is a hard-coded Thai literal `"กำลังโหลดคำศัพท์"` instead of an i18n key. All other UI in this file is English ("Enchanted Library", "Back to Games"). Mixed-language UX is inappropriate for an English-locale render and breaks age-appropriate, localized presentation.

**F-GAMES-B22-009 · High · page.tsx:114-118**
XP/accuracy bookkeeping sent to `/complete` is mathematically nonsensical: `correctAnswers: Math.floor(results.xp / results.accuracy)` and `totalAttempts: Math.floor(results.xp / results.accuracy / results.accuracy)`. If `accuracy` is a fraction (0–1) this inflates counts; if `accuracy` is 0 it yields `Infinity`/`NaN`; the derived `totalAttempts` divides by accuracy twice with no basis. Reported correct/attempt counts are fabricated, corrupting any progress/analytics that consume them.

**F-GAMES-B22-010 · Low · page.tsx:42-49**
`difficulty` defaults to `"normal"` and the Difficulty type includes `extreme` (`enchantedLibrary`), but the page never renders a difficulty selector at the page level — it is delegated to the game via `onDifficultyChange`. Rankings are bucketed by all four difficulties (lines 44-49, 249) yet only the game can change it; verify the game actually surfaces all four tiers or the `easy/hard/extreme` buckets stay permanently empty.

### File 4 — `magic-defense/page.test.tsx`

**F-GAMES-B22-011 · Low · page.test.tsx:116-122**
The `onComplete` test passes `{score:100, correctAnswers:10, totalAttempts:12, accuracy:0.83, difficulty:'normal'}` and only asserts the POST body contains `"score":100`. It does not assert the XP transformation in the page (`xp = floor(correctAnswers*accuracy)` at `page.tsx:66`) nor that `setLastResult` was called. The most error-prone scoring line is untested.

**F-GAMES-B22-012 · Info · page.test.tsx:69-82**
The "insufficient vocabulary" test returns a 1-item list and asserts an `alert` role appears. Good coverage of the <10 branch (`page.tsx:39`). Noted positively; this is the strongest of the page tests in the batch.

### File 5 — `magic-defense/page.tsx`

**F-GAMES-B22-013 · Medium · page.tsx:18-20**
Two `eslint-disable` comments suppress `no-unused-vars` for `locale` and `session`. The page fetches `/api/v1/games/magic-defense/vocabulary` **without a `?locale=` param** (line 32), unlike dragon-rider/paladins/rpg-battle which pass locale. Vocabulary cannot be localized for this game; the unused `locale` is a latent bug, not a clean no-op.

**F-GAMES-B22-014 · Low · page.tsx:66**
`xp = Math.floor(results.correctAnswers * results.accuracy)`. If `accuracy` is a 0–1 fraction this is plausible, but `wizard-vs-zombie` (B22-022) multiplies accuracy by 100 before sending, and `rpg-battle` uses a dedicated XP module. There is **no shared XP formula** across games in this batch — each page invents its own, undermining cross-game XP comparability and leaderboard fairness.

### File 6 — `paladins-twin-soul/page.tsx`

**F-GAMES-B22-015 · Medium · page.tsx:63-66**
Vocabulary fetch is gated behind `if (isAuthenticated)`. Since `useSession` is a mock that is always authenticated (`useSession.ts:13`), this works today, but the moment real auth lands, an unauthenticated/loading session leaves `isLoading` stuck at `true` forever (the effect never runs, nothing clears the initial `true`). No timeout or unauthenticated branch — a readiness hazard for the auth migration.

**F-GAMES-B22-016 · Low · page.tsx:50-53**
Success requires `data.vocabulary.length > 0`; there is no minimum-count enforcement for a game that presumably needs several pairs. A 1–2 word list would start the game. Inconsistent with rpg-battle (`>=5`) and magic-defense (`>=10`). Per-game thresholds are ad hoc.

**F-GAMES-B22-017 · Info · page.tsx:91-92,113,133**
Title/description "Paladin's Twin-Soul" / "Defend the realm…" are hard-coded English literals rather than `t(...)` keys, unlike magic-defense/rpg-battle which use `useScopedI18n`. Inconsistent i18n discipline; not localizable.

### File 7 — `rpg-battle/page.test.tsx`

**F-GAMES-B22-018 · Medium · page.test.tsx:68-112**
The test deeply mocks `useRPGBattleStore` with `Object.assign`, hand-stubbing 20+ store fields and `getState` returning a *different* status (`"playing"`) than the hook (`"idle"`). This dual-truth mock is fragile and can mask real store-page contract drift; tests "start the battle" (line 178) and "battle-stage" (line 191) depend on internal store wiring that is entirely faked, so they assert against the mock, not the component's real behavior.

**F-GAMES-B22-019 · Low · page.test.tsx:195-213**
The location-background test asserts `stage.style.backgroundImage` contains `background_magic_arena.png`, hard-coding an asset filename in the test. If the asset path/name changes this breaks; the asset itself is not verified to exist (no fs check). Asset-readiness is assumed, not tested.

### File 8 — `rpg-battle/page.tsx`

**F-GAMES-B22-020 · Medium · page.tsx:386-391**
Inline `SpeechSynthesisUtterance` with `utterance.lang = "en-US"` and comment "Assume English terms for now" speaks every term in en-US TTS regardless of the term's actual language. For non-English vocabulary this mispronounces words, an accessibility/age-UX defect. TTS is also invoked directly in the page rather than via a shared adapter — not feature-detected beyond the `"speechSynthesis" in window` guard, and never cancelled (rapid answers stack utterances).

**F-GAMES-B22-021 · Low · page.tsx:121-134,347-360,397-401**
Multiple `setTimeout`/`Math.random` driven effects (floating text 1000ms auto-remove, 600ms enemy turn, 200ms crit, 800ms crit chance) run without cleanup on unmount except the results timeout (line 112). If the player navigates away mid-animation, these timers fire on an unmounted tree → React state-update-after-unmount warnings and potential leaks. Mobile/performance and stability concern.

### File 9 — `rune-match/page.test.tsx`

**F-GAMES-B22-022 · Medium · page.test.tsx:50-58**
Three of six tests (`renders without crashing`, `displays game title`, `displays game description`, `includes back to games link`) are **synchronous** and run before the `useEffect` fetch resolves, yet the suite mocks `next/dynamic` to a static component and the store to empty vocabulary. The "sets sample vocabulary if empty" test (line 76) only asserts `setVocabulary` was called — it does not verify `SAMPLE_VOCABULARY` was the argument, so the fallback-content path (`page.tsx:41,45`) is unverified.

### File 10 — `rune-match/page.tsx`

**F-GAMES-B22-023 · Medium · page.tsx:34,39-46**
On any API failure OR empty result, the page silently falls back to `SAMPLE_VOCABULARY` (lines 41, 45) with only a `console.warn`. Unlike every other game in the batch, there is **no error UI and no minimum-count gate** — students always get the same hard-coded sample words when their flashcards are empty, masking the "go save words first" guidance other games show. This undermines the learning loop and hides backend failures.

**F-GAMES-B22-024 · Low · page.tsx:34**
Fetch omits `?locale=` (like magic-defense, B22-013), so rune-match vocabulary is not localizable. Also `useScopedI18n`-driven title/description are used but the data layer is locale-blind — inconsistent localization.

### File 11 — `wizard-vs-zombie/page.test.tsx`

**F-GAMES-B22-025 · Low · page.test.tsx:46-50,59-64**
Two tests are synchronous (`renders the page title`, `contains a link back to games`) and never await the fetch effect; only one test awaits the game component. The fallback vocabulary path (`page.tsx:32-49`) and `handleComplete` POST are entirely untested. No assertion that `accuracy*100` transformation (B22-026) is correct.

### File 12 — `wizard-vs-zombie/page.tsx`

**F-GAMES-B22-026 · Medium · page.tsx:67**
`accuracy: results.accuracy * 100` is sent to `/complete`, whereas magic-defense sends raw fractional accuracy and dragon-rider sends `accuracy` unmultiplied. The `/complete` factory does not consume the posted `accuracy` (it recomputes), but any future server logic or analytics will receive **inconsistent accuracy units (0–1 vs 0–100) across games**. Scoring-data normalization defect.

**F-GAMES-B22-027 · Medium · page.tsx:31-49**
Hard-coded Spanish fallback vocabulary (`Correr/Saltar/...`) is injected on empty result or fetch error, duplicated in both the success-else and catch branches. Like rune-match (B22-023) there is no error UI; a student with no saved words silently plays with fixed Spanish translations regardless of their target language — wrong-language content is an age/UX and pedagogy defect.

**F-GAMES-B22-028 · Low · page.tsx:97**
`XP: {session?.user?.xp || 0}` reads from the mock session which always returns `xp:0` (`useSession.ts:6`). The XP display is permanently `0` until real auth/profile data exists. Cosmetic now, but the leaderboard/XP surface is non-functional.

### File 13 — `student/leaderboard/page.tsx`

**F-GAMES-B22-029 · High · page.tsx:20,22 + useLeaderboard.ts:14-28**
The leaderboard is backed entirely by `localStorage` (`useLeaderboard`), so it is **per-device, per-browser, not server-backed and not cross-user**. It cannot function as a real class/school leaderboard, will reset on cache clear, and never syncs with the `/complete` endpoints. None of the game pages in this batch call `recordSession`, so this page will show empty data even after playing those games — the local leaderboard and the API `/complete` flow are two disconnected systems. Major readiness gap for the scoring/leaderboard/progress focus area.

**F-GAMES-B22-030 · Medium · page.tsx:37-43,174**
"Back to Arcade" and "Explore Games" links point to `/` (root), but the games live under `/[locale]/student/games`. Within the `[locale]/(student)` segment, `/` is not the games menu — these links escape the student area and ignore locale. Navigation/i18n defect.

**F-GAMES-B22-031 · Low · page.tsx:9-17,149**
`formatDate` hard-codes `'en-US'` locale and `session.accuracy` is rendered as `{accuracy}%` with no normalization — if upstream stores accuracy as a fraction it shows `0.83%`. Date is not localized for non-English users.

### File 14 — `[locale]/layout.tsx`

**F-GAMES-B22-032 · High · layout.tsx:3-5**
`generateStaticParams` returns only `[{ locale: "en" }]`. Combined with the `force-static` API routes (files 15–20), the entire app is effectively English-only at build time. Any non-`en` locale route is not pre-generated; this contradicts the locale-aware fetches in the game pages and blocks importability into multi-locale Reading/Primary apps without rework.

**F-GAMES-B22-033 · Low · layout.tsx:7-14**
The layout receives `params: Promise<{locale}>` but never reads it — no `<html lang>`, no i18n provider, no locale propagation. It is a pass-through. Whatever locale context the pages rely on (`useCurrentLocale`) must come from elsewhere; this layout provides no locale binding, so `lang` accessibility attribute is never set per-locale.

### File 15 — `abyssal-well/complete/route.ts`

**F-GAMES-B22-034 · High · route.ts:3,5 + completeRoute.ts:4-24**
`export const dynamic = "force-static"` on a `POST` route that is supposed to persist game results. The shared `createCompleteRoute` is a pure mock: it computes `xpEarned` in-memory, returns a fake `mock-activity-${Date.now()}`, performs **no auth, no validation, no DB write, no tenant/schoolId scoping**. Game completion/XP/progress is not actually saved anywhere. This is the central readiness blocker for scoring/XP/progress across the whole app, surfaced via this file.

**F-GAMES-B22-035 · Low · route.ts:1-7**
No Zod (or any) validation of the request body; `body: CompleteRequest = await request.json()` trusts the client shape entirely. Per AGENTS.md every backend boundary must validate input with Zod. Applies to all four complete/vocabulary routes in this batch.

### File 16 — `abyssal-well/sentences/route.ts`

**F-GAMES-B22-036 · Medium · route.ts:2,6 + sentencesRoute.ts:4-35**
Sentences are served from a static `SAMPLE_SENTENCES` constant via `force-static`. Every user of abyssal-well gets the same hard-coded sentences regardless of their saved/learned content. The factory's `NO_SENTENCES`/`INSUFFICIENT_SENTENCES` warnings (sentencesRoute.ts:13-29) can never trigger because the sample list is fixed and non-empty. The game is a static demo, not connected to real per-student data.

### File 17 — `alchemists-synthesis/complete/route.ts`

**F-GAMES-B22-037 · Info · route.ts:1-6**
Identical mock-completion pattern as B22-034 (same `createCompleteRoute`, same `force-static`). Same persistence/auth/validation gaps apply. Note the `import dynamic` ordering places `export const dynamic` (line 2) before the `SAMPLE_VOCABULARY` import in the sibling vocabulary file (B22-038) — stylistic inconsistency across the pair.

### File 18 — `alchemists-synthesis/vocabulary/route.ts`

**F-GAMES-B22-038 · Medium · route.ts:1-7**
Vocabulary served from static `SAMPLE_VOCABULARY` via `force-static` (same as abyssal-well sentences, B22-036). No locale handling, no per-user flashcard data, warnings unreachable. Line 2 `export const dynamic` is interleaved between two imports (lines 1 and 3) — works in TS but unconventional ordering that linters may flag.

### File 19 — `archers-revenge/complete/route.test.ts`

**F-GAMES-B22-039 · Medium · route.test.ts:30-33**
The test asserts `xpEarned` is `16` for `{correctAnswers:18, totalAttempts:20}`. Since the request omits `xp`, the route computes `floor(18 * (18/20)) = floor(16.2) = 16`. The test also asserts `activityId` matches `/^mock-activity-/` — i.e. it **codifies the mock behavior as the expected contract**, locking in the non-persistent placeholder. When real persistence is added, this test must change; it provides false confidence that completion "works."

**F-GAMES-B22-040 · Low · route.test.ts:3-13**
`MockRequest` is a hand-rolled stand-in cast `as unknown as Request`; it only implements `json()`. The test never exercises Next.js `NextRequest` semantics, headers, auth, or error paths (malformed body, missing fields). Single happy-path test for a route that should validate input.

### File 20 — `archers-revenge/complete/route.ts`

**F-GAMES-B22-041 · Info · route.ts:1-7**
Identical to abyssal-well/alchemists complete routes — thin re-export of the shared mock factory with `force-static`. Confirms the shared-runtime pattern is consistently applied (a positive for maintainability) but propagates the same persistence/auth/validation deficits (B22-034, B22-035) to every game uniformly.

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Completion/XP/progress is a non-persistent mock (`force-static`, no DB, no auth, no Zod) | B22-003, B22-034, B22-035, B22-037, B22-039, B22-041 | High |
| Leaderboard is localStorage-only, disconnected from `/complete`; pages never call `recordSession` | B22-007, B22-028, B22-029 | High |
| Vocabulary/sentences served from static SAMPLE_* constants, no per-user/localized data | B22-013, B22-024, B22-027, B22-036, B22-038 | Medium |
| App is effectively English-only (`generateStaticParams` en, hard-coded en links/strings) — blocks Reading/Primary import | B22-001, B22-008, B22-017, B22-030, B22-031, B22-032, B22-033 | High |
| No shared/consistent XP & accuracy formula across games (0–1 vs 0–100; bespoke math) | B22-009, B22-014, B22-026 | Medium |
| Inconsistent / absent minimum-vocabulary gates and error UX (silent fallback vs alert) | B22-002, B22-016, B22-023, B22-027 | Medium |
| Shallow/brittle page tests (global React mock, mock-driven assertions, untested scoring paths) | B22-004, B22-005, B22-006, B22-011, B22-018, B22-019, B22-022, B22-025, B22-039, B22-040 | Medium |
| Auth is a hard-coded mock; auth-gated effects will hang under real auth | B22-015, B22-028 | Medium |
| TTS hard-coded en-US, not cancelled, no shared adapter; timers without unmount cleanup | B22-020, B22-021 | Medium |

---

## Limitations

- This is a **static, read-only review**. I did not execute the games, run the Jest suites, measure FPS, render on mobile/real browsers, or exercise the actual Konva game components (which are dynamically imported and out of this batch's file list).
- Game logic/components referenced by the pages (`DragonRiderGame`, `EnchantedLibraryGame`, `RPGBattle*`, `RuneMatchGame`, `WizardZombieGame`, `GameContainer`, `BattleSelectionModal`, etc.) were **not** in this batch and were not reviewed; findings about scoring/difficulty are scoped to what the page layer constructs and sends.
- Route persistence/auth claims are based on inspecting the shared `@/lib/games/api/*` factories and `useSession`; I confirmed they are mocks but did not trace whether a real backend is wired elsewhere (none found in the inspected scope).
- The missing `enchanted-library/ranking` route (B22-007) was verified by directory listing; I did not search the entire repo for an alternative handler — it may be intended for a future track.
- Accuracy-unit and XP-formula inconsistencies are reasoned from the literal arithmetic in each page; downstream consumers were not traced beyond the `/complete` factory.
- Findings are scoped strictly to the 20 files in `/tmp/opencode/games-batch-22`. Supporting files were consulted only to validate claims and are not themselves under review.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
