# Line-by-Line Review — games-batch-07

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-07`
**Scope source:** `/tmp/opencode/games-batch-07` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure archive documents** (specs, plans, metadata, index, asset specs) for six archived tracks inside `apps/advantage-games/measure/archive/`. No `.ts`/`.tsx` runtime, component, or test source files are in this batch.
**Finding ID scheme:** `F-GAMES-B07-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `mobile_perf_hardening_20260407/index.md` | mobile_perf_hardening | index |
| 2 | `mobile_perf_hardening_20260407/metadata.json` | mobile_perf_hardening | metadata |
| 3 | `mobile_perf_hardening_20260407/plan.md` | mobile_perf_hardening | plan |
| 4 | `mobile_perf_hardening_20260407/spec.md` | mobile_perf_hardening | spec |
| 5 | `paladins-twin-soul-20260321/metadata.json` | paladins-twin-soul | metadata |
| 6 | `paladins-twin-soul-20260321/plan.md` | paladins-twin-soul | plan |
| 7 | `paladins-twin-soul-20260321/spec.md` | paladins-twin-soul | spec |
| 8 | `potion-rush-20260107/asset-spec.md` | potion-rush | asset-spec |
| 9 | `potion-rush-20260107/metadata.json` | potion-rush | metadata |
| 10 | `potion-rush-20260107/plan.md` | potion-rush | plan |
| 11 | `potion-rush-20260107/spec.md` | potion-rush | spec |
| 12 | `potion-rush-refinements-20260129/index.md` | potion-rush-refinements | index |
| 13 | `potion-rush-refinements-20260129/metadata.json` | potion-rush-refinements | metadata |
| 14 | `potion-rush-refinements-20260129/plan.md` | potion-rush-refinements | plan |
| 15 | `potion-rush-refinements-20260129/spec.md` | potion-rush-refinements | spec |
| 16 | `reading-advantage-migration-20260317/index.md` | reading-advantage-migration | index |
| 17 | `reading-advantage-migration-20260317/plan.md` | reading-advantage-migration | plan |
| 18 | `reading-advantage-migration-20260317/spec.md` | reading-advantage-migration | spec |
| 19 | `realm-carver-20260320/metadata.json` | realm-carver | metadata |
| 20 | `realm-carver-20260320/plan.md` | realm-carver | plan |

---

## Findings

### File 1 — `mobile_perf_hardening_20260407/index.md`

**F-GAMES-B07-001 · Info · index.md:1-6**
Index is a minimal three-link stub (metadata/spec/plan). Complete and consistent; no `baseline.md` link though the plan and metadata both reference a `baseline.md` performance artifact (see F-GAMES-B07-005). The index does not surface the one document (perf baseline) that carries the actual evidence for this track.

### File 2 — `mobile_perf_hardening_20260407/metadata.json`

**F-GAMES-B07-002 · Medium · metadata.json:4 vs spec.md:21-24**
Metadata declares `"status": "completed"` (line 4) and `"actual_tasks": 4` matching estimate, but the spec's Acceptance Criteria checkboxes are **all still unchecked** (`spec.md:21-24`). A track archived as completed with zero acceptance boxes ticked leaves the readiness signal ambiguous — completion cannot be verified from the documents alone.

**F-GAMES-B07-003 · Low · metadata.json:10**
`deviation_notes` asserts "before/after notes were captured in baseline.md," but `baseline.md` is not part of this batch and is not linked from `index.md`. The quantitative performance evidence is therefore unverifiable from this batch.

### File 3 — `mobile_perf_hardening_20260407/plan.md`

**F-GAMES-B07-004 · High · plan.md:24-27 (Remaining Opportunities, Not Started)**
Performance-regression guardrails are explicitly deferred: "Add performance regression checks (requires profiling tooling)", "Batch state updates in game loops across other games", "Profile memory allocation in game loops". This directly conflicts with spec FR `spec.md:12` ("Add lightweight diagnostics for performance regressions") which is a stated functional requirement, not an optional. The shared-runtime performance posture has **no automated regression gate**, so future games can silently reintroduce the same hotspots that were hand-fixed here.

