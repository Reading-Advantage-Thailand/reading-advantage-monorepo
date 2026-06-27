# Line-by-Line Review — `games-batch-06`

- **Track:** `advantage_games_review_20260626`
- **Batch:** `games-batch-06`
- **File list source:** `/tmp/opencode/games-batch-06` (20 entries)
- **Reviewer mode:** Read-only. No source code was modified.
- **Date:** 2026-06-27

## Scope Note

All 20 files in this batch are **Measure track metadata / planning artifacts** located under
`apps/advantage-games/measure/archive/`. None of them are game runtime source, tests, or
configuration. They are historical records of completed/abandoned game-development tracks
(RNG refactor, flaky-test fix, a maze game build, two prototype-game tracks, and two
mobile-optimization/perf tracks).

Consequently the review focuses on:

- **Process / documentation integrity** of the archived tracks (status accuracy, plan
  completion, acceptance-criteria closure).
- **Cross-referencing claims** in these documents against the actual game source still in
  the tree (to flag stale or contradicted assertions that future importers/maintainers
  would trust).
- The technical-readiness signals these documents surface (scoring/XP formulas, RNG
  determinism, mobile/perf hotspots, accessibility) — judged as *documented intent*, not
  as live verification of the games themselves (which lives in other batches).

Severity legend: **High** = blocks correctness/import or is a false-completion record that
hides real risk; **Medium** = misleading/incomplete record or technical-debt signal worth
tracking; **Low** = minor doc hygiene.

---

## Files Reviewed (20/20)

| # | File | Type | Verdict |
|---|------|------|---------|
| 1 | `gryphon_patrol_rng_injectable_20260415/metadata.json` | track metadata | Findings: B06-001, B06-002 |
| 2 | `gryphon_patrol_rng_injectable_20260415/plan.md` | plan | Findings: B06-002, B06-003 |
| 3 | `gryphon_patrol_rng_injectable_20260415/spec.md` | spec | Findings: B06-004 |
| 4 | `haunted_library_flaky_fix_20260416/metadata.json` | track metadata | Findings: B06-005 |
| 5 | `haunted_library_flaky_fix_20260416/plan.md` | plan | Findings: B06-006 |
| 6 | `haunted_library_flaky_fix_20260416/track.md` | spec/track | Findings: B06-006, B06-007 |
| 7 | `labyrinth-goblin-king-20260320/metadata.json` | track metadata | Findings: B06-008 |
| 8 | `labyrinth-goblin-king-20260320/plan.md` | plan | Findings: B06-009, B06-010 |
| 9 | `labyrinth-goblin-king-20260320/spec.md` | spec (GDD) | Findings: B06-011, B06-012, B06-013 |
| 10 | `magic_defense_refactor_20260102/metadata.json` | track metadata | Findings: B06-014 |
| 11 | `magic_defense_refactor_20260102/plan.md` | plan | Findings: B06-015, B06-016 |
| 12 | `magic_defense_refactor_20260102/spec.md` | spec | Findings: B06-016, B06-017 |
| 13 | `missile_command_20260102/metadata.json` | track metadata | Findings: B06-018 |
| 14 | `missile_command_20260102/plan.md` | plan | Findings: B06-018, B06-019 |
| 15 | `missile_command_20260102/spec.md` | spec | Findings: B06-019, B06-020 |
| 16 | `mobile-optimization-20260127/index.md` | index | Clean (no findings) |
| 17 | `mobile-optimization-20260127/metadata.json` | track metadata | Findings: B06-021 |
| 18 | `mobile-optimization-20260127/plan.md` | plan | Findings: B06-021, B06-022, B06-023 |
| 19 | `mobile-optimization-20260127/spec.md` | spec | Findings: B06-024 |
| 20 | `mobile_perf_hardening_20260407/baseline.md` | perf baseline | Findings: B06-025, B06-026, B06-027 |

---

## Findings

### File 1 — `gryphon_patrol_rng_injectable_20260415/metadata.json`

- **F-GAMES-B06-001** — *Medium* — Lines 7–11: `status: "in_progress"` with
  `estimated_tasks: 7` / `actual_tasks: 5`. This is an **archived** track
  (`measure/archive/...`) yet it is recorded as still in progress. An archived track left
  in `in_progress` either means it was abandoned mid-stream or the status was never
  finalized. For a review that must establish per-game readiness, this ambiguity hides
  whether Gryphon Patrol's deterministic-RNG work was actually finished.
