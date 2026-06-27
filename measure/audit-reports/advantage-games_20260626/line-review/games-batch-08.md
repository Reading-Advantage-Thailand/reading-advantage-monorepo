# Line-by-Line Review — games-batch-08

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-08`
**Scope source:** `/tmp/opencode/games-batch-08` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure archive documents** (specs, plans, metadata, asset specs) for six archived tracks inside `apps/advantage-games/measure/archive/`: `realm-carver-20260320`, `realm_carver_coverage_20260415`, `rpg_battle_20260102`, `rune-forge-chamber-20260320`, `rune_match_20260104`, `selection_screen_20260102`, plus the asset-spec/metadata/plan head of `shadow-gate-dungeon-20260320`. No `.ts`/`.tsx` runtime, component, or test source files are in this batch. Light read-only structural verification of routes/lib paths was performed via `ls`/`find` and is noted inline.
**Finding ID scheme:** `F-GAMES-B08-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `realm-carver-20260320/spec.md` | realm-carver | spec |
| 2 | `realm_carver_coverage_20260415/metadata.json` | realm_carver_coverage | metadata |
| 3 | `realm_carver_coverage_20260415/plan.md` | realm_carver_coverage | plan |
| 4 | `realm_carver_coverage_20260415/spec.md` | realm_carver_coverage | spec |
| 5 | `rpg_battle_20260102/asset-spec.md` | rpg_battle | asset-spec |
| 6 | `rpg_battle_20260102/metadata.json` | rpg_battle | metadata |
| 7 | `rpg_battle_20260102/plan.md` | rpg_battle | plan |
| 8 | `rpg_battle_20260102/spec.md` | rpg_battle | spec |
| 9 | `rune-forge-chamber-20260320/metadata.json` | rune-forge-chamber | metadata |
| 10 | `rune-forge-chamber-20260320/plan.md` | rune-forge-chamber | plan |
| 11 | `rune-forge-chamber-20260320/spec.md` | rune-forge-chamber | spec |
| 12 | `rune_match_20260104/asset-spec.md` | rune_match | asset-spec |
| 13 | `rune_match_20260104/plan.md` | rune_match | plan |
| 14 | `rune_match_20260104/spec.md` | rune_match | spec |
| 15 | `selection_screen_20260102/metadata.json` | selection_screen | metadata |
| 16 | `selection_screen_20260102/plan.md` | selection_screen | plan |
| 17 | `selection_screen_20260102/spec.md` | selection_screen | spec |
| 18 | `shadow-gate-dungeon-20260320/asset-spec.md` | shadow-gate-dungeon | asset-spec |
| 19 | `shadow-gate-dungeon-20260320/metadata.json` | shadow-gate-dungeon | metadata |
| 20 | `shadow-gate-dungeon-20260320/plan.md` | shadow-gate-dungeon | plan |

---

## Findings

### File 1 — `realm-carver-20260320/spec.md`

**F-GAMES-B08-001 · High · spec.md:39-43 (XP & Scoring System)**
XP model is under-specified and inconsistent with sibling games. "Base XP: 1 XP per word" + "Area Bonus +2" + "Speed Bonus +2" = a maximum of 5 from the stated components, yet "Maximum XP: 10" (line 43). The accumulation path to a 10 cap is undocumented (per-word? per-sentence? per-session?). This mirrors the suite-wide XP-normalization gap (paladins caps at 10, potion-rush uncapped per-customer). Any shared leaderboard/progression on import into Reading/Primary will be non-comparable across games. Note: batch-07 F-GAMES-B07-045 flagged that the realm-carver *plan* has no scoring/XP task; this spec supplies a scoring section but it does not resolve into a coherent, testable formula.

**F-GAMES-B08-002 · High · spec.md:56-59 (Territory Filling)**
The core territory-claiming algorithm is left ambiguous: line 57 says "Use a flood-fill or polygon clipping algorithm," line 58 says "Usually, the smaller side or the side WITHOUT the 'core' monster is filled," and line 59 concedes "standard Qix logic is usually simpler … the side containing the correct word could be filled, but…". The which-side-fills rule is the heart of a Qix-style game and determines whether the educational goal (enclosing the correct next word) is even achievable. A central win mechanic described as "could be / usually" is a readiness blocker for deterministic scoring and for any E2E/regression test helper.

**F-GAMES-B08-003 · Medium · spec.md:61-64, 69-73 (flood-fill perf on mobile)**
The technical approach commits to a 100×100 logical grid (10,000 cells) for "easy filling and collision detection," running under `tickRealmCarver`. No frame-time budget, no low-end-device fallback, and no perf test are specified. Per-completion flood-fill over 10k cells plus per-frame collision against 2 moving monsters and a self-non-crossing trail is exactly the hot path the mobile-perf hardening track did **not** profile for this game (cross-ref batch-07 F-GAMES-B07-006/046). High frame-drop risk on the low-end mobile hardware the suite targets.

