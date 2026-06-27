# Line-by-Line Review — games-batch-09

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-09`
**Scope source:** `/tmp/opencode/games-batch-09` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited or read. This batch contains **only Measure archive documents** (specs, plans, metadata, asset specs) for six archived tracks inside `apps/advantage-games/measure/archive/`. No `.ts`/`.tsx` runtime, component, store, API-route, or test source files are in this batch.
**Finding ID scheme:** `F-GAMES-B09-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `shadow-gate-dungeon-20260320/spec.md` | shadow-gate-dungeon | spec |
| 2 | `shared_game_camera_hook_20260414/metadata.json` | shared_game_camera_hook | metadata |
| 3 | `shared_game_camera_hook_20260414/plan.md` | shared_game_camera_hook | plan |
| 4 | `shared_game_camera_hook_20260414/spec.md` | shared_game_camera_hook | spec |
| 5 | `spellweavers-run-20260319/asset-spec.md` | spellweavers-run | asset-spec |
| 6 | `spellweavers-run-20260319/metadata.json` | spellweavers-run | metadata |
| 7 | `spellweavers-run-20260319/plan.md` | spellweavers-run | plan |
| 8 | `spellweavers-run-20260319/spec.md` | spellweavers-run | spec |
| 9 | `squires-gauntlet-20260328/metadata.json` | squires-gauntlet | metadata |
| 10 | `squires-gauntlet-20260328/plan.md` | squires-gauntlet | plan |
| 11 | `squires-gauntlet-20260328/spec.md` | squires-gauntlet | spec |
| 12 | `storm-castle-tower-20260320/metadata.json` | storm-castle-tower | metadata |
| 13 | `storm-castle-tower-20260320/plan.md` | storm-castle-tower | plan |
| 14 | `storm-castle-tower-20260320/spec.md` | storm-castle-tower | spec |
| 15 | `the-haunted-library-20260328/metadata.json` | the-haunted-library | metadata |
| 16 | `the-haunted-library-20260328/plan.md` | the-haunted-library | plan |
| 17 | `the-haunted-library-20260328/spec.md` | the-haunted-library | spec |
| 18 | `unified-game-screens-20260131/metadata.json` | unified-game-screens | metadata |
| 19 | `unified-game-screens-20260131/plan.md` | unified-game-screens | plan |
| 20 | `unified-game-screens-20260131/spec.md` | unified-game-screens | spec |

---

## Findings

### File 1 — `shadow-gate-dungeon-20260320/spec.md`

**F-GAMES-B09-001 · Medium · spec.md:146-150, 70, 136**
Hardest pursuer `shadow-dragon` is set to `120 px/s` (line 149), identical to `playerSpeed: 120` (line 136). An equal-speed pursuer that "predicts player movement" (line 70) is mathematically un-outrunnable: once the dragon is on the player's tail it can never be shaken, only avoided by level geometry. On Hard this risks an unwinnable / unfair chase, an age-inappropriate frustration mode for a learning game. No documented escape mechanic or speed margin.

**F-GAMES-B09-002 · Medium · spec.md:40-46, 157-164**
XP formula `Math.min(10, correctWords + bonuses)` caps at 10 with three +1 bonuses (accuracy/speed/survival). This differs structurally from sibling games in this batch (spellweavers uses an uncapped `Math.floor` formula — F-GAMES-B09-016; storm-castle caps at 10 — F-GAMES-B09-029; squires/haunted define none). The per-game XP scales are not reconciled to a shared contract, so any leaderboard/progression imported into Reading/Primary will not be comparable across the suite.

**F-GAMES-B09-003 · Medium · spec.md:160 (`speedBonusThreshold: 30000`)**
Speed bonus uses a single fixed 30-second threshold for all three difficulties, even though difficulties change word count (4/5/6) and creature speed (60/90/120). A flat time bar across unequal workloads makes the speed bonus easier on Easy and near-impossible on Hard — an inconsistent, untunable scoring component.