- **F-GAMES-B06-002** — *Medium* — Lines 3,7 (metadata) cross-referenced with `plan.md`
  lines 13–14: metadata schema here uses `trackId` (camelCase) and lacks the
  `track_id`/`type`-aligned fields used by sibling tracks in this same batch
  (e.g. file 7 uses `track_id`). Inconsistent metadata schema across tracks degrades any
  automated rollup of track status across the gallery.

### File 2 — `gryphon_patrol_rng_injectable_20260415/plan.md`

- **F-GAMES-B06-003** — *High* — Lines 12–14: Task 2 verification is **incomplete** —
  "Run full test suite and build" (line 13) and "Measure — User Manual Verification"
  (line 14) are both unchecked `[ ]`, while the metadata for the same track is `in_progress`.
  The core refactor *was* implemented (verified in source:
  `src/lib/games/gryphonPatrol.ts:79` `rng: () => number = Math.random`, used at
  lines 89–92), but the track was never verified/closed. **Readiness signal:** the RNG
  determinism guarantee for Gryphon Patrol is implemented but unverified by full
  suite/build per its own record.

### File 3 — `gryphon_patrol_rng_injectable_20260415/spec.md`

- **F-GAMES-B06-004** — *Low* — Lines 18–24: Acceptance criteria are all left unchecked
  `[ ]`. Combined with B06-003 this confirms the track never reached formal acceptance.
  This is the correct (honest) state, but it should be reconciled with the archive
  location — an unaccepted track should not be silently archived without a disposition note.

### File 4 — `haunted_library_flaky_fix_20260416/metadata.json`

- **F-GAMES-B06-005** — *Low* — Lines 7,11: `status: "completed"`,
  `estimated_tasks: 6 / actual_tasks: 6`, and `spec: "track.md"` (line 12). Note the spec
  pointer is `track.md` rather than the conventional `spec.md` used by other tracks in this
  batch — schema drift that complicates tooling. Otherwise internally consistent.

### File 5 — `haunted_library_flaky_fix_20260416/plan.md`

- **F-GAMES-B06-006** — *Medium* — Lines 5,15 claim RNG was made injectable in
  `createLibraryState` and "Run tests 10 times to confirm no flakiness". Source confirms
  injection (`src/lib/games/hauntedLibrary.ts:65` `rng: () => number = Math.random`, used
  for ghost/bat placement at lines 81–122). **However**, a non-injected `Math.random()`
  remains at `hauntedLibrary.ts:318` (`id: \`bat-${nextState.time}-${Math.random()}\``).
  This residual call is used only for a runtime ID string, not positioning/collision, so it
  does not reintroduce the documented flakiness — but the plan's blanket "deterministic"
  framing is not literally complete. Flag so future maintainers don't assume the module is
  fully `Math.random`-free.

### File 6 — `haunted_library_flaky_fix_20260416/track.md`

- **F-GAMES-B06-006** (also applies) — see above; the technical analysis (lines 16–22)
  correctly scopes the randomness to ghost/bat positioning and door assignment.
- **F-GAMES-B06-007** — *Low* — Lines 24–36 duplicate the entire implementation plan that
  also lives in `plan.md` (file 5). Two sources of truth for the same checklist can drift;
  this is documentation redundancy worth noting for the gallery's track hygiene.

### File 7 — `labyrinth-goblin-king-20260320/metadata.json`

- **F-GAMES-B06-008** — *Low* — Lines 5–6: `created_at` and `completed_at` are exactly one
  hour apart (12:00Z → 13:00Z) for a 37-task, 7-phase game build (per `plan.md` line 134).
  Either the timestamps are placeholders or the "completed" status reflects scaffolding
  rather than a fully built/verified game. Worth corroborating against actual source
  completeness in the per-game readiness matrix.

### File 8 — `labyrinth-goblin-king-20260320/plan.md`

- **F-GAMES-B06-009** — *High* — Lines 27–41 (Phase 3: Rendering): **all six required
  art assets are unchecked** (`[ ]` knight.png, paladin.png, goblin.png, wall.png,
  floor.png, orb.png) and **every rendering task in Phase 3 is unchecked** (lines 35–41,
  including "Implement asset preloading" and "Measure - Mark Phase 3 complete"). Yet the
  metadata (file 7) marks the track `completed`. This is a **false-completion record**: a
  game cannot be import-ready if its sprite assets and rendering were never delivered. This
  directly affects the import-readiness column for Labyrinth of the Goblin King.