**F-GAMES-B08-004 · Medium · spec.md:11, 72-73 (viewport/grid mismatch)**
Platform reference is "390×844" (line 11) but the config declares `gameWidth: 390, gameHeight: 600` (lines 72-73) — a non-standard play-area height vs the 700 used by rune-forge-chamber and shadow-gate-dungeon (both `arenaHeight: 700`). Inconsistent canvas dimensions across sentence games complicate the shared runtime's responsive scaling and the embedding apps' layout contract. No statement on how the 390×600 logical area maps onto the 844-tall device viewport.

**F-GAMES-B08-005 · Medium · spec.md:9-14, 47-49 (accessibility / motion)**
Accessibility coverage is limited to a 44×44 DPad target (line 12) and a min 18px word size (line 13). The game is built on continuous motion (bouncing word orbs, 2 chasing monsters, drawn trails) with state communicated largely by area color fill. No color-blind-safe territory differentiation, no reduced-motion option, no keyboard alternative beyond the virtual DPad, and no caption alternative for any SFX. For a fast arcade game aimed at young learners this is a notable a11y gap.

**F-GAMES-B08-006 · Low · spec.md:20-25 (collision/HP UX)**
Collision rules apply damage on trail-hit and wild-area hit with HP starting at 3 (config `initialHp: 3`). A monster hitting the player's trail destroys the trail (line 22) on top of HP loss, and a wild hit resets the player to the safe area (line 23). Double penalty (lost progress + lost HP) with only 3 HP can yield a punitive failure curve for the target age group; no recovery/checkpoint affordance is documented.

**F-GAMES-B08-007 · Low · spec.md:1-88 (route/path not specified)**
The spec names no route or file path. Verified out-of-band that the game lives at `src/app/[locale]/(student)/student/games/sentence/realm-carver/` and lib at `src/lib/games/realmCarver.ts` — consistent with the migration contract — but the spec itself does not encode the `[locale]/(student)/student/` import-target structure, leaving routing correctness to convention only.

### File 2 — `realm_carver_coverage_20260415/metadata.json`

**F-GAMES-B08-008 · Info · metadata.json:7-10**
A dedicated chore track to lift realm-carver coverage from 75.51% to ≥80% confirms the original feature track shipped **below** the app's stated >80% coverage standard and required a remediation pass — relevant evidence for the review's test-quality theme. `actual_tasks` (4) matches `estimated_tasks` (4); deviation_notes are internally coherent.

**F-GAMES-B08-009 · Low · metadata.json:10**
`deviation_notes` records that useSound already had "3 tests existing, all passing," so the coverage uplift came from GameEndScreen (8 tests) + VirtualDPad (3 tests) — shared-UI components, not realm-carver gameplay logic. The 80% threshold was reached by testing reusable scaffolding rather than the game-specific flood-fill/trail/scoring logic (see F-GAMES-B08-001/002), so the coverage number may overstate confidence in the game's distinctive code paths.

### File 3 — `realm_carver_coverage_20260415/plan.md`

**F-GAMES-B08-010 · Medium · plan.md:5-9, 13-16 (tests target shared components)**
Phases 1-2 add tests for `GameEndScreen` and `VirtualDPad`, which are **shared runtime components** reused by many games. Testing them under the realm-carver coverage track means their coverage is attributed to one game; the plan does not state whether these tests live with the shared component or with the game. If duplicated per-game this is churn; if shared, the realm-carver "coverage fix" did not actually exercise realm-carver-specific branches. Either way the plan does not clarify ownership of the new tests.

**F-GAMES-B08-011 · Low · plan.md:25-28 (Phase 4 verification)**
Phase 4 "Run coverage report and verify ≥80%" and "Commit final checkpoint" are checked, but the plan records **no resulting coverage figure** (metadata says the goal was 75.51%→≥80%, but neither plan nor metadata states the final measured number). The acceptance signal ("≥80%") is asserted as done without a captured value, so the gate cannot be re-verified from the documents.

### File 4 — `realm_carver_coverage_20260415/spec.md`

**F-GAMES-B08-012 · Medium · spec.md:14-18 (Acceptance Criteria)**
Acceptance criteria ("coverage ≥ 80%", "All new tests pass", "No regressions") are prose bullets with no checkboxes and no recorded measurement. For a track whose **entire purpose** is a numeric coverage threshold, the absence of the achieved figure means the spec's headline acceptance criterion is unverifiable from this batch.

