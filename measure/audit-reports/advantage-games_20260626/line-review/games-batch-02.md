# Line-by-Line Review — games-batch-02

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-02`
**Reviewer model:** ark-code-latest (Doubao-Seed-Code)
**Date:** 2026-06-27
**Scope source:** `/tmp/opencode/games-batch-02` (exact 20-line file list)
**Source edits:** none (read-only review)

---

## Summary

All 20 files in this batch are **Measure track artifacts** (plan.md, spec.md, metadata.json, index.md) located under
`apps/advantage-games/measure/archive/`. They cover two games:

- **Archer's Revenge** (vocabulary shooter) — 1 track (`archers-revenge-20260318`).
- **Castle Defense** (sentence tower-defense) — 6 tracks across asset, rewrite, fixes, sprites, and start/end-screen work.

Because these are planning/specification documents rather than runtime source, findings focus on: (a) spec/plan internal
consistency and correctness, (b) drift between documented intent and the **current** shipped source, (c) readiness, scoring/XP,
importability, asset/performance/mobile/accessibility, and test-quality signals **as described in the artifacts**. Where claims
were verifiable against the live tree, I grounded them (see Verification Notes). Runtime correctness of the actual game code is
**out of scope for this batch** (those `.tsx`/`.ts` files are not in this file list).

**Severity legend:** Critical = blocks release / data-wrong; High = significant readiness/correctness gap; Medium = quality/maintainability;
Low = minor/cosmetic; Info = observation, no action required.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 5 |
| Medium   | 11 |
| Low      | 8 |
| Info     | 6 |

---

## Verification Notes (grounding against live tree)

Confirmed against the current working tree to assess spec→implementation drift (read-only):

- Archer's Revenge source **exists** at the planned-equivalent paths but under a **different layout** than the plan documents:
  - Plan says `src/lib/games/archersRevenge.ts` / `archersRevengeConfig.ts` → **present** (`src/lib/games/archersRevenge.ts`, `archersRevengeConfig.ts`, plus `.test.ts` for both).
  - Plan says page at `src/app/[locale]/(student)/student/games/vocabulary/archers-revenge/page.tsx` → **present**.
  - Plan says API routes `src/app/api/v1/games/archers-revenge/{vocabulary,complete}/route.ts` → both **present** (`complete/` and `vocabulary/` dirs exist).
  - Plan §127 says component at `src/components/games/vocabulary/archers-revenge/ArchersRevengeGame.tsx` (not verified to exist in this batch; component file not in list).
- Castle Defense plan documents reference `src/lib/castleDefense.ts`, `src/components/castle-defense/…`, `src/app/games/castle-defense/page.tsx`. Current tree has these at **relocated paths**:
  - `src/lib/games/castleDefense.ts` (+ `castleDefense.test.ts`).
  - `src/components/games/sentence/castle-defense/CastleDefenseGame.tsx` (+ `BackgroundLayer.tsx`, tests).
  - `src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx`.
  - The legacy paths in the plans (`src/components/castle-defense/`, `src/store/useCastleDefenseStore.ts`) **no longer exist**.
- `gameCards.ts` registers both `castle-defense` and `archers-revenge` (confirmed).
- `calculateCastleDefenseXP` exists in `src/lib/games/castleDefense.ts` (line 662) but its **signature/formula differ** from the start/end-screens spec (see F-GAMES-B02-006).
- Castle Defense assets present in `public/games/castle-defense/` (grass A–D, roads, tower-base/built, player-castle, 3×3 sprite sheets for player/goblin/orc/troll/zombie). Archer's Revenge `public/games/archers-revenge/` contains only screenshots (`archers-revenge-gameplay.png`, `archers-revenge-start-screen.png`), **not** the gameplay sprites the plan lists (see F-GAMES-B02-004).

---

## Files Reviewed (20/20)

1. archers-revenge-20260318/plan.md
2. archers-revenge-20260318/spec.md
3. castle-defense-20260115/metadata.json
4. castle-defense-20260115/plan.md
5. castle-defense-20260115/spec.md
6. castle-defense-assets-20260117/metadata.json
7. castle-defense-assets-20260117/plan.md
8. castle-defense-assets-20260117/spec.md
9. castle-defense-fixes-20260129/metadata.json
10. castle-defense-fixes-20260129/plan.md
11. castle-defense-fixes-20260129/spec.md
12. castle-defense-rewrite-20260127/metadata.json
13. castle-defense-rewrite-20260127/plan.md
14. castle-defense-rewrite-20260127/spec.md
15. castle-defense-start-end-screens-20260130/metadata.json
16. castle-defense-start-end-screens-20260130/plan.md
17. castle-defense-start-end-screens-20260130/spec.md
18. castle_defense_sprites_20260118/index.md
19. castle_defense_sprites_20260118/metadata.json
20. castle_defense_sprites_20260118/plan.md

---

## Findings

### 1. archers-revenge-20260318/plan.md

- **F-GAMES-B02-001** — *Medium* — lines 39–43 & 81–85. Phase 3 lists 5 required sprite assets (`player.png`, `enemy.png`, `arrow.png`, `projectile.png`, `background.png`) all left `[ ]` (not done), and Phase 6 sound effects, yet every rendering task (45–52) is checked `[x]`. The plan is internally inconsistent: rendering "complete" while its declared asset prerequisites remain unchecked. Live tree confirms `public/games/archers-revenge/` holds only screenshots, not these gameplay PNGs — implying the game ships on Konva primitives or reused assets, which the plan never reconciles. Readiness risk: documented art pipeline never closed.
- **F-GAMES-B02-002** — *Low* — line 16. Phase 1 verification marked `[~]` (in-progress) while all other phase verifications are `[x]`. Leaves the track in an ambiguous "verified?" state for the first phase; closeout status unclear from the artifact alone.
- **F-GAMES-B02-003** — *Low* — lines 124–132 ("File Structure"). Documented paths (`src/app/[locale]/(student)/student/games/vocabulary/archers-revenge/`, `src/components/games/vocabulary/archers-revenge/ArchersRevengeGame.tsx`) match the live `app/` and `lib/games/` layout, but the plan never notes that component/lib files live under `src/lib/games/` and `src/components/games/vocabulary/`. Minor doc/source path drift; harmless but reduces navigability.
- **F-GAMES-B02-004** — *High* — lines 38–43. Asset readiness: the five gameplay sprites are unchecked and absent from `public/games/archers-revenge/`. If the shipped game depends on them, this is a release blocker; if it intentionally uses primitives, the plan is stale and misleading. Either way the asset/audio readiness story is unresolved in the artifact.

### 2. archers-revenge-20260318/spec.md

- **F-GAMES-B02-005** — *Medium* — lines 56 & 144–164. XP/scoring formula `XP = floor(baseXP * accuracyMultiplier * speedMultiplier * comboMultiplier)` is under-specified: `baseXP`, the multiplier ranges, and clamping/cap are never defined, and config (143–171) lists raw point values (`basePointsPerEnemy: 100`, `comboMultiplier: 0.1`) that don't map cleanly to the formula's named multipliers. This creates ambiguity for cross-game XP parity (importability into Reading/Primary depends on a consistent XP economy — see F-GAMES-B02-022). No max-XP clamp is stated, risking unbounded XP relative to other games.
- **F-GAMES-B02-031** — *Medium* — lines 7, 29, 58–62. Vocabulary contract is `{ term, translation }` and the target word is shown as the `term` while enemies display `translation`. The spec assumes a single correct translation per term and unique distractors per wave (lines 64–68) but never addresses duplicate/synonym translations or RTL/long-script terms (e.g., Thai shown at line 28). Accessibility/i18n gap: text length and script direction unhandled for the on-enemy labels at 16px min (line 13).
- **F-GAMES-B02-032** — *Low* — lines 95, 173–187. "Target Display" timer is marked optional and "Future Scope" includes leaderboard, sound, particles, combo feedback — but plan.md (84–86, lines 83–86) marks combo display and sound as `[x]` done. Spec "out of scope/future" vs plan "done" disagree on combo/sound; doc inconsistency.
- **F-GAMES-B02-033** — *Info* — lines 97–102 (difficulty table). Difficulty scaling is well-defined (HP/speed/target-interval/formation per Easy/Normal/Hard) and matches config in both spec and plan — good age-appropriate difficulty ramp documentation.

### 3. castle-defense-20260115/metadata.json

- **F-GAMES-B02-007** — *Low* — lines 4 & 5–6. `status: "completed"` but `created_at` and `updated_at` are both `2026-01-15` (same day) and there is no `completed_at`, while five later tracks (rewrite, fixes, sprites, assets, start/end) materially changed this game. The "completed" flag on the original track is misleading given the game was substantially rewritten 12 days later. Metadata does not reflect supersession.

### 4. castle-defense-20260115/plan.md

- **F-GAMES-B02-008** — *Medium* — line 49. Final task "Phase 6 … User Manual Verification" is `[ ]` (unchecked) even though metadata marks the track `completed`. Manual verification gate not closed — readiness signal incomplete.
- **F-GAMES-B02-009** — *Medium* — line 37. "Replace placeholders with final assets (Using Polished Konva Primitives as per agreement)" marked `[x]`. This was later fully reversed by `castle-defense-assets-20260117` (tile PNG system) and `castle_defense_sprites_20260118` (sprite sheets). The original plan's "final assets" claim is stale; no cross-reference/supersession note. Indicates churn — the game's asset story changed at least twice.
- **F-GAMES-B02-010** — *Info* — lines 3–48. Uses a Zustand store (`useCastleDefenseStore`, line 5) and WASD movement. This entire architecture was thrown away in the rewrite (F-GAMES-B02-016). Useful as historical context for the performance-debt lesson.

### 5. castle-defense-20260115/spec.md

- **F-GAMES-B02-011** — *Medium* — lines 36–38 & 48–51. Non-functional requirements mention "Responsive Canvas" and "Performance: Handle multiple projectiles and enemies smoothly" with **no quantified target** (FPS, entity count, device class). The later rewrite (F-GAMES-B02-016) reveals this game shipped at ~0.1 FPS on mobile — the original spec's vague performance bar is the root cause. Mobile/performance acceptance was untestable as written.
- **F-GAMES-B02-012** — *Low* — lines 40–46 (Acceptance Criteria). All acceptance checkboxes are `[ ]` (none checked) despite `metadata.status = completed`. Acceptance criteria never marked satisfied.
- **F-GAMES-B02-013** — *Low* — line 9. Movement spec is "WASD/Arrow keys" only — no touch/mobile control in the original spec, contradicting the mobile-first mandate in `apps/advantage-games/AGENTS.md`. Mobile D-Pad was bolted on later (plan line 36). Mobile UX was an afterthought in the original design.

### 6. castle-defense-assets-20260117/metadata.json

- **F-GAMES-B02-014** — *Low* — line 4. `status: "new"` although its plan.md has all phases checked `[x]` through Phase 4 (line 24). Metadata status not advanced to complete after work finished — inconsistent track bookkeeping (recurring pattern across this batch).

### 7. castle-defense-assets-20260117/plan.md

- **F-GAMES-B02-015** — *Medium* — lines 14–19 (Phase 3). Background is rendered to "a cached Konva layer" via a `BackgroundLayer` component. Caching is good for performance, but the plan never specifies cache invalidation on resize/orientation change. Combined with the responsive `ResizeObserver` flow used elsewhere, a stale cached background on viewport resize is a plausible mobile/browser-compat defect not covered by any task. (`BackgroundLayer.tsx` + test exist in current tree — behavior not verified in this batch.)
- **F-GAMES-B02-034** — *Info* — lines 8–12 (Phase 2). Road-tile selection (EW/NS/corner + rotation) and stable-random grass distribution are properly unit-tested per the plan ("Write unit tests … all corner rotations"). Good test-quality signal for deterministic tile logic.

### 8. castle-defense-assets-20260117/spec.md

- **F-GAMES-B02-035** — *Low* — line 14. Asset filename inconsistency: three grass tiles use underscore (`grass_A.png`, `grass_B.png`, `grass_C.png`) but the fourth uses a hyphen (`grass-D.png`). Live tree confirms the exact same mixed convention in `public/games/castle-defense/`. Fragile naming — easy to mistype in code; recommend normalizing. Not a functional break (files match), so Low.
- **F-GAMES-B02-036** — *Low* — lines 9–11. Hard-codes `TILE_SIZE = 50`, grid `16x12`, resolution `800x600`. This fixed-resolution world (matching the rewrite's `GAME_WIDTH/HEIGHT`) is scaled responsively, but the spec never states behavior for ultra-tall portrait phones (e.g., 390×844 reference from AGENTS.md → aspect 0.46 vs world 1.33). Letterboxing/zoom behavior on mobile portrait is unspecified — a mobile-fit risk.

### 9. castle-defense-fixes-20260129/metadata.json

- **F-GAMES-B02-037** — *Low* — line 4. `status: "new"` while plan.md shows Phases 1–6 fully checked and only Phases 7–10 partially incomplete. Status not maintained; same bookkeeping defect as F-GAMES-B02-014.

### 10. castle-defense-fixes-20260129/plan.md

- **F-GAMES-B02-017** — *High* — lines 367, 440, 500, 525 (+ Phases 7–10). Phases 7 (HUD verification), 8 (Fullscreen — **entirely unchecked**, lines 374–440), 9 (Integration Testing & Polish — nearly all `[ ]`), and 10 (Balance) are **not completed**, yet the track sits in `archive/`. Fullscreen support (a stated track goal, summary line 540 claims "Add fullscreen support ✓") is contradicted by Phase 8 being 0% done. **Readiness gap + false summary claim.** If fullscreen never shipped, the summary's ✓ is wrong.
- **F-GAMES-B02-018** — *High* — lines 446–498 (Phase 9). End-to-end gameplay test, edge-case tests (empty `SAMPLE_SENTENCES`, single-word, 10+ word sentences), error boundaries, and mobile HUD-overlap checks are all `[ ]`. The "✅" annotations after each Verification line (e.g., 471, 489, 498) are **aspirational text not backed by checked tasks** — a misleading verification pattern that could be mistaken for passing QA. Edge-case robustness (empty/oversized sentence input) is explicitly untested.
- **F-GAMES-B02-019** — *Medium* — lines 196–204 & 256–270. `WAVE_CONFIGS` (6 waves) and `MAP_CONFIGS` (6 maps) are hard-coded with fixed enemy counts and fixed waypoints/base positions. This couples difficulty and map geometry to a fixed 6-wave structure — not parameterized by vocabulary length or class level. For importability into Reading/Primary (variable-length vocab sets, age tiers) this rigidity limits reuse (see F-GAMES-B02-022).
- **F-GAMES-B02-020** — *Medium* — lines 99–110 & 132–145. Scoring: "Award points (e.g., 50 points per completed sentence)" and tower-building consume the completed sentence. The points-per-sentence value is parenthetical/example only, never finalized, and there is no documented relationship to XP. Combined with the XP drift in F-GAMES-B02-006, the scoring→XP pipeline is under-defined for this game.
- **F-GAMES-B02-038** — *Low* — lines 182–186 (Task 4.3). "Highlight next required word" is `[ ]` with a note that highlighting was **removed** per user feedback ("Players choose the next word without hints"). Removing the only affordance that signals collection order may hurt younger learners (age-appropriate UX): sequential-order collection with no hint + full reset on error (Task 2.3) can be punishing for early readers. Accessibility/age-UX concern.
- **F-GAMES-B02-039** — *Medium* — lines 87–96 (Task 2.3). On a wrong word, the design **clears all collected words and respawns every sentence word** (full reset). For long sentences (10+ words, untested per F-GAMES-B02-018) this is a harsh penalty loop and a potential frustration/accessibility issue for the target age group. No partial-credit or "undo last" alternative considered.

### 11. castle-defense-fixes-20260129/spec.md

- **F-GAMES-B02-021** — *Medium* — lines 7, 36, 38. Hard-codes a Thai→English language pairing ("แมวอยู่บนพรม", "Thai sentence at top"). The game is built around a specific L1=Thai assumption baked into HUD copy and sentence source. For **importability into Reading/Primary** (which serve other locales), this Thai-specific framing must be generalized; the spec does not parameterize source/target language. **Cross-product portability risk.**
- **F-GAMES-B02-040** — *Low* — lines 153–155 & 200–205. Compatibility section requires fullscreen on "Chrome, Firefox, Safari, Edge" with graceful degradation, but (per F-GAMES-B02-017) Phase 8 fullscreen tasks are unchecked. Spec requirement has no satisfied implementation evidence in the artifacts.
- **F-GAMES-B02-041** — *Info* — lines 146–161 & 207–218. Good: spec mandates TDD, >80% coverage for new functions, and enumerates required unit tests (parsing, order validation, reset, tower-build, wave limits, progression). Strong test-intent documentation; partially realized (live `castleDefense.test.ts` exists and includes XP/parse tests).

### 12. castle-defense-rewrite-20260127/metadata.json

- **F-GAMES-B02-042** — *Info* — lines 3–13. Well-formed: `status: "complete"`, `completed_at` set, plus `performance_result: "30+ FPS achieved on mobile"` and `code_reduction: "1,497 lines (net)"`. This is the **best-maintained metadata** in the batch and a good template for the others (contrast F-GAMES-B02-007/014/037).

### 13. castle-defense-rewrite-20260127/plan.md

- **F-GAMES-B02-016** — *High* — lines 393, 436, 462, 494, 548, 604, 663 (Phase 2). Multiple distinct tasks are all labeled `### Task 2.\1:` — a broken/duplicated task-numbering bug (literal `\1` regex backreference artifact, likely from a sed/find-replace). Seven functions (moveEnemy, collision helpers, collectWords, checkTowerActivation, updateTowers, updateProjectiles, checkBaseDamage) share the malformed ID and are all left `[ ]` unchecked, while Phase 2's later test tasks are `[x]`. Makes phase-completion tracking unreliable and indicates an automated edit gone wrong. **Process/traceability defect.**
- **F-GAMES-B02-043** — *High* — lines 854–855 (scoring logic in spec'd code). The embedded `advanceCastleDefenseTime` computes `enemiesKilled` as `state.enemies.length - enemies.length - (baseDamage.enemies.length < state.enemies.length ? 1 : 0)`. This formula conflates enemies removed by **death** vs enemies removed by **reaching the base** and can yield negative/incorrect kill counts (e.g., when an enemy leaks to base, the term subtracts 1 but only for a single leak regardless of count). Scoring correctness bug as documented; if copied verbatim into source, score under/over-counts. (Note: live `castleDefense.ts` may differ — not verified line-by-line in this batch.)
- **F-GAMES-B02-044** — *Medium* — lines 179, 760, 776–800. `generateId()` uses `Date.now()+Math.random()` and word spawn uses `Math.random()` directly (line 866 `spawnWords(vocabulary, state.targetWord)` with no seeded RNG passed), while `spawnEnemy`/`spawnWords` accept an injectable `random` param elsewhere. Inconsistent RNG injection undermines deterministic testing (the spec demands TDD). Also `.substr` (line 179) is deprecated. Test-quality/maintainability.
- **F-GAMES-B02-045** — *Medium* — lines 297, 751, 931, 1228, 1486, 1571 (and many phase ends). Nearly every "Measure - User Manual Verification" task across Phases 1–6 is `[ ]` unchecked, yet metadata says `complete` and the Summary (1659) declares "PROJECT COMPLETE". Manual-verification gates not closed despite completion claim — same pattern as fixes track. Readiness signal weak.
- **F-GAMES-B02-046** — *Medium* — lines 1017–1024 & 1352–1357. Asset loading reuses Wizard-vs-Zombie sprites (`player_3x3_pose_sheet.png`, `tile-ruins.png`) for Castle Defense, mixed with castle-defense enemy sprites. Cross-game asset borrowing creates a hidden coupling: deleting/renaming Wizard assets would silently break Castle Defense. Shared-runtime/asset-dependency risk; not documented as an intentional shared asset.
- **F-GAMES-B02-047** — *Low* — lines 1018, 1023, 1019–1022. Image `onerror` rejects the Promise.all (line 1011 `img.onerror = rej`), and the only handler is `console.error('Failed to load assets', e)` (1029). A single missing asset aborts ALL asset loading and leaves the game stuck on the "Loading…" screen (1111–1118) with no user-facing error/retry. Browser-compat/robustness gap (e.g., one 404 → permanent loading state).

### 14. castle-defense-rewrite-20260127/spec.md

- **F-GAMES-B02-022** — *High* — lines 41–87 & 433–438. The rewrite spec preserves a **fixed-world, single-vocabulary-driven** model (`createInitialState(vocabulary)`, hard-coded path/slots) and explicitly targets only this app's patterns (Wizard-vs-Zombie). Nothing in the spec addresses **importability into Reading/Primary**: no shared game-runtime contract, no XP/score interface aligned to host apps, no locale/vocab-source abstraction. Combined with the Thai-specific framing (F-GAMES-B02-021) and rigid wave/map configs (F-GAMES-B02-019), porting these games into the Reading/Primary products would require non-trivial rework. **Cross-product portability is undesigned.**
- **F-GAMES-B02-023** — *Medium* — lines 283–286 & 366–369. Spec states game logic runs at "20 FPS game logic (same as Wizard)" via `GAME_TICK_MS = 50`, while acceptance criteria demand "30+ FPS on mobile". The 50 ms tick is the **logic** rate; rendering FPS is separate. The doc conflates logic-tick and render-FPS, making the "30+ FPS" acceptance ambiguous and hard to verify objectively. Performance acceptance under-specified.
- **F-GAMES-B02-024** — *Medium* — lines 331–336 & 346. The `Word` type carries `isCorrect`/`translation` and `base` is `{x,y,hp,maxHp}` (no radius), but the plan's `Base` type (plan lines 133–139) **includes** `radius`. Type drift between spec and plan for the same entity; importers/tests relying on the spec type would miss `radius`. Contract inconsistency.
- **F-GAMES-B02-048** — *Low* — lines 404–414. Spec lists files to DELETE (old CastleDefenseGame, BackgroundLayer, HUD, DPad, store). The current tree confirms these legacy paths are gone and a new `BackgroundLayer.tsx` was re-created under `components/games/sentence/castle-defense/` — i.e., a file marked for deletion was effectively reintroduced under a new path in a later track. Acceptable evolution but the rewrite spec's deletion list became stale. Info-adjacent; Low.

### 15. castle-defense-start-end-screens-20260130/metadata.json

- **F-GAMES-B02-025** — *Low* — lines 4–7. `status: "completed"` with `completed_at: 2026-03-20` but `created_at`/`updated_at` both `2026-01-30`; `updated_at` was never bumped to the completion date (~7 weeks later). Timestamp hygiene issue; `updated_at < completed_at` is logically inconsistent.

### 16. castle-defense-start-end-screens-20260130/plan.md

- **F-GAMES-B02-006** — *High* — lines 26–28, 78, 104. Plan specifies XP as `calculateCastleDefenseXP(score)` = `ceil(score * 0.01)` (1% of score, rounded up). **Live source diverges**: `src/lib/games/castleDefense.ts:662` implements `calculateCastleDefenseXP(state: CastleDefenseState)` returning an **accuracy/survival/speed/wave-bonus** formula capped at 10 (baseXP = `min(5, correctWordCollections)` + bonuses). The signature (takes `state`, not `score`), the formula, and the cap **all differ** from the spec/plan. Spec→implementation drift on the XP economy — directly impacts cross-game XP parity and any host-app (Reading/Primary) that reads XP. **Documented contract is wrong relative to shipped code.**
- **F-GAMES-B02-026** — *Low* — lines 32, 57, 83, 96. All four "Measure - User Manual Verification" tasks are `[ ]` unchecked though metadata is `completed`. Same unclosed-verification-gate pattern as the other tracks.
- **F-GAMES-B02-049** — *Low* — lines 90–92 (Task 4.1). Accessibility is partially addressed ("buttons have proper focus/hover states", "sentence list scrollable and readable on small screens") but there is no mention of ARIA roles, screen-reader labels for the canvas/score, color-contrast checks, or keyboard navigation of the start/end overlays. Accessibility coverage is shallow for an education product.

### 17. castle-defense-start-end-screens-20260130/spec.md

- **F-GAMES-B02-027** — *Medium* — lines 4, 14–22, 38. Spec defines XP **only** as `ceil(totalScore * 0.01)` and explicitly puts "Changes to scoring rules or XP economy beyond the 1% calculation" **out of scope**. The shipped accuracy-based formula (F-GAMES-B02-006) violates this spec's own scope boundary. Either the spec is obsolete or the implementation went out of scope without a spec update — governance/traceability gap.
- **F-GAMES-B02-050** — *Info* — lines 7–22. Good UX intent: start screen lists practice sentences, end screen shows score + XP + performance breakdown (waves/enemies/accuracy), consistent with sibling games (Wizard vs Zombie, Potion Rush). Promotes a consistent shared end-screen pattern across the games suite.

### 18. castle_defense_sprites_20260118/index.md

- **F-GAMES-B02-028** — *Info* — lines 1–5. Pure navigation stub (links to spec/plan/metadata). Notably this is the **only** track in the batch with an `index.md`; the others omit it. Minor inconsistency in track scaffolding across the suite (Low-adjacent, recorded as Info).

### 19. castle_defense_sprites_20260118/metadata.json

- **F-GAMES-B02-029** — *Low* — line 4. `status: "new"` despite plan.md showing all three phases' top-level tasks `[x]` complete. Status not advanced — recurring metadata-staleness defect (see F-GAMES-B02-014/037).

### 20. castle_defense_sprites_20260118/plan.md

- **F-GAMES-B02-030** — *Medium* — lines 5–8, 13–15, 20–23. Every **sub-task** bullet under the checked parent tasks is left `[ ]` unchecked (e.g., death-state "plays once and locks on final frame" line 8; row/col mapping verification line 15; spawner randomization line 22), while the **parent** `Task` lines are `[x]`. Parent-marked-done / children-unchecked makes it impossible to confirm the death-animation lock and spawn randomization were actually implemented/tested. Traceability + animation-correctness verification gap.
- **F-GAMES-B02-051** — *Low* — lines 4–9 (Phase 1). The 3×3 sprite system (row=action Idle/Walk/Attack/Death, col=frame) has **no unit tests referenced** in the plan, unlike sibling Castle Defense tracks that mandate TDD (F-GAMES-B02-041). Animation-state logic (especially the "death plays once and locks" edge case) ships without documented test coverage. Test-quality gap.
- **F-GAMES-B02-052** — *Info* — line 7. Asset/runtime grounding: live `public/games/castle-defense/` contains `player_3x3_pose_sheet.png`, `goblin_3x3_pose_sheet.png`, `orc_3x3_pose_sheet.png`, `troll_3x3_pose_sheet.png` — confirming the planned sprite sheets were delivered. Positive readiness signal for this track's asset goal.

---

## Cross-Cutting Observations

- **Metadata hygiene (recurring):** 4 of 7 tracks (`assets`, `fixes`, `sprites`, and partially `20260115`) leave `status` stale (`new`/`completed` mismatched with plan state) or fail to bump `updated_at`. Only the `rewrite` track has exemplary metadata. Recommend a closeout convention. (F-GAMES-B02-007, 014, 025, 029, 037)
- **Unclosed manual-verification gates (recurring):** Nearly every track leaves "Measure - User Manual Verification" tasks `[ ]` while declaring completion. The "✅" inline annotations are decorative, not gate-backed. This systematically weakens the readiness signal across the games suite. (F-GAMES-B02-008, 017, 018, 026, 045)
- **XP economy drift (high impact):** Two tracks document mutually inconsistent XP rules, and both differ from shipped code. Any importer (Reading/Primary) consuming Castle Defense XP cannot trust the specs. (F-GAMES-B02-005, 006, 020, 027)
- **Portability undesigned:** Thai-hardcoding, fixed wave/map configs, cross-game asset borrowing, and app-internal architecture coupling mean these games are not yet structured for clean import into Reading/Primary. (F-GAMES-B02-019, 021, 022, 046)
- **Doc/source path drift:** All plans reference pre-relocation paths (`src/lib/castleDefense.ts`, `src/components/castle-defense/`); current code lives under `src/lib/games/` and `src/components/games/sentence|vocabulary/`. Archived plans are not annotated with the relocation. (F-GAMES-B02-003)

---

## Limitations

1. **Document-only batch:** All 20 files are Measure planning/spec artifacts, not runtime source. Findings about gameplay, scoring, performance, accessibility, and mobile behavior are assessed **as described in the artifacts**, not by executing or fully reading the game code. Embedded code blocks in plans (e.g., the rewrite's `advanceCastleDefenseTime`) may differ from what actually shipped.
2. **Selective grounding only:** I verified file existence, registration in `gameCards.ts`, asset presence, and the `calculateCastleDefenseXP` signature/formula against the live tree. I did **not** perform a full line-by-line audit of `castleDefense.ts`, `CastleDefenseGame.tsx`, `archersRevenge.ts`, or their tests — those source files are outside this batch's file list.
3. **No tests executed:** No `pnpm`/`npm`/`vitest`/`jest` runs were performed; test-quality findings are based on documented test intent and presence of `.test.ts(x)` files, not on pass/fail results or coverage measurement.
4. **No source edits made** (read-only review, per instructions).
5. **Archive context:** These tracks are archived; some staleness (path drift, status flags) is expected for historical artifacts and is reported as Low/Info where it has no live impact.
6. **No acceptance/closeout determination:** This report makes **no** acceptance or closeout claims for the batch or the parent track; it is a findings inventory only.

---

## Coverage Confirmation

- Files in `/tmp/opencode/games-batch-02`: **20**
- Files reviewed: **20** (100%)
- Findings IDs assigned: **F-GAMES-B02-001 … F-GAMES-B02-052** (52 findings; non-contiguous numbering by file grouping, all unique).