**F-GAMES-B09-004 · Medium · spec.md:73-78, 154-155**
Health economy is punitive: 100 HP, wrong word −20 (line 154), creature collision −25 (line 155). Five wrong words, or four creature hits, ends the run. For a vocabulary learner practicing word order, a 5-mistake hard fail with no documented partial-credit or retry affordance is an age-appropriate-UX concern and a steep difficulty cliff.

**F-GAMES-B09-005 · Low · spec.md:108-111, 112-116**
State signalling is color-only: target crystal "glows brighter"/gold vs cyan (line 108), gate locked=red / unlocked=green (line 111). No shape, icon, or label differentiation for color-blind players. Effects include "Screen shake on damage" (line 115) with no reduced-motion alternative. The spec has no accessibility section at all.

**F-GAMES-B09-006 · Low · spec.md:130-131 vs 11-12**
Config `arenaHeight: 700` (line 131) does not match the platform reference viewport `390×844` declared at lines 11-12 (and app-wide convention). The 144px discrepancy is unexplained (letterbox? scaled?); responsive-scaling behavior on a true 844-tall device is unspecified.

**F-GAMES-B09-007 · Low · spec.md:67-70, 123**
Pursuer behaviors ("wanders when far", "actively tracks", "predicts player movement") and the "optional prediction" AI (line 123) are described only in prose — no algorithm, no per-tick cadence, no prediction lookahead value. Difficulty is therefore non-reproducible and untestable from the spec.

**F-GAMES-B09-008 · Info · spec.md:180, 1**
Leaderboards are listed under "Future Scope (Post-MVP)" (line 180). Only the `spec.md` for this track is present in this batch (no metadata/plan/asset-spec), so build status, test evidence, and gameCards registration cannot be assessed here (see Limitations).

### File 2 — `shared_game_camera_hook_20260414/metadata.json`

**F-GAMES-B09-009 · High · metadata.json:4, 10**
Track is filed under `measure/archive/` yet `"status": "in_progress"` (line 4), and `deviation_notes` (line 10) state: "Implementation landed, but both Measure verification tasks still remain open in plan.md." A **shared-runtime infrastructure** track (camera/dimension hook used by multiple games) was archived without completing either verification gate. The shared hook's correctness is unverified by the Measure protocol, and the registry status is unreliable for determining what shipped.

**F-GAMES-B09-010 · Low · metadata.json:8-9**
`estimated_tasks: 5`, `actual_tasks: 3` — two tasks short, and those two are precisely the verification gates (F-GAMES-B09-011). The deviation is acknowledged but not resolved before archive.

### File 3 — `shared_game_camera_hook_20260414/plan.md`

**F-GAMES-B09-011 · High · plan.md:13, 20**
Both "Measure - User Manual Verification" gates (Phase 1 line 13, Phase 2 line 20) are unchecked `[ ]`. For a hook that other games depend on for camera offset/scale and indicator positioning, shipping without manual verification means cross-game regressions (mis-scaled canvas, off-screen indicators) could go undetected at the shared layer.

**F-GAMES-B09-012 · Medium · plan.md:17 vs spec.md:25**
Plan Phase 2 migrates WizardZombieGame to use **`useGameDimensions`** (line 17), but the spec and Phase 1 define the hook as **`useGameCamera`** (`spec.md:25`, `plan.md:8`). The pilot migration appears to consume a differently named hook than the one specified/created. Either the hook was split/renamed (undocumented), or the plan references the wrong symbol — a real ambiguity for anyone adopting the shared hook in additional games.

**F-GAMES-B09-013 · Medium · plan.md:15-20, spec.md:31-36**
Only one game (WizardZombie) was migrated; spec "Affected Games" lists WizardZombieGame, DungeonLiberatorGame, GriffinSkyJoustGame (`spec.md:33-35`). Per spec "Out of Scope" this single-pilot scope is intentional (`spec.md:46-47`), but the consequence is that **camera/ResizeObserver duplication remains in the other games** the track set out to de-duplicate — the DRY goal (`spec.md:14`) is only partially realized and the shared-runtime consolidation is incomplete.