**F-GAMES-B08-013 · Info · spec.md:20-22 (Out of Scope)**
Spec correctly scopes out gameplay/feature changes, keeping the chore narrow. No issue; recorded for completeness. Confirms the underlying gameplay defects in F-GAMES-B08-001/002 were explicitly *not* addressed by this coverage track.

### File 5 — `rpg_battle_20260102/asset-spec.md`

**F-GAMES-B08-014 · Medium · asset-spec.md:25-27 (single format, no fallback)**
Naming convention specifies `.webp` pose sheets (`hero_pose_sheet_3x3.webp`). WebP is well-supported in modern browsers but the spec provides **no fallback format (png) and no DPR/@2x guidance** for the 3×3 sheet. Combined with the "randomize hero and enemy sprites at battle start" task (plan line 43), multiple large pose sheets may be fetched; no preload/lazy policy or sprite-budget is stated. Minor browser-compat and mobile-load risk.

**F-GAMES-B08-015 · Low · asset-spec.md:19-23 (orientation/flip logic)**
The flip rule ("Player flipped on X to face right; Enemy stays facing left") is a rendering contract carried only in the asset doc. If the runtime `Sprite` component (plan line 21) does not honor scale-(-1) cleanly, text or shading baked into the sheet could mirror incorrectly. The contract is reasonable but undocumented in any tested spec assertion — verification depends on code not in this batch.

### File 6 — `rpg_battle_20260102/metadata.json`

**F-GAMES-B08-016 · Medium · metadata.json:4 (`"status": "new"`)**
File is under `measure/archive/` yet metadata still reads `"status": "new"` with identical `created_at`/`updated_at` (both 2026-01-02T10:00:00Z). This is the same archive-status-staleness defect flagged systemically in batch-07 (F-GAMES-B07-021/027): an archived, fully-built game (plan shows all phases checked) whose metadata never advanced past `new`. Makes the tracks registry unreliable for determining what shipped.

**F-GAMES-B08-017 · Low · metadata.json:5-6 vs plan.md:34-45**
Metadata records no `completed_at` and no task counts, while the plan shows Phase 4 plus eight extra polish tasks completed. Metadata and plan disagree on lifecycle state; the metadata carries none of the deviation/closeout detail that sibling tracks (e.g., realm_carver_coverage) do.

### File 7 — `rpg_battle_20260102/plan.md`

**F-GAMES-B08-018 · High · plan.md:6, 8 (Zustand store vs pure-state convention)**
RPG Battle is built on a **Zustand store** (`RPGBattleStore`, `useRPGBattleStore`, plan lines 8-9) rather than the "pure state object with tick function" pattern mandated for the Konva games (rune-forge-chamber plan line 121, shadow-gate-dungeon plan line 127, app AGENTS.md). A divergent state architecture for one game complicates the shared runtime, the import-into-Reading/Primary contract, and any common test harness/E2E helper that assumes pure-state tick functions. This is an architectural-consistency risk for the suite, not just a style nit.

**F-GAMES-B08-019 · Medium · plan.md:45 (final manual-verification gate unchecked)**
Phase 4 "Measure - User Manual Verification 'Phase 4: XP & Finalization'" (line 45) is **unchecked `[ ]`** while the track is archived. Phase 4 covers XP calculation, BattleResults, app-router integration, and the XP-snapshot fix — i.e., the scoring/XP and integration surface was never signed off by the Measure verification protocol. Readiness for XP/integration cannot be claimed from the documents.

**F-GAMES-B08-020 · Medium · plan.md:31, 40 (Framer Motion + screen shake, no a11y guard)**
Combat uses Framer Motion attack animations and **screen-shake effects** (lines 31, 40) plus sound effects (line 40). No reduced-motion guard or motion/audio opt-out appears anywhere in the plan. Screen shake is a vestibular/photosensitivity concern, especially for younger learners; the absence of an accessibility task repeats the suite-wide a11y omission.

**F-GAMES-B08-021 · Low · plan.md:28 (2-second hard wait on error)**
The "2-second error feedback loop" forces a fixed 2s lockout after every incorrect answer. For learners who mistype frequently this compounds into long dead time and is not configurable; also a potential frustration/UX-pacing issue with no skip affordance documented.

### File 8 — `rpg_battle_20260102/spec.md`

**F-GAMES-B08-022 · Medium · spec.md:14-16, 30-33 (dynamic difficulty under-specified)**
"Dynamic Difficulty" claims words the player knows are assigned to low-damage attacks and missed words to high-damage "Power Attacks," and XP factors in "Battle Efficiency" and "Streak Bonus." Neither the accuracy-tracking source, the known/new thresholds, nor the streak/efficiency formula are quantified. The spec asserts adaptive behavior and a 1-10 XP range (line 30) without a computable rule — not testable as written, and the adaptivity depends on prior per-word accuracy data that the import contract (mock session, `xp:0`) may not supply.

