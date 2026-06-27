# Line-by-Line Review — games-batch-14

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-14`
**Scope source:** `/tmp/opencode/games-batch-14` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (index, metadata, plan, report, spec) for four compliance-audit tracks under `apps/advantage-games/measure/tracks/`. No `.ts`/`.tsx` runtime, component, or test source files are present in this batch; the games themselves (Dragon Flight, Dragon Rider, Dungeon Liberator, Enchanted Library) were **not** read and are out of scope for direct code findings.
**Finding ID scheme:** `F-GAMES-B14-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `dragon-flight-compliance-audit_20260426/index.md` | dragon-flight | index |
| 2 | `dragon-flight-compliance-audit_20260426/metadata.json` | dragon-flight | metadata |
| 3 | `dragon-flight-compliance-audit_20260426/plan.md` | dragon-flight | plan |
| 4 | `dragon-flight-compliance-audit_20260426/report.md` | dragon-flight | report |
| 5 | `dragon-flight-compliance-audit_20260426/spec.md` | dragon-flight | spec |
| 6 | `dragon-rider-compliance-audit_20260426/index.md` | dragon-rider | index |
| 7 | `dragon-rider-compliance-audit_20260426/metadata.json` | dragon-rider | metadata |
| 8 | `dragon-rider-compliance-audit_20260426/plan.md` | dragon-rider | plan |
| 9 | `dragon-rider-compliance-audit_20260426/report.md` | dragon-rider | report |
| 10 | `dragon-rider-compliance-audit_20260426/spec.md` | dragon-rider | spec |
| 11 | `dungeon-liberator-compliance-audit_20260426/index.md` | dungeon-liberator | index |
| 12 | `dungeon-liberator-compliance-audit_20260426/metadata.json` | dungeon-liberator | metadata |
| 13 | `dungeon-liberator-compliance-audit_20260426/plan.md` | dungeon-liberator | plan |
| 14 | `dungeon-liberator-compliance-audit_20260426/report.md` | dungeon-liberator | report |
| 15 | `dungeon-liberator-compliance-audit_20260426/spec.md` | dungeon-liberator | spec |
| 16 | `enchanted-library-compliance-audit_20260426/index.md` | enchanted-library | index |
| 17 | `enchanted-library-compliance-audit_20260426/metadata.json` | enchanted-library | metadata |
| 18 | `enchanted-library-compliance-audit_20260426/plan.md` | enchanted-library | plan |
| 19 | `enchanted-library-compliance-audit_20260426/report.md` | enchanted-library | report |
| 20 | `enchanted-library-compliance-audit_20260426/spec.md` | enchanted-library | spec |

---

## Cross-Cutting Findings (whole batch)

**F-GAMES-B14-001 · High · all four metadata.json:4**
Every track's `metadata.json` declares `"status": "new"` (dragon-flight:4, dragon-rider:4, dungeon-liberator:4, enchanted-library:4), yet all four `plan.md` files have **every** task checkbox marked `[x]` and all four `report.md` files claim full completion (e.g., dragon-rider report:13 "Final Pass 25/25"; dungeon-liberator report:107 "ready for production"). Status, plan, and report disagree. Three plans contain an explicit Phase 7 task "Update track metadata.json status to completed" marked `[x]` (dragon-flight plan:56, dungeon-liberator plan:52, enchanted-library plan:48) — checked, but the metadata was never changed. `"actual_tasks": null` in all four despite plans claiming all tasks done. The completion signal is internally contradictory.

**F-GAMES-B14-002 · High · plan/report commit references vs git history**
Every commit hash referenced in the docs is **absent from the repository's git history**. `git cat-file -t` returns "NOT FOUND" for: `9a9e730` (dragon-flight plan:57), `98847cb` (dragon-rider plan all phases + report:6), `ecd82bb` (dungeon-liberator plan:4 et al.), `c87e5dc` (enchanted-library plan all phases + report). The documented audit work cannot be verified to exist in this checkout (never committed, on an unmerged branch, or rebased away). This compounds F-GAMES-B14-001.

**F-GAMES-B14-003 · Medium · all four spec.md:59-65**
All four spec Acceptance Criteria blocks have every checkbox unchecked (`- [ ]`) while reports declare success (e.g., enchanted-library report:9 "25/25 passing"). The spec is the contract; leaving acceptance unticked while reporting success means readiness cannot be confirmed from the spec doc. Consistent across the batch — specs were not closed out.

