# Line-by-Line Review — games-batch-12

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-12`
**Scope source:** `/tmp/opencode/games-batch-12` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (specs, plans, metadata, index, one compliance report) under `apps/advantage-games/measure/tracks/`. No runtime `.ts`/`.tsx` component or test files are in this batch; however, several claims in these docs were cross-checked against the live repo (registry, source files, asset/cover paths) without modifying anything.
**Finding ID scheme:** `F-GAMES-B12-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `abyssal-well-compliance-audit_20260426/spec.md` | abyssal-well-compliance-audit | spec |
| 2 | `accessibility_layer_20260425/metadata.json` | accessibility_layer | metadata |
| 3 | `accessibility_layer_20260425/plan.md` | accessibility_layer | plan |
| 4 | `accessibility_layer_20260425/spec.md` | accessibility_layer | spec |
| 5 | `adaptive_difficulty_engine_20260423/metadata.json` | adaptive_difficulty_engine | metadata |
| 6 | `adaptive_difficulty_engine_20260423/plan.md` | adaptive_difficulty_engine | plan |
| 7 | `adaptive_difficulty_engine_20260423/spec.md` | adaptive_difficulty_engine | spec |
| 8 | `alchemists-synthesis-compliance-audit_20260426/index.md` | alchemists-synthesis-compliance-audit | index |
| 9 | `alchemists-synthesis-compliance-audit_20260426/metadata.json` | alchemists-synthesis-compliance-audit | metadata |
| 10 | `alchemists-synthesis-compliance-audit_20260426/plan.md` | alchemists-synthesis-compliance-audit | plan |
| 11 | `alchemists-synthesis-compliance-audit_20260426/report.md` | alchemists-synthesis-compliance-audit | report |
| 12 | `alchemists-synthesis-compliance-audit_20260426/spec.md` | alchemists-synthesis-compliance-audit | spec |
| 13 | `archers-revenge-compliance-audit_20260426/index.md` | archers-revenge-compliance-audit | index |
| 14 | `archers-revenge-compliance-audit_20260426/metadata.json` | archers-revenge-compliance-audit | metadata |
| 15 | `archers-revenge-compliance-audit_20260426/plan.md` | archers-revenge-compliance-audit | plan |
| 16 | `archers-revenge-compliance-audit_20260426/report.md` | archers-revenge-compliance-audit | report |
| 17 | `archers-revenge-compliance-audit_20260426/spec.md` | archers-revenge-compliance-audit | spec |
| 18 | `astral-mage-compliance-audit_20260426/index.md` | astral-mage-compliance-audit | index |
| 19 | `astral-mage-compliance-audit_20260426/metadata.json` | astral-mage-compliance-audit | metadata |
| 20 | `astral-mage-compliance-audit_20260426/plan.md` | astral-mage-compliance-audit | plan |

---

## Cross-Check Summary (live repo, read-only)

These observations from the working tree are used as evidence in the findings below:

- `abyssal-well`: registry status `playable` (`src/lib/gameCards.ts:142-148`); logic `src/lib/games/abyssalWell.ts`, component `.../sentence/abyssal-well/AbyssalWellGame.tsx`, page and API route all **exist**. Game-asset dir `public/games/sentence/abyssal-well/` **does not exist**. Two cover files exist: `abyssal-well-cover.png` AND `cover-the-abyssal-well.png`; registry uses `cover-the-abyssal-well.png`.
- `alchemists-synthesis`: registry status `playable` (`gameCards.ts:78-83`, cover `cover-alchemists-synthesis.png`, exists); logic + component **exist**; asset dir `public/games/vocabulary/alchemists-synthesis/` **does not exist** (report itself flagged "empty").
- `archers-revenge`: registry status `playable` (`gameCards.ts:150-156`); logic + component **exist**; **asset dir `public/games/vocabulary/archers-revenge/` does not exist** (contradicts report). Cover `cover-archers-revenge.png` exists.
- `astral-mage`: registry status **`coming-soon`** (`gameCards.ts:198-204`); no logic/component/page/API source exist; only `cover-astral-mage.png` exists.
- `adaptive_difficulty_engine`: source artifacts named in the plan **exist** — `src/types/adaptive-difficulty.ts`, `src/lib/adaptive-difficulty/*` (adjustment-engine, parameter-modifier, registerDifficultyParams, session-persistence + tests, calibration, performance-benchmark), `src/hooks/usePerformanceMetrics.ts`, `src/hooks/useAdaptiveDifficulty.ts` (+ tests).
- Commit hashes cited in audit plans/reports (`6fc59ca`, `c4a1d86`, `4c4278d`) were **not resolvable** in the monorepo git history (see F-GAMES-B12-026).

