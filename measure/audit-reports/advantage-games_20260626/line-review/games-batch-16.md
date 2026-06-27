# Line-by-Line Review — games-batch-16

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-16`
**Scope source:** `/tmp/opencode/games-batch-16` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (index, metadata, plan, report, spec) for five tracks under `apps/advantage-games/measure/tracks/`: four single-game compliance audits and one multiplayer feature track. No `.ts`/`.tsx` runtime, component, or test files are listed in this batch. Selected source files were read-only inspected to validate document claims.
**Finding ID scheme:** `F-GAMES-B16-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `labyrinth-goblin-king-compliance-audit_20260426/index.md` | labyrinth-goblin-king | index |
| 2 | `labyrinth-goblin-king-compliance-audit_20260426/metadata.json` | labyrinth-goblin-king | metadata |
| 3 | `labyrinth-goblin-king-compliance-audit_20260426/plan.md` | labyrinth-goblin-king | plan |
| 4 | `labyrinth-goblin-king-compliance-audit_20260426/report.md` | labyrinth-goblin-king | report |
| 5 | `labyrinth-goblin-king-compliance-audit_20260426/spec.md` | labyrinth-goblin-king | spec |
| 6 | `magic-defense-compliance-audit_20260426/index.md` | magic-defense | index |
| 7 | `magic-defense-compliance-audit_20260426/metadata.json` | magic-defense | metadata |
| 8 | `magic-defense-compliance-audit_20260426/plan.md` | magic-defense | plan |
| 9 | `magic-defense-compliance-audit_20260426/report.md` | magic-defense | report |
| 10 | `magic-defense-compliance-audit_20260426/spec.md` | magic-defense | spec |
| 11 | `multiplayer_competitive_mode_20260423/metadata.json` | multiplayer-competitive-mode | metadata |
| 12 | `multiplayer_competitive_mode_20260423/plan.md` | multiplayer-competitive-mode | plan |
| 13 | `multiplayer_competitive_mode_20260423/spec.md` | multiplayer-competitive-mode | spec |
| 14 | `paladins-twin-soul-compliance-audit_20260426/index.md` | paladins-twin-soul | index |
| 15 | `paladins-twin-soul-compliance-audit_20260426/metadata.json` | paladins-twin-soul | metadata |
| 16 | `paladins-twin-soul-compliance-audit_20260426/plan.md` | paladins-twin-soul | plan |
| 17 | `paladins-twin-soul-compliance-audit_20260426/report.md` | paladins-twin-soul | report |
| 18 | `paladins-twin-soul-compliance-audit_20260426/spec.md` | paladins-twin-soul | spec |
| 19 | `potion-rush-compliance-audit_20260426/index.md` | potion-rush | index |
| 20 | `potion-rush-compliance-audit_20260426/metadata.json` | potion-rush | metadata |

Note: the batch list intentionally truncates the `potion-rush` track at file 20 (`metadata.json`); its `spec.md`, `plan.md`, and `report.md` exist on disk but are **not** in scope for this batch (they fall to a later batch). Findings about Potion Rush are limited to its `index.md` and `metadata.json` plus cross-file consistency.

This batch is documentation; runtime quality is asserted by the reports/plans, so findings below focus on (a) internal consistency of the documents, (b) verifiability of claims against the actual repo, and (c) readiness/portability/importability signals these documents surface.

---

## Cross-Batch Verification Performed (read-only)

The following claims were spot-checked against the live repo. Results feed several findings:

- Registry entries exist in `src/lib/gameCards.ts` for all four game IDs: `magic-defense` (line 30), `potion-rush` (line 86), `labyrinth-goblin-king` (line 134), `paladins-twin-soul` (line 182). All have `status: 'playable'`. Confirmed.
- Cover images exist on disk: `magic-defense-cover.png`, `potion-rush-cover.png`, `cover-labyrinth-of-the-goblin-king.png`, `cover-paladins-twin-soul.png`. Confirmed. **Naming is inconsistent** with each spec's stated path (see findings).
- Multiplayer source exists: `src/lib/multiplayer/ws-server.ts`, `room-manager.ts`, `game-session.ts`, `scoring-engine.ts`; `src/hooks/useMultiplayerSocket.ts`; `src/components/multiplayer/{LobbyScreen,ScoreboardOverlay,PodiumScreen,MultiplayerGameWrapper}.tsx` with co-located `.test.tsx`/`.test.ts`. `ws@^8.20.0` is in `package.json`. Confirmed.
- `useMultiplayerGameState.ts` hook claimed in plan Phase 3 — present alongside socket hook (multiplayer dir populated). Confirmed.