**F-GAMES-B14-004 · Medium · spec scope "25 specifications" vs report tables**
All specs state the audit is against "the 25 shared specifications" (e.g., dragon-flight spec:5) and list 25 items. Dragon Flight report:20 totals **27** items (camera + off-screen as separate N/A rows), while the other three report 25. Inconsistent item numbering across games auditing the *same* shared spec set undermines cross-game comparability of the compliance baseline.

**F-GAMES-B14-005 · Low · all index.md:1-5**
All four `index.md` files are identical three-link stubs (spec/plan/metadata) and do **not** link to `report.md`. The report is the primary deliverable of a compliance-audit track yet is undiscoverable from the track index. Repeated across the batch.

**F-GAMES-B14-006 · Info · shared-spec divergence on difficulty tier naming**
Spec mandates "Easy/Medium/Hard" (each spec:41). Dragon Flight uses `easy/normal/hard/extreme` (report:62) marked PASS; Enchanted Library uses `Easy/Normal/Hard/Extreme` (report:36) marked PASS; Dragon Rider was *changed* to `easy/medium/hard` to comply (report:47). Identical requirement, inconsistent enforcement — two games pass with non-conforming tier keys while a third was forced to conform. Importability/shared-runtime risk if Reading/Primary key on `medium`.

---

## File-Specific Findings

### File 1 — `dragon-flight-compliance-audit_20260426/index.md`
**F-GAMES-B14-007 · Info · index.md:1-5** — Minimal stub; consistent for the three linked artifacts. Missing report link (see F-GAMES-B14-005). No other issues.

### File 2 — `dragon-flight-compliance-audit_20260426/metadata.json`
**F-GAMES-B14-008 · High · metadata.json:4,9** — `"status": "new"` and `"actual_tasks": null` contradict the fully-checked plan and completion-claiming report. `updated_at` (line 6) equals `created_at` (line 5): metadata was never touched after creation, confirming closeout was not performed despite plan:56 checked. See F-GAMES-B14-001.

### File 3 — `dragon-flight-compliance-audit_20260426/plan.md`
**F-GAMES-B14-009 · Medium · plan.md:15,16,22,30** — The most *honest* of the four plans: it records real PARTIAL/FAIL outcomes inline — rAF not used (PARTIAL, line 15), `useGameFullscreen` not implemented (FAIL, line 16), accessibility settings not implemented (FAIL, line 22), custom screens instead of shared `GameStartScreen`/`GameEndScreen` (FAIL, line 30). Yet all tasks are checked `[x]`, conflating "audited" with "compliant." A reader skimming checkboxes would wrongly infer compliance. FAIL items are genuine game-readiness gaps (no fullscreen, no accessibility scaling).

**F-GAMES-B14-010 · High · plan.md:38-39,44-52 vs report.md:90-93** — Plan claims an infinite-loop bug fix plus hook/unused-var fixes and new tests committed at `9a9e730`. That commit does not exist (F-GAMES-B14-002), so the claimed critical infinite-loop fix (report:90-93) is unverifiable. An unverified infinite-loop fix is a material game-readiness risk.

### File 4 — `dragon-flight-compliance-audit_20260426/report.md`
**F-GAMES-B14-011 · High · report.md:39,47,63,81,146-149** — Report defers (FAIL) three shared-spec requirements — fullscreen (39), accessibility settings (47), shared start/end screens (63) — while the game stays registered `status: 'playable'` (81). Missing accessibility settings (no touch-target scaling, no text-size multiplier) is an age-appropriate-UX/accessibility gap for a student-facing game. Deferred to "future tracks" (146-149) with **no track IDs created**, so the gaps have no owner.

**F-GAMES-B14-012 · Medium · report.md:38,66 vs spec.md:26,45** — Loop uses `useInterval` with `TICK_MS = 60` and report admits delta-time is "not clamped to 50ms max" (38), yet item 17 "Performance" is **PASS** (66). Spec requires "delta-time (clamped to 50ms)" (26) and "30+ FPS" (45); a 60ms interval is ~16.7Hz. Marking PASS contradicts the spec and the report's own note — a real mobile-perf/background-tab-coalescing risk.

