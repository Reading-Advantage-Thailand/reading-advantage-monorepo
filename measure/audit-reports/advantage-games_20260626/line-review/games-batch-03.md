# Line-by-Line Review Report: games-batch-03

> **Track:** `advantage_games_review_20260626`
> **Batch:** `games-batch-03`
> **Reviewed:** 2026-06-27
> **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> **Files inspected:** 20
> **Reviewer focus:** game readiness, shared runtime, scoring/XP/leaderboards/progress/difficulty, importability into Reading/Primary, asset/audio/performance/mobile/browser compatibility, accessibility, age-appropriate UX, test quality.

---

## Coverage

All 20 files in this batch are **Measure track documentation/metadata artifacts** under `apps/advantage-games/measure/archive/`. They are not executable source. Findings therefore concern spec/plan accuracy, archive hygiene, doc↔code drift, and the readiness/portability claims the documents make. Where a document references real source, the source was cross-read to verify the claim (see Cross-Reference Verification).

| # | File | Lines | Status |
|---|------|-------|--------|
| 1 | `castle_defense_sprites_20260118/spec.md` | 61 | Reviewed |
| 2 | `content_rotation_pack_mgmt_20260407/index.md` | 6 | Reviewed |
| 3 | `content_rotation_pack_mgmt_20260407/metadata.json` | 11 | Reviewed |
| 4 | `content_rotation_pack_mgmt_20260407/plan.md` | 23 | Reviewed |
| 5 | `content_rotation_pack_mgmt_20260407/spec.md` | 94 | Reviewed |
| 6 | `devourer-slime-20260328/devourer-slime/metadata.json` | 11 | Reviewed |
| 7 | `devourer-slime-20260328/devourer-slime/plan.md` | 44 | Reviewed |
| 8 | `devourer-slime-20260328/metadata.json` | 11 | Reviewed |
| 9 | `devourer-slime-20260328/plan.md` | 44 | Reviewed |
| 10 | `devourer-slime-20260328/spec.md` | 52 | Reviewed |
| 11 | `difficulty_curve_tuning_20260407/difficulty_model.md` | 171 | Reviewed |
| 12 | `difficulty_curve_tuning_20260407/index.md` | 5 | Reviewed |
| 13 | `difficulty_curve_tuning_20260407/metadata.json` | 11 | Reviewed |
| 14 | `difficulty_curve_tuning_20260407/plan.md` | 24 | Reviewed |
| 15 | `difficulty_curve_tuning_20260407/spec.md` | 30 | Reviewed |
| 16 | `difficulty_curve_tuning_20260407/tuning_playbook.md` | 156 | Reviewed |
| 17 | `difficulty_guardrail_fix_20260413/metadata.json` | 12 | Reviewed |
| 18 | `difficulty_guardrail_fix_20260413/plan.md` | 19 | Reviewed |
| 19 | `difficulty_guardrail_fix_20260413/spec.md` | 18 | Reviewed |
| 20 | `dragon-flight/metadata.json` | 8 | Reviewed |

**Total lines reviewed:** ~811 (all under `apps/advantage-games/measure/archive/`)

---

## Cross-Reference Verification (read-only)

To validate the documents' readiness/difficulty claims, the following live source was inspected (not edited):

- `src/lib/games/difficulty.ts` — `DIFFICULTY_TIERS.extreme.wordCount = { min: 9, max: 10 }` (line 45); `DIFFICULTY_GUARDRAILS.maxWordCount = 10` (line 70); `validateDifficultyConfig` is exported from this file (line 73). Confirms `difficulty_guardrail_fix` was applied correctly.
- `src/store/useGameStore.ts` line 9 — `export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme'` matches `difficulty_model.md`.
- `src/lib/games/contentPackSchema.ts` / `packRotation.ts` (+ their `.test.ts`) — exist, implementing the content-pack workflow described in `content_rotation_pack_mgmt`.
- `src/lib/games/devourerSlime.ts` + `devourerSlime.test.ts` exist; route `src/app/[locale]/(student)/student/games/sentence/devourer-slime/page.tsx` exists; `gameCards.ts` registers `devourer-slime` (lines 206–210).
- `public/games/castle-defense/` contains `player_3x3_pose_sheet.png`, `goblin_…`, `orc_…`, `troll_…`, and an additional `zombie_3x3_pose_sheet.png` — confirms castle-defense sprite assets are present.

---

## Findings

### F-GAMES-B03-001 (High) — Archived `difficulty_curve_tuning` track still marked `in_progress` with unchecked acceptance