- **F-GAMES-B06-010** — *Medium* — Lines 107–116 (config block) define
  `LIVES_EASY: 3, LIVES_MEDIUM: 3` (identical) — the only difficulty differentiation between
  Easy and Medium is word count (4 vs 5) and goblin count (2 vs 3). Documented difficulty
  curve between the two lowest tiers is weak; for age-appropriate scaling this should be
  validated against real play.

### File 9 — `labyrinth-goblin-king-20260320/spec.md`

- **F-GAMES-B06-011** — *Medium* — Lines 44–48 (XP & Scoring): formula
  `Math.min(10, Math.floor(correctWords * accuracy * timeBonus) + goblinsEaten)`. The
  `goblinsEaten` bonus is added **after** the `Math.min(10,...)` cap is conceptually
  described as "Base XP: 1–10" but the formula applies `Math.min(10, ...)` to the *whole*
  expression including `goblinsEaten`. So the "+1 XP per goblin" bonus (line 46) is silently
  swallowed once base reaches 10 — the stated bonus reward is non-functional at high
  accuracy. This is an XP-system inconsistency that should be reconciled with the
  platform-wide XP contract.
- **F-GAMES-B06-012** — *Medium* — Lines 56–60 vs lines 28–30: the educational model
  requires collecting orbs **in correct sentence order**, with "wrong word: life lost, orb
  respawns elsewhere" (line 30). Combined with invincible patrolling goblins (line 7), the
  failure pressure is high; with only 2 lives on Hard (file 8 line 109) and order-strict
  collection, the difficulty for younger learners may be punishing. Age-appropriateness of
  the punitive loop should be validated.
- **F-GAMES-B06-013** — *Low* — Lines 70–71: word-order cue is conveyed "subtly … via glow
  intensity" only. Relying on a single visual-intensity channel to communicate sequence is
  an accessibility concern (low-vision / colour-and-brightness perception); no
  non-visual/numeric alternative is documented.

### File 10 — `magic_defense_refactor_20260102/metadata.json`

- **F-GAMES-B06-014** — *High* — Lines 4–7: `status: "new"` for a track whose `plan.md`
  marks **all four phases complete** (file 11). An archived track that did substantial,
  committed work (commit hashes present throughout the plan) but whose metadata still reads
  `"new"` is a stale-status defect that makes any automated readiness rollup unreliable.

### File 11 — `magic_defense_refactor_20260102/plan.md`

- **F-GAMES-B06-015** — *Medium* — Lines 22,31: Phase 3 and Phase 4 final "Measure - User
  Manual Verification" tasks are unchecked `[ ]`, while all implementation sub-tasks are
  checked with commits. The game logic shipped but the human verification gate was never
  closed — i.e. self-reported "completed" work without the required Measure verification.
- **F-GAMES-B06-016** — *High* — Lines 17, 26, 29 (and spec line 29): the **XP formula
  changed three times within this single track**:
  Phase 3 `(Score / 10) * Accuracy` (line 17) → Phase 4 `Score * Accuracy` (line 26) →
  Phase 4 `Correct Answers * Accuracy` (line 29). Line 27 even records a bug
  "argument mismatch causing 0 XP". This churn indicates the XP/scoring contract for Magic
  Defense was unstable and is not aligned to a single shared platform formula — a direct
  hit on the cross-game scoring/XP consistency review surface.

### File 12 — `magic_defense_refactor_20260102/spec.md`

- **F-GAMES-B06-016** (also applies) — Line 29 states XP `= (Score / 10) * Accuracy`, which
  contradicts the final implemented formula in `plan.md` line 29
  (`Correct Answers * Accuracy`). **The spec was never updated to match the shipped
  formula** — the spec is now actively misleading for anyone importing/porting this game.
- **F-GAMES-B06-017** — *Medium* — Lines 26–27 specify the shooting trigger as **SPACE**,
  but `plan.md` line 25 records "Revert shooting mechanic to **Enter** key". Spec/impl
  divergence on the primary input mechanic; also a keyboard-only control with no documented
  touch equivalent (mobile/accessibility gap for a typing game).

### File 13 — `missile_command_20260102/metadata.json`

- **F-GAMES-B06-018** — *Medium* — Lines 4–7: `status: "new"` despite `plan.md` showing all
  four phases with completed tasks and checkpoint commits. Same stale-status pattern as
  B06-014. For a foundational game (this appears to be the original engine that Magic
  Defense was later refactored from), an inaccurate status undermines the inventory.

### File 14 — `missile_command_20260102/plan.md`

- **F-GAMES-B06-018** (also applies) — Lines 6,12,18,23: every phase's "Measure - User
  Manual Verification" task is checked, but the metadata still says `new` (contradiction).