**F-GAMES-B14-013 · Low · report.md:46,107 vs spec.md:31** — Labels use `text-[9px]` justified as "decorative" (46); unused-variable warnings were "suppressed" for `xpEarned`/`results` rather than resolved (107). 9px is far below the 16px readability minimum (31); suppression masks dead code/state-wiring issues. Counts against age-appropriate readability and code quality.

### File 5 — `dragon-flight-compliance-audit_20260426/spec.md`
**F-GAMES-B14-014 · Medium · spec.md:43-44** — Camera/off-screen items are conditioned on "If world > 500px" (43) but listed as flat checkboxes; Dragon Flight marked both N/A (report:64-65). The conditional makes the "25 items" count elastic (F-GAMES-B14-004) and prevents a clean pass/fail tally across games. Spec should separate mandatory vs conditional items.

### File 6 — `dragon-rider-compliance-audit_20260426/index.md`
**F-GAMES-B14-015 · Info · index.md:1-5** — Identical stub to File 1; missing report link (F-GAMES-B14-005). No further issues.

### File 7 — `dragon-rider-compliance-audit_20260426/metadata.json`
**F-GAMES-B14-016 · High · metadata.json:4,9** — `"status": "new"`, `"actual_tasks": null`, `updated_at == created_at` directly contradict plan (all `[x]` at `98847cb`) and report (25/25). Closeout never recorded. See F-GAMES-B14-001/002.