**File:** `difficulty_curve_tuning_20260407/metadata.json` line 4; `plan.md` lines 11, 23; `spec.md` lines 22–25
**Observation:** The track lives under `measure/archive/` (signaling completion), yet `metadata.json` reports `"status": "in_progress"` with `"actual_tasks": 5` vs `"estimated_tasks": 7` and an empty `deviation_notes`. The plan leaves both "User Manual Verification" tasks unchecked (`- [ ]` at line 11 and line 23), and **every** acceptance criterion in `spec.md` (lines 22–25) is unchecked. An archived track that is simultaneously `in_progress`, missing 2 of 7 tasks, and has zero satisfied acceptance criteria is an audit/readiness contradiction.
**Risk:** Medium–High for review integrity: a reader cannot tell whether the shared difficulty model was actually validated. The companion `difficulty_guardrail_fix` track (files 17–19) implies the model *did* ship and needed a follow-up bug fix, so the real state is likely "done but never closed out."
**Recommendation:** Reconcile metadata to the true state (set `status` to `completed` if archived, fill `deviation_notes` explaining the 5/7 task count, and either check or explicitly mark the two manual-verification and four acceptance items). Do not treat as closed until reconciled.

---

### F-GAMES-B03-002 (High) — `tuning_playbook.md` documents a non-existent import path for `validateDifficultyConfig`

**File:** `difficulty_curve_tuning_20260407/tuning_playbook.md` lines 59–60
**Observation:** The playbook instructs new-game authors to:
```typescript
import { validateDifficultyConfig } from '@/lib/games/difficulty.test'
```
Verified against source: `validateDifficultyConfig` is exported from `@/lib/games/difficulty` (`difficulty.ts` line 73), **not** from `difficulty.test`. There is no exported symbol from `difficulty.test.ts` (grep for `export` returned nothing). Following this guidance produces a module-resolution/compile error, and importing application code from a `*.test` file would also be an anti-pattern even if it existed.
**Risk:** Medium: this is a "playbook for future game tracks" — every new game built from it inherits a broken import and a bad convention (test files as runtime dependencies).
**Recommendation:** Change the documented import to `from '@/lib/games/difficulty'` and ensure no production import targets a `*.test` module.

---

### F-GAMES-B03-003 (High) — Duplicated/nested `devourer-slime/devourer-slime/` archive directory

**Files:** `devourer-slime-20260328/devourer-slime/metadata.json` (file 6), `devourer-slime-20260328/devourer-slime/plan.md` (file 7) vs `devourer-slime-20260328/metadata.json` (file 8), `devourer-slime-20260328/plan.md` (file 9)
**Observation:** The archive contains a redundant nested folder: `devourer-slime-20260328/devourer-slime/` holding a second copy of `metadata.json` and `plan.md`. File 6 and file 8 are byte-identical; file 7 (nested plan) is the *clean* version, while file 9 (outer plan) is corrupted (see F-GAMES-B03-004). This looks like an archive-move accident that duplicated the track directory one level deep.
**Risk:** Low functionally (docs only) but Medium for tooling: Measure automation, `tracks.md` indexing, or any script that globs `archive/*/metadata.json` may double-count this track or pick the corrupted copy.
**Recommendation:** Collapse to a single canonical track directory; delete the nested `devourer-slime/` duplicate after confirming the kept `plan.md` is the clean version.

---

### F-GAMES-B03-004 (Medium) — Corrupted heading in outer `devourer-slime/plan.md`

**File:** `devourer-slime-20260328/plan.md` line 5
**Observation:** Line 5 reads:
`## Phase 1: Foundation ## Phase 1: Foundation & Scaffolding [x] Scaffolding [x] [checkpoint: d8d158a]`
The Phase 1 heading text is interleaved/duplicated — clearly a botched edit or merge. The nested copy (file 7) has the correct `## Phase 1: Foundation & Scaffolding [x]`.
**Risk:** Low (cosmetic/parse). Any Markdown TOC or phase-extraction tool will mis-render this heading.
**Recommendation:** Restore the heading to the clean form from file 7. Confirm which copy is canonical first (ties into F-GAMES-B03-003).

---

### F-GAMES-B03-005 (Medium) — `dragon-flight` metadata `in_progress` while archived; vague scope description