**F-GAMES-B08-023 · Medium · spec.md:39-44 (Acceptance Criteria unchecked) vs 44 (integration claim)**
All acceptance criteria are unchecked `[ ]`, including line 44 "The game integrates with the existing `useGameStore` and `xp.ts` logic where applicable." The "where applicable" hedge plus the unique Zustand store (F-GAMES-B08-018) leaves it unclear whether RPG Battle actually shares the suite's XP pipeline or maintains a parallel one — central to importability and leaderboard normalization.

**F-GAMES-B08-024 · Low · spec.md:36 (responsive desktop+mobile, but typing input)**
"Responsive Design: playable on desktop and mobile." The core interaction is **typing the translation**, which on mobile invokes the soft keyboard — occluding the battle scene in portrait and conflicting with the suite's touch-first 390×844 convention. No mobile keyboard/IME handling or input-occlusion mitigation is specified.

### File 9 — `rune-forge-chamber-20260320/metadata.json`

**F-GAMES-B08-025 · Info · metadata.json:3-7**
`status: "completed"` with `created_at` 04:40Z → `completed_at` 08:00Z (~3.3h) for a full Konva sentence game across 7 phases. Status is correctly terminal here (contrast rpg_battle). Fast build window; flag the "strict TDD" claim (plan line 3) for test-artifact verification — no test files are in this batch to confirm the >80% coverage claim.

### File 10 — `rune-forge-chamber-20260320/plan.md`

**F-GAMES-B08-026 · Medium · plan.md:67-69, 72 (deferred polish + integration test on a "completed" track)**
Phase 7 leaves "visual feedback and juice," "sound effects," "balance tuning," and **"Final integration test (deferred)"** (line 72) unchecked while metadata marks the track `completed`. The integration test that would validate the API routes (`/sentences`, `/complete`, lines 70) end-to-end was explicitly deferred — so the leaderboard/XP/progress persistence path (the key importability surface) is unverified, matching the suite-wide mock-`complete` gap (batch-07 F-GAMES-B07-042).

**F-GAMES-B08-027 · Medium · plan.md:102-109 (XP formula components exceed nothing but cap arithmetic unclear)**
Config XP: `xpPerCorrectWord:1` + `accuracyBonus:2` + `speedBonus:1` + `survivalBonus:1`, `maxXP:10`, formula `Math.min(10, correctWords + bonuses)` (spec line 45). With Master difficulty `wordCount:8` (line 115), correctWords alone can reach 8, +4 bonuses = 12 → capped to 10; but Apprentice `wordCount:4` maxes at 4+4=8, never reaching the 10 cap. XP ceiling is therefore **difficulty-dependent and uncapped-relative-to-effort**, so easy and hard runs are not comparable on a shared leaderboard. Same normalization concern as F-GAMES-B08-001.

**F-GAMES-B08-028 · Low · plan.md:113-116 (wordCount vs spec range mismatch)**
Plan config sets fixed `wordCount` 4/6/8 for easy/normal/hard, but the spec difficulty table (spec lines 87-91) lists ranges 3-4 / 5-6 / 7-8. The single fixed values silently pick the top of each range; minor spec/impl drift that affects sentence-length expectations and timer balance.

### File 11 — `rune-forge-chamber-20260320/spec.md`

**F-GAMES-B08-029 · Medium · spec.md:36-37, 62-72 (dual lose conditions + timer pressure for young learners)**
Defeat triggers on **either** timer expiry (10-15s per sentence) **or** health zero (-15 per wrong tap, 100 HP = ~7 wrong taps). A tight 10s timer on Master plus health drain creates compounding time pressure that may be age-inappropriate for early readers and disadvantages slower/assistive users. No relaxed/practice mode or per-user timer accommodation is specified (the spec lists "freeze timer" only as post-MVP, line 169).

**F-GAMES-B08-030 · Medium · spec.md:100-114 (state communicated by color)**
Visual design encodes critical state purely via color: target circle = gold, collected = green, wrong = red flash, word circles = blue. With "ONLY text differs" educational intent, color-only target-highlighting (line 106) gives no color-blind-safe alternative (shape/label/ring). Combined with screen shake on wrong selection (line 113) and no reduced-motion option, this is an accessibility gap for a game whose entire feedback loop is color+motion.

