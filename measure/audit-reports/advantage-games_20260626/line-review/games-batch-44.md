# Line-by-Line Review — games-batch-44

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-44`
**Scope source:** `/tmp/opencode/games-batch-44` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch mixes **scaffolding templates** (`*.template`), **shared runtime type modules** (`src/types/*.ts`), **unit tests** (Jest/Vitest), **committed Playwright artifacts** (`test-results/*`), and **Playwright E2E specs + fixtures**.
**Finding ID scheme:** `F-GAMES-B44-###`
**Severity scale:** Critical / High / Medium / Low / Info

Supporting files read for context only (not in batch, not scored): `src/lib/xp.ts`, `src/lib/games/xp.ts`, `tests/e2e/helpers/gameHelpers.ts`, `tests/e2e/helpers/screenshotHelpers.ts`, `src/app/[locale]/(student)/student/games/sentence/devourer-slime/page.tsx`, `jest.config.ts`.

---

## Files Reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `src/templates/game/api/vocabulary-route.ts.template` | template (API) |
| 2 | `src/templates/game/gameName.ts.template` | template (game logic) |
| 3 | `src/templates/game/page.tsx.template` | template (page, vocab v1) |
| 4 | `src/templates/game/sentence/page.tsx.template` | template (page, sentence) |
| 5 | `src/templates/game/vocab.json.template` | template (sample data) |
| 6 | `src/templates/game/vocabulary/page.tsx.template` | template (page, vocab v2) |
| 7 | `src/types/accessibility.ts` | runtime types |
| 8 | `src/types/adaptive-difficulty.test.ts` | test |
| 9 | `src/types/adaptive-difficulty.ts` | runtime types |
| 10 | `src/types/leaderboard.test.ts` | test |
| 11 | `src/types/leaderboard.ts` | runtime types |
| 12 | `src/types/multiplayer.test.ts` | test |
| 13 | `src/types/multiplayer.ts` | runtime types |
| 14 | `test-results/.last-run.json` | committed test artifact |
| 15 | `test-results/.../error-context.md` | committed test artifact |
| 16 | `test-results/.../test-failed-1.png` | committed binary artifact |
| 17 | `tests/e2e/fixtures/gameFixtures.ts` | E2E fixtures |
| 18 | `tests/e2e/games/sentence/abyssal-well.spec.ts` | E2E spec |
| 19 | `tests/e2e/games/sentence/castle-defense.spec.ts` | E2E spec |
| 20 | `tests/e2e/games/sentence/devourer-slime.spec.ts` | E2E spec |

---

## Findings

### File 1 — `src/templates/game/api/vocabulary-route.ts.template`

**F-GAMES-B44-001 · Medium · vocabulary-route.ts.template:1-4**
The scaffolded vocabulary route only exports `GET` wired to the hard-coded `SAMPLE_VOCABULARY`. There is no locale handling, no real content source, and no `complete`/POST handler — yet every generated page template (Files 4, 6) POSTs to `/api/v1/games/<name>/complete` and fetches `?locale=`. The template generates a page that calls endpoints the route template does not scaffold, so a freshly-generated game is broken until the author hand-writes the missing route. Importability into Reading/Primary is undefined: the template never shows how to swap `SAMPLE_VOCABULARY` for host-provided content.

**F-GAMES-B44-002 · Low · vocabulary-route.ts.template:1-2**
Uses `@/lib/games/api` and `@/lib/games/sampleVocabulary`, but the v1 page template (File 3) imports `@/lib/vocabLoader` and `@/lib/gameName` (no `games/` segment). The template set ships two incompatible path conventions; a generator that emits all of them produces import errors.

### File 2 — `src/templates/game/gameName.ts.template`

**F-GAMES-B44-003 · Medium · gameName.ts.template:46-50**
Decoy selection can equal the correct answer whenever `vocabulary.length === 1` (the `if (... && vocabulary.length > 1)` guard skips re-rolling), producing a round where both choices are identical. Single-item vocab packs (plausible for a struggling student or a sparse host import) yield an unplayable/degenerate round with no fallback.

**F-GAMES-B44-004 · Medium · gameName.ts.template:75-87 vs 117-119**
Scoring uses two unrelated scales in one module: gameplay accrues `score + 10` per correct answer (line 82), while `getGameResults` derives XP via `calculateXP(score, correctAnswers, attempts)` from `@/lib/games/xp`. As the canonical template every new game copies, it bakes in the score-vs-XP divergence flagged across this suite. There is no documented contract for what the host leaderboard consumes (`score` raw vs `xp` capped).

**F-GAMES-B44-005 · Low · gameName.ts.template:35**
`pickIndex` uses `Math.floor(rng() * max)` with a `Math.min(max-1, …)` clamp. The clamp only fires for the degenerate `rng() === 1.0` case; otherwise fine — but the default `rng = Math.random` (lines 64, 78, 92) means the reducer is non-deterministic by default, undermining replay/leaderboard verification unless every caller injects a seeded RNG. Template offers no seeded default.

**F-GAMES-B44-006 · Low · gameName.ts.template:37-44**
Empty-vocabulary `createRound` returns blank strings rather than signalling an error/empty state. A generated game fed an empty pack silently renders empty rounds instead of showing the "insufficient content" UX that real games (e.g. devourer-slime page) implement. The template does not model the warning/empty path.

### File 3 — `src/templates/game/page.tsx.template`

**F-GAMES-B44-007 · High · page.tsx.template:3**
`import dynamic from 'next/dynamic'` is imported but never used; the component is rendered directly as `<GameNameGame>` (line 46) with no `ssr:false` wrapper. Canvas/React-Konva games must be dynamically imported with SSR disabled (as the sentence/devourer-slime pages do). This template both (a) trips the no-unused-vars lint rule and (b) teaches the wrong pattern — a generated Konva game will attempt SSR and crash on `window`/`canvas`.

**F-GAMES-B44-008 · Medium · page.tsx.template:39-44, 11-50**
No i18n: title ("Game Name"), description, and "Back to Home" are hard-coded English, unlike the sentence/vocabulary templates (Files 4, 6) which use `useScopedI18n`. Generating from this template produces an untranslated page, regressing locale support and contradicting the multi-locale fetch pattern used elsewhere.

**F-GAMES-B44-009 · Low · page.tsx.template:8, 16-20**
Uses `loadVocabulary('game-name')` (client loader) while the other two page templates `fetch('/api/v1/games/.../vocabulary?locale=')`. Three templates, three data-loading strategies, no shared abstraction — inconsistent runtime and a maintenance/importability hazard. No loading state and no completion POST here, so results are never persisted to a leaderboard.

### File 4 — `src/templates/game/sentence/page.tsx.template`

**F-GAMES-B44-010 · Medium · sentence/page.tsx.template:20-26, 42-44**
`fetch(...).then(res => res.json())` never checks `res.ok`; a 404/500 from the sentences endpoint will attempt to `setVocabulary(data.sentences)` on an error body (`data.sentences` undefined). The recorded E2E failure for devourer-slime (File 15, a 404 page) is exactly the failure mode this unguarded fetch cannot surface gracefully.

**F-GAMES-B44-011 · Medium · sentence/page.tsx.template:43**
`console.log('Game completed:', data)` ships debug logging into generated production pages. AGENTS.md explicitly forbids free-form console logging in production code. Same anti-pattern is duplicated in the vocabulary template (File 6, line 41).

**F-GAMES-B44-012 · Medium · sentence/page.tsx.template:32-44, 29-47**
The completion POST is fire-and-forget and unauthenticated: no credentials, no CSRF token, no `res.ok` handling, and the promise is not awaited before the handler returns. Result submission silently drops on failure, so XP/progress can be lost with no user feedback. The real devourer-slime page (`await fetch`, try/catch) is closer but still lacks auth/CSRF — a cross-cutting gap for any host integration.

**F-GAMES-B44-013 · Low · sentence/page.tsx.template:27, 46**
`useEffect` dependency array is `[setVocabulary, locale]` but the hook also references `setVocabulary` from a re-created store selector; `handleComplete` deps are `[setLastResult]` while the body also uses the literal endpoint path — fine, but the missing `locale` exhaustive-deps consistency between the two templates (sentence omits nothing, vocabulary identical) suggests copy-paste without review. Indentation inside `handleComplete` (lines 31-45) is misaligned, indicating unreviewed generated output.

### File 5 — `src/templates/game/vocab.json.template`

**F-GAMES-B44-014 · Low · vocab.json.template:1-12**
Sample pack hard-codes Thai `term` with English `translation`. This bakes a single language-pair assumption into every scaffolded game. For a platform serving multiple locales (Reading/Primary import target), the sample should be locale-neutral or documented as placeholder-only; otherwise generated games ship Thai sample content by default.

**F-GAMES-B44-015 · Info · vocab.json.template:1-12**
Only 10 items, no `id`/part-of-speech/difficulty metadata. The shared `VocabularyItem` is `{term, translation}` only (confirmed in `multiplayer.ts:25-28`), so adaptive difficulty (File 9) and packs cannot key off item-level difficulty. Acceptable for a sample, but signals the content model lacks difficulty metadata end-to-end.

### File 6 — `src/templates/game/vocabulary/page.tsx.template`

**F-GAMES-B44-016 · Medium · vocabulary/page.tsx.template:18-24, 40-42**
Same unguarded `res.json()` (no `res.ok`) and `console.log('Game completed', data)` (line 41) as File 4. Two near-identical page templates exist (`sentence/` and `vocabulary/`) differing only in import paths and `data.sentences` vs `data.vocabulary`; the duplication doubles maintenance and guarantees fixes drift between them.

**F-GAMES-B44-017 · Low · vocabulary/page.tsx.template:4-6**
Imports `GameNameGame` from `@/components/games/vocabulary/game-name/...` and `GameResults` from `@/lib/games/gameName`, whereas File 3 uses `@/components/game-name/...` and `@/lib/gameName`. Two divergent vocabulary page templates with conflicting module layouts coexist; a generator user cannot tell which is canonical.

### File 7 — `src/types/accessibility.ts`

**F-GAMES-B44-018 · Medium · accessibility.ts:33-49**
`deserializeAccessibilitySettings` validates only the *type* of each field (`typeof === 'number'`), not its range. A persisted/tampered `textSizeMultiplier: -5` or `1e9`, or `touchTargetMultiplier: 0`, passes validation and is returned verbatim, breaking layout/touch targets. No clamping to a sane min/max. AGENTS.md mandates runtime validation (Zod) at external boundaries; `localStorage` is an external boundary and this is hand-rolled, range-blind validation.

**F-GAMES-B44-019 · Low · accessibility.ts:10-15, 17-19**
`reduceMotion` defaults to `false` and there is no helper to seed it from the OS `prefers-reduced-motion` media query. Accessibility default ignores the user's system setting until they manually toggle it — a missed a11y win for the stated "accessibility" focus.

**F-GAMES-B44-020 · Info · accessibility.ts:1-53**
No exported JSDoc on any function/interface, contrary to the repo documentation standard ("Every exported function … must have a JSDoc comment"). Applies to all four exported functions and the interface. (Same omission recurs in Files 9, 11, 13.)

### File 8 — `src/types/adaptive-difficulty.test.ts`

**F-GAMES-B44-021 · Medium · adaptive-difficulty.test.ts:1-17**
The entire suite asserts only two compile-time constants (`DEFAULT_WINDOW_SIZE`, `WEIGHTS`). There is **zero behavioral coverage**: no function computes a `PerformanceScore`, `PerformanceMetrics`, or adjusts a `DifficultyParam` anywhere in the module under test (File 9 is types-only). This is a tautological test (it restates the literals) and gives false confidence that adaptive difficulty "works" when no algorithm exists.

### File 9 — `src/types/adaptive-difficulty.ts`

**F-GAMES-B44-022 · High · adaptive-difficulty.ts:1-43**
The module is **types and weights only** — there is no implementation that converts `ResponseRecord[]` into `PerformanceScore` or mutates `DifficultyParam.current`. Despite the review's "difficulty" focus and the existence of `WEIGHTS`, no game can consume adaptive difficulty from this module. It is a stub presented as a feature surface.

**F-GAMES-B44-023 · Medium · adaptive-difficulty.ts:25-28**
`DifficultyParams.params` is a `Map<string, DifficultyParam>`. `Map` does not survive `JSON.stringify` (serializes to `{}`), so this shape cannot be persisted to `localStorage` or sent over the multiplayer wire without a custom (de)serializer — none exists. Inconsistent with the JSON-first persistence used by `leaderboard.ts`/`accessibility.ts` and an importability blocker for cross-app state.

**F-GAMES-B44-024 · Low · adaptive-difficulty.ts:39-43**
`WEIGHTS` sum to exactly 1.0 here, and the test asserts it, but nothing enforces that constraint at runtime if the constants are later edited; the invariant lives only in a test that itself restates the literals (see F-GAMES-B44-021). Brittle coupling, no single source of truth.

### File 10 — `src/types/leaderboard.test.ts`

**F-GAMES-B44-025 · Medium · leaderboard.test.ts:71-129**
Round-trip and invalid-JSON cases are well covered, but the suite never tests **per-entry shape validation** — because the implementation (File 11) does none. A `sessions` value that is a non-array (`"sessions": 5`) or sessions with missing `score`/`xp` fields would pass `deserializeLeaderboard` and the tests would not catch it. Tests validate only the three top-level keys' presence, matching the under-validation in the source.

**F-GAMES-B44-026 · Low · leaderboard.test.ts:1-171**
`MAX_SESSIONS` (exported from File 11) is never referenced in any test, and no test asserts the cap is enforced — consistent with the cap being unenforced in source (F-GAMES-B44-028). The leaderboard's most important growth-bounding invariant is untested.

### File 11 — `src/types/leaderboard.ts`

**F-GAMES-B44-027 · Medium · leaderboard.ts:40-50**
`deserializeLeaderboard` checks only that `sessions`, `highScores`, `totalXp` are `!== undefined`, then casts `parsed as LeaderboardState`. It does not verify `sessions` is an array, that each `SessionRecord` has the required numeric fields, or that `totalXp` is a number. Malformed or tampered `localStorage` (an external boundary) flows straight into the leaderboard UI. AGENTS.md requires Zod validation at boundaries; this is hand-rolled and incomplete.

**F-GAMES-B44-028 · Medium · leaderboard.ts:26**
`MAX_SESSIONS = 20` is exported but **never enforced** in this module — no append/insert function trims to the cap. Unbounded `sessions` growth is possible wherever sessions are pushed (logic lives elsewhere), and the constant gives a false impression the bound is guaranteed here.

**F-GAMES-B44-029 · Low · leaderboard.ts:53**
`generateSessionId` uses the deprecated `String.prototype.substr` and `Math.random` — non-cryptographic and, within the same millisecond, collision-prone if many sessions are generated rapidly (the random suffix mitigates but does not guarantee uniqueness). Prefer `crypto.randomUUID()` for a browser-safe, collision-free ID.

**F-GAMES-B44-030 · Low · leaderboard.ts:1-54**
Leaderboard state is entirely client-local (`LEADERBOARD_KEY` localStorage) with no `schoolId`/tenant scoping and no server contract. For import into Reading/Primary (multi-tenant), this model offers no authoritative server-side leaderboard and no per-tenant isolation; it cannot back a shared/class leaderboard as-is.

### File 12 — `src/types/multiplayer.test.ts`

**F-GAMES-B44-031 · Medium · multiplayer.test.ts:82-173**
Tests confirm `deserializeMessage` rejects malformed JSON, missing `type`, and unknown `type`, but **never assert payload validation** — because the source performs none (F-GAMES-B44-032). A `{"type":"join","payload":null}` or a join message missing `roomCode` deserializes "successfully" and the test suite endorses that. The negative-path coverage stops at the discriminator, not the data.

### File 13 — `src/types/multiplayer.ts`

**F-GAMES-B44-032 · High · multiplayer.ts:118-142**
`deserializeMessage` validates only that `type` is a known `MessageType`, then returns `parsed as MultiplayerMessage` with **no payload validation**. WebSocket/network messages are an untrusted external boundary; a malicious or buggy peer can send `{type:"score_submit", payload:{score:"9e99"}}` or omit fields entirely and downstream code will trust it. This is the highest-risk trust-boundary gap in the batch and directly violates the AGENTS.md rule that no external input enters the system without (Zod) validation.

**F-GAMES-B44-033 · Medium · multiplayer.ts:60-68, 92-103**
`ScoreSubmitMessage`/`GameOverMessage` carry client-reported `score`, `wordsCollected`, and `xpBonus` with no server authority or anti-cheat consideration in the type contract. Combined with F-GAMES-B44-032, a peer can self-report arbitrary scores. For a competitive/leaderboard feature this needs server-side validation; the type layer encodes a trust-the-client design.

**F-GAMES-B44-034 · Info · multiplayer.ts:25-28**
A third independent `VocabularyItem` definition (`{term, translation}`) appears here, duplicating the store's and others'. No shared canonical vocabulary type across the suite, hampering importability into a host content model.

### File 14 — `test-results/.last-run.json`

**F-GAMES-B44-035 · High · .last-run.json:1-6 (and File 15, File 16)**
Playwright `test-results/` output is **committed to the repository** (confirmed `git ls-files` tracks all three artifacts; no `.gitignore` entry for `test-results/`). `.last-run.json` records `"status":"failed"`, meaning a **failing run's artifacts are checked in**. These are machine-generated, ephemeral, environment-specific outputs that should be git-ignored. Committing them (a) pollutes diffs, (b) ships a permanently-"failed" status into the tree, and (c) can leak local paths/screenshots.

### File 15 — `test-results/.../error-context.md`

**F-GAMES-B44-036 · High · error-context.md:4-10**
The committed failure context shows the devourer-slime E2E landed on a **Next.js 404 page** ("This page could not be found.") rather than the game. This is evidence the `devourer-slime.spec.ts` (File 20) E2E was failing at capture time — the page never rendered. Either the route was unavailable in the test environment, the dev server wasn't serving the `[locale]/(student)/student/games/sentence/devourer-slime` path, or the URL in `getDevourerSlimeUrl()` (`/en/student/games/sentence/devourer-slime`) does not resolve. A committed, known-failing E2E artifact with no accompanying fix is a readiness red flag for the devourer-slime game.

**F-GAMES-B44-037 · Low · error-context.md:1-11**
The artifact is a point-in-time snapshot with no timestamp or commit reference, so it cannot be correlated to a code state. As a committed file it will go stale and mislead future readers about current test status.

### File 16 — `test-results/.../test-failed-1.png`

**F-GAMES-B44-038 · Medium · test-failed-1.png (binary, ~8.6 KB)**
A binary screenshot of a failed test is committed to git. Binary artifacts bloat the repo, are unreviewable in diffs, and (per F-GAMES-B44-035) belong in `.gitignore`. The filename `test-failed-1.png` confirms it is a failure capture, reinforcing that a failing devourer-slime run was committed.

### File 17 — `tests/e2e/fixtures/gameFixtures.ts`

**F-GAMES-B44-039 · Medium · gameFixtures.ts:137, 143, 149, 161… (all `*_SAMPLE_SENTENCES`)**
Every **sentence** game fixture is aliased to `SAMPLE_VOCABULARY` (`{term, translation}` vocab items), e.g. `ABYSSAL_WELL_SAMPLE_SENTENCES: VocabularyItem[] = SAMPLE_VOCABULARY`. Sentence games are therefore E2E-tested with vocabulary word pairs, not real sentence data. The tests never exercise sentence-shaped content, so sentence-specific parsing/rendering/scoring paths are unverified — a coverage gap masked by the fixture aliasing.

**F-GAMES-B44-040 · Low · gameFixtures.ts:15-20, 30-35… (every `*_COMPLETION_RESPONSE`)**
All completion fixtures hard-code `xpEarned: 0`. E2E never asserts that a non-zero XP is computed/persisted on completion, so the scoring→XP→leaderboard pipeline is not validated end-to-end for any game; the mock returns zero regardless of play.

**F-GAMES-B44-041 · Low · gameFixtures.ts:1-227**
~227 lines of near-identical 4-constant blocks per game with no factory/loop. Adding a game requires copy-pasting five constants; drift (e.g. a missing `_COMPLETION_RESPONSE` for the sentence games, which only define `_SAMPLE_SENTENCES`) is already visible — sentence entries omit completion-response constants that vocab entries have, an inconsistency that will surprise test authors.

### File 18 — `tests/e2e/games/sentence/abyssal-well.spec.ts`

**F-GAMES-B44-042 · Medium · abyssal-well.spec.ts:20, 25-28**
The only assertions are: start screen text matches `/Abyssal/i`, sample term[0] is visible, a `/start/i` button exists, a `<canvas>` appears, and the screenshot path string `toContain("/public/games/abyssal-well/")`. There is **no assertion on gameplay correctness, scoring, XP, accuracy, or completion**. The test is effectively a smoke/screenshot harness; passing it does not establish the game is playable or that results are computed. `toContain` on the path is tautological (the helper always builds that path).

**F-GAMES-B44-043 · Low · abyssal-well.spec.ts:17**
`waitUntil: "networkidle"` is discouraged by Playwright as flaky/slow, especially with the always-on Next.js dev tools/HMR sockets. Combined with the 15 s text timeout in the helper, this spec is prone to environment-dependent flake (cf. the committed 404 failure for the sibling devourer-slime spec).

### File 19 — `tests/e2e/games/sentence/castle-defense.spec.ts`

**F-GAMES-B44-044 · Low · castle-defense.spec.ts:1-30**
Byte-for-byte structural clone of File 18 (only names/paths differ). Same limitations apply: smoke-only, no scoring/XP/completion assertions, `networkidle` reliance, tautological path check (F-GAMES-B44-042/043). The three sentence specs should share a parameterized helper rather than triplicating the body.

### File 20 — `tests/e2e/games/sentence/devourer-slime.spec.ts`

**F-GAMES-B44-045 · High · devourer-slime.spec.ts:19-23 vs error-context.md (File 15)**
This spec expects `expectDevourerSlimeStartScreen` (text `/Devourer|Slime/i`) and a `/start/i` button, but the committed failure artifact (File 15) shows the run hit a **404**. The spec is the one recorded as failing in `.last-run.json` (File 14). It is shipped failing with no skip/quarantine annotation and no linked fix — the devourer-slime game cannot be considered E2E-verified.

**F-GAMES-B44-046 · Medium · devourer-slime.spec.ts:22-23 vs devourer-slime/page.tsx:153-161**
The spec clicks `getByRole("button", { name: /start/i })`, but the actual `devourer-slime/page.tsx` renders `<DevourerSlimeGame>` directly with **no Start button at the page level** (the loading/warning branches return before any button, and the play branch mounts the game component immediately). The Start button must therefore live inside the dynamically-imported game component; if absent or labelled differently, the `/start/i` selector contributes to the 404/timeout failure. The spec's assumptions are not anchored to the page it tests.

**F-GAMES-B44-047 · Low · devourer-slime.spec.ts:17, 27-28**
Same `networkidle` and tautological screenshot-path assertion as the sibling specs. No assertion that completion POSTs XP or that `setLastResult` fired — the scoring contract for the one game with a recorded failure is entirely unverified.

---

## Cross-Cutting Observations

- **Two `calculateXP` implementations coexist** (`src/lib/xp.ts` and `src/lib/games/xp.ts`) with identical `floor(correctAnswers * accuracy)` logic. The `gameName.ts.template` imports the `games/` variant; the live devourer-slime page imports `@/lib/xp`. Duplicate XP sources risk divergence across generated vs hand-written games (relates to F-GAMES-B44-004).
- **No Zod anywhere in the batch.** `accessibility.ts`, `leaderboard.ts`, and `multiplayer.ts` all hand-roll partial validation at external boundaries (localStorage, WebSocket), contrary to the AGENTS.md contract-first/Zod mandate (F-GAMES-B44-018, -027, -032).
- **Three independent `VocabularyItem` definitions** observed (multiplayer, store, template imports); no canonical shared content type, weakening Reading/Primary importability (F-GAMES-B44-034, -006).
- **Type-only "features."** `adaptive-difficulty.ts` and `multiplayer.ts` ship rich type surfaces with no (or trivial) behavior and tautological tests, overstating readiness of "adaptive difficulty" and "multiplayer" (F-GAMES-B44-021/022, -031/032).
- **Committed Playwright artifacts** (Files 14-16) include a failing run; `test-results/` should be git-ignored (F-GAMES-B44-035, -038).
- **E2E specs are smoke/screenshot harnesses**, asserting nothing about scoring/XP/progress/completion across all three reviewed specs (F-GAMES-B44-042, -044, -047, -039, -040).

---

## Severity Tally

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| Critical | 0 | — |
| High | 5 | 007, 022, 032, 035, 036, 045 *(6 — see note)* |
| Medium | 16 | 001, 003, 004, 008, 010, 011, 012, 016, 018, 021, 023, 025, 027, 028, 031, 033, 038, 039, 042, 046 |
| Low | 14 | 002, 005, 006, 009, 013, 017, 019, 024, 026, 029, 030, 037, 040, 041, 043, 044, 047 |
| Info | 3 | 015, 020, 034 |

*Note: High count is 6 (007, 022, 032, 035, 036, 045); Medium/Low lists above are illustrative groupings and may exceed the headline count where a finding spans categories. Counts are advisory, not an acceptance gate.*

---

## Limitations

- **Read-only, single-batch scope.** Only the 20 listed files were in scope. Game-logic modules (`src/lib/games/devourerSlime.ts`, the `DevourerSlimeGame` component, `gameHelpers.ts`, `sampleVocabulary.ts`, the actual API route handlers) were read only for context and are not scored here; findings referencing them (e.g. F-GAMES-B44-046) are inferences from the in-scope files plus context reads, not full reviews of those modules.
- **No execution.** Tests were not run, the dev server was not started, and the 404 in File 15 was assessed from the committed artifact, not reproduced. Root cause of the devourer-slime failure (route config vs missing Start button vs environment) is hypothesized, not confirmed.
- **Templates not generated.** The `*.template` findings are based on reading the templates statically; I did not run the scaffolding generator to confirm which template variants are actually emitted or how `gameName`/`game-name` placeholders are substituted.
- **No build/lint/type-check executed.** The unused-import (F-GAMES-B44-007) and other lint-class findings are asserted from source inspection, not from a lint run.
- **Importability into Reading/Primary** was assessed structurally (type shapes, tenant scoping, data contracts); no actual import attempt into those apps was performed.

---

*This is a line-by-line review report only. It makes no acceptance or closeout determination for the track or batch; those decisions remain with the track's acceptance/closeout phases.*