---

## Findings

### File 1 — `labyrinth-goblin-king/index.md`

**F-GAMES-B16-001 · Info · index.md:1-5**
Standard three-link stub (spec/plan/metadata). Consistent with all other audit-track index files. No issue.

### File 2 — `labyrinth-goblin-king/metadata.json`

**F-GAMES-B16-002 · High · metadata.json:4**
`"status": "new"` while the track's `plan.md` marks **every** task across all 7 phases `[x]` complete and `report.md` claims a finished 25/25 audit with a committed SHA `7a6ecb8`. The metadata status was never advanced to `completed` (plan Phase 7 explicitly claims "Update track metadata.json status to completed" as done — that task did not actually update the file). This is an internal contradiction that undermines the trustworthiness of the track's self-reported completion state.

**F-GAMES-B16-003 · Low · metadata.json:9**
`"actual_tasks": null` despite all tasks marked complete and a fixed estimate of 8. Post-completion bookkeeping not filled in (pattern repeats across the batch).

### File 3 — `labyrinth-goblin-king/plan.md`

**F-GAMES-B16-004 · Medium · plan.md:4-53**
All 7 phases (incl. all "Measure - User Manual Verification" gates) are checked `[x]` and tagged with the **same single commit `7a6ecb8`**. A genuine multi-phase TDD audit with discovery → fixes → regression would normally produce multiple checkpoints. A single SHA across discovery, fixes, tests, and report strongly suggests the plan was back-filled in one pass rather than executed phase-by-phase. Treat phase-gate "verification" claims as unverified.

**F-GAMES-B16-005 · Info · plan.md:5**
Coverage commands reference `--collectCoverageFrom='src/lib/games/labyrinthGoblinKing.ts'` and `src/components/games/sentence/labyrinth-goblin-king/**/*.tsx`. Paths are internally consistent with the spec's file table; not independently re-run here.

### File 4 — `labyrinth-goblin-king/report.md`

**F-GAMES-B16-006 · Medium · report.md:11,17,60**
Report claims "25/25 PASS" with "Fixes Applied: 7", but the items listed as PASS include five that are explicitly fixes the auditor applied to bring the game into compliance (fullscreen, accessibility hook, text-size bump, i18n/session hooks, hook-dep fix). A "25/25 PASS" headline obscures that the game **shipped non-compliant** and only passed after same-session remediation. For readiness tracking, pre-fix state (≈18/25, mirroring the magic-defense/paladins baselines) is the more honest readiness signal.

**F-GAMES-B16-007 · Medium · report.md:28 vs spec.md:24**
Spec mandates "Mobile-First Portrait — **390×844** reference viewport"; report records compliance as "**390×700** reference viewport with responsive scaling". 390×700 is not the standardized reference height. Marked PASS despite deviating from the spec's own stated dimension — a soft non-compliance hidden inside a PASS.

**F-GAMES-B16-008 · Medium · report.md:51 vs spec.md:41**
Difficulty tiers reported as "easy/normal/hard/extreme" (PASS), but the shared spec mandates "**Easy/Medium/Hard**". The magic-defense and paladins reports in this same batch treat `normal`→`medium` rename and `extreme` removal as **required fixes** (B16 magic-defense report.md:58, paladins report.md:57). Labyrinth retains `normal`/`extreme` yet is marked PASS — an inconsistent application of the same spec across the batch. Likely a genuine residual non-compliance.

**F-GAMES-B16-009 · Low · report.md:70 vs spec.md:56**
Cover image: spec requests `/public/games/cover/labyrinth-goblin-king-cover.png`; report says `cover-labyrinth-of-the-goblin-king.png` exists. Verified: the on-disk filename is `cover-labyrinth-of-the-goblin-king.png` and the registry references it. Functionally fine, but the platform cover-naming convention is not standardized (some games use `<id>-cover.png`, others `cover-<id>.png`), which is a portability/importability hazard when Reading/Primary host resolve assets by convention.

**F-GAMES-B16-010 · Low · report.md:95**
Coverage table footer shows branches 78.46%, functions 73.33%. The ≥80% gate is stated against statements/lines only (87.71%); function and branch coverage are below 80%. Acceptable per the stated spec wording, but worth flagging: the 87.71% headline masks sub-80% function/branch coverage, weakening the "test quality" assurance.