**F-GAMES-B08-031 · Low · spec.md:128-131 (arenaHeight 700 vs realm-carver 600)**
`arenaWidth:390, arenaHeight:700` here vs realm-carver's 390×600 (F-GAMES-B08-004). The two sentence games in this batch disagree on canvas height, confirming the suite lacks a single canonical play-area dimension — a shared-runtime/responsive-scaling consistency issue.

### File 12 — `rune_match_20260104/asset-spec.md`

**F-GAMES-B08-032 · High · asset-spec.md:104-112, 350 (single rune design — readability vs reading goal)**
The "CRITICAL DESIGN RULE" (one identical rune design, text-only differentiation) is pedagogically sound but creates a **readability/accessibility tension**: a low-contrast board background is required (lines 290-292) so that small text on identical 64×64 tiles remains legible. For dyslexic/low-vision learners, dense identical tiles distinguished only by translation text on a 6×8 grid is demanding. No min font-size, no high-contrast mode, and no tile-text scaling guidance is given — the readability requirement is asserted ("must not interfere with rune text readability") without a measurable spec.

**F-GAMES-B08-033 · Medium · asset-spec.md:337-344, 361-364 (many discrete sprites, no atlas)**
The asset table enumerates 4 monster sprite sheets, 3 rune PNGs, multiple effect sheets, HP-bar elements, panels, banners, and backgrounds (lines 337-344), all "PNG with transparency" + "@2x" (lines 362-363) with **no texture-atlas/sprite-sheet consolidation requirement** beyond per-monster sheets. In a Konva match-3 with a 48-tile board plus cascading animations, many discrete textures mean many GPU binds and HTTP requests — a mobile load/perf concern. No WebP/compression or total-asset budget is specified.

**F-GAMES-B08-034 · Low · asset-spec.md:135-160 (power-up runes must be visually distinct — conflicts with read-the-word intent)**
Heal/Shield runes are intentionally visually distinct (heart/shield icons), while vocabulary runes are intentionally identical. This is fine, but the spec gives no rule preventing power-up icons from becoming visual "anchors" that let players pattern-match the board without reading — a subtle dilution of the core educational constraint. Worth a design note; not a blocker.

### File 13 — `rune_match_20260104/plan.md`

**F-GAMES-B08-035 · High · plan.md:58 (match explosion effect never implemented)**
Phase 7 "Implement match explosion effects" is **unchecked `[ ]`** while the track's other Phase 7 items are checked and the game is registered in the menu (Phase 1 line 10). The primary juice/feedback for the central match action shipped absent. More importantly, there is **no Phase-7 Measure manual-verification gate listed at all** (contrast every other game's "User Manual Verification" task), so Game-States & Polish was never formally signed off.

**F-GAMES-B08-036 · Medium · plan.md:32-33 (monster attack timer + random damage = real-time pressure on a puzzle)**
Monster attacks every 5s for "random 1 to ATK" damage (lines 32-33) with Power Word rotating on the same 5s clock (line 36). This injects a **real-time clock into a match-3** that is otherwise turnless, penalizing slower/assistive players and players who pause to read — an age-appropriateness and accessibility concern. No pause, no slow-mode, and no timer accommodation is in the plan.

**F-GAMES-B08-037 · Medium · plan.md:5-9 (non-canonical route + lib path)**
Plan creates the route at `src/app/games/rune-match` (line 8) and config at `src/lib/runeMatchConfig.ts` (line 6) — **not** the `[locale]/(student)/student/games/...` + `src/lib/games/` convention. Verified out-of-band the game was later relocated to `src/app/[locale]/(student)/student/games/vocabulary/rune-match` and `src/lib/games/runeMatch*.ts`, i.e., the plan's paths are stale relative to the shipped structure (the migration track moved it). The archived plan therefore misdescribes the current import target — traceability defect.

**F-GAMES-B08-038 · Low · plan.md:70-99 (XP fixed per-monster, not effort-based)**
XP is a flat per-monster reward (goblin 3 / skeleton 6 / orc 9 / dragon 12, lines 75-78) and can **exceed 10** (dragon 12), unlike the 10-capped sentence games. Yet another distinct XP scale in the suite (cross-ref F-GAMES-B08-001, B08-027); a shared leaderboard would see rune-match dragon wins outscore any sentence-game perfect run regardless of skill.

### File 14 — `rune_match_20260104/spec.md`

**F-GAMES-B08-039 · Medium · spec.md:14-19, 33-35 (XP scale 3/6/9/12 vs suite 1-10)**
Confirms the design intent: defeat-based XP of 3/6/9/12 with **0 XP on defeat** (line 35). Two problems for importability: (a) the 12 ceiling breaks the 1-10 normalization other games use; (b) all-or-nothing XP (0 on any loss) is harsh for a learning context and produces high-variance progression that is hard to reconcile into a shared progress/leaderboard contract in Reading/Primary.