**F-GAMES-B07-005 · Medium · plan.md:8-10**
Phase 1 tasks "Set acceptable frame-time thresholds" and "Set memory allocation guardrails" are marked done, but no numeric threshold/budget is recorded in the plan or spec. Without committed numbers (e.g., target ms/frame, allocation ceiling), the "budgets" cannot be enforced or re-checked — they exist only as prose.

**F-GAMES-B07-006 · Info · plan.md:20-22 (Completed Remediations)**
Remediations are scoped to only three components: `VirtualDPad`, `WizardZombieGame`, `DungeonLiberatorGame`. The hardening pass is therefore **not platform-wide**; the ~8 other games in the suite (dragon-flight, dragon-rider, enchanted-library, magic-defense, rpg-battle, rune-match, castle-defense, potion-rush, paladins-twin-soul, realm-carver) received no profiling under this track. Readiness matrix should treat mobile-perf as verified only for those three.

### File 4 — `mobile_perf_hardening_20260407/spec.md`

**F-GAMES-B07-007 · Medium · spec.md:19-24**
All four acceptance criteria are unchecked in an archived/"completed" track (mirror of F-GAMES-B07-002 from the spec side). Acceptance item line 23 ("Targeted gameplay tests remain green") and line 24 ("Manual mobile verification shows improved frame consistency") have no recorded evidence in this batch.

**F-GAMES-B07-008 · Low · spec.md:28**
Out-of-scope explicitly excludes "Cross-browser performance parity audit." This is a legitimate scoping decision, but it means **browser-compatibility performance remains an open gap** for the suite and should be carried into the review's browser-compat findings rather than assumed covered.

### File 5 — `paladins-twin-soul-20260321/metadata.json`

**F-GAMES-B07-009 · Info · metadata.json:5-6**
`created_at` 12:30Z and `completed_at` 14:30Z — a 2-hour build window for a full Galaga-style game with capture/rescue mechanics, TDD across 5 phases. Plausible only if heavily scaffolded/templated; flag for verification that the "strict TDD" claim in `plan.md:3` produced real test files (none are in this batch to confirm — see F-GAMES-B07-013).

### File 6 — `paladins-twin-soul-20260321/plan.md`

**F-GAMES-B07-010 · Medium · plan.md:3, 17-40**
Plan claims "strict TDD methodology" and lists test-driven tasks (collision, capture, rescue), but **no test file paths and no coverage target** are named anywhere in the plan, unlike the migration track which references explicit test commands. The app AGENTS.md requires ">80% coverage" for vocab games; this plan does not encode that gate. Test quality is unverifiable.

**F-GAMES-B07-011 · Low · plan.md:54**
Technical note targets "60 FPS shooting gameplay" via `requestAnimationFrame`, but the sibling perf track standardized on a 50ms fixed-timestep clock for Konva games (`potion-rush-20260107/plan.md:4`). No statement on whether paladins uses fixed-timestep or raw rAF; inconsistent loop strategy across games complicates the shared-runtime performance story.

### File 7 — `paladins-twin-soul-20260321/spec.md`

**F-GAMES-B07-012 · High · spec.md:37-41 (XP & Scoring)**
XP math is internally inconsistent / under-specified. Base 1 + Twin-Soul bonus +2 + Accuracy bonus +2 = 5, yet "Maximum XP: 10" (line 41). The path from the listed components to a 10 XP cap is undocumented (per-word accumulation? per-wave?). This matters for **XP normalization across the suite**: potion-rush awards uncapped XP (see F-GAMES-B07-024) while paladins caps at 10 — leaderboards/progress imported into Reading/Primary will not be comparable across games.

**F-GAMES-B07-013 · Medium · spec.md:33-34 vs 7,22**
Win condition is ambiguous: line 22 / line 34 state "Collect all target words in correct order (or survive waves)" — two distinct, non-equivalent win conditions joined by "or" with no rule for which applies. A defined, testable terminal condition is required for deterministic scoring and for E2E test helpers.