### File 5 — `labyrinth-goblin-king/spec.md`

**F-GAMES-B16-011 · Info · spec.md:43-44**
Camera/off-screen-indicator items are conditional ("if world > 500px"). Report marks both N/A on the basis of a 390×700 world. Consistent given F-GAMES-B16-007's smaller-than-spec world. No additional issue.

---

### File 6 — `magic-defense/index.md`

**F-GAMES-B16-012 · Info · index.md:1-5**
Standard stub. No issue.

### File 7 — `magic-defense/metadata.json`

**F-GAMES-B16-013 · Info · metadata.json:4**
`"status": "completed"` — correctly matches the plan/report (contrast with labyrinth F-GAMES-B16-002). Good.

### File 8 — `magic-defense/plan.md`

**F-GAMES-B16-014 · High · plan.md:43-55**
**Duplicate "Phase 6" block.** Lines 43-48 are a completed Phase 6 (all `[x]`); lines 50-55 are a second "Phase 6" with all tasks `[ ]` unchecked. A malformed plan with two conflicting Phase-6 sections indicates the document was hand-edited/templated incorrectly. The unchecked duplicate makes the plan's completion state ambiguous and would break any automated phase-gate parser.

**F-GAMES-B16-015 · Medium · plan.md:12-16,29-30**
Plan candidly records hard FAILs that remain architectural: React-Konva FAIL (DOM/framer-motion), pure-tick FAIL (Zustand direct mutation), rAF FAIL (`setInterval`). These are genuine readiness/shared-runtime gaps (see report findings). The plan is honest here; the issue is that the track was nonetheless marked `completed` with these gaps open.

### File 9 — `magic-defense/report.md`

**F-GAMES-B16-016 · High · report.md:21,31-34**
Three core architecture specs are **FAIL and unresolved**: React-Konva canvas, pure state + tick functions, and rAF+delta-time game loop. The game uses DOM/framer-motion + Zustand + `setInterval`. This is the central shared-runtime divergence in the batch: Magic Defense does **not** share the platform's React-Konva runtime, so it cannot benefit from the shared game loop, fullscreen, or accessibility scaling primitives the other games use. High impact for "shared runtime" and "importability into Reading/Primary" (the host expects the standardized Konva game contract).

**F-GAMES-B16-017 · High · report.md:41-42,115**
Accessibility marked **PARTIAL**: `useAccessibilitySettings` is *imported* but `getEffectiveTextSize`/`getEffectiveTouchTarget` are **not wired** into UI elements; sub-16px Tailwind classes (`text-[10px]`, `text-xs`) remain in HUD/StartScreen. Touch-target ≥44px also not applied to all interactive elements. For an age-appropriate (young learner) reading game, sub-16px text and unscaled touch targets are real accessibility/UX defects, not cosmetic. Importing a hook without consuming it is a false-comfort signal.

**F-GAMES-B16-018 · Medium · report.md:14-21**
Math/labeling inconsistency: executive summary header says "Pass 20 / Fail 3 / N/A 2" (=25) and "20/25 passing", but the Input & Accessibility and Game Systems sub-tables include **PARTIAL** ratings (items 6, 7) that are neither counted as pass nor fail. The pass/fail tally is therefore not reconcilable with the detailed matrix. A reader cannot derive the true compliance count from the document.

**F-GAMES-B16-019 · Medium · report.md:62 vs 113**
Item 17 "Performance" marked **PASS** ("framer-motion handles animations efficiently"), yet item 4 documents the loop is `setInterval`-based and item in Known Debt (line 113) admits it "does not match the standardized rAF + delta-time pattern". A `setInterval` loop has no delta-time clamping; marking Performance PASS while the loop spec FAILs is contradictory and overstates mobile/perf readiness (no frame-time compensation under load).

**F-GAMES-B16-020 · Medium · report.md:68,124-127**
Coverage reported 80.52% overall — barely above the 80% gate — but the per-file table shows GameEngine.tsx at **72.52%** statements and overall **functions 64.7%**. The most logic-heavy component (the engine) is under-covered, and function coverage is well below 80%. The headline "PASS" rests on a thin aggregate margin; test quality for the engine specifically is weak.