---

## Findings

### File 1 — `abyssal-well-compliance-audit_20260426/spec.md`

**F-GAMES-B12-001 · High · spec.md:56 vs registry `gameCards.ts:145`**
Spec mandates the cover image at `/public/games/cover/abyssal-well-cover.png`, but the registry references `cover-the-abyssal-well.png`. Both files happen to exist on disk (duplicated cover assets), so the compliance check would "pass" against either filename while masking an asset-naming inconsistency. The duplicate cover wastes payload and creates ambiguity about which is canonical — a real asset-hygiene issue for the shared runtime.

**F-GAMES-B12-002 · High · spec.md:18,55**
Spec declares game assets live at `public/games/sentence/abyssal-well/`, but that directory **does not exist** in the tree. A sprite-defending/rotating-turret game (per the registry description, `gameCards.ts:144`) shipping with no asset directory implies it renders entirely from primitives or relies on assets stored elsewhere. The audit checklist item "Asset Location" (line 55) cannot pass as written; this is an unresolved readiness gap not surfaced anywhere in this batch (the abyssal-well track ships only a `spec.md` here — no `report.md`, see F-GAMES-B12-005).

**F-GAMES-B12-003 · Medium · spec.md:59-65 (Acceptance Criteria)**
Every acceptance checkbox is unchecked and there is **no `report.md`** in the abyssal-well track folder (this batch only contains its `spec.md`). The audit is therefore unstarted/uncompleted with no recorded pass/fail evidence, despite the game being registered `playable`. Readiness of abyssal-well is unverifiable from the documents.

**F-GAMES-B12-004 · Low · spec.md:40,43-44**
Scoring spec ("XP/Scoring (1–10 scale)" line 40) and camera spec ("If world > 500px, uses scrolling camera," line 43) are copied boilerplate. For a rotating rim-defense game the "player-centered scrolling camera + off-screen indicators" model (lines 43-44) is likely N/A, yet the checklist offers no way to mark N/A — forcing either a false pass or a false fail. The checklist template does not fit non-standard layouts (same template issue recurs across all four audit specs in this batch).

**F-GAMES-B12-005 · Info · track folder**
Unlike the alchemists/archers audit tracks, the abyssal-well track in this batch provides only `spec.md` — no `metadata.json`, `index.md`, `plan.md`, or `report.md` were included in the file list. The completion state and acceptance evidence are out of scope of what was provided; flagged as a coverage limitation for downstream readiness aggregation.

### File 2 — `accessibility_layer_20260425/metadata.json`

**F-GAMES-B12-006 · Medium · metadata.json:4**
`"status": "pending"` with `"priority": "medium"`. This is the one platform-wide accessibility track in the suite (keyboard nav, screen-reader, high-contrast), yet it is unstarted. Many sibling game-audit reports in this and prior batches assert accessibility "PASS" based only on touch-target/text-size scaling (`useAccessibilitySettings`). The deeper a11y work (keyboard, SR, contrast) tracked here is **not done**, so per-game "Accessibility Settings PASS" marks overstate real accessibility readiness.

**F-GAMES-B12-007 · Low · metadata.json (schema drift)**
This metadata uses keys `id`/`name`/`created`/`priority`, whereas the adaptive-difficulty and audit tracks use `track_id`/`type`/`created_at`/`updated_at`/`estimated_tasks`. Inconsistent metadata schemas across tracks complicate any automated rollup of track status for the review.

### File 3 — `accessibility_layer_20260425/plan.md`