### File 4 — `shared_game_camera_hook_20260414/spec.md`

**F-GAMES-B09-014 · Low · spec.md:38-43**
Acceptance Criteria are prose bullets without checkboxes/verification status, so the spec carries no traceable acceptance signal — consistent with the two open verification gates (F-GAMES-B09-011) and `status:"in_progress"` (F-GAMES-B09-009). Criterion 4 "No regression in game functionality" has no recorded evidence.

### File 5 — `spellweavers-run-20260319/asset-spec.md`

**F-GAMES-B09-015 · Medium · asset-spec.md:46-73, 4-7**
Three parallax layers are specified as `400×1200px` PNGs (lines 49, 59, 68) and the platform note recommends "@2x assets for retina" (line 6), i.e. up to `800×2400` PNGs each. Three large full-screen PNGs with no compressed/WebP format, no texture atlas, and no total asset budget is a mobile load-time and memory concern for the shared runtime. (The plan ultimately shipped gradients instead — F-GAMES-B09-019 — so these assets are not yet realized.)

### File 6 — `spellweavers-run-20260319/metadata.json`

**F-GAMES-B09-016 · Info · metadata.json:4-6**
`status: completed`, created 2026-03-19 → completed 2026-03-20 04:35 (~1 day). Terminal status correctly set (unlike the camera-hook and unified-screens tracks in this batch). No issue beyond cross-references elsewhere.

### File 7 — `spellweavers-run-20260319/plan.md`

**F-GAMES-B09-017 · High · plan.md:48, 57, 66, 76**
Four test tasks are explicitly **deferred**: input-handling tests (line 48), UI-component tests (line 57), state-transition tests (line 66), and the final integration test (line 76). Only game-logic tests were written (line 25, "100% achieved"). Input, HUD/UI, phase transitions, and end-to-end flow are unvalidated. Given the app's >80% coverage standard, this is a substantive test-quality gap for everything outside the pure logic module.

**F-GAMES-B09-018 · Medium · plan.md:83-101 vs spec.md:37-40**
Two conflicting XP definitions exist. The config block (`plan.md:90-92`) lists `xpPerSentence: 2`, `xpPerCorrectWord: 1`, `comboMultiplier: 0.1`, while the spec scoring section (`spec.md:39`) gives `Math.floor(sentencesCompleted * 2 + correctWords * accuracy)` — which uses neither the per-word constant nor the combo multiplier as written. The authoritative XP computation is ambiguous, and the formula is **uncapped**, conflicting with the cap-10 model in shadow-gate/storm-castle (F-GAMES-B09-002).

**F-GAMES-B09-019 · Medium · plan.md:28-33, 39**
Phase 3 asset tasks for `orb.png`, `scroll.png`, and parallax layers are unchecked `[ ]` with "using primitives"/"using gradient" annotations; visual feedback was reduced to a "target orb highlight" (line 39). The shipped game uses primitives, not the designed assets in `asset-spec.md` — a visual-fidelity gap and a divergence between the asset spec and the delivered build.

**F-GAMES-B09-020 · Low · spec.md:33-34, 80-81**
Win condition is dual/ambiguous: "Complete all sentences in the session (configurable count)" (line 34) vs "Endless Mode: Complete as many sentences as possible before mana depletes" (line 81). No rule states which mode is the default/shipped terminal condition — an issue for deterministic scoring and E2E test helpers.

### File 8 — `spellweavers-run-20260319/spec.md`

**F-GAMES-B09-021 · Low · spec.md:88-91**
Feedback is color/motion-coded: correct = sparkle/chime, wrong = "red flash, shake, error sound", "Mana pulse when low" (lines 89-91). No color-blind-safe alternative, no reduced-motion guard, and audio cues have no visual-caption equivalent. No accessibility section in the spec.

### File 9 — `squires-gauntlet-20260328/metadata.json`

**F-GAMES-B09-022 · Info · metadata.json:7-8**
`created_at` and `completed_at` are both `2026-03-28T00:00:00Z` (identical, zero-duration). The build window is unknowable from the metadata; flag the "strict TDD" claim (`plan.md` Phase 2) for test-evidence verification against code (no test artifacts in this batch).