**File:** `dragon-flight/metadata.json` lines 4, 7
**Observation:** `"status": "in_progress"` despite the track residing in `archive/`. The `description` ("Housekeeping tasks plus delivery of the Dragon Flight (Gate Runner) mini game.") bundles unrelated "housekeeping" with a game delivery, and there is no `track_id` date suffix in the directory name (`dragon-flight` vs the dated convention used by sibling tracks). No `estimated_tasks`/`actual_tasks` fields are present (unlike files 3/13).
**Risk:** Medium for status integrity — same class as F-GAMES-B03-001. Mixed-scope tracks make it hard to attribute what shipped.
**Recommendation:** Set `status` to the true terminal value, split or clarify the housekeeping vs game-delivery scope, and align the directory naming with the dated convention if archive consistency is desired.

---

### F-GAMES-B03-006 (Medium) — `difficulty_model.md` status says "Draft – Pending implementation" but model is implemented in code

**File:** `difficulty_curve_tuning_20260407/difficulty_model.md` lines 167–171
**Observation:** Section 8 declares `Status: Draft - Pending implementation` (line 171). However, the model is implemented: `difficulty.ts` defines the tiers, `DIFFICULTY_GUARDRAILS`, `FALLBACK_DIFFICULTY_CONFIG`, and `validateDifficultyConfig`, and a follow-up bug-fix track (`difficulty_guardrail_fix`) already corrected a tier value. The doc therefore understates readiness and contradicts its own plan (file 14, lines 15–22 mark integration tasks `[x]`).
**Risk:** Medium: doc↔code drift. A future contributor reading "pending implementation" may re-implement an existing system or distrust the guardrails.
**Recommendation:** Update the status to reflect "Implemented" with the implementing files referenced, or remove the stale status line.

---

### F-GAMES-B03-007 (Medium) — Difficulty model + playbook are app-local; importability into Reading/Primary not addressed

**Files:** `difficulty_model.md` lines 11–14, 68–75, 154–162; `tuning_playbook.md` lines 13–16
**Observation:** The shared difficulty framework is documented entirely in terms of `apps/advantage-games` paths (`@/store/useGameStore`, `@/lib/games/difficulty`). The audit scope explicitly includes "importability into Reading/Primary," but neither doc describes how the `Difficulty` type, `DIFFICULTY_TIERS`, or guardrails are consumed by the Reading/Primary apps. Per repo `AGENTS.md`, cross-app shared logic should live in a `packages/*` package; an app-local `@/` alias is not importable by another app without duplication.
**Risk:** Medium for portability: if Reading/Primary embed these games, they cannot reuse this "shared framework" as written — they would copy it, defeating the "unified" goal and risking the tiers drifting per app.
**Recommendation:** Document (and ideally extract) the difficulty model into a shared package, or note in the model that it is currently advantage-games-only with a portability follow-up. Flag for the importability work item.

---

### F-GAMES-B03-008 (Medium) — Castle Defense acceptance criteria unchecked in an archived (completed) track; non-deterministic acceptance step

**File:** `castle_defense_sprites_20260118/spec.md` lines 36, 49–57
**Observation:** Two issues. (a) All six acceptance criteria (lines 50–57) remain unchecked `- [ ]` even though the track is archived and the four required `_3x3_pose_sheet.png` assets are confirmed present in `public/games/castle-defense/`. (b) The functional requirement at line 36 specifies confirming the player sheet layout "via trial implementation" / "Inspect the player asset visually" — a non-deterministic, manual, human-eyeball step embedded as a requirement, which conflicts with the deterministic/test-reproducible standard the difficulty track espouses.
**Risk:** Low–Medium: readiness of the sprite animation (no flicker / correct death-frame hold, line 57) is asserted only by an unchecked manual criterion; there is no automated regression for sprite state→row mapping.
**Recommendation:** Reconcile the checkboxes to actual state, and convert the "visually inspect" step into a documented config (Player vs Enemy row mapping) with a unit test over the sprite-row state machine.

---

### F-GAMES-B03-009 (Medium) — Content-pack schema documented as TS interfaces with hand-rolled validation, not Zod boundary validation

**File:** `content_rotation_pack_mgmt_20260407/spec.md` lines 28–54, 80–88
**Observation:** The pack metadata "schema" is expressed as TypeScript `interface`s plus a table of string error codes (e.g., `MISSING_PACK_ID`, `INSUFFICIENT_ITEMS`). Cross-reading source, `contentPackSchema.ts` validates with manual `if`/`push(error)` checks (no Zod). Repo `AGENTS.md` mandates Zod for "External API payloads" and content entering the system at boundaries; rotated content packs are exactly such an external boundary. The doc neither references a Zod schema nor a single source of truth for the type.
**Risk:** Medium: hand-rolled validation tends to drift from the declared interface (e.g., the `UNKNOWN_FIELD` rule at line 88 must be manually kept in sync with the interface fields). Importing packs into Reading/Primary would re-implement this validation per app.
**Recommendation:** Note this as a contract-validation gap; recommend a shared Zod schema (inferring the TS type) so pack validation is reusable and self-syncing. Source change is out of this batch's scope.