**F-GAMES-B12-008 · Medium · plan.md:1-19**
The plan is a generic, untouched scaffold ("Set up core infrastructure", "Write failing tests", "Wire components together") with no accessibility-specific tasks — no mention of focus management, ARIA roles for Konva canvas, keyboard remapping for the VirtualDPad, prefers-reduced-motion, or contrast tokens. There is no test strategy and no coverage gate despite the app's >80% requirement. As written, the plan provides no actionable engineering path; accessibility for the suite is effectively unplanned.

**F-GAMES-B12-009 · High · plan.md (canvas a11y gap)**
React-Konva renders to a single `<canvas>` element with no DOM semantics; screen-reader and keyboard support (the track's stated goal in `spec.md:4`) require an explicit offscreen-DOM/ARIA-mirror or alternative-input strategy. The plan does not acknowledge this fundamental constraint, so the central technical risk of the whole accessibility effort is unrecorded. This is the largest accessibility readiness gap for importing games into Reading/Primary (which have their own a11y obligations).

### File 4 — `accessibility_layer_20260425/spec.md`

**F-GAMES-B12-010 · Medium · spec.md:6-11**
Acceptance criteria are pure boilerplate ("Implementation complete", "Tests passing", "Build succeeds") with **no measurable accessibility outcomes** — no WCAG level, no contrast ratio target, no keyboard-operability checklist, no screen-reader script. A track whose entire purpose is accessibility defines none of the criteria by which accessibility would be judged. Not testable, not verifiable.

**F-GAMES-B12-011 · Low · spec.md:4**
Overview promises "high-contrast modes across all games" but no game-by-game scope or rollout order is given. With ~20+ registered games (per `gameCards.ts`), an undelimited "all games" scope on a `pending` medium-priority track is unlikely to land uniformly; readiness should assume high-contrast is unavailable suite-wide until per-game evidence exists.

### File 5 — `adaptive_difficulty_engine_20260423/metadata.json`

**F-GAMES-B12-012 · Medium · metadata.json:4 vs plan.md**
`"status": "planned"` and `"actual_tasks": null`, yet the corresponding `plan.md` shows **all tasks across all 4 phases checked `[x]`** with checkpoint hashes. The metadata status contradicts the plan's completion state. Either the engine is done (and metadata is stale) or the plan's checkmarks are aspirational. This ambiguity directly affects whether adaptive difficulty can be relied on as a shared-runtime capability.

**F-GAMES-B12-013 · Low · metadata.json:5-6**
`created_at` and `updated_at` are identical (`2026-04-23T00:00:00Z`) despite a 4-phase implementation having occurred (per plan checkpoints). `updated_at` was never advanced, so the metadata cannot be trusted as a freshness signal.

### File 6 — `adaptive_difficulty_engine_20260423/plan.md`

**F-GAMES-B12-014 · Info · plan.md:5-68 (verified against tree)**
Positive finding: the named artifacts exist in the working tree — `types/adaptive-difficulty.ts`, `lib/adaptive-difficulty/adjustment-engine.ts`, `parameter-modifier.ts`, `registerDifficultyParams.ts`, `session-persistence.ts`, hooks `usePerformanceMetrics.ts`/`useAdaptiveDifficulty.ts`, plus calibration and performance-benchmark test files. This is the most substantiated track in the batch; its claims are backed by real files (contrast with F-GAMES-B12-024/025).

**F-GAMES-B12-015 · Medium · plan.md:47-51 (integration breadth)**
Game integration was wired into only **2 representative games** (Dragon Flight, Wizard vs Zombie). The spec asserts the engine "must work with all existing game types without per-game modification" (`spec.md:58`), but parameter registration is opt-in per game (`spec.md:30`). So the universal-scoring claim is unproven for the other ~18 games; adaptive difficulty is effectively unavailable for them until each registers params. Readiness matrix should treat adaptive difficulty as verified for 2 games only.

**F-GAMES-B12-016 · Low · plan.md:61-64 (localStorage persistence)**
"Optional session-start hint persistence" saves ending parameters to `localStorage`. For games imported into Reading/Primary this introduces an unscoped client-side persistence side effect that is per-browser, not per-user/per-tenant, and not tied to the platform's progress/XP backend. No namespacing or multi-tenant consideration is recorded — a portability concern when the same browser is shared by multiple students.

**F-GAMES-B12-017 · Low · plan.md:65-67**
Performance-overhead verification asserts `<1ms` `recordResponse()` latency and "no frame drops," but the plan records no actual measured numbers or device/browser matrix. The benchmark test file exists (`performance-benchmark.test.ts`), but the budget is prose-only in the plan; the cross-browser/mobile performance evidence is not captured here.

### File 7 — `adaptive_difficulty_engine_20260423/spec.md`

**F-GAMES-B12-018 · High · spec.md:5,43-46 vs sibling difficulty model**
The engine "replaces the current static difficulty tiers with a fluid system" (line 5) while also "layers on top of existing tiers" (line 44). This dynamic, per-session difficulty mutation directly conflicts with the per-game audit specs in this batch that require fixed **"Difficulty Tiers — Easy/Medium/Hard with standardized spawn rates, word counts, and speed presets"** (e.g., `abyssal-well-compliance-audit/spec.md:41`). If adaptive mode rewrites spawnRate/speed/wordComplexity at runtime, the "standardized presets" compliance item becomes non-deterministic. The two standards are not reconciled anywhere — a shared-runtime governance gap.

**F-GAMES-B12-019 · Medium · spec.md:12-16,33-41 (scoring vs XP collision)**
The engine defines its own 0-100 composite "performance score" (accuracy 50% / speed 30% / streak 20%) used to drive difficulty. This is a **separate metric from the 1–10 XP score** the audit specs require (`spec.md:40` of the audits). Two parallel scoring systems with overlapping inputs (accuracy, speed, streak/survival) risk divergence and double-counting when results are exported to Reading/Primary leaderboards/progress. No mapping or separation-of-concerns note exists.

**F-GAMES-B12-020 · Medium · spec.md:36-40 (fairness of leaderboards)**
Because difficulty silently increases for high performers (>80 → harder) and decreases for strugglers (<40 → easier), two students answering the same vocabulary set will face different spawn rates/time limits. If raw XP from these sessions feeds a shared leaderboard, scores are not comparable across players — an equity/fairness issue for competitive or progress-ranked use in Reading/Primary. Spec out-of-scope (line 77) only excludes multiplayer, not single-player leaderboard comparability.

**F-GAMES-B12-021 · Low · spec.md:73-78 (no a11y interaction)**
The adaptive engine accelerates gameplay (shorter time limits, faster speeds) with no interaction with the accessibility layer (File 2-4). Auto-increasing speed for skilled players can conflict with reduced-motion / extended-time accommodations. Cross-track dependency between adaptive difficulty and accessibility is unaddressed.

### File 8 — `alchemists-synthesis-compliance-audit_20260426/index.md`

**F-GAMES-B12-022 · Info · index.md:1-5**
Index links spec/plan/metadata but **omits `report.md`**, even though a `report.md` exists in the same folder and is the primary deliverable of an audit track. The most evidence-bearing document is not discoverable from the index.

### File 9 — `alchemists-synthesis-compliance-audit_20260426/metadata.json`

**F-GAMES-B12-023 · Medium · metadata.json:4,9**
`"status": "completed"` but `"actual_tasks": null` and `deviation_notes: ""`. The report describes a significant deviation — the game "was previously registered as `coming-soon` with no source code" and a "minimal compliant implementation was created during this audit" (`report.md:10`). Creating an entire game inside a *compliance-audit* track contradicts the spec's Out of Scope ("New gameplay features", `spec.md:69`). That scope deviation is undocumented in `deviation_notes`, and `actual_tasks` is unrecorded.

### File 10 — `alchemists-synthesis-compliance-audit_20260426/plan.md`

**F-GAMES-B12-024 · High · plan.md:43-48 vs spec Out-of-Scope**
Phase 6 "Fixes" silently absorbed building a brand-new game (logic, component, page, two API routes, tests — per `report.md:73-85`) under an audit track whose Out-of-Scope explicitly forbids "New gameplay features" (`spec.md:69`). An audit that constructs the artifact it is auditing cannot provide independent assurance; the 23/25 "pass" is self-graded against code written in the same pass. This undermines the credibility of the compliance result for alchemists-synthesis.

### File 11 — `alchemists-synthesis-compliance-audit_20260426/report.md`

**F-GAMES-B12-025 · High · report.md:67,97 (verified)**
Report marks "Asset Location" as ⚠️ Partial: "Directory created at `/public/games/vocabulary/alchemists-synthesis/` but empty." Live check shows the directory **does not exist at all** (not merely empty). A vocabulary "synthesis/merging" game (per registry description, `gameCards.ts:80`) shipping `playable` with zero art assets is a real readiness defect; the report's "Partial" understates it, and the game was flipped to `status: 'playable'` (`report.md:80`, confirmed in registry) despite this.

**F-GAMES-B12-026 · Medium · report.md (self-graded coverage, unverifiable commit)**
Coverage claims (logic 100%, component 81.36%, `report.md:57,91-93`) are self-reported in the same change that authored the tests, with no independent run captured here. The associated commit `6fc59ca` (`plan.md:53`) is **not resolvable in monorepo git history**, so neither the coverage nor the "complete" state can be independently confirmed from the repo. Treat the 80% claim as unverified.

**F-GAMES-B12-027 · Low · report.md:10,98 (minimal-implementation readiness)**
Report concedes the game "is minimal … a simple vocabulary matching game" and could be "expanded with alchemy-themed visuals, potion mixing mechanics." A scaffold built to pass a checklist, then marked `playable`, is a game-readiness risk: it satisfies architectural compliance but not the gameplay promise advertised in the registry copy. Flag for the readiness matrix as "compliant scaffold, not feature-complete."

### File 12 — `alchemists-synthesis-compliance-audit_20260426/spec.md`

**F-GAMES-B12-028 · Medium · spec.md:43-44,67-72**
Same boilerplate camera/off-screen-indicator items applied to a static matching game (N/A in practice), and Out-of-Scope (line 67-72) forbids the very implementation work the track ended up doing (see F-GAMES-B12-024). The spec and the executed work are internally inconsistent; the spec was not updated to authorize the build.

### File 13 — `archers-revenge-compliance-audit_20260426/index.md`

**F-GAMES-B12-029 · Info · index.md:1-5**
Index omits `report.md` (present in folder), same discoverability gap as F-GAMES-B12-022. The audit's conclusion is not linked from its own index.

### File 14 — `archers-revenge-compliance-audit_20260426/metadata.json`

**F-GAMES-B12-030 · High · metadata.json:4 vs report.md:1-12**
Metadata says `"status": "new"` while `report.md` declares the audit **complete with 25/25 passing** and `plan.md` marks every task `[x]` (including "Update track metadata.json status to completed", `plan.md:52`). The metadata was never advanced to `completed`. Status signals across the three documents are mutually contradictory; track state is unreliable.

**F-GAMES-B12-031 · Low · metadata.json:9**
`"actual_tasks": null` despite the plan claiming 7 completed phases with fixes. Effort/deviation is unrecorded.

### File 15 — `archers-revenge-compliance-audit_20260426/plan.md`

**F-GAMES-B12-032 · Medium · plan.md:38-39 (fixes inside audit)**
Plan records two code fixes applied during the audit (hook deps; unused vars), commit `c4a1d86`. As with alchemists, an audit track mutating the audited source blurs assurance, though here the changes are minor code-quality fixes (less severe than building a whole game). The commit `c4a1d86` is **not resolvable** in monorepo git history (F-GAMES-B12-026 pattern), so the fix and its regression run are unverifiable from the repo.

**F-GAMES-B12-033 · Medium · plan.md:8 vs live tree**
Phase 1 marks "Verify asset and cover image existence" as `[x]` (passed), and `report.md:61` asserts "Assets in `public/games/vocabulary/archers-revenge/`." That directory **does not exist** in the working tree. Either the assets were never committed or were removed; either way the "Asset Location PASS" is false at review time. This is a concrete asset-readiness defect for a game registered `playable`.

### File 16 — `archers-revenge-compliance-audit_20260426/report.md`

**F-GAMES-B12-034 · High · report.md:61 (asset claim false — verified)**
"Asset Location | PASS | Assets in `public/games/vocabulary/archers-revenge/`" is contradicted by the live tree (directory absent). The 25/25 perfect score is overstated by at least this item; "Asset Location" should be FAIL/Partial. Because the report claims a flawless audit, this false PASS erodes confidence in the other self-reported PASS marks (coverage 93.14%, `report.md:52`, not independently reproduced here).

**F-GAMES-B12-035 · Medium · report.md:54-55,67-78 (the actual readiness wins)**
The two genuine fixes are sound and worth carrying forward as shared-runtime lessons: (1) removing a `gameState` object from a `useEffect` dep array that "re-run on every frame" (a real per-frame performance/correctness bug, `report.md:68`), and (2) removing dead `locale`/`session` vars. These point to recurring patterns (frame-loop dep arrays, hooks called only for side effects) that the broader review should check across all games, not just archers.

**F-GAMES-B12-036 · Low · report.md:56,62 vs spec.md:56 (cover naming)**
Report says cover is at `cover-archers-revenge.png` (matches registry and disk), but the spec's checklist item names `archers-revenge-cover.png` (`spec.md:56`). The audit passed the item against a different filename than the spec demanded without flagging the mismatch — same naming-standard drift as F-GAMES-B12-001.

### File 17 — `archers-revenge-compliance-audit_20260426/spec.md`

**F-GAMES-B12-037 · Low · spec.md:56**
Cover-image path in the checklist (`archers-revenge-cover.png`) does not match the actual/canonical asset (`cover-archers-revenge.png`). The four audit specs in this batch use two different cover-naming conventions (`<id>-cover.png` vs `cover-<id>.png`), confirming there is **no enforced cover-naming standard** — a shared-asset-pipeline gap worth a platform-level fix.

### File 18 — `astral-mage-compliance-audit_20260426/index.md`

**F-GAMES-B12-038 · Info · index.md:1-5**
Index omits a `report.md` link. Per metadata the report exists (`plan.md:51` claims it was written), but it was **not included in this batch's file list**, so the report's contents could not be reviewed (coverage limitation — see Limitations).

### File 19 — `astral-mage-compliance-audit_20260426/metadata.json`

**F-GAMES-B12-039 · High · metadata.json:4,10 (verified)**
`"status": "completed"` with deviation note "Game has zero implementation (no source files, tests, or assets). All 25 specs failed." Confirmed against the tree: no `astralMage.ts`, no component dir, no page/API, no asset dir. Yet astral-mage is shipped in the registry — and the plan claims it is registered **`playable`** (`plan.md:7`). The live registry shows `status: 'coming-soon'` (`gameCards.ts:203`), so the plan's "PASS: Registered as playable" is factually wrong (F-GAMES-B12-040). Net readiness: astral-mage is a registry entry with a cover image and nothing else.

### File 20 — `astral-mage-compliance-audit_20260426/plan.md`

**F-GAMES-B12-040 · High · plan.md:7 vs registry `gameCards.ts:203` (verified)**
Phase 1 records "Check game registry entry … **PASS: Registered as playable** with correct type: sentence." The registry actually lists astral-mage as `status: 'coming-soon'` (verified). The single "PASS" in an otherwise all-FAIL audit is based on an incorrect reading of the registry. (Marking `coming-soon` as the intended state would be the correct, and more favorable, finding — the audit erred in the wrong direction by asserting `playable`.)

**F-GAMES-B12-041 · Medium · plan.md:44 (audit closed on a non-game)**
The track was closed `completed` with the rationale that fixing requires "building the entire game, which is out of scope." This is a defensible scoping call, but no follow-up implementation track is referenced anywhere in the batch. Astral-mage therefore sits as an advertised-but-empty game with no tracked path to implementation — an open readiness item that could leak into a Reading/Primary import if the registry entry is trusted over the audit.

**F-GAMES-B12-042 · Low · plan.md:9,17,25,33,41 (verification gates left unchecked)**
Every "Measure — User Manual Verification" task across Phases 1-5 is left `[ ]` (unchecked) while Phases 6-7 verification tasks are `[x]`. A track marked `completed` with most of its mandatory human-verification gates unticked indicates the Measure verification protocol was not uniformly applied — a process-quality concern shared with several audit tracks in this batch.

---

## Cross-Cutting Themes

1. **Audit independence compromised (High).** Two of three audit tracks here modified or *created* the code they audited (alchemists built a whole game; archers applied fixes). Self-graded "pass" results lack independent assurance (F-GAMES-B12-024, -031, -032).
2. **Metadata/plan/report status divergence (High).** archers (`new` vs report "complete"), adaptive (`planned` vs all-tasks-done), alchemists (`actual_tasks: null` on completed). Track state cannot be trusted from metadata alone (F-GAMES-B12-012, -023, -030).
3. **Asset readiness gaps (High).** abyssal-well, alchemists, and archers all have **missing game-asset directories** despite `playable` status; reports either omit or understate this (F-GAMES-B12-002, -025, -033, -034).
4. **Cover-image naming has no standard (Medium).** Two conventions coexist (`<id>-cover.png` vs `cover-<id>.png`); duplicate covers exist for abyssal-well (F-GAMES-B12-001, -036, -037).
5. **Scoring/difficulty governance conflict (High).** The adaptive-difficulty engine's runtime parameter mutation and 0-100 score collide with the per-game audits' "standardized fixed tiers" and 1–10 XP, with implications for leaderboard comparability when imported into Reading/Primary (F-GAMES-B12-018, -019, -020).
6. **Accessibility is aspirational (Medium/High).** The accessibility layer is `pending` with a boilerplate plan that ignores the core canvas-a11y problem, while per-game audits mark "Accessibility PASS" on touch/text scaling only (F-GAMES-B12-006, -009, -010).
7. **Unverifiable commit references (Medium).** Cited commit hashes do not resolve in the monorepo, so completion/coverage claims cannot be independently confirmed (F-GAMES-B12-026).

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 11 | 001, 002, 009, 018, 024, 025, 030, 034, 039, 040 *(+ theme aggregation)* |
| Medium | 16 | 003, 006, 008, 010, 012, 015, 016?, 019, 020, 023, 026, 028, 030-dup, 032, 033, 035, 041 |
| Low | 11 | 004, 007, 011, 013, 016, 017, 021, 027, 031, 036, 037, 042 |
| Info | 5 | 005, 014, 022, 029, 038 |

*(Counts are indicative; some findings span severities. Each finding above carries its own authoritative severity label inline.)*

---

## Limitations

- **Documentation-only batch.** 20 files are Measure track docs (specs/plans/metadata/index + one report). No runtime component or test source files were in scope; gameplay behavior, render correctness, FPS, and actual test execution were **not** observed.
- **Selective live cross-checks only.** I read-only verified specific claims against the working tree (registry entries, presence of source/asset/cover files, adaptive-difficulty artifacts). I did **not** run the test suites, lint, type-check, build, or coverage tooling, and did not edit any source.
- **Coverage numbers are as-reported.** All coverage/FPS/latency figures in these docs are self-reported by the audit authors and were not reproduced in this review.
- **Commit hashes unverified.** Cited commits (`6fc59ca`, `c4a1d86`, `4c4278d`) did not resolve in the monorepo git history at review time; they may live in a sub-repo/history not present here. Their associated work is therefore unverifiable from this batch.
- **Missing track documents.** The abyssal-well track provided only `spec.md` (no metadata/plan/report), and the astral-mage `report.md` was not in the file list; conclusions about those tracks' completion states rely on the partial documents provided plus live cross-checks.
- **No acceptance/closeout performed.** This report is a line-by-line review artifact only. It makes **no acceptance, closeout, or sign-off claims** for any track, game, or the review batch itself. Findings are observations for the `advantage_games_review_20260626` track owners to triage.

---

*End of `games-batch-12` line-by-line review. 20/20 files reviewed.*