**F-GAMES-B07-014 · Medium · spec.md:53-55 (Rescue Logic)**
"Only one rescue attempt per session" plus "shooting the captured paladin … results in permanent loss of twin soul for that wave" mixes "session" and "wave" scope. Combined with capture-on-tractor-beam (line 18), a single mis-tap can permanently remove the core power-up — a punitive, age-inappropriate failure mode for a learning game with no documented recovery or retry affordance.

**F-GAMES-B07-015 · Medium · spec.md:16, 47 (difficulty & tilt input)**
Start screen offers difficulty selection ("enemy speed, fire rate", line 16) but the config (`spec.md:62-82`) hard-codes single values (`enemy.speed: 50`, `player.fireRate: 500`) with **no per-difficulty tables**. Difficulty system is asserted in UX but not specified in data. Separately, line 47 lists "Tilt" as a movement option — device-orientation control is an accessibility/mobile-compat hazard (no fallback for users who cannot tilt, motion sensitivity) and is not mentioned in any accessibility section (there is none).

**F-GAMES-B07-016 · Low · spec.md:80 (`diveProbability: 0.01`)**
Dive probability is given as a bare `0.01` with no stated evaluation cadence (per frame? per tick? per second). At 60fps this is ~0.6 dives/sec/enemy; at 50ms tick ~0.2. The behavioral meaning is undefined without the loop rate, making difficulty non-reproducible and untestable.

**F-GAMES-B07-017 · Low · spec.md:9-14**
Accessibility coverage is limited to touch-target size (44×44) and min text 18px. No mention of color-blind-safe distinctions, captions/visual cues for the audio SFX, reduced-motion mode, or screen-reader/keyboard alternatives. For a "fixed shooter" with rapid motion this is a notable a11y gap.

### File 8 — `potion-rush-20260107/asset-spec.md`

**F-GAMES-B07-018 · High · asset-spec.md:54-63 (Audio)**
All SFX are specified as `.wav` (uncompressed PCM) and BGM as an unspecified-format loop. WAV files are large and bandwidth-heavy on mobile; there is no compressed format (mp3/ogg/webm) or fallback strategy, no preload/lazy-load policy, and no total audio-budget. This is a real mobile-performance and load-time risk for the shared runtime and contradicts the sibling mobile-perf track's intent.

**F-GAMES-B07-019 · Medium · asset-spec.md:8-52**
~30 individual PNG sprites are enumerated (cauldron states, 5 flask types, 3 customers × 3 moods, environment, UI) with **no sprite-atlas/texture-sheet requirement**. As discrete files this is many HTTP requests and many GPU texture binds in Konva — an asset-loading and performance concern, especially combined with the conveyor's many simultaneous moving nodes. No image format/compression (PNG vs WebP) or resolution/DPR guidance is given.

**F-GAMES-B07-020 · Low · asset-spec.md:13-15, 50-52**
Liquid states rely on color (blue=ok, green=warning, gold=done) and a heart patience meter. The original spec (`spec.md:55`) requires color-blind-safe shape/particle differentiation, but the asset spec defines only color-named overlays with no shape/icon variant assets — the asset list does not satisfy the colour-blindness requirement it must support.

### File 9 — `potion-rush-20260107/metadata.json`

**F-GAMES-B07-021 · Medium · metadata.json:1 (`"status": "new"`)**
File is located under `measure/archive/` yet metadata still reads `"status": "new"`. The same staleness appears in the refinements track (F-GAMES-B07-025). Archived tracks carrying `new`/non-terminal status make the tracks registry unreliable for determining what actually shipped — a process/traceability defect that undermines the review's readiness matrix.

### File 10 — `potion-rush-20260107/plan.md`

