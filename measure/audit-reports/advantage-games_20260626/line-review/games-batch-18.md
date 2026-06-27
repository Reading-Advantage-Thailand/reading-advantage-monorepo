# Line-by-Line Review — games-batch-18

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-18`
**Scope source:** `/tmp/opencode/games-batch-18` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (index, metadata, plan, report, spec) plus two feature-track planning sets. No `.ts`/`.tsx` runtime, component, or test files appear in the batch itself. Source/asset files were read-only inspected to validate document claims.
**Finding ID scheme:** `F-GAMES-B18-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track / Subject | Type |
|---|------|------------------|------|
| 1 | `rune-match-compliance-audit_20260426/plan.md` | rune-match audit | plan |
| 2 | `rune-match-compliance-audit_20260426/report.md` | rune-match audit | report |
| 3 | `rune-match-compliance-audit_20260426/spec.md` | rune-match audit | spec |
| 4 | `sentence_game_expansion_20260423/metadata.json` | sentence game expansion (v1) | metadata |
| 5 | `sentence_game_expansion_20260423/plan.md` | sentence game expansion (v1) | plan |
| 6 | `sentence_game_expansion_20260423/spec.md` | sentence game expansion (v1) | spec |
| 7 | `sentence_game_expansion_v2_20260425/metadata.json` | sentence game expansion v2 | metadata |
| 8 | `sentence_game_expansion_v2_20260425/plan.md` | sentence game expansion v2 | plan |
| 9 | `sentence_game_expansion_v2_20260425/spec.md` | sentence game expansion v2 | spec |
| 10 | `shadow-gate-dungeon-compliance-audit_20260426/index.md` | shadow-gate-dungeon audit | index |
| 11 | `shadow-gate-dungeon-compliance-audit_20260426/metadata.json` | shadow-gate-dungeon audit | metadata |
| 12 | `shadow-gate-dungeon-compliance-audit_20260426/plan.md` | shadow-gate-dungeon audit | plan |
| 13 | `shadow-gate-dungeon-compliance-audit_20260426/report.md` | shadow-gate-dungeon audit | report |
| 14 | `shadow-gate-dungeon-compliance-audit_20260426/spec.md` | shadow-gate-dungeon audit | spec |
| 15 | `sorcerer-ziggurat-compliance-audit_20260426/index.md` | sorcerer-ziggurat audit | index |
| 16 | `sorcerer-ziggurat-compliance-audit_20260426/metadata.json` | sorcerer-ziggurat audit | metadata |
| 17 | `sorcerer-ziggurat-compliance-audit_20260426/plan.md` | sorcerer-ziggurat audit | plan |
| 18 | `sorcerer-ziggurat-compliance-audit_20260426/report.md` | sorcerer-ziggurat audit | report |
| 19 | `sorcerer-ziggurat-compliance-audit_20260426/spec.md` | sorcerer-ziggurat audit | spec |
| 20 | `spellweavers-run-compliance-audit_20260426/index.md` | spellweavers-run audit | index |

This batch mixes three completed/attempted compliance-audit tracks (rune-match, shadow-gate-dungeon, sorcerer-ziggurat), one orphan index pointer (spellweavers-run), and two sentence-game **feature** tracks (v1 and v2). Findings focus on (a) internal document consistency, (b) verifiability of claims against the live repo, and (c) readiness/portability/age-appropriateness signals these documents surface.

---

## Cross-Batch Verification Performed (read-only against live repo)

