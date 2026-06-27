# Line-by-Line Review — games-batch-17

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-17`
**Scope source:** `/tmp/opencode/games-batch-17` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (plan, report, spec, index, metadata) for five compliance-audit tracks under `apps/advantage-games/measure/tracks/`. No `.ts`/`.tsx` runtime, component, or test files are present in this batch. Source files were read-only inspected to validate the claims asserted by these documents.
**Finding ID scheme:** `F-GAMES-B17-###`
**Severity scale:** Critical / High / Medium / Low / Info
**Reviewed:** 2026-06-27

---

## Files Reviewed (20/20)

| # | File | Track / Game | Type |
|---|------|--------------|------|
| 1 | `potion-rush-compliance-audit_20260426/plan.md` | potion-rush | plan |
| 2 | `potion-rush-compliance-audit_20260426/report.md` | potion-rush | report |
| 3 | `potion-rush-compliance-audit_20260426/spec.md` | potion-rush | spec |
| 4 | `realm-carver-compliance-audit_20260426/index.md` | realm-carver | index |
| 5 | `realm-carver-compliance-audit_20260426/metadata.json` | realm-carver | metadata |
| 6 | `realm-carver-compliance-audit_20260426/plan.md` | realm-carver | plan |
| 7 | `realm-carver-compliance-audit_20260426/report.md` | realm-carver | report |
| 8 | `realm-carver-compliance-audit_20260426/spec.md` | realm-carver | spec |
| 9 | `rpg-battle-compliance-audit_20260426/index.md` | rpg-battle | index |
| 10 | `rpg-battle-compliance-audit_20260426/metadata.json` | rpg-battle | metadata |
| 11 | `rpg-battle-compliance-audit_20260426/plan.md` | rpg-battle | plan |
| 12 | `rpg-battle-compliance-audit_20260426/report.md` | rpg-battle | report |
| 13 | `rpg-battle-compliance-audit_20260426/spec.md` | rpg-battle | spec |
| 14 | `rune-forge-chamber-compliance-audit_20260426/index.md` | rune-forge-chamber | index |
| 15 | `rune-forge-chamber-compliance-audit_20260426/metadata.json` | rune-forge-chamber | metadata |
| 16 | `rune-forge-chamber-compliance-audit_20260426/plan.md` | rune-forge-chamber | plan |
| 17 | `rune-forge-chamber-compliance-audit_20260426/report.md` | rune-forge-chamber | report |
| 18 | `rune-forge-chamber-compliance-audit_20260426/spec.md` | rune-forge-chamber | spec |
| 19 | `rune-match-compliance-audit_20260426/index.md` | rune-match | index |
| 20 | `rune-match-compliance-audit_20260426/metadata.json` | rune-match | metadata |

All five tracks are self-described compliance audits of advantage-games titles against a shared 25-point platform spec (March–April 2026 standardization). Four games are `type: sentence` (potion-rush, realm-carver, rune-forge-chamber, rune-match) and one is `type: vocabulary` (rpg-battle). This batch is **documentation**; runtime quality is *asserted* by the reports. The rune-match track is represented here by only `index.md` + `metadata.json` (its plan/report/spec fall in an adjacent batch), so rune-match runtime quality cannot be assessed from this batch.

Findings below focus on (a) internal consistency of the documents, (b) verifiability of the reports' claims against the live repo, and (c) readiness/portability/accessibility signals these documents surface.

---

## Cross-Batch Verification Performed (read-only)

The following report claims were spot-checked against the live repo to confirm or refute. Results feed several findings:

| Claim | Result |
|-------|--------|
| Potion Rush `calculatePotionRushXP` exists, capped 1–10 | **Confirmed** — `src/store/usePotionRushStore.ts:649`, `return Math.min(10, baseXP + bonus)` at `:677` |
| Potion Rush main loop uses rAF w/ delta clamp 50ms | **Confirmed** — `PotionRushGame.tsx:168` `const clampedDelta = Math.min(delta, 50)` |
| Potion Rush TrashPortal still uses `useInterval` (known limitation) | **Confirmed** — `TrashPortal.tsx:3,9` |
| Potion Rush cover at `potion-rush-cover.png` | **Confirmed** — exists in `public/games/cover/` |
| Realm Carver canvas dims & asset dir | **Diverges** — report itself says 390×**600** (not 390×844); asset dir `public/games/sentence/realm-carver/` contains only `.gitkeep` (0-byte, no real assets) |
| Realm Carver cover `realm-carver-cover.png` (per spec) | **Diverges** — actual file is `cover-realm-carver.png` |
| RPG Battle is DOM-based (not React-Konva) | **Confirmed by report** — flagged FAIL/deviation |
| RPG Battle StartScreen text sizes bumped to text-xs/text-sm | **Confirmed** — `StartScreen.tsx` uses `text-xs`/`text-sm`; **still below 16px** per report's own recommendation |
| Rune Forge Chamber dims | **Diverges from spec** — config `GAME_WIDTH=390`, `GAME_HEIGHT=700` (not 844); report rated PASS anyway |
| Rune Forge Chamber uses `VocabularyItem[]` (not `SentenceItem`) | **Confirmed** — `RuneForgeChamberGame.tsx:14` imports `VocabularyItem`; report rated "Sentence Data" PASS |
| Rune Forge Chamber `calculateXP` capped at `maxXP` | **Confirmed** — `runeForgeChamber.ts:281` |
| Rune Forge Chamber cover `cover-rune-forge-chamber.png` | **Confirmed** — matches spec (this spec uniquely uses `cover-` prefix) |

---

## Findings

### Files 1–3 — Potion Rush track (plan / report / spec)

**F-GAMES-B17-001 · High · potion-rush/plan.md:1-99**
The plan file is **structurally corrupted/duplicated**: Phases 2–7 are written twice (lines 11–54 with detailed PASS/FAIL annotations, then lines 56–99 as a bare duplicate). This indicates a botched plan regeneration. A duplicated plan defeats Measure's audit trail (which checkpoint set is authoritative?) and should be flagged as a process-integrity defect for the whole track.

**F-GAMES-B17-002 · High · potion-rush/plan.md:9,17,25,33,41,48,54,62,70,78,86,93,99**
Every "Measure - User Manual Verification" checkpoint is marked `[x]` (complete) but carries **no commit hash or verifier evidence** (contrast realm-carver/rune-forge-chamber plans which cite `[70d4f01]`/`[0da114a]`). Self-marked manual-verification checkpoints with no traceable evidence cannot be relied upon as independent verification.

**F-GAMES-B17-003 · Medium · potion-rush/report.md:10,40,114-115**
The report claims the game is "fully compliant" (24/25) while spec #17 (Performance) is explicitly **MIXED**, not pass: `TrashPortal.tsx` still drives animation via `useInterval` rather than rAF (confirmed in source). This is a genuine, if minor, performance/architecture inconsistency that mildly contradicts the "fully compliant … ready for production" conclusion at line 119.

**F-GAMES-B17-004 · Medium · potion-rush/report.md:35,86 vs spec.md:35**
**Data-contract drift.** The spec (line 35) requires `SentenceItem[]` with `{ sentence, words }`. The report (lines 32, 76-79) states it created a *local* `SentenceItem` interface with `{ term, translation, id? }` — i.e., a vocabulary-style shape under a sentence-typed game. This local, per-game type duplication is a **portability/importability risk for Reading/Primary**: a shared importer expecting the platform's canonical `SentenceItem` (`{ sentence, words }`) would mismatch this game's `{ term, translation }`. Flagged as a cross-game type-fragmentation signal.

**F-GAMES-B17-005 · Low · potion-rush/report.md:100-110**
Function-level coverage is weak despite the 85.58% line headline: `PotionRushGame.tsx` functions **44.44%**, `PotionRushEffectsLayer.tsx` functions **16.66%**, `ConveyorBelt.tsx` functions **37.5%**. Line coverage masks large untested behavior surfaces (effects/particles, game-over paths). The 80% gate is met on lines only; behavioral confidence is lower than the headline implies.

**F-GAMES-B17-006 · Info · potion-rush/spec.md:43-44**
Camera/off-screen-indicator specs are inherited boilerplate and marked N/A. Consistent with a fixed-viewport conveyor game; no concern, noted for completeness.

---

### Files 4–8 — Realm Carver track (index / metadata / plan / report / spec)

**F-GAMES-B17-007 · High · realm-carver/metadata.json:4**
`"status": "new"` while `plan.md` shows all phases `[x]` complete and `report.md` declares "25/25 passing." **Status desync** — metadata never advanced to `completed`/`in-progress` despite the plan claiming Phase 7 ("Update track metadata.json status to completed") was done (plan.md:52). The closeout step it claims to have performed did not actually occur. Same defect recurs across all four full tracks in this batch (see F-GAMES-B17-014).