---

### F-GAMES-B03-010 (Low) — Content-pack v1→v2 auto-conversion lacks documented audit/log trail

**File:** `content_rotation_pack_mgmt_20260407/spec.md` lines 63–78; `metadata.json` line 10
**Observation:** Legacy v1 packs are "auto-converted to v2 format on validation" (line 71) and emit a migration warning (lines 75–76). The non-functional requirement (`spec.md` line 16) demands the rotation workflow be "deterministic and auditable," and `metadata.json` claims a published runbook. The spec does not state where the conversion warning is surfaced (operator log? CI? runtime console?) nor whether conversions are recorded for audit.
**Risk:** Low: silent auto-conversion can mask malformed legacy content in production rotations with no durable record.
**Recommendation:** Document the warning sink and whether conversions are audit-logged, per the "auditable" NFR.

---

### F-GAMES-B03-011 (Low) — Difficulty guardrails: `enemySpeed`/`scrollSpeed` caps documented but not in the validated config surface

**File:** `difficulty_model.md` lines 139–143; `tuning_playbook.md` lines 109–113
**Observation:** The guardrails section lists mobile-performance caps (`enemySpeed ≤ 300`, `scrollSpeed ≤ 200`, `wordCount ≤ 10`, `spawnInterval ≥ 500`, `timer ≥ 5000`). Source `validateDifficultyConfig` (`difficulty.ts`) enforces a subset (e.g., `maxWordCount`, and per spec the `spawnInterval`/`speed` checks the playbook example at lines 62–70 relies on). The documents present all caps as if uniformly enforced, but only some are machine-checked; speed caps appear advisory. Note also `difficulty_model.md` line 141 caps `scrollSpeed ≤ 200` while line 91/116 inventory shows games using `scrollSpeed` ranges — consistency between the cap and per-game inventory is asserted but untested.
**Risk:** Low: a new game could set `enemySpeed: 280` (within doc cap) or `350` (over cap) and the validator may not reject it, undermining the "no mobile playability regression" NFR (`spec.md` line 17).
**Recommendation:** Either extend `validateDifficultyConfig` coverage to all documented caps or mark in the doc which caps are advisory vs enforced.

---

### F-GAMES-B03-012 (Low) — Devourer Slime accessibility/audio claims unverifiable from spec; touch-only controls for a sequence task

**File:** `devourer-slime-20260328/spec.md` lines 38–39, 49–52; `plan.md` lines 36, 38
**Observation:** The spec states "immediate visual feedback through growth/shrink" and color change (slime "turns red/flashes," lines 22, 39) as the *primary* correctness signal, and the plan claims "audio/visual" feedback (line 36) and shared `GameStartScreen`/`GameEnd Screen` integration (line 38). Color-only correctness feedback is a WCAG 1.4.1 (use-of-color) concern for color-vision-deficient students, and the spec offers no non-color/redundant cue. Controls are "DPad / Arrow Keys / Virtual Joystick" (line 51) with no mention of keyboard-only focus order, screen-reader labeling of the current target word, or reduced-motion handling for the "scaling animations / ripples" (line 47).
**Risk:** Low–Medium for accessibility/age-appropriateness: an order-sensitive sentence task that signals "wrong" mainly via red flash may disadvantage some learners.
**Recommendation:** Add a redundant non-color correctness cue and document keyboard/reduced-motion support; verify against the `accessibility_input_assist` track patterns referenced elsewhere in this app.

---

### F-GAMES-B03-013 (Low) — `difficulty_guardrail_fix/spec.md` terminal status reads "SPEC" though track is completed

**File:** `difficulty_guardrail_fix_20260413/spec.md` line 18; `metadata.json` line 7
**Observation:** `metadata.json` correctly reports `"status": "completed"` and `plan.md` shows all phases `[x]` with concrete evidence ("difficulty tests: 13/13", "extreme max from 12 to 10"). But the spec footer still says `## Status: SPEC` (line 18), a stale lifecycle marker. This is the cleanest, best-evidenced track in the batch — the only defect is the unreconciled spec footer.
**Risk:** Very low (cosmetic).
**Recommendation:** Update the spec status footer to `COMPLETED` for consistency.

---

### F-GAMES-B03-014 (Low) — Castle Defense out-of-scope stat scaling leaves enemy variety as visual-only, weakening difficulty integration