- **F-GAMES-B06-019** — *Medium* — Lines 17,21 describe "adaptive difficulty (speed scaling
  based on performance)" and "XP calculation logic based on accuracy and speed" but give no
  concrete formula or thresholds in the plan; spec (file 15) is equally vague (see B06-020).
  Difficulty and XP are review surfaces requiring explicit definition for cross-game
  consistency; this track leaves them under-specified.

### File 15 — `missile_command_20260102/spec.md`

- **F-GAMES-B06-019** (also applies) — Lines 14–21: "XP is awarded based on accuracy and
  speed" / "Speed increases based on consecutive correct answers and overall accuracy" — no
  formula, no caps, no relation to the platform XP scale (1–10 used elsewhere, e.g. file 9).
  Unbounded/undefined scoring contract.
- **F-GAMES-B06-020** — *Medium* — Lines 23–32: Tech constraints mandate **Next.js + Zustand
  + Framer Motion + shadcn/ui** and a **text input** typing mechanic. This is a materially
  different runtime from the React-Konva canvas architecture the platform standardizes on
  (per `apps/advantage-games/AGENTS.md`: "React-Konva canvas architecture"). Missile Command
  / Magic Defense are Framer-Motion + DOM games, creating **two divergent runtimes** in the
  same gallery — a shared-runtime and importability concern. Line 32 "Large touch targets
  and responsive layout" is asserted but the core mechanic is keyboard typing, which is
  poor for mobile/touch (see also B06-017).

### File 16 — `mobile-optimization-20260127/index.md`

- No findings. Lines 1–5 are a simple link index to spec/plan/metadata; accurate and
  internally consistent.

### File 17 — `mobile-optimization-20260127/metadata.json`

- **F-GAMES-B06-021** — *High* — Lines 4–7: `status: "new"` while `plan.md` shows Phases
  2–5 implementation tasks completed (checkpoints present) — stale status again. More
  importantly, the **Phase 6 Final Verification is entirely unchecked** (plan lines 41–46),
  so this track materially did not finish (see B06-022/B06-023).

### File 18 — `mobile-optimization-20260127/plan.md`

- **F-GAMES-B06-022** — *High* — Lines 42–44: an **unresolved `InvalidStateError` in Castle
  Defense (Circle.drawScene)** is listed as an open Phase 6 task (all sub-tasks unchecked).
  A canvas runtime exception in a shipped game is a correctness/crash-class blocker for
  mobile and import readiness, and this track left it open. This should be reflected in
  Castle Defense's readiness row as a known crash.
- **F-GAMES-B06-023** — *Medium* — Lines 14,21,27,33,39: **none** of the per-phase "Measure -
  User Manual Verification" tasks are checked, and line 39 uses an in-progress marker `[~]`
  for Rune Match verification. The mobile-optimization work was implemented but never
  verified across phases — every "fix" here is unconfirmed, which weakens confidence in the
  documented mobile-readiness of Rune Match, Castle Defense, Wizard vs Zombie, and Magic
  Defense.

### File 19 — `mobile-optimization-20260127/spec.md`

- **F-GAMES-B06-024** — *Medium* — Lines 9–10,29–31: Good intent (adaptive layouts, 44×44px
  touch targets, no-lag layout calc, DevTools verification) but **no measurable acceptance
  criteria** (e.g. target viewport list, min font px, pass/fail thresholds) and **no
  accessibility criteria beyond touch-target size** (no contrast ratio, no text-scaling, no
  screen-reader considerations). Line 34 explicitly excludes landscape, which is reasonable,
  but leaves orientation-lock behaviour undocumented.

### File 20 — `mobile_perf_hardening_20260407/baseline.md`

- **F-GAMES-B06-025** — *High* — Lines 9–12: documents real perf hotspots —
  `Math.random()` in Layer render at `WizardZombieGame.tsx:678` "Causes re-render every
  frame", plus "Multiple setState calls in game loop (3–6 re-renders per tick)" and
  "DOM-based floating texts → reflow on every update" across **all games**. These are
  cross-cutting shared-runtime performance defects affecting 60 FPS targets; their presence
  in a *baseline* implies they were extant at 2026-04-08. Whether they were remediated is
  not establishable from this batch (this file is only the baseline; no completion record is
  in batch-06) — flag for the shared-runtime findings section and corroborate against
  current source in the relevant batch.
