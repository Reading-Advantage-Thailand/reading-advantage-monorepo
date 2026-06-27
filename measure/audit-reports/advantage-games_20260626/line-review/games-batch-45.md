# Line-by-Line Review — games-batch-45

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-45`
**Scope source:** `/tmp/opencode/games-batch-45` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is **entirely Playwright end-to-end specs** (`apps/advantage-games/tests/e2e/games/{sentence,vocabulary}/*.spec.ts`). Supporting files read for context only (not in batch, not scored as finding targets): `tests/e2e/helpers/gameHelpers.ts`, `tests/e2e/helpers/screenshotHelpers.ts`, `tests/e2e/fixtures/gameFixtures.ts`, `src/lib/games/sampleVocabulary.ts`, `playwright.config.ts`.
**Finding ID scheme:** `F-GAMES-B45-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Game | Genre |
|---|------|------|------|-------|
| 1 | `sentence/dungeon-liberator.spec.ts` | e2e smoke | Dungeon Liberator | sentence |
| 2 | `sentence/griffin-riders-escape.spec.ts` | e2e smoke | Griffin Riders Escape | sentence |
| 3 | `sentence/griffin-sky-joust.spec.ts` | e2e smoke | Griffin Sky Joust | sentence |
| 4 | `sentence/gryphon-patrol.spec.ts` | e2e smoke | Gryphon Patrol | sentence |
| 5 | `sentence/haunted-library.spec.ts` | e2e smoke | Haunted Library | sentence |
| 6 | `sentence/labyrinth-goblin-king.spec.ts` | e2e smoke | Labyrinth Goblin King | sentence |
| 7 | `sentence/potion-rush.spec.ts` | e2e smoke + warning | Potion Rush | sentence |
| 8 | `sentence/realm-carver.spec.ts` | e2e smoke + warning | Realm Carver | sentence |
| 9 | `sentence/rune-forge-chamber.spec.ts` | e2e smoke + warning | Rune Forge Chamber | sentence |
| 10 | `sentence/shadow-gate-dungeon.spec.ts` | e2e smoke + warning | Shadow Gate Dungeon | sentence |
| 11 | `sentence/spellweavers-run.spec.ts` | e2e smoke + warning | Spellweavers Run | sentence |
| 12 | `sentence/storm-castle-tower.spec.ts` | e2e smoke | Storm Castle Tower | sentence |
| 13 | `sentence/village-guardian.spec.ts` | e2e smoke | Village Guardian | sentence |
| 14 | `vocabulary/archers-revenge.spec.ts` | e2e smoke | Archers Revenge | vocabulary |
| 15 | `vocabulary/dragon-flight.spec.ts` | e2e smoke | Dragon Flight | vocabulary |
| 16 | `vocabulary/dragon-rider.spec.ts` | e2e smoke | Dragon Rider | vocabulary |
| 17 | `vocabulary/enchanted-library.spec.ts` | e2e smoke | Enchanted Library | vocabulary |
| 18 | `vocabulary/magic-defense.spec.ts` | e2e smoke | Magic Defense | vocabulary |
| 19 | `vocabulary/paladins-twin-soul.spec.ts` | e2e smoke | Paladin's Twin Soul | vocabulary |
| 20 | `vocabulary/rpg-battle.spec.ts` | e2e smoke | RPG Battle | vocabulary |

All 20 are thin Playwright specs that (a) install route mocks, (b) navigate, (c) assert a start screen, (d) click a start button, (e) assert a `<canvas>` is visible, and (f) capture a screenshot and assert the returned path string. They are **load/smoke tests**, not gameplay, scoring, or learning-outcome tests. The most important cross-cutting consequences of that shape are captured in F-GAMES-B45-001..009 and the Cross-Cutting section; per-file findings record game-specific deviations.

---

## Findings

### Cross-batch structural findings (anchored to representative files)

**F-GAMES-B45-001 · High · all 20 specs (e.g. dungeon-liberator.spec.ts:27-28, archers-revenge.spec.ts:27-30, rpg-battle.spec.ts:32-35)**
The screenshot assertion is effectively a tautology and verifies nothing about game readiness. Every spec ends with `const screenshotPath = await capture<Game>Screenshot(page); expect(screenshotPath).toContain("/public/games/<game>/")`. The captured path is a **hard-coded constant** built inside the helper from `<GAME>_SCREENSHOT_DIR`/`_FILE` (screenshotHelpers.ts), so the assertion can never fail regardless of what the page rendered — it asserts a string against a substring of itself. It does not validate that the screenshot is non-blank, that gameplay actually started, or that the canvas drew anything. The final "is it working" gate in each test is inert.

**F-GAMES-B45-002 · High · all 20 specs — scoring/XP/leaderboard/progress never exercised**
None of the 20 specs assert any scoring, XP, leaderboard, or progress behavior — the exact focus areas of this review. The `/complete` mocks are hard-coded to `xpEarned: 0` (gameHelpers.ts:84-97, 127-140, …) and the specs never trigger or read a completion. The `/ranking` endpoints that exist for some games (gryphon-patrol, potion-rush, enchanted-library, rpg-battle — gameHelpers.ts:226-232, 360-366, 642-648, 742-748) are mocked to empty arrays and never asserted. There is therefore **zero e2e coverage of the score/XP/leaderboard/progress contract** that a Reading/Primary host depends on. Game-readiness for these subsystems cannot be claimed from this batch.

**F-GAMES-B45-003 · Medium · playwright.config.ts:22-26 (governs all 20 specs)**
The Playwright project list contains only `chromium`. There is **no Firefox/WebKit project**, so the "browser compatibility" focus of the review is unmet — Safari/WebKit (the dominant mobile-iOS engine for this 390×844 portrait target) is never exercised by any of these 20 specs. Canvas/Konva + audio behavior frequently diverges on WebKit; none of it is covered.

**F-GAMES-B45-004 · Medium · playwright.config.ts:15-18 (governs all 20 specs)**
A single fixed viewport (390×844) is used for every spec. There is no tablet, desktop, or landscape projection and no orientation-change test. The games are intended to be importable into Reading/Primary (desktop and tablet contexts), but no spec in this batch verifies rendering or canvas sizing outside the one portrait phone viewport. Responsive/mobile-vs-desktop readiness is unverified.

**F-GAMES-B45-005 · Medium · screenshotHelpers.ts:59-297 (invoked by all 20 specs)**
Every spec writes its screenshot into the **served `public/games/<game>/…` source directory** (`path.join(process.cwd(), <GAME>_SCREENSHOT_DIR)` where the dir is `public/games/...`, gameFixtures.ts:7,24,39,…). Tests mutate the repository's shipped asset tree as a side effect, with `fullPage: true`. Consequences: (1) test runs dirty the working tree and can clobber/commit binary PNGs into `public/`; (2) there is no teardown to remove them; (3) running the suite in CI vs locally yields different on-disk artifacts. Test artifacts should go to a Playwright output/temp dir, not production static assets.

**F-GAMES-B45-006 · Medium · sentence specs vs gameFixtures.ts:137-227 / sampleVocabulary.ts:3-29**
The "sentence" games are fed **single Thai vocabulary words, not sentences.** Every `*_SAMPLE_SENTENCES` constant is aliased to `SAMPLE_VOCABULARY` (e.g. `DUNGEON_LIBERATOR_SAMPLE_SENTENCES: VocabularyItem[] = SAMPLE_VOCABULARY`, gameFixtures.ts:155), whose entries are `{ term: 'สวัสดี', translation: 'Hello' }` — words, not sentences. Specs like dungeon-liberator.spec.ts:20 then assert `getByText(DUNGEON_LIBERATOR_SAMPLE_SENTENCES[0].term)` = the word "สวัสดี". The sentence-construction/ordering mechanic that defines these games is never represented in test data, so the tests cannot validate sentence-game behavior at all — they validate that a word string renders.

**F-GAMES-B45-007 · Medium · gameHelpers.ts mock-shape divergence (affects specs 1-13)**
The sentence-endpoint mocks disagree on payload shape, so the specs do not pin a single API contract. Some return `{ vocabulary: sentences }` (dungeon-liberator gameHelpers.ts:548, griffin-riders-escape:578, griffin-sky-joust:608, gryphon-patrol:638, haunted-library:675, labyrinth-goblin-king:705), some return `{ sentences }` (devourer/realm-carver:774, rune-forge:804, shadow-gate:834, spellweavers:864, storm-castle:894, village-guardian:924), and potion-rush returns `{ sentences }` (731-741). Because each game presumably consumes only its own shape, a regression in the response contract for any one game would slip through unnoticed; the suite encodes no canonical sentence-feed schema.

**F-GAMES-B45-008 · Medium · realm-carver.spec.ts:14 + gameHelpers.ts:771-778**
`mockRealmCarverApis` **ignores its `sentences` argument** and hard-codes `sentences: [{ text: "The cat sat on the mat", id: "1" }]`. The fixture passed by callers is dead, only one sentence is returned, and the shape (`{text,id}`) differs from the `VocabularyItem` `{term,translation}` shape every other sentence game receives. The positive realm-carver test (spec:11-27) thus exercises a bespoke one-item payload, so it neither matches the shared fixture nor validates multi-sentence handling/min-count logic for that game.

**F-GAMES-B45-009 · Medium · localized-warning assertions inconsistent across sibling specs (specs 7-11)**
The negative "insufficient sentences" tests navigate to the **`/en/`** locale (gameFixtures.ts paths all begin `/en/student/...`) but assert **Thai** warning copy in three games — `ประโยคที่บันทึกไว้ไม่เพียงพอ` (rune-forge-chamber.spec.ts:46, shadow-gate-dungeon.spec.ts:46, spellweavers-run.spec.ts:46) — while potion-rush.spec.ts:47 asserts English `Insufficient Sentences` and realm-carver.spec.ts:45 asserts English `Unable to Start Game`. Sibling games handling the same condition assert different-language strings under the same `/en/` route. Either the warning UI is not localized (a real product i18n defect) or the tests are internally inconsistent; either way the assertions are not portable and signal an i18n gap relevant to Reading/Primary import.

### File 1 — `sentence/dungeon-liberator.spec.ts`

**F-GAMES-B45-010 · Low · dungeon-liberator.spec.ts:17**
`waitUntil: "networkidle"` is used (here and in 16 of the 20 specs). For canvas games with continuous animation, polled assets, or audio streaming, `networkidle` is discouraged by Playwright (flaky/slow) and can hang or race. The batch mixes `networkidle` (most), `domcontentloaded` (archers-revenge:17), and an explicit `Ready` gate (dragon-flight:24) with no documented rationale — inconsistent load-wait strategy across siblings.

**F-GAMES-B45-011 · Low · dungeon-liberator.spec.ts:25**
Asserting `page.locator("canvas").first()` is visible is a weak readiness signal: Konva renders a `<canvas>` for start/loading/error screens too, so a visible canvas does not prove gameplay began. No assertion of game-state text (score HUD, lives, first prompt) confirms the play loop is actually running.

### File 2 — `sentence/griffin-riders-escape.spec.ts`

**F-GAMES-B45-012 · Low · griffin-riders-escape.spec.ts:19-20**
Start-screen assertion delegates to `expectGriffinRidersEscapeStartScreen`, which matches `/Griffin|Rider/i` (gameHelpers.ts:592-593) — a very loose regex that would pass on many unrelated headings. Combined with the word-as-sentence fixture (F-GAMES-B45-006), the only real assertion is "the word 'สวัสดี' is on screen and a Start button exists." No griffin/escape gameplay is verified.

### File 3 — `sentence/griffin-sky-joust.spec.ts`

**F-GAMES-B45-013 · Low · griffin-sky-joust.spec.ts:19-25**
Identical smoke shape to File 2; start-screen matcher `/Griffin|Joust/i` (gameHelpers.ts:623) is loose and would also match the sibling Griffin games' shared chrome. No joust mechanic, scoring, or difficulty assertion. Single test only.

### File 4 — `sentence/gryphon-patrol.spec.ts`

**F-GAMES-B45-014 · Low · gryphon-patrol.spec.ts:15-26 + gameHelpers.ts:642-648**
A `/gryphon-patrol/ranking` mock is registered (empty rankings) but the spec never navigates to or asserts any leaderboard UI. The leaderboard surface this game exposes is wired in the mock yet left entirely unverified — dead mock, missing assertion (instance of F-GAMES-B45-002).

### File 5 — `sentence/haunted-library.spec.ts`

**F-GAMES-B45-015 · Low · haunted-library.spec.ts:11-29**
Single smoke test. Sibling line-review of `hauntedLibrary.ts` (batch-39, F-GAMES-B39-014) flagged a per-frame life-drain fairness defect; nothing in this e2e spec exercises ghost contact, lives, or defeat, so the e2e layer provides no safety net for that gameplay defect. Start matcher `/Haunted|Library/i` (gameHelpers.ts:690) is loose.

### File 6 — `sentence/labyrinth-goblin-king.spec.ts`

**F-GAMES-B45-016 · Low · labyrinth-goblin-king.spec.ts:11-29**
Single smoke test for the most mechanically complex sentence game (maze/AI/multi-sentence). No maze movement, capture, win/lose, or difficulty-tier coverage. Given batch-39 noted this game's logic had no unit test in that batch, the e2e layer here also adds no behavioral coverage beyond load.

### File 7 — `sentence/potion-rush.spec.ts`

**F-GAMES-B45-017 · Info · potion-rush.spec.ts:30-48**
Positive: this is one of only six specs in the batch with a **second, behavioral** test — the insufficient-sentences warning path. It registers a fresh route returning `INSUFFICIENT_SENTENCES` with `requiredCount/currentCount` and asserts the warning surfaces. This is the kind of negative-path coverage the other (single-test) games lack. (See F-GAMES-B45-009 for the cross-game localized-string inconsistency.)

**F-GAMES-B45-018 · Low · potion-rush.spec.ts:31-43**
The warning test's inline `page.route` does not mock `/complete` or `/ranking`; it relies on the page failing before those are hit. Fine here, but it diverges from the helper-based mocking used everywhere else, duplicating route-setup logic inline and increasing drift risk if the endpoint path changes.

### File 8 — `sentence/realm-carver.spec.ts`

**F-GAMES-B45-019 · Low · realm-carver.spec.ts:29-46**
The negative test mocks `warning: "NO_SENTENCES"` and asserts English `Unable to Start Game`. Good negative coverage, but see F-GAMES-B45-008 (positive test uses a hard-coded single-sentence payload that ignores the fixture) and F-GAMES-B45-009 (English vs Thai warning inconsistency across siblings).

### File 9 — `sentence/rune-forge-chamber.spec.ts`

**F-GAMES-B45-020 · Medium · rune-forge-chamber.spec.ts:46**
Negative test asserts Thai copy `ประโยคที่บันทึกไว้ไม่เพียงพอ` while loading the `/en/` route (instance of F-GAMES-B45-009). If the warning component is hard-coded Thai, this is an i18n defect blocking clean English-locale import into Reading/Primary; if intentional, the test is locale-mismatched. Either reading is a real problem.

### File 10 — `sentence/shadow-gate-dungeon.spec.ts`

**F-GAMES-B45-021 · Low · shadow-gate-dungeon.spec.ts:46**
Same Thai-warning-under-`/en/` issue as File 9 (F-GAMES-B45-009/020). Positive test (11-27) is load-only; start matcher is the exact heading `/shadow gate dungeon/i` (gameHelpers.ts:850), which is tighter than the Griffin matchers — note the inconsistency in matcher strictness across the batch.

### File 11 — `sentence/spellweavers-run.spec.ts`

**F-GAMES-B45-022 · Low · spellweavers-run.spec.ts:46**
Same Thai-warning-under-`/en/` issue (F-GAMES-B45-009). Positive test load-only. No run/scoring/difficulty coverage.

### File 12 — `sentence/storm-castle-tower.spec.ts`

**F-GAMES-B45-023 · Low · storm-castle-tower.spec.ts:11-27**
Single smoke test and, unlike most sentence specs, it does **not** assert any sentence/word content is visible (no `getByText(...SAMPLE_SENTENCES[0].term)`), only the heading + canvas. Even the (already weak) content-presence assertion is dropped here, making it the thinnest sentence spec in the batch.

### File 13 — `sentence/village-guardian.spec.ts`

**F-GAMES-B45-024 · Low · village-guardian.spec.ts:11-27**
Same as File 12: heading + Start + canvas only, no content assertion, single test, no scoring/difficulty/win-lose coverage.

### File 14 — `vocabulary/archers-revenge.spec.ts`

**F-GAMES-B45-025 · Medium · archers-revenge.spec.ts:19 + gameHelpers.ts:100-102**
`expectArchersRevengeStartScreen` asserts that **both** `loading vocabulary` text **and** the `draw your bow` Start button are visible simultaneously. A loading indicator and a ready-to-start button being visible at the same instant is contradictory app state; this works only because the mock injects a 250ms delay (gameHelpers.ts:69) creating a fragile timing window. On a fast machine the loading text may already be gone, making this assertion order-dependent and flaky.

**F-GAMES-B45-026 · Low · archers-revenge.spec.ts:17**
Uses `domcontentloaded` while sibling vocabulary specs use `networkidle` — load-wait inconsistency (cross-ref F-GAMES-B45-010).

### File 15 — `vocabulary/dragon-flight.spec.ts`

**F-GAMES-B45-027 · Info · dragon-flight.spec.ts:23-27**
Positive: this spec is the only one that gates on an explicit asset-ready signal (`await expect(page.getByText(/Ready/i)).toBeVisible({ timeout: 30000 })`) before starting and uses an explicit canvas timeout. This is the most robust load-readiness pattern in the batch and worth propagating to the others (which assert canvas with no asset-ready gate).

**F-GAMES-B45-028 · Low · dragon-flight.spec.ts:24 (30s) vs others**
The 30s `Ready` timeout hints these games have heavy asset loads (sprite sheets/audio). No spec in the batch measures or asserts a performance/asset budget, and the other specs give the canvas only the default/15s window — a potential source of flakiness on low-end mobile (the stated target) that is untested.

### File 16 — `vocabulary/dragon-rider.spec.ts`

**F-GAMES-B45-029 · Low · dragon-rider.spec.ts:11-31**
Single smoke test; asserts term+translation visible then canvas. No adventure/scoring/difficulty path. Standard batch limitation (F-GAMES-B45-002).

### File 17 — `vocabulary/enchanted-library.spec.ts`

**F-GAMES-B45-030 · Low · enchanted-library.spec.ts:11-26 + gameHelpers.ts:226-232**
A `/enchanted-library/ranking` mock (empty rankings per difficulty) is registered but never asserted (instance of F-GAMES-B45-002). Start button matcher `/play/i` (spec:20) is generic. Single test only.

### File 18 — `vocabulary/magic-defense.spec.ts`

**F-GAMES-B45-031 · Low · magic-defense.spec.ts:17-22**
Start-screen check is `getByText(/Magic Defense/i)` (gameHelpers.ts:278) and start button `/play/i`. The title text is visible during loading too, so the assertion does not confirm interactivity before the click. Single smoke test; no defense-wave/scoring/difficulty coverage.

### File 19 — `vocabulary/paladins-twin-soul.spec.ts`

**F-GAMES-B45-032 · Low · paladins-twin-soul.spec.ts:11**
Dead import: `import { readFileSync } from "fs";` is never used in the spec. Lint/cleanliness smell and an unusual dependency for a Playwright test; should be removed.

**F-GAMES-B45-033 · Medium · paladins-twin-soul.spec.ts:11-29**
Sibling batch-39 (F-GAMES-B39-033) found Paladin's Twin Soul's signature dive/capture mechanic is **not wired into the tick loop** (dead code reachable only via unit-test fixtures). This e2e spec is load-only and clicks `begin`, so it would pass even though the core learning interaction never runs — the e2e layer gives false confidence that the game "works." Start matcher `/Paladin/i` is loose.

### File 20 — `vocabulary/rpg-battle.spec.ts`

**F-GAMES-B45-034 · Info · rpg-battle.spec.ts:21-28**
Positive: this is the only spec that exercises in-game **tab navigation** (vocabulary tab → assert term+translation → briefing tab → start battle), giving slightly richer interaction coverage than the pure load specs. Still no battle/scoring/XP assertion (F-GAMES-B45-002), and the `/rpg-battle/ranking` mock (gameHelpers.ts:360-366) is unused.

**F-GAMES-B45-035 · Low · rpg-battle.spec.ts:30**
Asserts `page.locator("canvas")` without `.first()`; if the page ever renders more than one canvas (HUD + game layer, common in Konva `Stage` with multiple layers/canvases), Playwright strict mode will throw on the ambiguous locator. Other specs defensively use `.first()`; this one does not — a latent strictness/flakiness inconsistency.

---

## Cross-Cutting Themes

- **Smoke-only coverage; review focus areas untested (F-GAMES-B45-001, 002).** All 20 specs verify only that a game loads to a visible canvas. Scoring, XP, leaderboards, progress, difficulty tiers, win/lose, and learning correctness — the explicit focus of this review — have **no e2e coverage**. The terminal screenshot assertion is a tautology that can never fail.
- **Browser/viewport matrix is a single point (F-GAMES-B45-003, 004).** Chromium-only, 390×844-only. No WebKit (iOS), no Firefox, no tablet/desktop/landscape — so "browser compatibility" and "responsive/mobile" readiness are unverified by this batch.
- **Test side effects pollute shipped assets (F-GAMES-B45-005).** Screenshots are written `fullPage` into `public/games/<game>/` with no teardown, dirtying the repo and risking binary commits.
- **Test data does not represent sentence games (F-GAMES-B45-006).** Sentence-game fixtures are aliased to single Thai vocabulary words, so the sentence-construction mechanic is never represented; the specs validate "a word renders," not sentence behavior.
- **No canonical API contract (F-GAMES-B45-007, 008).** Sentence mocks split between `{vocabulary}` and `{sentences}` shapes; realm-carver's mock ignores its fixture and hard-codes a one-item, differently-shaped payload. The suite encodes no single content-feed schema for host-app import.
- **i18n inconsistency in negative paths (F-GAMES-B45-009, 020, 021, 022).** Under the `/en/` route, three games assert Thai warning copy while two assert English — a real i18n defect signal or internally inconsistent tests; both block clean Reading/Primary English-locale import.
- **Flakiness vectors (F-GAMES-B45-010, 025, 028, 035).** `networkidle` on animated/audio canvases, the contradictory loading+ready assertion in archers-revenge, heavy 30s asset waits, and a non-`.first()` canvas locator are all latent flakiness sources with inconsistent handling across siblings.
- **Loose start-screen matchers (F-GAMES-B45-012, 013, 015).** Regexes like `/Griffin|Rider/i`, `/Haunted|Library/i` are weak identity checks that could pass on shared chrome or sibling games.
- **Positives worth propagating (F-GAMES-B45-017, 027, 034).** Dragon Flight's explicit `Ready` asset gate, Potion Rush/Realm Carver/Rune Forge/Shadow Gate/Spellweavers' negative warning tests, and RPG Battle's tab-navigation interaction are the strongest patterns in the batch and should be standardized across all games.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 2 | 001, 002 |
| Medium | 9 | 003, 004, 005, 006, 007, 008, 009, 020, 025, 033 |
| Low | 20 | 010, 011, 012, 013, 014, 015, 016, 018, 019, 021, 022, 023, 024, 026, 028, 029, 030, 031, 032, 035 |
| Info | 4 | 017, 027, 034, + (027/034 positives) |

Recount (each ID once): High 2 (001, 002); Medium 10 (003, 004, 005, 006, 007, 008, 009, 020, 025, 033); Low 20 (010, 011, 012, 013, 014, 015, 016, 018, 019, 021, 022, 023, 024, 026, 028, 029, 030, 031, 032, 035); Info 3 (017, 027, 034).

Total findings: **35** (F-GAMES-B45-001 … F-GAMES-B45-035).

---

## Limitations

1. **Scope is exactly the 20 listed files.** All are e2e specs. The shared `gameHelpers.ts`, `screenshotHelpers.ts`, `gameFixtures.ts`, `sampleVocabulary.ts`, and `playwright.config.ts` were read **for context only** to evaluate what the specs actually assert and mock; they are not in this batch and were not scored as finding targets (they are cross-referenced where they determine a spec's behavior).
2. **No execution.** Tests were not run and the app was not built. Assertions about flakiness, tautological screenshot checks, canvas ambiguity, and the Thai-vs-English warning behavior are derived from static reading of the specs + helpers, not observed at runtime. Whether the localized-warning mismatch is a product i18n defect or a test bug cannot be disambiguated without running against the live UI.
3. **Underlying game logic is out of batch.** Game readiness, real scoring/XP/leaderboard/progress correctness, difficulty math, asset/audio/performance, accessibility (ARIA/keyboard/reduced-motion), and importability into Reading/Primary live in the (out-of-batch) game components, reducers, configs, and host wiring. Cross-references to batch-39 logic findings (e.g., Paladin's dive/capture, Haunted Library life drain) are provided to show where these smoke specs fail to provide a safety net, but those logic files were not re-reviewed here.
4. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes no claim that the batch, track, or review phase is accepted, complete, or closed.