**F-GAMES-B17-008 · Medium · realm-carver/report.md:74 vs spec.md:24**
**Viewport divergence not flagged.** Spec #2 requires a **390×844** reference viewport; the report (line 74) states the game uses a **390×600** canvas over a 100×100 logical grid, yet rated spec #2 "PASS" (line 46). The shorter canvas may be intentional, but rating it PASS without noting the 844→600 deviation is an internal-consistency gap and a mobile-layout signal (letterboxing / unused vertical space on tall phones).

**F-GAMES-B17-009 · High · realm-carver/report.md:33,67 vs live repo**
**Asset-existence claim is misleading.** Fix #11 (line 33) says it "Created `/public/games/sentence/realm-carver/`" and spec #23 "Asset Location" is rated PASS (line 67). The directory exists but contains **only a 0-byte `.gitkeep`** — there are no actual game assets. Creating an empty placeholder dir and rating "Asset Location PASS" overstates readiness; if the game renders purely with Konva primitives this is acceptable but should be stated, not papered over as PASS.

**F-GAMES-B17-010 · Medium · realm-carver/report.md:68 vs spec.md:56**
**Cover-image naming drift.** Spec requests `/public/games/cover/realm-carver-cover.png`; the actual file (verified) is `cover-realm-carver.png`. Report rates spec #24 PASS without noting the inverted naming convention. Inconsistent cover-naming across games (`<id>-cover.png` vs `cover-<id>.png`) is a registry/import hazard for host apps that resolve covers by convention.

**F-GAMES-B17-011 · Low · realm-carver/report.md:39,55**
Component coverage **82.85%** is only marginally above the 80% gate, and the report does not break out function/branch coverage for the component (unlike potion-rush). The 100% logic coverage carries the 91% overall headline; component behavioral coverage is thin.

**F-GAMES-B17-012 · Info · realm-carver/spec.md:35**
This spec's "Sentence Data" requirement is stated as `{ term, translation }` (line 35) — different from potion-rush's `{ sentence, words }` (potion-rush/spec.md:35). The "shared 25-point spec" is **not actually uniform across games** on the data-shape line item. This inconsistency in the supposedly-shared spec template is the root cause behind F-GAMES-B17-004 and undermines the "standardized" framing.

---

### Files 9–13 — RPG Battle track (index / metadata / plan / report / spec)