**File:** `castle_defense_sprites_20260118/spec.md` lines 39–40, 59–61
**Observation:** Enemy stat differentiation (HP/Speed per Goblin/Orc/Troll) is marked "(Optional)" (line 40) and explicitly out of scope beyond "basic stat differences" (line 61). Combined with the unified difficulty model (files 11/16), this means three visually distinct enemies may share identical mechanics, so the visual upgrade does not feed the difficulty curve. An extra `zombie_3x3_pose_sheet.png` asset exists in `public/` not referenced by this spec (asset inventory drift).
**Risk:** Low: visual variety without mechanical variety is acceptable for a sprite track but should be flagged so difficulty tuning doesn't assume per-type stats exist.
**Recommendation:** Note the visual-only nature in the difficulty inventory; account for or remove the unreferenced `zombie` sheet to keep the asset manifest accurate.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| High | 3 | F-GAMES-B03-001, F-GAMES-B03-002, F-GAMES-B03-003 |
| Medium | 6 | F-GAMES-B03-004, F-GAMES-B03-005, F-GAMES-B03-006, F-GAMES-B03-007, F-GAMES-B03-008, F-GAMES-B03-009 |
| Low | 5 | F-GAMES-B03-010, F-GAMES-B03-011, F-GAMES-B03-012, F-GAMES-B03-013, F-GAMES-B03-014 |

**Key themes:**
1. **Status/lifecycle drift in the archive:** Three tracks (`difficulty_curve_tuning`, `dragon-flight`, plus the `difficulty_guardrail_fix` spec footer) carry stale `in_progress`/`SPEC`/"Draft" markers despite being archived, with unchecked acceptance criteria (F-GAMES-B03-001, -005, -006, -013). Auditors cannot trust archived = done from metadata alone.
2. **Archive corruption/duplication:** A nested duplicate `devourer-slime/devourer-slime/` directory and a corrupted Phase-1 heading indicate a botched archive move (F-GAMES-B03-003, -004).
3. **Doc guidance that would break new games:** The tuning playbook's `validateDifficultyConfig` import points at a `*.test` module (F-GAMES-B03-002); the difficulty framework is documented only with app-local `@/` aliases, blocking Reading/Primary reuse (F-GAMES-B03-007).
4. **Contract/validation gaps vs repo standards:** Content-pack validation is hand-rolled rather than Zod-backed at an external boundary (F-GAMES-B03-009); only a subset of documented difficulty guardrails are machine-enforced (F-GAMES-B03-011).
5. **Accessibility & deterministic-acceptance gaps:** Color-only correctness feedback and undocumented keyboard/reduced-motion support (F-GAMES-B03-012); a "visually inspect the sprite" manual acceptance step with no automated regression (F-GAMES-B03-008).

The single strongest artifact is `difficulty_guardrail_fix` — well-scoped, evidence-backed, and verified against source (`difficulty.ts` extreme `wordCount.max` is indeed 10).

---

## Limitations

- **Documentation-only batch.** All 20 files are Measure spec/plan/metadata/index artifacts, not executable code. No game runtime, component, scoring/XP, leaderboard, or test file is contained in this batch; findings about game readiness are inferred from spec claims and corroborated by targeted, read-only cross-reads of referenced source.
- **No source code was edited** (per task constraint and repo review policy).
- Cross-reference reads (`difficulty.ts`, `useGameStore.ts`, `contentPackSchema.ts`, `devourerSlime.*`, `gameCards.ts`, `public/games/castle-defense/`) were spot checks to validate document claims; a full review of those implementation files belongs to their own batches and was not performed here.
- Runtime behaviors (actual mobile performance, audio playback, frame timing, browser compatibility, real XP/leaderboard wiring) could not be exercised from documentation and were assessed only against the documents' assertions.
- Accessibility findings are derived from spec descriptions, not from auditing rendered DOM/ARIA or running an a11y tool.
- This report makes **no acceptance or closeout claims** for the track; it is a line-review artifact only.

---

MEASURE_AGENT_RESULT
```json
{
  "track_id": "advantage_games_review_20260626",
  "role": "line-review",
  "batch_id": "games-batch-03",
  "files_reviewed": 20,
  "lines_reviewed": 811,
  "findings": {
    "total": 14,
    "high": 3,
    "medium": 6,
    "low": 5
  },
  "blocking_issues": [],
  "result_path": "measure/audit-reports/advantage-games_20260626/line-review/games-batch-03.md",
  "status": "complete"
}
```