| Claim | Result |
|-------|--------|
| Cover images for the audited games exist | `rune-match-cover.png`, `cover-shadow-gate-dungeon.png`, `cover-sorcerers-ziggurat.png`, `cover-spellweavers-run.png` all present in `public/games/cover/`. Confirmed. |
| Sorcerer Ziggurat has **no** source files | Confirmed: `src/components/games/sentence/sorcerer-ziggurat` does not exist; no `sorcererZiggurat.ts` in `src/lib/games/`. |
| Sorcerer registry `status: 'coming-soon'` | Confirmed (`gameCards.ts:227`). |
| Shadow Gate Dungeon logic/component/tests exist | Confirmed: `shadowGateDungeon.ts` + `.test.ts` + config + tests in `src/lib/games/`; component dir `src/components/games/sentence/shadow-gate-dungeon` present. |
| Rune Match logic/config/tests exist | Confirmed: `runeMatch.ts`, `runeMatchConfig.ts`, `*.test.ts` present. |
| Spellweavers Run has full source | Confirmed: `spellweaversRun.ts`/`Config.ts`/tests + `SpellweaversRunGame.tsx`/`.test.tsx`. (Spellweavers batch ships only its `index.md`; spec/plan/report were NOT in this batch.) |
| API factory `createSentenceRoute` (singular, per sorcerer spec) exists | **FALSE** — only `createVocabularyRoute`, `createSentencesRoute`, `createCompleteRoute`, `createRankingRoute` exported from `src/lib/games/api/index.ts`. |
| Shared hooks referenced by sentence-expansion specs (`useGameTimer`, `useGameCamera`, `useSound`, `usePerformanceMetrics`) | Partial: `useGameCamera`, `useSound`, `usePerformanceMetrics`, `useGameFullscreen`, `useAccessibilitySettings` exist in `src/hooks/`. **`useGameTimer` does NOT exist.** |
| Shared `SentenceDisplay` component referenced by expansion specs | **NOT FOUND** anywhere in `src/`. |
| `games/index.ts` catalog referenced by expansion plans | **NOT FOUND**; the live registry is `src/lib/gameCards.ts`. |

---

## Findings

### Files 1–3 — rune-match-compliance-audit

**F-GAMES-B18-001 · Info · plan.md:1-54 / report.md:1-113 / spec.md:1-72**
Well-formed audit track. Spec defines the canonical 25-point shared game specification (React-Konva, mobile-first 390×844, pure state + tick, rAF with 50ms delta clamp, fullscreen, ≥44px touch targets, ≥16px text, accessibility layer, `VocabularyItem[]`, API route factories, i18n/session, 1–10 XP scale, difficulty tiers, shared start/end screens, camera + off-screen indicators, ≥80% coverage, no `any`, hook deps, no unused imports, registry, assets, cover, dir structure). This is the reusable rubric the rest of the batch is measured against. No action.

**F-GAMES-B18-002 · Medium · report.md:96-103, 109**
Self-reported coverage gap not closed. `RuneMatchGame.tsx` is **73.33%** and `page.tsx` is **71.15%**, both below the spec's ≥80% bar (spec.md:48,65). The 82.97% overall headline (report.md:18) is carried by `runeMatch.ts` at 99.32%. The component — which contains all touch handling, mobile/desktop layout branches, skill buttons, and floating-text animation (the readiness-critical paths) — is the **least** tested. Coverage on logic ≠ readiness of the playable surface. Risk: regressions in input/rendering go undetected.

**F-GAMES-B18-003 · Medium · report.md:55, 84-86**
Scoring/XP correctness asserted but not independently demonstrated. The report states XP changed from `monster.xp` to `calculateXP()` (1–10 scale), but provides no before/after XP value table or test assertion proving parity with sibling games. For Reading/Primary importability, XP must be consistent across games; this report shows the mechanism changed but not that the **output range/curve** matches the platform standard. Recommend a cross-game XP parity test.

**F-GAMES-B18-004 · Low · report.md:56, 86**
Difficulty mapping is content-coupled, not tier-driven. `MONSTER_DIFFICULTY` maps `goblin→easy, skeleton→medium, orc/dragon→hard`. The shared spec (spec.md:41) expects difficulty tiers to drive "spawn rates, word counts, and speed presets." Mapping monster identity onto a tier label is a label, not a parameterized difficulty system; verify the underlying presets actually differ per tier rather than just renaming enemies. Affects difficulty consistency when imported.

**F-GAMES-B18-005 · Low · spec.md:35 vs report.md:48**
Data-shape ambiguity for vocabulary. Spec requires `VocabularyItem[]` with `{ term, translation }` (spec.md:35); report confirms `{ term, translation }` (report.md:48). Confirmed against repo (`VocabularyItem` from `@/store/useGameStore`). Recorded for traceability; this term/translation shape recurs (see shadow-gate F-GAMES-B18-012).

**F-GAMES-B18-006 · Info · report.md:111-113**
Report ends with "Sign-off / Audit complete." This is the track's own self-assessment. Per this review's mandate, no acceptance or closeout is granted here; the sign-off is noted as a documented claim only, not endorsed.

### Files 4–6 — sentence_game_expansion (v1, 20260423)