**F-GAMES-B16-021 · Medium · report.md:59,114**
Shared screens (`GameStartScreen`/`GameEndScreen`) **FAIL** — custom `StartScreen`/`ResultsScreen` retained. This breaks UI consistency and means platform-level changes to shared start/end screens (telemetry, XP display, leaderboard hooks) will not propagate to this game — an importability/maintenance gap.

### File 10 — `magic-defense/spec.md`

**F-GAMES-B16-022 · Info · spec.md:33-37**
Spec correctly lists `VocabularyItem[]` and `createVocabularyRoute`/`createCompleteRoute`; report confirms these PASS. Data/API integration is the strongest area for this game. No issue.

---

### File 11 — `multiplayer-competitive-mode/metadata.json`

**F-GAMES-B16-023 · High · metadata.json:4 vs plan.md**
`"status": "planned"` but `plan.md` has **every task across all 5 phases checked `[x]`** with distinct commit SHAs and checkpoints, and the corresponding source files exist on disk (verified: `ws-server.ts`, `room-manager.ts`, `game-session.ts`, `scoring-engine.ts`, hooks, components, plus tests). Status `planned` flatly contradicts a fully-checked plan and real implementation. Either the metadata is stale or the plan over-claims; this contradiction must be resolved before any readiness/closeout decision. (No closeout asserted here.)

**F-GAMES-B16-024 · Low · metadata.json:10**
`"deviation_notes": null` despite an 18-task estimate and a plan that appears fully executed across 5 phases — no record of whether scope held. Bookkeeping gap.

### File 12 — `multiplayer-competitive-mode/plan.md`

**F-GAMES-B16-025 · Medium · plan.md:5,55**
Spec requires (spec.md:22) a "Fallback to long-polling if WebSocket is unavailable", and (spec.md:49) "Room state must survive brief server restarts (in-memory with Redis backup)". The plan contains **no task** for long-polling fallback, and Redis is explicitly deferred (spec.md:78 "designed but not implemented"). The plan marks Phase 1-5 complete without these resilience requirements, so the "done" plan does not satisfy all functional/non-functional requirements in its own spec. Readiness gap for unreliable mobile networks.

**F-GAMES-B16-026 · Medium · plan.md:77-86**
Phase 5 claims Playwright 2-context E2E, mobile-viewport verification, and a "<100ms state update latency" performance benchmark — all `[x]` under a single checkpoint `5f39039`/`ef2b944`. A `performance-benchmark.test.ts` file exists, but the plan asserts the 400-player / 100-concurrent-room non-functional target (spec.md:47) is met; nothing in the plan shows a load test at that scale. Performance/scalability claims are unverified by the artifacts described.

**F-GAMES-B16-027 · Low · plan.md:48**
"Latency compensation: optimistic UI for own inputs, rollback on rejection" is a complex correctness-critical feature checked complete in one task with no sub-tasks describing reconciliation/test scenarios. Rollback logic is a common source of desync bugs; the plan provides no evidence of adversarial/latency testing.

### File 13 — `multiplayer-competitive-mode/spec.md`

**F-GAMES-B16-028 · Medium · spec.md:27-30,69**
Server-authoritative scoring + anti-cheat ("reject score submissions that exceed maximum possible score") is specified, and a `scoring-engine.ts` exists. However, the spec's anti-cheat is bounded only by "maximum possible score for the round" — it does not address input-timing spoofing or rapid-fire automated submissions. For a competitive mode tied to XP/leaderboards (importability into Reading/Primary progress systems), weak anti-cheat could pollute real student progress/XP. Worth a deeper security pass before this mode feeds graded progress.

**F-GAMES-B16-029 · Medium · spec.md:50-51**
Non-functional accessibility requirement is only "screen reader announcements for player join/leave events". A real-time competitive game with score overlays and round timers has far broader a11y needs (timer/score live-regions, reduced-motion for Framer Motion animations, keyboard operability of lobby). The spec under-specifies accessibility for an age-targeted product; this propagates to thin a11y coverage in the plan.

**F-GAMES-B16-030 · Info · spec.md:57-58**
Spec uses a separate Zustand store for multiplayer state and a `MultiplayerGameWrapper` to inject server state into existing game components. This is a reasonable importability bridge — but it only works for games already on the shared Konva/state contract. Magic Defense (F-GAMES-B16-016) is on a divergent runtime, so it would **not** be wrappable without rework. Cross-track interaction worth noting for the wider review.