**F-GAMES-B07-022 · High · plan.md:4-6 (Notes 2026-01-28) vs 50-63 (checked tasks)**
Top-of-file notes record three unresolved problems — "Drag/drop feels unreliable; likely needs fixed timestep updates", "Conveyor belt height is ~25% too tall", "Trash portal animation not implemented" — while Phase 5/6 tasks (including "Trash Component" line 40, "Particle Effects" line 54, "Mobile Optimization" lines 61-63) are all marked `[x]`. The notes (unreliable core drag/drop input) directly contradict the checked mobile/touch tasks. This indicates the game shipped with a **known-unreliable primary input mechanic**, which is a readiness blocker for the central interaction.

**F-GAMES-B07-023 · Medium · plan.md:63**
"Stack elements vertically if needed on portrait (**or force landscape**)" contradicts the app-wide mobile-first portrait convention (390×844 reference; `apps/advantage-games/AGENTS.md`, and `paladins/spec.md:11`). Forcing landscape for one game breaks the consistent orientation contract relied on by the embedding Reading/Primary apps and harms importability/UX consistency.

### File 11 — `potion-rush-20260107/spec.md`

**F-GAMES-B07-024 · Medium · spec.md:53-55**
Original accessibility section requires a conveyor "Text Speed" slow-down option and color-blind-safe shape/particle differentiation. These requirements are **dropped from the refinements spec** (`potion-rush-refinements/spec.md` has no accessibility section — see F-GAMES-B07-028), so the later-shipped version may not honor them. Accessibility regression risk between the two tracks.

**F-GAMES-B07-025 · Low · spec.md:31-32, 48-51**
Game-over depends on a global "Daylight" timer plus per-customer patience, and the engine is Konva+Zustand with drag/drop central. The combination of a global countdown + multiple independent timers + many moving belt nodes is the exact load profile the mobile-perf track did **not** profile for this game (F-GAMES-B07-006). Performance under worst case (3 cauldrons + full belt + queue) is unverified.

### File 12 — `potion-rush-refinements-20260129/index.md`

**F-GAMES-B07-026 · Info · index.md:1-5**
Clean three-link index; consistent with metadata/spec/plan present. No issues beyond the status staleness noted on the metadata.

### File 13 — `potion-rush-refinements-20260129/metadata.json`

**F-GAMES-B07-027 · Medium · metadata.json:4 (`"status": "new"`)**
Archived track still marked `"status": "new"` despite the plan showing nearly all tasks checked. Same traceability defect as F-GAMES-B07-021. Two of six archived tracks in this batch carry non-terminal status, suggesting the staleness is systemic, not isolated.

### File 14 — `potion-rush-refinements-20260129/plan.md`

**F-GAMES-B07-028 · High · plan.md:58 and 92 (unchecked manual-verification gates)**
Phase 3 "User Manual Verification" (line 58) and Phase 5 "User Manual Verification" (line 92) are unchecked `[ ]`, yet the track is archived. Phase 3 covers HUD/reputation/penalty visual feedback and Phase 5 covers scoring/XP/Game-Over summary — i.e., the scoring/XP and feedback systems were never signed off by the Measure verification protocol. Readiness for scoring/XP cannot be claimed.

**F-GAMES-B07-029 · Medium · plan.md:9, 18-20 (reputation/difficulty balance)**
Reputation replaces lives, starts at 100, and drops **25% per angry customer** (line 19) → only **4 missed customers = game over**. Combined with patience scaling `60 * 0.9^n` (line 76) and customer spawn every `currentPatience/3` seconds (line 78), late-game spawn pressure rises while the failure buffer stays fixed at four. This can produce a sharp, possibly age-inappropriate difficulty cliff; the only evidence of balancing is a self-reported "playtested" line (line 67), no data.

**F-GAMES-B07-030 · Low · plan.md:50-53**
Penalty feedback uses a red screen flash / camera shake via framer-motion. No reduced-motion guard is mentioned; red-flash + shake can be a vestibular/photosensitivity concern for younger users. No accessibility opt-out is planned.

### File 15 — `potion-rush-refinements-20260129/spec.md`