**F-GAMES-B18-007 · High · metadata.json:4 / plan.md (all) / spec.md:64-76**
Track is `"status": "planned"` with **zero** completed tasks (every checkbox in plan.md is unchecked). Acceptance criteria (spec.md:66-76) — 4 playable games, shared `SentenceDisplay`, pack integration, difficulty tiers, registry, 390×844, ≥80% coverage — are entirely unmet/unverified. No readiness can be claimed for these four proposed games (fill-in-the-blank platformer, word reorder, translation match, context clue detective). Treat as backlog, not shippable.

**F-GAMES-B18-008 · High · spec.md:44-45,70 / plan.md:13,21**
Spec mandates a shared `SentenceDisplay` component as the typography contract for all 4 games, but **no `SentenceDisplay` exists in the repo** (verified). The acceptance criterion "All 4 games use shared `SentenceDisplay`" (spec.md:70) depends on a component that must be built first; the plan never schedules its creation. Architectural dependency gap that will block importability and consistent rendering.

**F-GAMES-B18-009 · High · spec.md:61 / plan.md:21**
Spec/plan rely on `useGameTimer` and `useGameCamera` hooks; **`useGameTimer` does not exist** in `src/hooks/` (only `useGameCamera`, `useSound`, `usePerformanceMetrics`). Plan task plan.md:21 ("Use shared `useGameTimer` and `useGameCamera` hooks") references a non-existent shared hook. Either the hook must be created or the reference corrected; as written the plan is not executable.

**F-GAMES-B18-010 · Medium · plan.md:24,50,76,103 / spec.md:60**
Plan registers new games in `games/index.ts`, but the live catalog is `src/lib/gameCards.ts` (verified; no `games/index.ts`). The integration target named throughout the plan is wrong for this codebase. Will cause the games to never appear in the menu if implemented as written. Affects Reading/Primary importability (registry is the import surface).

**F-GAMES-B18-011 · Medium · spec.md:12,20,28,36 / report.md(rune):55**
Scoring schemes in this spec are **raw point values** (+100/-50, +200/+50, +150/-75 combo, +100 streak ×2) and directly conflict with the platform-standardized **1–10 XP scale** enforced by the compliance-audit tracks (rune-match report.md:55, shadow-gate report.md:47). Two divergent scoring philosophies coexist in the same batch. Unless reconciled, these games would fail the same compliance audit the rest of the batch passed. Cross-game leaderboard/XP parity is at risk.

### Files 7–9 — sentence_game_expansion_v2 (20260425)

**F-GAMES-B18-012 · High · metadata.json:1-7 / plan.md:1-19 / spec.md:1-11**
Effectively empty/boilerplate track. `spec.md` is a 4-line generic stub ("more game modes, difficulty levels, and vocabulary categories") with generic checkbox acceptance criteria ("Implementation complete / Tests passing / Build succeeds"). `plan.md` is a generic 3-phase template ("Set up core infrastructure / Write failing tests / ..."). No game-specific scope, no file paths, no testable acceptance. This track provides no auditable substance and overlaps the v1 track (F-GAMES-B18-007) without explaining the relationship. Recommend merge or deletion.

**F-GAMES-B18-013 · Medium · metadata.json:2-6**
Metadata schema inconsistency across the batch. v2 uses `{ id, name, status, created, priority }`; the compliance-audit tracks use `{ track_id, type, status, created_at, updated_at, description, estimated_tasks, actual_tasks, deviation_notes }`; v1 uses the latter shape too. Divergent metadata schemas hinder automated track tooling/registry aggregation. Low functional impact, but a process/tooling smell.

**F-GAMES-B18-014 · Info · spec.md:6-11**
No "Out of Scope" or content/age-appropriateness section. The v1 expansion spec (sentence_game_expansion_20260423/spec.md:77-83) at least lists out-of-scope items; v2 omits all guardrails. For a K-12 reading product, target age band and content-pack appropriateness should be stated. Info-level for a stub.

### Files 10–14 — shadow-gate-dungeon-compliance-audit