---

### File 14 — `paladins-twin-soul/index.md`

**F-GAMES-B16-031 · Info · index.md:1-5**
Standard stub. No issue.

### File 15 — `paladins-twin-soul/metadata.json`

**F-GAMES-B16-032 · Info · metadata.json:4**
`"status": "completed"` — matches plan/report. Good (contrast labyrinth).

### File 16 — `paladins-twin-soul/plan.md`

**F-GAMES-B16-033 · Medium · plan.md:3-53**
As with labyrinth, every phase + verification gate is `[x]` under a **single checkpoint `70d4f01`**. Same back-fill pattern: discovery, fixes, regression, and report all attributed to one commit. Phase-gate "User Manual Verification" entries cannot be independently trusted from the document alone.

### File 17 — `paladins-twin-soul/report.md`

**F-GAMES-B16-034 · Medium · report.md:10,51-62**
Headline "25/25 passing after fixes (18 passing at start, 7 failures)". Like labyrinth, the PASS total is post-remediation; pre-fix readiness was 18/25. The 7 fixes include XP rework (`calculateXP` implemented to 1-10 scale), difficulty rename (`normal`→`medium`, removed `extreme`), fullscreen, accessibility hook + text-size bump, hook-dep fixes, and i18n/session. Honest fix list, but "25/25" overstates baseline readiness — flag for accurate readiness rollup.

**F-GAMES-B16-035 · Medium · report.md:56**
"calculateXP — Implemented proper 1-10 scale" was a **fix applied during the audit**, meaning the game previously shipped without a spec-compliant XP/scoring calculation. For scoring/XP/progress integration into Reading/Primary, a game whose XP formula was only just standardized warrants re-verification that emitted XP values match host expectations (1-10 clamp) at the API/`createCompleteRoute` boundary, which this report does not evidence.

**F-GAMES-B16-036 · Low · report.md:61 vs spec.md:56**
Cover: spec requests `paladins-twin-soul-cover.png`; report says cover exists at `cover-paladins-twin-soul.png` and was created as a **symlink** ("cover symlink", lines 61,84). Verified on disk: `cover-paladins-twin-soul.png` present and registry references it (line 185). A symlinked cover asset is a portability hazard — symlinks may not survive checkout on all platforms (Windows/CI), and Reading/Primary import would need the real file. Recommend a committed binary, not a symlink.

**F-GAMES-B16-037 · Low · report.md:66**
Coverage 92.5% statements but **branch 78.09%, functions 66.66%** overall. Same pattern as labyrinth/magic-defense: strong statement coverage masking sub-80% function/branch coverage. Test quality for branch/function paths is weaker than the headline implies.

### File 18 — `paladins-twin-soul/spec.md`