### File 10 — `squires-gauntlet-20260328/plan.md`

**F-GAMES-B09-023 · High · plan.md (whole file), spec.md:23,27**
The plan contains **no XP or scoring task**, and no XP/score values appear anywhere. The spec mentions "Gain Score/XP" (line 23) and "Score penalty" (line 27) but never defines amounts, caps, or formula. For a game intended for import where XP/progress is a hard requirement, the complete absence of a scoring/XP definition and implementation step is a readiness and import-contract gap (mirrors realm-carver in batch-07).

**F-GAMES-B09-024 · Medium · plan.md:38, spec.md (no config)**
Difficulty is described as "hazard speed, lane count, word density" (line 38) but neither the plan nor the spec records any per-difficulty numeric table. The difficulty system is asserted but not specified in data, so it cannot be balanced or tested from the documents.

**F-GAMES-B09-025 · Medium · plan.md:15**
Only English translations were added ("Add translations to `src/locales/en.ts`"). No other locale is referenced. A Frogger-style game with on-screen "message bar" and translation display that ships en-only is an i18n/importability gap for the multi-locale Reading/Primary host apps.

**F-GAMES-B09-026 · Low · plan.md:23-24, 33, 40**
Test evidence covers only the logic module (`squiresGauntlet.test.ts`, >80% claimed at line 24). Phases 3-4 verification is "Manual check" / "Complete 3 full game sessions" (lines 33, 40) — manual, unrecorded, and no component/render or input tests are planned. Canvas-component test coverage is unvalidated.

### File 11 — `squires-gauntlet-20260328/spec.md`

**F-GAMES-B09-027 · Medium · spec.md:28-31, 24-27**
Death model stacks multiple hard-fail conditions — hazard collision, falling into water/missing a platform, and "reaching zero lives" — plus wrong-word knockback/life-loss (lines 26-27). A Frogger pressure game layered on word-order recall, with several instant-death sources and no documented recovery, is a difficulty/age-appropriateness concern for younger learners. The life count and penalty magnitudes are unspecified.

**F-GAMES-B09-028 · Low · spec.md (whole file)**
No accessibility section: feedback is "shake, red flash" / "magical glows for correct words" (lines 26, 47) — color-and-motion only, no color-blind-safe encoding, no reduced-motion, no audio-caption alternative. Continuous moving hazards with no motion opt-out.

### File 12 — `storm-castle-tower-20260320/metadata.json`

**F-GAMES-B09-029 · Info · metadata.json:5-6**
`created_at` 2026-03-20T12:30Z → `completed_at` 2026-03-20T21:00Z (~8.5h) for a full grid climber with hazards, controls, and sound. Terminal status set correctly. Flag the "strict TDD" claim (`plan.md:3`) for test-evidence verification — see F-GAMES-B09-031.

### File 13 — `storm-castle-tower-20260320/plan.md`

**F-GAMES-B09-030 · Medium · plan.md:100-105, spec.md:42-46**
XP config caps at `maxXP: 10` with `perCorrectWord: 1` + `accuracyBonus: 2`. This is yet another distinct XP scale (cf. shadow-gate cap-10 with three +1 bonuses, spellweavers uncapped, squires undefined). Reinforces the suite-wide XP-normalization gap (F-GAMES-B09-002) that any shared Reading/Primary leaderboard import must reconcile.

**F-GAMES-B09-031 · High · plan.md:1-71 (no test task) vs line 3**
The plan header claims "**strict TDD methodology**" (line 3), but the eight phases contain **no "write tests" task whatsoever** — Phase 2 (core logic) and all others list only implementation tasks, and there is no coverage gate. For a game asserting TDD, the absence of any test task in the plan is a direct test-quality/process gap and contradicts the app's >80% coverage requirement.