**F-GAMES-B18-015 · High · spec.md:35 vs report.md:42 / plan.md:23**
Data-contract contradiction. Spec requires sentence games to use `SentenceItem[]` with `{ sentence, words }` (spec.md:35). The report instead claims compliance using `VocabularyItem[]` with `{ term, translation }` (report.md:42), and the live `shadowGateDungeon.ts` imports `VocabularyItem` (verified, lines 1/55/73). The report marks "Sentence Data" PASS while silently substituting a different type than the spec demands, with a parenthetical hand-wave ("standard across sentence games"). This is a genuine spec/implementation divergence marked green — it undermines the "25/25 passing" headline (report.md:12) and the portability story for sentence content.

**F-GAMES-B18-016 · Medium · report.md:128, 131**
"25/25 passing" overstates component test rigor. Coverage table shows `ShadowGateDungeonGame.tsx` at **78.42% stmts / 55.55% branch / 36.36% funcs** (report.md:128). Function coverage of 36% on the playable component means roughly two-thirds of its functions are never exercised. The ≥80% spec item (spec.md:48) is reported PASS on the **overall 88.67%** aggregate, masking a weakly-tested UI/input layer. Same pattern as rune-match (F-GAMES-B18-002).

**F-GAMES-B18-017 · Medium · plan.md:8 / report.md:62,102-103 / spec.md:55**
Asset directory was "fixed" by creating an **empty** directory. Plan.md:8 records "Assets: FAIL - no directory"; the fix (report.md:102-103) is "Created `/public/games/sentence/shadow-gate-dungeon/` directory." An empty asset directory satisfies the path check but provides no actual game art — readiness for an art-dependent dungeon game is not demonstrated. Cover image exists, but in-game assets remain absent. Marking spec #23 PASS for an empty dir is a checkbox-vs-substance gap.

**F-GAMES-B18-018 · Low · report.md:31 vs spec.md:24**
Viewport reference inconsistency. Report states "Mobile-First Portrait — 390×700 reference viewport" (report.md:31) while the spec mandates **390×844** (spec.md:24). The 390×700 deviation is marked PASS without justification. Minor, but reference viewport drift affects responsive-scaling consistency across the platform.

**F-GAMES-B18-019 · Low · metadata.json:4 vs plan.md:52 / report.md:12**
Metadata status drift. `metadata.json` still reads `"status": "new"` (line 4) even though plan.md:52 and report.md claim the track is completed and metadata was updated to "completed." The status field was not actually updated, contradicting the plan's own completed task. Traceability defect.

**F-GAMES-B18-020 · Low · report.md:42, 84**
"Chase indicator: 16 → 16" listed under text-size fixes (report.md:84) is a no-op entry, indicating the fix list was padded. Cosmetic, but it slightly inflates the "12 fixes applied" narrative.

### Files 15–19 — sorcerer-ziggurat-compliance-audit

**F-GAMES-B18-021 · Info · report.md:7,13 / metadata.json:10 / plan.md (all)**
Honest negative audit. Report correctly states the game **does not exist** (0/25 specs pass; only registry stub + cover present). Verified against repo: no component, no logic, registry `status: 'coming-soon'`. This is the most internally-consistent document set in the batch. No readiness claimed; recommendation to create an implementation track (report.md:78-83) is appropriate. No action beyond noting the game is non-shippable.

**F-GAMES-B18-022 · Medium · spec.md:36**
Spec references a non-existent API factory `createSentenceRoute` (singular). The repo exports `createSentencesRoute` (plural) only. If/when Sorcerer Ziggurat is implemented from this spec verbatim, the import will fail. Same singular/plural error should be checked across other sentence-game specs. Pre-implementation defect baked into the spec.

**F-GAMES-B18-023 · Low · spec.md:35**
Spec self-contradiction: declares "Sentence Data — Uses `SentenceItem[]` with `{ term, translation }`" (spec.md:35) — mixing the `SentenceItem` type name with the `VocabularyItem` field shape. The data contract for sentence games is inconsistently specified across the batch (cf. F-GAMES-B18-015). Spec authors are conflating two types.

**F-GAMES-B18-024 · Low · spec.md:56 vs repo**
Cover-image path mismatch. Spec expects `public/games/cover/sorcerer-ziggurat-cover.png` (spec.md:56); actual file is `cover-sorcerers-ziggurat.png` (note plural "sorcerers" and `cover-` prefix). Report (report.md:72) marks Cover Image PASS against the actual filename, so the spec's stated path is stale. Naming-convention drift (`<id>-cover.png` vs `cover-<id>.png`) recurs platform-wide.