**F-GAMES-B17-013 · Medium · rpg-battle/report.md:14,29,32,95**
Headline "19/25 passing, 3 failing, 3 N/A" — but two **FAIL** items (React-Konva #1, Game Loop rAF #4) are core architecture specs marked as "deviation accepted" by the auditor itself, not by an independent reviewer. A turn-based DOM RPG legitimately differs from the canvas spec, but self-accepted deviations on two of five architecture specs mean this game is **architecturally non-conformant with the shared runtime**. For Reading/Primary import this matters: a host expecting the React-Konva `<Stage>` mount contract and rAF lifecycle gets a DOM/`setTimeout` component instead — an importability risk that should be surfaced, not normalized.

**F-GAMES-B17-014 · High · rpg-battle/metadata.json:4 (and realm-carver, rune-forge-chamber)**
`"status": "new"` despite plan.md:60 claiming metadata was set to completed and report.md being finalized + committed (`[e5c0096]`, plan.md:61). Confirms a **systemic closeout failure**: across this batch, every full track's `metadata.json` still reads `"status": "new"` (realm-carver, rpg-battle, rune-forge-chamber; rune-match metadata also `"new"` but its plan is out-of-batch). The plans assert a metadata update that was never persisted. Tracks cannot be considered closed.

**F-GAMES-B17-015 · Medium · rpg-battle/report.md:17,103**
`page.tsx` coverage is **70.35%**, below the 80% per-file target; the report concedes this (line 103) and only the *overall* 83.52% clears the gate. Uncovered code is the high-risk path: `handleSubmit`, `triggerEnemyTurn`, victory/defeat effects (i.e., scoring/progress submission and battle resolution). Scoring/XP-completion paths being undertested is a direct hit on the "scoring/XP/progress" focus area.

**F-GAMES-B17-016 · Medium · rpg-battle/report.md:40,104**
**Accessibility text-size not actually compliant.** Spec #7 requires ≥16px; the fix bumped text to `text-xs`/`text-sm` (14px max) and the report's own recommendation (line 104) admits "some text remains below 16px" and suggests using `getEffectiveTextSize`. The item is marked **FIXED/PASS** (line 40) but by the report's own admission it does **not** meet the 16px threshold. This is an overstated PASS on an accessibility/age-appropriate-UX requirement for young readers.

**F-GAMES-B17-017 · Low · rpg-battle/report.md:31,57,97**
Spec #14 "Shared Screens" is **PARTIAL**: `GameEndScreen` adopted but `StartScreen` remains custom (rankings + enemy select). Acceptable per documented rationale, but it means leaderboard/start UX is not the shared component — a divergence worth tracking if shared-screen consistency is a platform goal.

**F-GAMES-B17-018 · Low · rpg-battle/report.md:56**
Spec #13 "Difficulty Tiers" rated **N/A** because the game uses enemy multipliers (1×–2.5×) instead of easy/medium/hard. Functionally reasonable, but rating a required difficulty-standardization spec "N/A" rather than FAIL hides a real difficulty-model divergence from the platform standard.

---

### Files 14–18 — Rune Forge Chamber track (index / metadata / plan / report / spec)

**F-GAMES-B17-019 · Medium · rune-forge-chamber/report.md:38 vs spec.md:35**
**Data-shape mismatch rated PASS.** Spec #9 requires `SentenceItem[]` with `{ sentence, words }`; the report (line 38) rates it PASS while admitting it actually uses `VocabularyItem[]` ("platform standard for sentence games"). Confirmed in source (`RuneForgeChamberGame.tsx:14,29` import/use `VocabularyItem`). A `sentence`-typed game backed by a vocabulary data shape is the same type-fragmentation pattern as potion-rush (F-GAMES-B17-004); the parenthetical justification contradicts the spec's stated contract.

**F-GAMES-B17-020 · Medium · rune-forge-chamber/report.md:23 vs spec.md:24**
**Viewport divergence rated PASS.** Spec #2 requires 390×844; report rates PASS but states `GAME_HEIGHT=700` (confirmed in `runeForgeChamberConfig.ts:15`). As with realm-carver, the height deviation (844→700) is unflagged. Two of four sentence games in this batch silently use a shorter-than-spec canvas, suggesting the 390×844 reference is aspirational rather than enforced.

**F-GAMES-B17-021 · Low · rune-forge-chamber/report.md:50,86**
Component branch/function coverage is thin: `RuneForgeChamberGame.tsx` branches **67.27%**, functions **50%**, despite 90.72% lines and a 93.75% overall headline. Performance claim "no setState inside rAF loop (uses refs)" (line 50) is plausible but not independently verified in this doc-only batch.

**F-GAMES-B17-022 · Info · rune-forge-chamber/report.md:48-49**
Camera (#15) and off-screen indicators (#16) marked **"PASS"** with body text "N/A". Cosmetic inconsistency (PASS-labelled N/A items) repeated across reports; harmless but muddies the pass-count arithmetic.

**F-GAMES-B17-023 · Info · rune-forge-chamber/report.md:31,71-72**
The only substantive fix was swapping `<span>` for `<label htmlFor>` on difficulty/rune selects — a genuine, if small, accessibility improvement. Report's "already well-architected, 25/25" framing is plausible for this title but, like the others, rests on self-rated PASS items that include the data-shape and viewport divergences above.

---

### Files 19–20 — Rune Match track (index / metadata only)

**F-GAMES-B17-024 · Medium · rune-match/metadata.json:4**
`"status": "new"` with `actual_tasks: null` and empty `deviation_notes`. Only `index.md` + `metadata.json` are in this batch; **no plan/report/spec for rune-match is present here**, so the audit's outcome for rune-match is unverifiable from this batch. Metadata gives no signal that any work occurred. (rune-match plan/report likely live in an adjacent batch — see Limitations.)

**F-GAMES-B17-025 · Info · rune-match/index.md:1-5 ; all four index.md files**
All `index.md` files are identical 5-line link stubs and all `metadata.json` files share the same `created_at`/`updated_at` timestamp (`2026-04-26T07:30:00Z`) with `actual_tasks: null` and empty `deviation_notes` — i.e., the timestamps were never updated through the lifecycle and task-count reconciliation (estimated 8 vs actual) was never recorded for any track. Consistent with the systemic closeout failure (F-GAMES-B17-014).

---

## Cross-Cutting Observations (readiness signals)

1. **Systemic closeout failure (High):** All metadata files remain `"status": "new"` though plans/reports claim completion and commits. Plans assert a metadata-update step that was never persisted (F-GAMES-B17-007, -014, -024, -025).
2. **The "shared 25-point spec" is not uniform (Medium):** the Sentence-Data line item differs between game specs (`{ sentence, words }` vs `{ term, translation }`), and multiple sentence games actually ship `VocabularyItem[]`. This data-shape fragmentation is the single biggest **importability risk into Reading/Primary** in this batch (F-GAMES-B17-004, -012, -019).
3. **Viewport spec under-enforced (Medium):** realm-carver (390×600) and rune-forge-chamber (390×700) both diverge from the 390×844 reference yet are rated PASS, with no mobile-letterboxing discussion (F-GAMES-B17-008, -020).
4. **Self-rated PASS inflation (Medium):** accessibility (RPG Battle <16px text), performance (Potion Rush useInterval), and asset existence (Realm Carver empty dir) are rated PASS/FIXED while the report bodies admit non-conformance (F-GAMES-B17-003, -009, -016).
5. **Cover-naming inconsistency (Low):** `<id>-cover.png` vs `cover-<id>.png` coexist across games; a convention-based importer will break (F-GAMES-B17-010).
6. **Test confidence overstated by line-coverage headlines (Low):** function/branch coverage is materially weaker than line coverage in potion-rush, realm-carver, and rune-forge-chamber components; scoring/completion paths are the least-covered in RPG Battle (F-GAMES-B17-005, -011, -015, -021).

---

## Limitations

- **Documentation-only batch.** All 20 files are Measure track docs; no runtime/test source files were in scope. Claims about game behavior are the reports' own assertions. I performed targeted read-only spot-checks against the live repo (dims, XP caps, useInterval, covers, asset dirs, data types) to validate/refute specific claims, but did **not** run the test suites, lint, builds, or coverage tools, so reported coverage/lint/test-pass numbers are **unverified**.
- **Rune Match is partially represented:** only `index.md` and `metadata.json` are in this batch. Its plan, report, and spec were not provided here, so rune-match runtime quality and audit outcome are out of scope for this review.
- **Performance/FPS, mobile-device, and cross-browser behavior** cannot be measured from documents; findings on those topics are limited to what the reports assert and to static config (viewport dims, rAF presence).
- **Commit hashes** cited in plans/reports (`70d4f01`, `0da114a`, `e5c0096`) were not validated against git history in this review.
- This review makes **no acceptance or closeout determination** for any track or for batch `games-batch-17`; it records line-anchored findings only.

---

## Finding Index

| ID | Severity | File(s) |
|----|----------|---------|
| F-GAMES-B17-001 | High | potion-rush/plan.md |
| F-GAMES-B17-002 | High | potion-rush/plan.md |
| F-GAMES-B17-003 | Medium | potion-rush/report.md |
| F-GAMES-B17-004 | Medium | potion-rush/report.md, spec.md |
| F-GAMES-B17-005 | Low | potion-rush/report.md |
| F-GAMES-B17-006 | Info | potion-rush/spec.md |
| F-GAMES-B17-007 | High | realm-carver/metadata.json, plan.md |
| F-GAMES-B17-008 | Medium | realm-carver/report.md, spec.md |
| F-GAMES-B17-009 | High | realm-carver/report.md |
| F-GAMES-B17-010 | Medium | realm-carver/report.md, spec.md |
| F-GAMES-B17-011 | Low | realm-carver/report.md |
| F-GAMES-B17-012 | Info | realm-carver/spec.md |
| F-GAMES-B17-013 | Medium | rpg-battle/report.md |
| F-GAMES-B17-014 | High | rpg-battle/metadata.json (+ realm-carver, rune-forge-chamber) |
| F-GAMES-B17-015 | Medium | rpg-battle/report.md |
| F-GAMES-B17-016 | Medium | rpg-battle/report.md |
| F-GAMES-B17-017 | Low | rpg-battle/report.md |
| F-GAMES-B17-018 | Low | rpg-battle/report.md |
| F-GAMES-B17-019 | Medium | rune-forge-chamber/report.md, spec.md |
| F-GAMES-B17-020 | Medium | rune-forge-chamber/report.md, spec.md |
| F-GAMES-B17-021 | Low | rune-forge-chamber/report.md |
| F-GAMES-B17-022 | Info | rune-forge-chamber/report.md |
| F-GAMES-B17-023 | Info | rune-forge-chamber/report.md |
| F-GAMES-B17-024 | Medium | rune-match/metadata.json |
| F-GAMES-B17-025 | Info | rune-match/index.md, all index/metadata files |

**Severity totals:** Critical 0 · High 4 · Medium 9 · Low 5 · Info 5 (25 findings across 20 files)