**F-GAMES-B08-040 · Low · spec.md:106-118 (config drift: powerUps.shieldDuration)**
The spec config (lines 106-118) omits `shieldDuration`, while the plan config (plan lines 89-93) includes `shieldDuration: 1`. Minor spec/plan config drift on the shield power-up; the canonical source is ambiguous.

**F-GAMES-B08-041 · Low · spec.md:42-43, 3.2 (Bejeweled "infinite stack" + identical tiles guarantees solvability?)**
The "infinite stack" model (new runes fall from top) plus identical-looking tiles raises an unaddressed question: with only ~10 vocabulary translations distributed on a 6×8 board, the spec does not state how no-valid-move/deadlock boards are detected or reshuffled. A match-3 without a deadlock-resolution rule can soft-lock; not specified anywhere in spec or plan.

### File 15 — `selection_screen_20260102/metadata.json`

**F-GAMES-B08-042 · Medium · metadata.json:4 (`"status": "new"`)**
Archived selection-screen feature still reads `"status": "new"` with identical created/updated timestamps — same staleness defect as rpg_battle (F-GAMES-B08-016) and the batch-07 systemic finding. Two of the rpg-battle-family tracks in this batch (rpg_battle, selection_screen) carry non-terminal status in the archive.

### File 16 — `selection_screen_20260102/plan.md`

**F-GAMES-B08-043 · Medium · plan.md:18 (Phase 2 manual-verification gate unchecked)**
Phase 2 "Measure - User Manual Verification 'Phase 2: Selection UI'" (line 18) is **unchecked `[ ]`** while the track is archived. Phase 2 covers the modal selection UI, step-locking, no-back-navigation, and displayed HP/XP values — the entire user-facing selection flow was not formally verified. (Phases 1, 3, 4 verification gates are checked.)

**F-GAMES-B08-044 · Medium · plan.md:14-15 (no-back-navigation as designed irreversibility)**
"Gate battle start until all selections confirmed; no back navigation" (line 15) implements an intentionally irreversible 3-step flow (spec lines 12, 51). For young learners, the inability to correct a mis-tapped hero/location/enemy before battle is a punitive UX choice with no undo — an age-appropriateness concern flagged here because it is a deliberate, tested constraint, not a bug.

**F-GAMES-B08-045 · Low · plan.md:28-30 (mobile center-crop background — no test of distortion)**
Phase 4 wires location backgrounds with a "centered background slice (center-crop)" for portrait (lines 28-29) and claims "UI tests for background selection mapping (desktop + mobile styles where feasible)" (line 30). "Where feasible" hedges the mobile-style test; center-crop correctness across aspect ratios (the actual responsive risk) may be untested.

### File 17 — `selection_screen_20260102/spec.md`

**F-GAMES-B08-046 · High · spec.md:34-38, 55 (enemy multiplier pushes XP past suite cap to 20)**
Enemy multipliers (0.5/1.0/1.5/2.0) scale enemy HP, **damage upper bound**, and XP, with final XP = `round(baseXp * multiplier)` explicitly allowed to **exceed 10 (e.g., 5/10/15/20)** (lines 38, 55). This deliberately breaks the 1-10 XP normalization used elsewhere in the suite and compounds the rune-match 12-ceiling issue — on import to Reading/Primary, RPG Battle could award up to 20 XP per session, dwarfing every sentence game and skewing any shared leaderboard/progression. Central importability/normalization defect, stated as a requirement rather than an oversight.

**F-GAMES-B08-047 · Medium · spec.md:36-37 (asymmetric damage scaling difficulty cliff)**
Only the **upper bound** of enemy damage is multiplied (lower bound fixed) to create a "final boss feel" (line 37). At multiplier 2.0 the damage variance widens dramatically, producing high-variance one-sided losses that, combined with the typing+2s-penalty loop (rpg_battle F-GAMES-B08-021), can make the Elemental enemy feel arbitrarily punishing. No playtest data or per-enemy balance evidence is recorded.

**F-GAMES-B08-048 · Low · spec.md:49-56 (Acceptance Criteria unchecked)**
All seven acceptance criteria are unchecked `[ ]` in an archived track, including "Final XP can exceed 10 based on the enemy multiplier" and "Mobile portrait view shows a centered background slice without distortion." No traceable acceptance signal; pairs with the unchecked Phase 2 gate (F-GAMES-B08-043).

### File 18 — `shadow-gate-dungeon-20260320/asset-spec.md`