**F-GAMES-B09-032 · Medium · plan.md:59, spec.md:80-83 vs 102-131**
Start screen offers "guard selection" / "Guard Type" (Lazy Guard / Alert Sentry / Elite Watchman, `spec.md:80-83`), but the config block (`plan.md:77-105`, `spec.md:102-131`) hard-codes single hazard intervals with **no per-guard table**. The opponent-selection UX is asserted but not backed by data (same defect class as paladins B07-015 and squires F-GAMES-B09-024).

### File 14 — `storm-castle-tower-20260320/spec.md`

**F-GAMES-B09-033 · Medium · spec.md:38-40, 21**
Defeat = "Lose all lives (3)" and wrong word "shutter slams, lose a life" (lines 39, 21). Only three lives, with hazards (oil, rocks) also costing lives, yields a low mistake tolerance for a word-order learning task — a steep difficulty cliff and age-appropriateness concern, with no partial-credit or retry affordance documented.

**F-GAMES-B09-034 · Low · spec.md:71-73, 88-92, 9-15**
Target word indicated by "golden glow" only (line 72); feedback is "particle sparks", "screen shake on wrong word", "oil splash" (lines 89-92). Color-only target encoding plus screen shake with no reduced-motion or color-blind alternative, and no accessibility section (only touch-target/text-size in Platform Requirements).

**F-GAMES-B09-035 · Low · spec.md:103-104 vs 11**
Config `gameHeight: 700` vs reference viewport `390×844` (line 11) — same 144px unexplained discrepancy as shadow-gate (F-GAMES-B09-006); responsive behavior on full-height devices unspecified.

### File 15 — `the-haunted-library-20260328/metadata.json`

**F-GAMES-B09-036 · Info · metadata.json:8-10**
`created_at` 07:00Z → `completed_at` 08:00Z (~1 hour) for a full Mappy-style platformer with gravity/trampoline physics, ghost+bat AI, doors, and "TDD" tests at >98% coverage. The window is implausibly short for the claimed scope; flag for test-evidence verification (cf. paladins B07-009). Status is `completed`, but see the unchecked Phase 5 gates (F-GAMES-B09-037).

### File 16 — `the-haunted-library-20260328/plan.md`

**F-GAMES-B09-037 · High · plan.md:46-49**
Phase 5 "Final Integration & Cleanup" is **entirely unchecked**: "Register game in `src/lib/gameCards.ts`" `[ ]`, "Final build check: `npm run build`" `[ ]`, and "Measure sync: Mark track completed and move to archive" `[ ]` — yet metadata marks the track `completed` and it sits in the archive. If the game was never registered in `gameCards.ts`, it is **not discoverable/playable** in the suite and not importable into Reading/Primary. This is a readiness blocker that directly contradicts the `completed` status.

**F-GAMES-B09-038 · Medium · plan.md:13**
"Add translations (Note: **mostly hardcoded in components**)" — UI strings are hardcoded rather than localized. For the multi-locale Reading/Primary host apps this breaks i18n and importability; the player-facing text cannot be translated without code changes.

**F-GAMES-B09-039 · Low · plan.md:48**
Migration/build command is `npm run build`, diverging from the monorepo standard `pnpm turbo run …`. Minor, but misleading for contributors re-running the build, and the gate is unchecked regardless (F-GAMES-B09-037).

**F-GAMES-B09-040 · Low · plan.md:25, 35, 43**
Test evidence is logic-only (`hauntedLibrary.test.ts`, >98% at line 26); Phases 3-4 rely on "Manual check" / "logic verified via tests" (lines 35, 43). No component/render tests for the Konva canvas, physics, or AI rendering paths.

### File 17 — `the-haunted-library-20260328/spec.md`

**F-GAMES-B09-041 · Medium · spec.md (whole file) — no XP/scoring**
The spec defines lives, enemies, and win/loss but contains **no XP or scoring definition** (no section 6 equivalent). Like squires (F-GAMES-B09-023), a game intended for import where XP/progress is required ships without any documented scoring contract.

**F-GAMES-B09-042 · Low · spec.md:5-6, 20-22, 39**
Theme is a "Haunted Victorian/Medieval Library" with "Ghostly Librarians", hunting "Bats", and a failure screen where "the player becomes a ghost" (line 39). For the youngest Primary learners this spooky/haunting framing may be age-inappropriate; no content-rating or age-band note accompanies it.