- **F-GAMES-B06-026** — *Medium* — Lines 28,49–52: `any` type in `griffin-sky-joust:94`
  (type-safety hole in game logic) and a documented need for object pooling / functional
  setState batching. The `any` undermines the strict-TypeScript convention and is a concrete
  cleanup item for that game's readiness.
- **F-GAMES-B06-027** — *Low* — Lines 32–45: the perf budgets (≤16.67ms/frame,
  ≤100 bytes/tick allocation, ≤2 Konva layers, ≤10 DOM overlays, ≤50 draw calls) are stated
  as targets but the document provides **no measured baseline numbers** against them — it
  lists hotspots qualitatively ("Impact: re-render every frame") without ms/byte
  measurements, so the "baseline" cannot be used to prove regression/improvement later. This
  also implicitly confirms the DOM-overlay architecture (floating texts/indicators) is in
  tension with the ≤10-DOM-overlay budget on text-heavy vocab games.

---

## Cross-Cutting Observations (documentation-derived)

1. **Stale/contradictory track status is systemic in this batch.** Four of seven tracks
   carry a status that contradicts their own plan completion: Gryphon Patrol
   (`in_progress`, unfinished — honest), Magic Defense (`new` but all phases done),
   Missile Command (`new` but all phases done), Mobile Optimization (`new`, Phase 6
   unfinished). Any inventory built by trusting `metadata.json` `status` alone will be
   wrong. (B06-001, B06-014, B06-018, B06-021)
2. **Metadata schema is inconsistent** across tracks (`trackId` vs `track_id`,
   `spec`→`track.md` vs `spec.md`, presence/absence of `estimated_tasks`). Hampers tooling.
   (B06-002, B06-005)
3. **XP / scoring contract is not unified.** Labyrinth caps at 10 (and swallows its goblin
   bonus, B06-011); Magic Defense churned through three formulas and its spec still
   documents an obsolete one (B06-016); Missile Command never defines a formula at all
   (B06-019). This is the strongest scoring/XP-consistency signal in the batch.
4. **Two runtime families coexist.** Konva-canvas games (Gryphon Patrol, Haunted Library,
   Labyrinth) vs Framer-Motion/DOM typing games (Missile Command, Magic Defense). The latter
   diverge from the platform's stated React-Konva standard and use keyboard-only input, with
   weak mobile/touch and accessibility stories. (B06-017, B06-020)
5. **Mobile/perf hardening is documented but unverified.** The mobile-optimization track left
   all verification gates open and a Castle Defense canvas crash unresolved (B06-022, B06-023);
   the perf baseline lists frame-killing `Math.random()`-in-render and multi-setState issues
   without measured numbers or a remediation record in this batch (B06-025, B06-027).

---

## Limitations

- **Scope of this batch is metadata only.** No game runtime source, tests, route handlers,
  or shared-runtime modules are part of the 20-file list. Technical findings about scoring,
  RNG, perf, mobile, and accessibility are derived from *documented claims* in these archive
  files, lightly corroborated against current source by spot-checks (see below). They are
  **not** a live verification of the games and must be reconciled with the source-focused
  batches.
- **Corroboration performed (read-only spot checks, not exhaustive):**
  `src/lib/games/gryphonPatrol.ts` (rng injection confirmed, lines 79–92),
  `src/lib/games/hauntedLibrary.ts` (rng injection confirmed lines 65–122; residual
  `Math.random()` at line 318 confirmed), and existence of Gryphon Patrol API routes
  (`complete`, `sentences`, `ranking`). I did **not** verify `WizardZombieGame.tsx:678`,
  `griffin-sky-joust:94`, the Castle Defense `InvalidStateError`, or any Labyrinth/Magic
  Defense/Missile Command implementation behaviour against the baseline claims.
- **No execution.** No tests, builds, or runtime/perf measurements were run; FPS, frame
  time, and flakiness claims in the documents were not independently reproduced.
- **Commit hashes referenced in plans were not validated** against git history.
- **Archive disposition unknown.** I cannot determine from these files whether `new`/
  `in_progress` statuses on archived tracks reflect deliberate abandonment, a superseding
  track, or simply un-updated metadata.
- This report makes **no acceptance or closeout claims** for the `advantage_games_review_20260626`
  track or for any reviewed sub-track; it is a findings-only line review.

## Coverage Confirmation

All 20 files listed in `/tmp/opencode/games-batch-06` were read and reviewed (see the
Files Reviewed table; file 16 reviewed and found clean). 27 line-anchored findings recorded
(`F-GAMES-B06-001` … `F-GAMES-B06-027`).