**F-GAMES-B08-049 · Low · asset-spec.md:129-137 (MVP = Konva primitives, assets deferred)**
The asset spec explicitly green-lights shipping with Konva primitive shapes (circles/rectangles) and deferring all PNG art (lines 129-137; priorities LOW/MEDIUM with "can use circle/shapes"). This is a reasonable MVP stance but means the shipped game's visual identity (knight vs shadow-creature vs crystal vs gate) is conveyed by **color + shape only**, raising the same color-dependence accessibility concern, and the "asset placement" table (lines 120-126) describes files that may not exist. Readiness for visual polish is explicitly incomplete by design.

**F-GAMES-B08-050 · Low · asset-spec.md:96-99 (VirtualDPad reuse — shared component coupling)**
Asset spec mandates reusing DungeonLiberator's `VirtualDPad`. Good for consistency, but it couples shadow-gate-dungeon's mobile controls to a shared component whose own coverage was only retroactively raised under a separate chore (realm_carver_coverage tested VirtualDPad — F-GAMES-B08-010). The shared input control is a single point of failure across multiple games; its test ownership is diffuse.

### File 19 — `shadow-gate-dungeon-20260320/metadata.json`

**F-GAMES-B08-051 · Info · metadata.json:3-7**
`status: "completed"`, `created_at` 00:00:00Z → `completed_at` 04:30:00Z (~4.5h) for a full Konva sentence game. Status correctly terminal (contrast rpg_battle/selection_screen). Build window plausible only if heavily templated from DungeonLiberator (plan line 127 confirms pattern reuse); flag "strict TDD" + claimed 98% coverage (plan line 27) for test-artifact verification — no test files in this batch.

### File 20 — `shadow-gate-dungeon-20260320/plan.md`

**F-GAMES-B08-052 · Medium · plan.md:64-72 (Phase 7 polish, sound, and final integration test deferred)**
Phase 7 leaves "visual feedback and juice," "sound effects," "balance tuning," and **"Final integration test (deferred)"** (line 72) unchecked while metadata marks the track `completed`. API routes `/sentences` and `/complete` are created (line 70) but the integration test validating the leaderboard/XP/progress persistence path is deferred — identical importability-verification gap to rune-forge-chamber (F-GAMES-B08-026). The most import-critical behavior (the `complete` route writing progress/XP/ranking) is the least exercised.

**F-GAMES-B08-053 · Medium · plan.md:108-115 (XP bonuses + speedBonusThreshold semantics)**
Config XP: `xpPerCorrectWord:1`, `accuracyBonus:1`, `speedBonus:1` with `speedBonusThreshold:30000` and `survivalBonusThreshold:50`, `maxXP:10`. With difficulty word counts 4/5/6 (lines 119-121), correctWords maxes at 6, +3 bonuses = 9, never reaching the 10 cap — so the advertised "maxXP:10" is unreachable on any difficulty. Same effort-vs-cap mismatch as rune-forge-chamber (F-GAMES-B08-027). `speedBonusThreshold:30000` (ms) is an absolute time, not normalized to difficulty/word-count, so harder (more words) levels are penalized on the speed bonus.

**F-GAMES-B08-054 · Medium · plan.md:96-101, 43 (creature pursuit AI + 60fps loop, no perf budget)**
Creature speeds up to 120 with continuous pursuit AI (lines 96-101) plus player movement, crystal collision, and per-frame rendering. The plan asserts the DungeonLiberator pattern but states **no frame-time budget and no low-end-device fallback** (Phase 7 perf/juice deferred). Same unprofiled-hot-path concern as realm-carver (F-GAMES-B08-003); the mobile-perf hardening track did not cover shadow-gate-dungeon (batch-07 F-GAMES-B07-006).

**F-GAMES-B08-055 · Medium · plan.md:32-37, 64-72 (state via color + deferred a11y)**
Crystal target = gold glow vs cyan normal (rendering line 34), creature = purple, damage = flash (line 37) — state communicated by color and motion, with reduced-motion/juice deferred to optional Phase 7. No color-blind-safe target indicator, no reduced-motion option, no SFX captions. The chasing-creature continuous motion plus color-only target cue is an accessibility/age-appropriateness gap consistent across the batch's action games.

---

## Cross-Cutting Themes