**F-GAMES-B09-043 · Low · spec.md:30-31, 41-48 — accessibility/perf**
Doors "glow when containing a word" (color/glow-only word cue, line 31); physics uses gravity + trampoline bounce in a rAF loop with no performance budget for the low-end mobile target. No accessibility section (no color-blind, reduced-motion, or caption provisions) despite continuous enemy motion.

### File 18 — `unified-game-screens-20260131/metadata.json`

**F-GAMES-B09-044 · High · metadata.json:5**
`"status": "ready"` on a track that is filed under `measure/archive/` and whose plan is almost fully checked. A non-terminal status on an archived **shared-runtime** track (the start/end screens used by all 7 games) makes the registry unreliable and means the unified-screens rollout cannot be confirmed complete from metadata alone. Same staleness class as the camera-hook track (F-GAMES-B09-009).

### File 19 — `unified-game-screens-20260131/plan.md`

**F-GAMES-B09-045 · Medium · plan.md:157**
Phase 5 (RPG Battle migration) leaves "Test manually on desktop and mobile" unchecked `[ ]` while every other migration's manual test is checked. The RPG Battle integration of the shared end screen was not signed off, leaving one of the seven migrated games unverified on the shared component.

**F-GAMES-B09-046 · Medium · plan.md:206-211, spec.md:212-217**
The track standardizes the **display** of score/accuracy/XP (`GameEndScreen`) but explicitly keeps "Changes to game logic or scoring" out of scope (`spec.md:217`). Thus the shared screen unifies presentation while each game keeps its own incompatible XP computation (F-GAMES-B09-002/018/030). The unified screen can render `xp` from any game, masking the underlying lack of a normalized XP contract for leaderboard/progress import.

**F-GAMES-B09-047 · Low · plan.md:29, 63, spec.md:182-186**
Both shared screens use Framer Motion fade-in/scale-in animations (plan lines 29, 63). The spec's Non-Functional "Performance" note covers GPU-accelerated transforms but there is **no `prefers-reduced-motion` guard** specified for these always-on entrance animations — a motion-accessibility gap baked into the shared component every game now renders.

### File 20 — `unified-game-screens-20260131/spec.md`

**F-GAMES-B09-048 · High · spec.md:197-210**
All Acceptance Criteria — every Must-Have and Should-Have — are unchecked `[ ]` in an archived track, including "All games use the shared components" and "Unit tests with >80% coverage". Combined with `status:"ready"` (F-GAMES-B09-044) and the unverified RPG Battle migration (F-GAMES-B09-045), the completion of this shared-runtime track cannot be established from the documents.

**F-GAMES-B09-049 · Low · spec.md:178-181, 183-185**
Accessibility NFRs are well-stated (focus-visible ring, WCAG AA contrast, 44px touch targets) and tests exist for both components (`plan.md:32-43, 66-78`) — a positive relative to other games in this batch. However, the a11y NFRs are listed as requirements with no recorded verification (acceptance unchecked, F-GAMES-B09-048), so WCAG AA contrast and focus behavior are asserted but unconfirmed.

**F-GAMES-B09-050 · Info · spec.md:110-113, 261-266**
`GameEndScreen` takes `accuracy` as 0-1 and renders score/xp/accuracy with a clean stat contract, and Phase 7 deletes five deprecated per-game screens (`plan.md:187-194`) — good consolidation for the shared runtime and importability. Recorded as a positive; the only residual concern is the XP-normalization gap upstream of this display layer (F-GAMES-B09-046).

---

## Cross-Cutting Themes