### File 8 — `dragon-rider-compliance-audit_20260426/plan.md`
**F-GAMES-B14-017 · Medium · plan.md:4-54** — Every task is stamped with the same commit `[98847cb]` and carries **no** inline PASS/FAIL/PARTIAL annotation (unlike dragon-flight's plan). With that commit missing from history (F-GAMES-B14-002), there is no granular evidence of which items genuinely passed versus were fixed — the plan provides no audit trail beyond the unverifiable hash. Lower evidentiary value than dragon-flight's plan.

### File 9 — `dragon-rider-compliance-audit_20260426/report.md`
**F-GAMES-B14-018 · Medium · report.md:26,51 vs spec.md:26** — Item 4 "Game Loop" is PASS noting "`useInterval` with TICK_MS=60; parallax uses `Konva.Animation` (rAF-based)" (26). The core gameplay tick is still a 60ms interval, not rAF with delta clamping as the spec demands (26); only decorative parallax is rAF. Marking PASS overstates compliance — the same substantive gap dragon-flight honestly flagged PARTIAL is here graded PASS. Inconsistent grading of identical architecture across games.

**F-GAMES-B14-019 · Low · report.md:66 vs spec.md:56** — Report passes the cover as `/public/games/cover/cover-dragon-rider.png` (66) but spec expects `dragon-rider-cover.png` (56). Filesystem confirms the actual file is `cover-dragon-rider.png`; the spec's expected name does not exist. The game works, but the `<id>-cover.png` convention (used by dragon-flight and enchanted-library) is violated and the report passes it without flagging the divergence — an importability/asset-path consistency risk.

**F-GAMES-B14-020 · Low · report.md:87** — Coverage table row for `page.tsx` shows em-dashes for all four metrics (no data) while the table claims component coverage 88.78%. Page-level coverage is unreported, leaving a gap in the "≥80%" claim (report:56,93).

### File 10 — `dragon-rider-compliance-audit_20260426/spec.md`
**F-GAMES-B14-021 · Info · spec.md:1-72** — Template-identical to the other specs. Acceptance boxes unchecked (F-GAMES-B14-003). Cover-path line 56 is the source of the mismatch in F-GAMES-B14-019. No new issues.

### File 11 — `dungeon-liberator-compliance-audit_20260426/index.md`
**F-GAMES-B14-022 · Info · index.md:1-5** — Identical stub; missing report link. No further issues.

### File 12 — `dungeon-liberator-compliance-audit_20260426/metadata.json`
**F-GAMES-B14-023 · High · metadata.json:4,9** — `"status": "new"`, `actual_tasks: null`, `updated_at == created_at` vs a plan claiming 12 fixes + 49 tests committed at `ecd82bb` and report:107 "ready for production." Largest fix-volume track in the batch, yet metadata shows no closeout. See F-GAMES-B14-001/002.

### File 13 — `dungeon-liberator-compliance-audit_20260426/plan.md`
**F-GAMES-B14-024 · High · plan.md:28-29 vs spec.md:69-70** — Plan records adding `calculateDungeonLiberatorXP` with bonus tiers (28) and adding difficulty tiers with a "UI selector in GameStartScreen" plus `difficulty` added to state (29). These are **new gameplay/scoring systems**, but spec:69-70 lists "New gameplay features" and "Visual redesigns" as Out of Scope. The XP system and difficulty selector are feature additions, not audit fixes — a scope-boundary violation. With the enabling commit missing (F-GAMES-B14-002), the new scoring logic is also unverifiable — a direct scoring/XP-readiness risk.

**F-GAMES-B14-025 · Medium · plan.md:5** — Baseline was "0% baseline, no unit tests" (5); the track claims to have authored all 49 tests. Per the no-source-edits constraint these tests cannot be executed here, and the commit holding them is missing (F-GAMES-B14-002). A game that previously had zero tests is a high test-quality risk if the work is not actually in the tree.

**F-GAMES-B14-026 · Medium · plan.md:38 vs report.md:61** — "Hook dependency arrays" was "FIXED" by adding `// eslint-disable-next-line react-hooks/exhaustive-deps` for the rAF loop (plan:38, report:61). This *suppresses* the lint rule rather than satisfying it; combined with the rAF/ref refactor it is a known stale-closure hazard. Marking item 20 PASS via suppression overstates code-quality compliance.

### File 14 — `dungeon-liberator-compliance-audit_20260426/report.md`
**F-GAMES-B14-027 · Medium · report.md:68,81 vs spec.md:18,56** — Report says assets were "Moved" from `/public/games/dungeon-liberator/` to `/public/games/sentence/dungeon-liberator/` (68), but Fixes line 81 says "Copied assets" — moved vs copied is ambiguous and a copy leaves stale duplicates (asset bloat / wrong-path import risk). Cover is `/public/games/cover/dungeon-liberator.png` (69), again diverging from the `<id>-cover.png` convention (filesystem confirms `dungeon-liberator.png`). Importability into Reading/Primary depends on predictable asset paths; this track shows the paths were non-standard.

**F-GAMES-B14-028 · Low · report.md:94 vs spec.md:48** — `DungeonLiberatorGame.tsx` is 76.19% statements / 63.63% functions (94), under the 80% bar, but the track passes on the *overall* 82.05% blend (59,97). Spec requires "Test Coverage ≥ 80%" (48); dragon-flight checked per-file. Applying an overall-only standard here is an inconsistent, weaker test-quality gate. 63.63% function coverage means a third of component functions are untested.

### File 15 — `dungeon-liberator-compliance-audit_20260426/spec.md`
**F-GAMES-B14-029 · Info · spec.md:35** — Correctly specifies `SentenceItem[]` with `{ sentence, words }` (35) vs the vocabulary specs' `VocabularyItem[]`, consistent with game type. Acceptance boxes unchecked (F-GAMES-B14-003). No new issues.

### File 16 — `enchanted-library-compliance-audit_20260426/index.md`
**F-GAMES-B14-030 · Info · index.md:1-5** — Identical stub; missing report link. No further issues.

### File 17 — `enchanted-library-compliance-audit_20260426/metadata.json`
**F-GAMES-B14-031 · High · metadata.json:4,9** — `"status": "new"`, `actual_tasks: null`, `updated_at == created_at` vs plan (all `[x]` at `c87e5dc`) and report:9 "25/25 passing." See F-GAMES-B14-001/002.

### File 18 — `enchanted-library-compliance-audit_20260426/plan.md`
**F-GAMES-B14-032 · High · plan.md:29-30 vs spec.md:69** — Plan adds `calculateEnchantedLibraryXP` (29) and "off-screen indicators for books when camera is active" (30). Like dungeon-liberator, these are new systems added despite spec:69 ("New gameplay features" Out of Scope). Off-screen indicators are a new UI/gameplay affordance, not an audit fix. Same scope-creep + unverifiable-commit pattern (F-GAMES-B14-002, F-GAMES-B14-024).

**F-GAMES-B14-033 · Low · plan.md:11-15** — Plan embeds a "Phase 1 Results" prose block (11-15) duplicating report content, blurring plan-vs-report separation. Minor documentation-hygiene note.

### File 19 — `enchanted-library-compliance-audit_20260426/report.md`
**F-GAMES-B14-034 · Medium · report.md:36 vs spec.md:41** — Difficulty Tiers marked PASS with "Easy/Normal/Hard/Extreme" (36), but spec mandates "Easy/Medium/Hard" (41). Non-conforming tier set (uses `Normal`+`Extreme`, lacks `Medium`) yet graded PASS — same inconsistency as F-GAMES-B14-006. Downstream consumers keying on `medium` would break on import to Reading/Primary.

**F-GAMES-B14-035 · Low · report.md:64,76-78** — Component coverage jumped 78.14%→88.31% primarily via 12 RankingDisplay tests raising that one file 18.91%→100% (64). Concentrated coverage gains can mask thinly-tested gameplay paths elsewhere. Lessons-learned (76-78) cite rAF stale-closure and temporal-dead-zone hazards from the refactor, corroborating the stale-closure risk in F-GAMES-B14-026 and indicating fragile loop refactors across the batch.

### File 20 — `enchanted-library-compliance-audit_20260426/spec.md`
**F-GAMES-B14-036 · Info · spec.md:56** — Template-identical to the other vocabulary specs. Cover path `enchanted-library-cover.png` (56) — filesystem confirms this file exists, so this game follows the `<id>-cover.png` convention that dragon-rider and dungeon-liberator violate. Acceptance boxes unchecked (F-GAMES-B14-003). No new issues.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 10 | 001, 002, 008, 010, 011, 016, 023, 024, 031, 032 |
| Medium | 11 | 003, 004, 009, 012, 014, 017, 018, 025, 026, 027, 034 |
| Low | 7 | 005, 013, 019, 020, 028, 033, 035 |
| Info | 8 | 006, 007, 015, 021, 022, 029, 030, 036 |

(Total findings: 36 — IDs F-GAMES-B14-001 through F-GAMES-B14-036. Counts: 0 Critical + 10 High + 11 Medium + 7 Low + 8 Info = 36.)

### Highest-priority themes
1. **Status/evidence integrity (F-GAMES-B14-001, -002):** All four tracks are documented as complete/committed, but metadata says `new`, `actual_tasks` is null, and **none** of the four referenced commits (`9a9e730`, `98847cb`, `ecd82bb`, `c87e5dc`) exist in git history. The audit work and all "fixed" claims (bug fixes, new XP systems, 49 new tests, asset moves) are unverifiable from this checkout.
2. **Inconsistent grading of identical architecture (F-GAMES-B14-012, -018, -006, -034):** The same `useInterval`/60ms loop is PARTIAL for dragon-flight but PASS for dragon-rider; non-conforming difficulty tiers PASS for dragon-flight/enchanted-library but were forced to conform for dragon-rider. The "shared spec" is not enforced uniformly, weakening cross-game compliance comparability.
3. **Scope creep under a "no new features" spec (F-GAMES-B14-024, -032):** Dungeon Liberator and Enchanted Library added new XP-scoring systems, difficulty selectors, and off-screen indicators — explicitly Out of Scope per their specs.
4. **Readiness gaps shipped as "playable" (F-GAMES-B14-011):** Dragon Flight remains `status: 'playable'` while failing fullscreen, accessibility-settings, and shared-screen requirements, with deferred items owned by no track.

---

## Limitations

- **Documentation-only batch.** All 20 files are Measure track docs; no game source (`.tsx`/`.ts`), tests, assets, or registry files were in scope. Findings about gameplay, scoring/XP correctness, shared-runtime behavior, performance, mobile/browser compatibility, accessibility, and test quality are derived **from the audit documents' own claims**, not from inspecting the underlying code. Where docs and reality could be cheaply cross-checked, they were (commit existence via `git cat-file`; cover-image filenames via filesystem listing).
- **Commit verification** was performed against the current working checkout only. The four referenced commits may exist on remote/unmerged branches not present here; this could not be ruled in or out.
- **Coverage/test claims** (e.g., 82.05%, 88.78%, 91.27%, 49 tests) were not re-run — the batch contains no test files and editing/executing source is out of scope.
- **Shared-spec interpretation:** the "25 shared specifications" are summarized in each spec's checklist but the canonical source-of-truth spec document was not part of this batch, so ambiguities (item count 25 vs 27, conditional camera items) are noted but not resolved.
- No acceptance or closeout determination is made by this review; this report records line-anchored findings only and makes no claim that the batch or track is accepted or closed.