- **XP/scoring is not normalized across the suite** (F-GAMES-B08-001, B08-027, B08-038, B08-039, B08-046, B08-053): realm-carver caps at an unreachable-from-components 10, rune-forge-chamber/shadow-gate caps are unreachable on easy difficulty, rune-match awards fixed 3/6/9/12 (exceeds 10), and selection_screen deliberately allows up to 20 via enemy multiplier. A shared Reading/Primary leaderboard/progression cannot meaningfully compare these scales.
- **Import-critical `complete`/integration path is repeatedly deferred** (F-GAMES-B08-026, B08-052): both Konva sentence games created `/complete` API routes but explicitly deferred the final integration test, leaving leaderboard/XP/progress persistence unverified — the same mock-`complete` gap raised in batch-07 (F-GAMES-B07-042).
- **Architectural inconsistency in the shared runtime** (F-GAMES-B08-018, B08-004, B08-031): RPG Battle uses Zustand while the Konva games use pure-state tick functions; canvas heights disagree (600 vs 700). This complicates a common test harness/E2E helper and responsive scaling.
- **Process/traceability defects** (F-GAMES-B08-016, B08-019, B08-035, B08-042, B08-043, B08-048, B08-011, B08-012): archived tracks with `status:"new"`, multiple unchecked Measure manual-verification gates (rpg_battle Phase 4, selection_screen Phase 2), a missing Phase-7 gate (rune-match), unchecked acceptance criteria, and a coverage track that never records its achieved figure. Completion/readiness cannot be established from the documents alone.
- **Accessibility repeatedly omitted** (F-GAMES-B08-005, B08-020, B08-030, B08-032, B08-055): no color-blind-safe state encoding (state shown by color), no reduced-motion guards (screen shake / continuous chase / flashes), no SFX captions, no keyboard alternative beyond DPad. Consistent gap across both action and puzzle games.
- **Unprofiled performance hot paths** (F-GAMES-B08-003, B08-033, B08-054): realm-carver 100×100 flood-fill, rune-match many discrete textures, shadow-gate pursuit AI — none carry frame-time budgets, low-end fallbacks, or perf tests, and none were covered by the mobile-perf hardening track.
- **Age-appropriate-UX pressure points** (F-GAMES-B08-006, B08-021, B08-029, B08-036, B08-044): low HP + double penalties, fixed 2s error lockout, tight 10-15s sentence timers, real-time monster clock injected into a puzzle, and an irreversible selection flow with no undo.
- **Stale plan paths vs shipped structure** (F-GAMES-B08-037): rune-match's archived plan still references `src/app/games/rune-match` / `src/lib/runeMatchConfig.ts`, while the game now lives under the `[locale]/(student)/student/games/vocabulary/` + `src/lib/games/` convention (verified via `find`). Archived plans can misdescribe the current import target.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 6 | 001, 002, 018, 032, 035, 046 |
| Medium | 27 | 003, 004, 005, 010, 012, 014, 016, 019, 020, 022, 023, 026, 027, 029, 030, 033, 036, 037, 039, 042, 043, 044, 047, 052, 053, 054, 055 |
| Low | 18 | 006, 007, 009, 011, 015, 017, 021, 024, 028, 031, 034, 038, 040, 041, 045, 048, 049, 050 |
| Info | 4 | 008, 013, 025, 051 |

Total findings: **55** (F-GAMES-B08-001 … F-GAMES-B08-055). Cross-check: 6 + 27 + 18 + 4 = 55 distinct IDs.

---

## Limitations

1. **This batch is documentation-only.** All 20 files are Measure archive artifacts (specs, plans, metadata, asset specs). No `.ts`/`.tsx` game runtime, component, store, API-route, or test source files were in scope. Findings about scoring, XP, difficulty, performance, accessibility, and importability are assessed **as designed/planned**, not as implemented. Actual code may satisfy or violate these specs independently.
2. **No source code was edited.** Light read-only structural checks (`ls`/`find` on routes and `src/lib/games/`) were used to confirm a few path/registration claims (noted inline in F-GAMES-B08-007 and F-GAMES-B08-037). Runtime behavior (whether `complete` routes persist, whether flood-fill/pursuit meet 60fps, whether component tests pass) was **not** verified against current source.
3. **Referenced-but-absent artifacts could not be verified:** all test files behind the "strict TDD" / ">80% coverage" / "98% coverage" claims (rpg_battle, rune-forge-chamber, shadow-gate-dungeon, rune-match); the realm_carver_coverage final coverage figure; and `shadow-gate-dungeon-20260320/spec.md` (not in this batch — its spec-level rules are inferred from its plan/asset-spec only).
4. **Status drift in archive metadata** (`status:"new"` on archived rpg_battle and selection_screen, unchecked acceptance boxes and verification gates) means the documents cannot by themselves establish what shipped; readiness conclusions should be confirmed against code and consolidated review artifacts.
5. **Cross-batch references** (e.g., to batch-07 F-GAMES-B07-### and to the mobile-perf hardening track) are contextual; this report independently anchors its own findings to lines in the 20 files of games-batch-08.
6. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes no claim that the batch, any track, or the review phase is accepted, complete, or closed.