**F-GAMES-B18-025 · Info · plan.md:9-54 / metadata.json:4**
All Phase 1–7 tasks marked `[x]` and metadata `status: "completed"` for a game that does not exist. This is defensible (the audit *task* completed, concluding the game is absent), but a reader skimming checkboxes could misread it as the game being done. The "User Manual Verification — SKIPPED" annotations mitigate this. No code action.

### File 20 — spellweavers-run-compliance-audit/index.md

**F-GAMES-B18-026 · Medium · index.md:1-5**
Orphan index. This batch ships **only** the `index.md` pointer for spellweavers-run; the linked `spec.md`, `plan.md`, and `metadata.json` (index.md:3-5) are **not in this batch's file list**, so the actual audit content cannot be reviewed here. The index references three files; their existence in the track dir was confirmed (`spec.md`, `plan.md`, `report.md`, `metadata.json` all present on disk) but they fall outside this batch's scope. The spellweavers-run game source **does exist** in the repo (`spellweaversRun.ts` + `SpellweaversRunGame.tsx` + tests), so unlike sorcerer-ziggurat it is a real game — but its compliance verdict is unreviewable from this batch alone. Flagged as a coverage gap to ensure the spellweavers spec/plan/report are routed to a later batch.

**F-GAMES-B18-027 · Info · index.md:1-5**
Index format matches the standard pointer template used by other audit tracks (sorcerer, shadow-gate). No defect; recorded for completeness.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 5 | 007, 008, 009, 012, 015 |
| Medium | 9 | 002, 003, 010, 011, 013, 016, 017, 022, 026 |
| Low | 7 | 004, 005, 018, 019, 020, 023, 024 |
| Info | 6 | 001, 006, 014, 021, 025, 027 |
| **Total** | **27** | F-GAMES-B18-001 … F-GAMES-B18-027 |

### Recurring themes
- **Coverage headline vs component reality:** Both implemented audited games (rune-match, shadow-gate) report ≥80% overall while the playable React-Konva component sits well below 80% on functions/branches. Logic coverage is masking weak UI/input coverage (002, 016).
- **Scoring inconsistency:** Compliance tracks enforce a 1–10 XP scale; the sentence-expansion feature specs use raw +100/-50 point systems. Unreconciled (011), threatens cross-game XP/leaderboard parity.
- **Phantom shared dependencies:** `SentenceDisplay`, `useGameTimer`, and `games/index.ts` are referenced by the expansion specs but do not exist in the repo (008, 009, 010).
- **Data-contract drift for sentence games:** `SentenceItem {sentence, words}` (spec) vs `VocabularyItem {term, translation}` (implementation), with green PASS marks papering over the divergence (015, 023).
- **Checkbox-vs-substance:** Empty asset dirs and no-op fixes counted as compliance wins (017, 020); metadata status not actually updated (019).
- **Naming-convention drift:** Cover files are `cover-<id>.png` while specs request `<id>-cover.png` (024).

---

## Limitations

1. **Documentation-only batch.** 19 of 20 files are Measure track docs; the 20th is an orphan index. No runtime, component, or test source was in scope. All readiness/scoring/accessibility/performance assessments below the document layer are **as-claimed by the audit reports**, not independently re-executed.
2. **No tests run.** Coverage percentages, "25/25 passing," and "82.97%/88.67%" figures are quoted from the reports; this review did not run Jest, lint, or build. Findings 002/016 reason from the reports' own coverage tables, which is the only evidence available.
3. **Spot-check, not full verification.** Repo cross-checks were limited to file/directory/symbol existence (`gameCards.ts` entries, hook/factory/component presence, cover filenames). Behavior, gameplay correctness, mobile/browser compatibility, audio, and actual accessibility (screen-reader/contrast) were **not** exercised.
4. **Spellweavers-run unreviewable in this batch.** Only its `index.md` was provided (F-GAMES-B18-026); its spec/plan/report/metadata must be reviewed in a later batch for full coverage.
5. **No source edits performed**, per mandate. Findings are advisory; no fixes were applied.
6. **No acceptance or closeout.** This report makes no acceptance/closeout/verification-gate claims for the track `advantage_games_review_20260626` or any audited game. Self-described "Sign-off / Audit complete" statements within the reviewed reports (e.g., rune-match report.md:111-113) are recorded as the tracks' own claims and are explicitly **not** endorsed here.