**F-GAMES-B16-038 · Info · spec.md:41**
Spec mandates Easy/Medium/Hard. Report confirms `normal`→`medium` and `extreme` removed (fix #5). This is the correct application of the difficulty-tier spec — and directly highlights the inconsistency in labyrinth (F-GAMES-B16-008), which kept `normal`/`extreme` yet was marked PASS. No issue with paladins itself.

---

### File 19 — `potion-rush/index.md`

**F-GAMES-B16-039 · Info · index.md:1-5**
Standard stub. No issue. (Remaining potion-rush docs are out of batch scope; see Limitations.)

### File 20 — `potion-rush/metadata.json`

**F-GAMES-B16-040 · High · metadata.json:4**
`"status": "new"` while the on-disk `report.md` (out-of-batch, but spot-read) declares the audit complete at 24/25 (one mixed). Same stale-metadata contradiction as labyrinth (F-GAMES-B16-002): a track presenting a finished report while metadata still says `new`. Metadata is an unreliable completion indicator across this batch.

**F-GAMES-B16-041 · Medium · (cross-doc) potion-rush report.md:8-15 [referenced, out-of-batch]**
The in-scope `metadata.json` describes a generic compliance audit; the out-of-scope report (read only to validate the metadata's truthfulness) records a residual "Performance — delta-time clamping" mixed rating because `TrashPortal` still uses `useInterval` while the main loop uses rAF. This is a genuine residual shared-runtime/performance gap surfaced for awareness; full line-anchored review of that report belongs to the batch that owns it.

---

## Cross-Track / Systemic Observations

**F-GAMES-B16-042 · High · (systemic)**
**Metadata status is not a reliable completion signal.** Three of five tracks in this batch have `status` that contradicts their plan/report: labyrinth (`new` vs complete report), potion-rush (`new` vs complete report), multiplayer (`planned` vs fully-checked plan + real source). Only magic-defense and paladins have correct `completed` status. Any automated rollup keying on `metadata.status` will misreport this batch. Recommend reconciling status fields before readiness aggregation.

**F-GAMES-B16-043 · Medium · (systemic)**
**Single-commit phase back-fill.** labyrinth (`7a6ecb8`) and paladins (`70d4f01`) attribute all phases + manual-verification gates to one SHA each. The "User Manual Verification" gates therefore carry no independent evidence. Treat phase-gate completion as self-asserted, not verified.

**F-GAMES-B16-044 · Medium · (systemic)**
**Inconsistent application of the shared 25-point spec.** The difficulty-tier spec (Easy/Medium/Hard) is enforced for magic-defense and paladins (rename/remove `extreme`) but waived for labyrinth (`normal`/`extreme` kept, still PASS). The viewport spec (390×844) is waived for labyrinth (390×700, still PASS). Same auditor date (2026-04-26), same spec, different verdicts — reduces confidence in all four PASS verdicts.

**F-GAMES-B16-045 · Medium · (systemic)**
**Coverage headlines hide sub-80% branch/function coverage.** labyrinth (fn 73.33%, br 78.46%), magic-defense (fn 64.7%, GameEngine stmt 72.52%), paladins (fn 66.66%, br 78.09%). The ≥80% gate is satisfied only on statements/lines. Test quality on conditional and function paths is consistently weaker than reported.

**F-GAMES-B16-046 · Medium · (systemic — importability)**
**Asset/cover naming and symlinks are not import-safe.** Covers appear under two conventions (`<id>-cover.png` vs `cover-<id>.png`), and paladins uses a **symlinked** cover. For importing games into Reading/Primary (which resolve assets by convention and via standard checkout/CI), inconsistent names and symlinks are fragile. Recommend a single canonical naming scheme and committed binary assets.

**F-GAMES-B16-047 · High · (systemic — shared runtime)**
**Magic Defense is off the shared runtime.** It uses DOM/framer-motion + Zustand + `setInterval` rather than React-Konva + pure tick + rAF. This blocks reuse of the shared game loop, fullscreen, accessibility scaling, and the `MultiplayerGameWrapper` contract (F-GAMES-B16-030). It is the largest single readiness/importability risk among the four audited games and is documented as accepted "Known Debt" without a remediation track referenced.

---

## Limitations

- **Documentation-only batch.** No runtime/component/test source files were in the file list; runtime behavior (scoring math, mobile FPS, browser compatibility, audio, actual accessibility rendering) could not be exercised. Findings derive from document consistency plus read-only repo spot-checks of file existence and registry/cover/asset facts.
- **No source code edited**, per scope.
- **Spot-checks were existence/registry-level**, not full code review: I confirmed that named files, registry entries, cover images, and multiplayer modules exist, but did not line-audit those implementation files (they belong to other batches). Claims like coverage percentages, latency benchmarks, anti-cheat correctness, and "no `any` types" were **not** re-executed or re-measured; they are reported as the documents state them and flagged where internally inconsistent.
- **Potion Rush is partially in scope.** Only `index.md` and `metadata.json` are in this batch; `spec.md`/`plan.md`/`report.md` exist on disk and were read minimally solely to validate the metadata-status contradiction (F-GAMES-B16-040/041). Their full line-by-line review belongs to the batch that lists them.
- **Commit SHAs were not verified** against git history; checkpoint/commit references are taken from the documents at face value.
- This review makes **no acceptance or closeout determination** for any track; it records findings only.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 7 | 002, 016, 017, 023, 040, 042, 047 |
| Medium | 22 | 004, 006, 007, 008, 014, 015, 018, 019, 020, 021, 025, 026, 028, 029, 033, 034, 035, 041, 043, 044, 045, 046 |
| Low | 7 | 003, 009, 010, 024, 027, 036, 037 |
| Info | 11 | 001, 005, 011, 012, 013, 022, 030, 031, 032, 038, 039 |

Total: 47 distinct findings (F-GAMES-B16-001 … F-GAMES-B16-047).

**Files reviewed: 20/20.** No source code modified. No acceptance/closeout claims made.