**F-GAMES-B07-031 · High · spec.md:36-39 (Scoring & XP) vs paladins spec.md:37-41**
Score = remaining patience seconds (max ~60), XP = 10% of score, awarded **per customer with no session cap**. This is structurally incompatible with paladins' "Maximum XP: 10" model and with any normalized leaderboard. For import into Reading/Primary — where XP feeds a shared progression/leaderboard — these per-game XP scales must be reconciled to a common contract. This is an **import-contract gap**, not just a balance nit.

**F-GAMES-B07-032 · Medium · spec.md (whole file) — accessibility omitted**
The refinements spec contains no Accessibility section, silently dropping the original game's "Text Speed" and color-blind requirements (`potion-rush-20260107/spec.md:53-55`). Pairs with F-GAMES-B07-024. Later spec supersedes earlier in practice; the accessibility requirements effectively vanish.

**F-GAMES-B07-033 · Low · spec.md:48-55 (Acceptance Criteria)**
Acceptance criteria are written as prose bullets without checkboxes/verification status, so completion state is unrecorded in the spec while the plan's two manual-verification gates remain open (F-GAMES-B07-028). No traceable acceptance signal.

### File 16 — `reading-advantage-migration-20260317/index.md`

**F-GAMES-B07-034 · Medium · index.md:13-15**
Index reports `Current Phase: Phase 6 (Cleanup)` / `Next Task: Phase 6, Task 6.5 … then Phase 7`, but the plan shows Phase 6 fully checked and Phase 7 mostly checked. The index status was not updated to reflect the archived end-state — the human-readable status header is stale and misleading for anyone assessing migration completeness.

### File 17 — `reading-advantage-migration-20260317/plan.md`

**F-GAMES-B07-035 · High · plan.md:87,98,108,117-118,127-128,137-138 (`[~]` partial test runs)**
Across Phase 3 vocabulary-game imports, multiple "Run tests" sub-tasks are marked `[~]` with "lib tests pass, component tests timeout." Component test timeouts are a **systemic test-infrastructure defect** (Konva/jsdom render hangs) affecting at least dragon-flight, dragon-rider, enchanted-library, magic-defense, rpg-battle, rune-match. The suite's component-level test coverage is effectively unvalidated for the imported games — a major test-gap directly relevant to "test coverage, E2E helpers, and game-specific regressions" in the review scope.

**F-GAMES-B07-036 · High · plan.md:206 (dungeon-liberator) **
"No tests exist for dungeon-liberator (skipped - existing lib)" and "No tests to run." A game ported into the new structure with **zero tests** is shipped. Explicit coverage gap; contradicts the app's >80% coverage standard.

**F-GAMES-B07-037 · Medium · plan.md:15-16, 24-25, 52-53**
Phase 1 Task 1.1 leaves the two page-directory sub-tasks and its commit **unchecked** (`[ ]`), and the verification note (line 53) flags "page directories need correct `[locale]/(student)/student/` structure." The foundational routing structure for the whole migration was left in a known-incorrect/unverified state at Phase 1 close, yet later phases proceeded and the track was archived. Risk that imported game routes do not match the Reading/Primary `[locale]/(student)/student/` contract.

**F-GAMES-B07-038 · Medium · plan.md:375 (Phase 7 verification unchecked)**
Phase 7 "User Manual Verification" (Template & API Route Modernization) is unchecked. The template/factory modernization that future game authors depend on was not formally verified before archive.

**F-GAMES-B07-039 · Low · plan.md:1-8 (Pre-Implementation Checklist)**
Pre-impl checklist assumes `../reading-advantage/` working copy and uses `npm test`/`npm run build`, whereas the monorepo standard is `pnpm turbo run …`. The migration tooling commands diverge from the monorepo's pnpm/turbo conventions, which can mislead later contributors re-running the migration.

### File 18 — `reading-advantage-migration-20260317/spec.md`