- **XP/scoring is not normalized across games** (F-GAMES-B09-002, B09-018, B09-023, B09-030, B09-041, B09-046): shadow-gate caps at 10 (three +1 bonuses), storm-castle caps at 10 (perWord+accuracyBonus), spellweavers is uncapped with a self-contradictory formula vs config, and squires + haunted define no XP at all. The unified end screen standardizes display but explicitly not the computation, masking the absence of a shared leaderboard/progression contract for Reading/Primary import.
- **Shared-runtime tracks archived without completing verification** (F-GAMES-B09-009, B09-011, B09-044, B09-045, B09-048): both the camera-hook and unified-screens tracks — the two infrastructure tracks in this batch — sit in archive with non-terminal status and/or unchecked verification gates and acceptance criteria.
- **Test quality is logic-only or absent for canvas/UI** (F-GAMES-B09-017, B09-026, B09-031, B09-040): spellweavers defers input/UI/state/integration tests; squires and haunted test only the logic module; storm-castle claims TDD but lists no test task. Component/render/input/physics paths are broadly unvalidated.
- **Accessibility is consistently omitted** (F-GAMES-B09-005, B09-021, B09-028, B09-034, B09-043, B09-047): color-only state encoding (target glow, locked/unlocked color, glowing doors), screen-shake/red-flash with no reduced-motion guard (including the shared Framer Motion entrance animations), and no color-blind-safe or audio-caption alternatives. No game spec in this batch has an accessibility section.
- **i18n/importability gaps** (F-GAMES-B09-025, B09-037, B09-038): squires ships en-only, haunted hardcodes UI strings, and haunted's Phase 5 leaves `gameCards.ts` registration unchecked — so it may not be discoverable/importable at all.
- **Difficulty/opponent selection asserted in UX but not in data** (F-GAMES-B09-024, B09-032; and shadow-gate F-GAMES-B09-007): squires difficulty and storm-castle guard-type carry no per-level tables; pursuer AI is prose-only — non-reproducible, untestable difficulty.
- **Punitive failure economies** (F-GAMES-B09-004, B09-027, B09-033): low mistake tolerance (5 wrong words / 3 lives / multiple instant-death sources) on word-order learning tasks, with no documented partial-credit or retry — an age-appropriate-UX concern.
- **Viewport/orientation discrepancies** (F-GAMES-B09-006, B09-035): shadow-gate and storm-castle hard-code a 700px-tall arena against the 390×844 reference with no documented scaling behavior.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 8 | 009, 011, 017, 023, 031, 037, 044, 048 |
| Medium | 18 | 001, 002, 003, 004, 012, 013, 015, 018, 019, 024, 025, 027, 030, 032, 033, 041, 045, 046 |
| Low | 18 | 005, 006, 007, 010, 014, 020, 021, 026, 028, 034, 035, 038, 039, 040, 042, 043, 047, 049 |
| Info | 6 | 008, 016, 022, 029, 036, 050 |

Total findings: **50** (F-GAMES-B09-001 … F-GAMES-B09-050).

---

## Limitations

1. **This batch is documentation-only.** All 20 files are Measure archive artifacts (specs, plans, metadata, asset specs). No `.ts`/`.tsx` game runtime, component, store, API-route, or test source files were in scope. Findings about scoring, XP, difficulty, performance, accessibility, importability, and test quality are assessed **as designed/planned**, not as implemented. Actual code may satisfy or violate these specs independently.
2. **Per the task, no source code was read or edited.** Cross-references to runtime behavior (e.g., whether haunted-library is actually registered in `gameCards.ts`, whether the camera hook is named `useGameCamera` or `useGameDimensions` in code, whether deferred tests were later added, whether XP values match the specs) are inferred from the documents and the app `AGENTS.md`, not verified against current source.
3. **Partial track materials.** `shadow-gate-dungeon-20260320` is represented only by its `spec.md` in this batch (no metadata/plan/asset-spec), so its build status, test evidence, gameCards registration, and acceptance state cannot be assessed here. Other tracks may have additional documents outside this batch.
4. **Status drift in archive metadata** (`status:"in_progress"` and `status:"ready"` on archived tracks, unchecked acceptance boxes and verification gates) means the documents cannot by themselves establish what shipped; readiness conclusions should be confirmed against code and the consolidated review artifacts.
5. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes no claim that the batch, track, or review phase is accepted, complete, or closed.