**F-GAMES-B07-040 · High · spec.md:88-120, 204-207 (Stub interfaces / import contract)**
`useSession` returns a hard-coded user with `xp: 0` and `id: 'mock-id'`; `useCurrentLocale` always returns `'en'`. These are intentional stubs (real auth out of scope, line 204-207), but the spec does not flag the **failure mode at import time**: if a game reads `session.user.xp` to compute progression (potion-rush awards XP off score, not session xp, but other games may differ), the mock's constant `0` can mask bugs that only surface against real auth. The integration checklist (lines 210-221) should require re-validating any `session.user.*` reads — currently it only says "Update `useSession()` to use real auth if needed."

**F-GAMES-B07-041 · Medium · spec.md:182-201 (Acceptance Criteria all unchecked)**
Every Must-Have and Should-Have acceptance checkbox is unchecked `[ ]` in an archived track, including "All games playable after migration" and "All tests pass" — the latter is directly contradicted by the plan's component-test timeouts (F-GAMES-B07-035) and dungeon-liberator zero-tests (F-GAMES-B07-036). The spec's "All tests pass" cannot be truthfully claimed.

**F-GAMES-B07-042 · Medium · spec.md:130-134, 351-355 (import data contract)**
Import contract defines mock API shapes `{ vocabulary: [{ term, translation }] }` / `{ sentences: [{ term, translation }] }` and a `complete` route that, in reading-advantage, writes `userActivity`, `xPLog`, and updates `gameRanking`. The mock `complete` route persists nothing, so **leaderboard/XP/progress behavior is entirely unexercised in advantage-games** — games can pass here while failing the real ranking/XP contract. This is the central importability risk for the suite and should be elevated in `migration-tracks.md`.

**F-GAMES-B07-043 · Low · spec.md:173-176 (NFR2 coverage) **
NFR2 sets "Target: >80% coverage maintained," but no coverage was measured (component tests time out, dungeon-liberator has none). The NFR is aspirational and unverified.

### File 19 — `realm-carver-20260320/metadata.json`

**F-GAMES-B07-044 · Info · metadata.json:5-6**
`created_at` 2026-03-20T21:40Z → `completed_at` 2026-03-21T12:00Z (~14h). A Qix-style flood-fill territory game with 100×100 grid in one sitting; flag the "strict TDD" claim for the same test-evidence verification as paladins (no test artifacts in batch).

### File 20 — `realm-carver-20260320/plan.md`

**F-GAMES-B07-045 · High · plan.md (whole file) — no scoring/XP tasks**
The plan covers grid, territory fill, monsters, HP, win/lose, rendering, input — but contains **no XP or scoring task at all** (contrast paladins Phase 4 "scoring and XP" and potion-rush Phase 5 scoring). For a game intended for import where XP/progress is a hard requirement, the absence of any scoring/XP implementation step is a readiness and import-contract gap. (Note: realm-carver's `spec.md` is not in this batch, so an XP spec may exist elsewhere — see Limitations.)

**F-GAMES-B07-046 · Medium · plan.md:19, 22, 57 (flood-fill performance on mobile)**
Phase 2 uses a 100×100 occupancy map (10,000 cells) with per-frame flood/scanline fill and a trail redraw inside a `requestAnimationFrame` loop (line 57). The plan acknowledges "Flood fill … must be optimized for performance (60 FPS loop)" but commits **no budget, no test, and no fallback for low-end devices** — exactly the class of hot path the mobile-perf track targeted but did not cover for this game. High risk of frame drops on the low-end mobile hardware the suite explicitly supports.

**F-GAMES-B07-047 · Medium · plan.md:29, 38, 42 (motion/visual a11y)**
Bouncing monsters, moving trail, and color-coded claimed/wild/trail cells (line 38) with no accessibility task in the plan: no reduced-motion option, no color-blind-safe territory differentiation, no captioning for SFX (line 51). Continuous motion + color-only state is an age-appropriate-UX and accessibility gap.

**F-GAMES-B07-048 · Low · plan.md:48-52**
Like paladins and realm uses a generic "Final audit against fidelity checklist" (line 52) with no named test files or coverage gate, despite the "strict TDD" header (line 3). TDD/coverage is asserted but not evidenced in the plan.

---

## Cross-Cutting Themes

- **XP/scoring is not normalized across games** (F-GAMES-B07-012, F-GAMES-B07-031): paladins caps at 10, potion-rush is uncapped per-customer, realm-carver defines none. Any shared leaderboard/progression on import will be inconsistent.
- **Mock `complete` route hides the real XP/leaderboard/progress contract** (F-GAMES-B07-042): the most important import behavior is the least exercised in advantage-games.
- **Component/E2E test coverage is weak or absent** (F-GAMES-B07-035, F-GAMES-B07-036, F-GAMES-B07-010, F-GAMES-B07-043, F-GAMES-B07-048): component tests time out across imported games; dungeon-liberator has none; new games assert TDD without test artifacts or coverage gates.
- **Accessibility is repeatedly dropped or omitted** (F-GAMES-B07-017, F-GAMES-B07-024, F-GAMES-B07-030, F-GAMES-B07-032, F-GAMES-B07-047): no color-blind-safe state encoding, no reduced-motion, no caption alternatives; one spec silently removed prior a11y requirements.
- **Mobile-perf hardening is narrow and ungated** (F-GAMES-B07-004, F-GAMES-B07-006, F-GAMES-B07-046): only three components profiled, no regression checks, while heavier games (potion-rush belt, realm-carver flood-fill) went unprofiled.
- **Process/traceability defects** (F-GAMES-B07-002, F-GAMES-B07-021, F-GAMES-B07-027, F-GAMES-B07-028, F-GAMES-B07-034, F-GAMES-B07-038, F-GAMES-B07-041): archived tracks with `status:"new"`, unchecked acceptance criteria, stale index status, and unchecked manual-verification gates make completion/readiness claims unverifiable from the documents.
- **Orientation/loop-strategy inconsistency** (F-GAMES-B07-011, F-GAMES-B07-023): potion-rush may force landscape against the portrait standard; loop timestep strategy (rAF vs 50ms fixed) differs between games.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 10 | 004, 012, 018, 022, 028, 031, 035, 036, 040, 045 |
| Medium | 19 | 002, 005, 007, 010, 013, 014, 015, 019, 021, 023, 025, 029, 034, 037, 038, 041, 042, 046, 047 |
| Low | 13 | 003, 008, 011, 016, 017, 020, 024, 030, 033, 039, 043, 048 |
| Info | 6 | 001, 006, 009, 026, 044 + 027(*Med*) |

Total findings: **48** (F-GAMES-B07-001 … F-GAMES-B07-048). Note: 021 and 027 are Medium-severity though their files are metadata; counted under Medium above.

---

## Limitations

1. **This batch is documentation-only.** All 20 files are Measure archive artifacts (specs, plans, metadata, index, asset specs). No `.ts`/`.tsx` game runtime, component, store, API-route, or test source files were in scope. Findings about scoring, XP, difficulty, performance, accessibility, and importability are therefore assessed **as designed/planned**, not as implemented. Actual code may satisfy or violate these specs independently.
2. **Per the task, no source code was read or edited.** Cross-references to runtime behavior (e.g., whether `complete` routes persist, whether component tests still time out, whether flood-fill meets 60fps) are inferred from the documents and the app `AGENTS.md`, not verified against current source.
3. **Referenced-but-absent artifacts could not be verified:** `baseline.md` (mobile-perf), realm-carver `spec.md` (not in this batch — so the F-GAMES-B07-045 scoring/XP gap may be addressed in a spec outside this batch), and all test files referenced by "TDD" claims.
4. **Status drift in archive metadata** (`status:"new"` on archived tracks, unchecked acceptance boxes) means the documents cannot by themselves establish what shipped; readiness conclusions should be confirmed against code and the consolidated review artifacts.
5. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes no claim that the batch, track, or review phase is accepted, complete, or closed.
