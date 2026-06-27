# Line-by-Line Review — games-batch-19

**Track:** advantage_games_review_20260626
**Batch:** games-batch-19
**Reviewer:** ark-code-latest (line-review subagent)
**Date:** 2026-06-27
**Scope:** 20 Measure track-artifact files (metadata/plan/spec/report/index) for four advantage-games tracks: Spellweaver's Run compliance audit, Storm the Castle Tower compliance audit, Teacher Dashboard (v1), Teacher Dashboard v2, and Village Guardian compliance audit.

> NOTE: This batch contains **no source code** — every file is a Measure governance artifact (Markdown / JSON). Findings therefore concentrate on (a) internal consistency of the artifacts, and (b) whether claims in the audit reports/plans are corroborated by the actual game source in `apps/advantage-games/src`. Source files were read-only cross-checked; no source was edited. Severity legend: **Critical** (false/unverifiable completion claim or broken governance integrity), **High** (material inaccuracy affecting decisions), **Medium** (inconsistency / spec ambiguity), **Low** (cosmetic / hygiene).

---

## Files Reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `apps/advantage-games/measure/tracks/spellweavers-run-compliance-audit_20260426/metadata.json` | metadata |
| 2 | `apps/advantage-games/measure/tracks/spellweavers-run-compliance-audit_20260426/plan.md` | plan |
| 3 | `apps/advantage-games/measure/tracks/spellweavers-run-compliance-audit_20260426/report.md` | report |
| 4 | `apps/advantage-games/measure/tracks/spellweavers-run-compliance-audit_20260426/spec.md` | spec |
| 5 | `apps/advantage-games/measure/tracks/storm-castle-tower-compliance-audit_20260426/index.md` | index |
| 6 | `apps/advantage-games/measure/tracks/storm-castle-tower-compliance-audit_20260426/metadata.json` | metadata |
| 7 | `apps/advantage-games/measure/tracks/storm-castle-tower-compliance-audit_20260426/plan.md` | plan |
| 8 | `apps/advantage-games/measure/tracks/storm-castle-tower-compliance-audit_20260426/report.md` | report |
| 9 | `apps/advantage-games/measure/tracks/storm-castle-tower-compliance-audit_20260426/spec.md` | spec |
| 10 | `apps/advantage-games/measure/tracks/teacher_dashboard_20260423/metadata.json` | metadata |
| 11 | `apps/advantage-games/measure/tracks/teacher_dashboard_20260423/plan.md` | plan |
| 12 | `apps/advantage-games/measure/tracks/teacher_dashboard_20260423/spec.md` | spec |
| 13 | `apps/advantage-games/measure/tracks/teacher_dashboard_v2_20260425/metadata.json` | metadata |
| 14 | `apps/advantage-games/measure/tracks/teacher_dashboard_v2_20260425/plan.md` | plan |
| 15 | `apps/advantage-games/measure/tracks/teacher_dashboard_v2_20260425/spec.md` | spec |
| 16 | `apps/advantage-games/measure/tracks/village-guardian-compliance-audit_20260426/index.md` | index |
| 17 | `apps/advantage-games/measure/tracks/village-guardian-compliance-audit_20260426/metadata.json` | metadata |
| 18 | `apps/advantage-games/measure/tracks/village-guardian-compliance-audit_20260426/plan.md` | plan |
| 19 | `apps/advantage-games/measure/tracks/village-guardian-compliance-audit_20260426/report.md` | report |
| 20 | `apps/advantage-games/measure/tracks/village-guardian-compliance-audit_20260426/spec.md` | spec |

---

## Cross-Check Evidence (read-only)

Commands run against the working tree to verify report claims:

- `git log` for referenced commit hashes `afd4c24`, `70d4f01`, `c513109` → **all three are "unknown revision"** (do not exist in this repo's history).
- `git log -- src/lib/games/{spellweaversRun,stormCastleTower,villageGuardian}.ts` → last touch is monorepo scaffold `1c448546` (+ `85ecfd8f` for storm), **not** the audit commits.
- Difficulty enums in `*Config.ts` source files.
- Presence of `calculateSpellweaversRunXP`, `calculateXP`, asset directories, cover images, registry entries.

---

## Findings

### Spellweaver's Run audit (files 1–4)

**F-GAMES-B19-001 — Critical — report.md:6 — Referenced audit commit `afd4c24` does not exist.**
`report.md:6` states `**Commit:** afd4c24` and `plan.md:4-54` tag every completed task `[afd4c24]`. `git log afd4c24` returns "unknown revision." The most recent commit touching `src/lib/games/spellweaversRun.ts` is the monorepo scaffold `1c448546`. The completion evidence trail is therefore unverifiable — the claimed fix commit is absent from the audited repository (possibly a pre-monorepo-migration hash that was never preserved, or a fabricated/lost reference).

**F-GAMES-B19-002 — High — report.md:52,80 — "Difficulty Tiers PASS / removed extreme" contradicts source.**
`report.md:52` ("Standardized to Easy/Medium/Hard; removed extreme") and Fix #7 (`report.md:80`) claim the `extreme` tier was removed and tiers renamed to easy/medium/hard. Actual source `src/lib/games/spellweaversRunConfig.ts:1` still declares `export type SpellweaversRunDifficulty = 'easy' | 'normal' | 'hard' | 'extreme'`, with `extreme` presets at lines 19/25/55 and a default of `'normal'` (`spellweaversRun.ts:63`). Neither the rename to `medium` nor the removal of `extreme` is present. The report's compliance claim is false against the current tree.

**F-GAMES-B19-003 — High — report.md:14-18 — Coverage/“25/25 passing” numbers cannot be reproduced.**
The summary asserts 25/25 specs passing and 88.37% overall coverage tied to commit `afd4c24`. Because that commit is missing (F-001) and the difficulty fix is absent (F-002), the coverage table (`report.md:91-96`) and pass count are not reproducible from this repo. Treat as unsubstantiated.

**F-GAMES-B19-004 — Medium — spec.md:18 vs report.md:66 — Asset directory path inconsistency / unverified.**
Spec lists assets at `public/games/sentence/spellweavers-run/` (`spec.md:18`) and report claims it was created (`report.md:66,85`). The directory does **not** exist in the working tree (`ls public/games/sentence/spellweavers-run` → No such file or directory). Cover image `cover-spellweavers-run.png` does exist and the registry entry (`gameCards.ts:102-106`) is present, so the game is importable, but the asset-dir "PASS" is inaccurate.

**F-GAMES-B19-005 — Low — spec.md:24 vs report.md:29 — Reference viewport mismatch.**
Spec mandates `390×844` (`spec.md:24`); report records `390×600` (`report.md:29`). Both are described as "PASS." The discrepancy is unexplained — either the spec's reference viewport was not actually met or the report mislabels it. Low impact but undermines the "mobile-first portrait" verification.

**F-GAMES-B19-006 — Low — metadata.json:4 — Status never advanced to completed.**
`metadata.json:4` is `"status": "new"` and `actual_tasks` is `null`, yet `plan.md` marks all phases `[x]` and `report.md:53` claims a completion commit. The metadata lifecycle was not closed out, contradicting the plan. (Positive: `calculateSpellweaversRunXP` and `SentenceItem` type **do** exist in source — `spellweaversRun.ts:218,4` — so those two report claims are corroborated.)

### Storm the Castle Tower audit (files 5–9)

**F-GAMES-B19-007 — Critical — report.md:113 / plan.md:4-53 — Referenced commit `70d4f01` does not exist.**
`report.md:111-113` cites commit `70d4f01eb2bae2d4be0b68a9f16bd9e72c0ffad1`; every plan task is tagged `[70d4f01]`. `git log 70d4f01` → "unknown revision." Completion evidence is unverifiable.

**F-GAMES-B19-008 — High — report.md:55,98,117 — "Renamed normal → medium across type/config/state" is false in source.**
Fix #7 (`report.md:53-56`) and checklist line `report.md:98` claim difficulty keys were renamed `normal`→`medium`. Source still uses `normal`: `stormCastleTowerConfig.ts:47` (`normal: { name: "Knight's Keep" ... }`), fallback `stormCastleTowerConfig.ts:60` (`...difficulties.normal`), and default `stormCastleTower.ts:68` (`config.difficulty ?? 'normal'`). Notably a **later, real** commit `85ecfd8f` ("fix(games): Fix Difficulty type mismatches") did the *opposite* — it renamed `medium`→`normal` for stormCastleTower — directly contradicting this audit report's claimed direction. The report is inaccurate.

**F-GAMES-B19-009 — Medium — report.md:51 — Claims shared `calculateXP()` was substituted; partially corroborated but tied to phantom commit.**
`report.md:49-51` says the custom XP formula was replaced with `calculateXP()` from `@/lib/games/xp`. Source `StormCastleTowerGame.tsx:22,140` does import and call `calculateXP(correctWords, correctWords, totalAttempts)`. The end state matches, but the change is attributed to the non-existent commit `70d4f01`; provenance is unverifiable and the XP call passes `correctWords` for both the first two args (worth a source-level check that accuracy is computed correctly — out of scope here, flagged for the source-review batch).

**F-GAMES-B19-010 — Medium — report.md:56 vs spec.md:56 — Cover image filename mismatch.**
Spec expects cover at `/public/games/cover/storm-castle-tower-cover.png` (`spec.md:56`). Actual file is `cover-storm-the-castle-tower.png` and the registry references `cover-storm-the-castle-tower.png` (`gameCards.ts:161`). The report checklist marks "Cover Image PASS" (`report.md:108`) without noting the spec/actual filename divergence. Importability is fine (registry matches the real file), but the spec is stale/incorrect.

**F-GAMES-B19-011 — Medium — report.md:94 — "Sentence Data (VocabularyItem[])" contradicts the shared spec contract.**
`report.md:94` marks Sentence Data PASS using `VocabularyItem[]`, while the spec for this game (`spec.md:35`) requires `{ term, translation }` and the platform-wide sentence contract elsewhere (e.g. spellweavers spec.md:35) requires `SentenceItem` with `{ sentence, words }`. The report flags a PASS without reconciling which contract governs — a data-model ambiguity that affects importability into Reading/Primary if they expect a uniform sentence shape.

**F-GAMES-B19-012 — Medium — report.md:66-67 — Asset directory claimed created but absent.**
`report.md:65-67` claims `public/games/sentence/storm-castle-tower/` was created. `ls` shows it does not exist. Same pattern as F-004.

**F-GAMES-B19-013 — Low — report.md:39 — Text-size fix description self-contradictory.**
`report.md:38-39` lists "window words (11→16). Target already at 16, increased to 18 for emphasis." Mixing a 16px floor claim with an 18px value and an 11px starting point is confusing and, given the phantom commit, unverifiable. Cosmetic but reduces report trust.

### Teacher Dashboard v1 (files 10–12)

**F-GAMES-B19-014 — Medium — metadata.json:4 / plan.md — Track is genuinely "planned"; no implementation, no false claims (acceptable but stale).**
`metadata.json:4` `"status": "planned"`, all `plan.md` tasks unchecked, all `spec.md:70-81` acceptance items unchecked. Source confirms nothing was built: `src/app/teacher`, `src/stores/authStore.ts`, `src/stores/classStore.ts` do not exist. This is internally consistent (no overclaim), but the track has sat planned since 2026-04-23 and is superseded by v2 (file 13) without a cross-reference or deprecation note linking the two. Flagged as governance staleness, not a correctness defect.

**F-GAMES-B19-015 — Medium — spec.md:62-66, plan.md:9-12 — Architecture conflicts with monorepo AGENTS.md adapters.**
The v1 plan/spec prescribe bespoke JWT utilities (`lib/auth/jwt.ts`, `plan.md:11`), Zustand+localStorage auth (`spec.md:64`), and Next.js middleware role gating. The monorepo AGENTS.md mandates a replaceable auth adapter (`auth.login()/requireRole()`), PostgreSQL-backed sessions, and Argon2id — and forbids business logic in stores/components. Should this track ever be implemented, the spec as written would violate platform auth/architecture rules. Surface before any future build.

**F-GAMES-B19-016 — Low — spec.md:47, plan.md:7 — COPPA "minimal PII" data-model claims are unmeasured.**
The spec asserts COPPA-aligned minimal-PII student records and parental-consent stubs (`spec.md:46-51`), but defers consent implementation. Because nothing is implemented, these are aspirational; the audit batch cannot validate them. Noted as residual risk for student-facing/age-appropriate UX.

### Teacher Dashboard v2 (files 13–15)

**F-GAMES-B19-017 — High — metadata.json vs all sibling tracks — Non-conforming metadata schema.**
`teacher_dashboard_v2_20260425/metadata.json` uses keys `id/name/status/created/priority` (lines 2-6), whereas every other track in this batch uses `track_id/type/status/created_at/updated_at/description/estimated_tasks/actual_tasks/deviation_notes`. The divergent schema will break tooling that reads `track_id`/`type` and indicates the track was scaffolded outside the standard Measure generator.

**F-GAMES-B19-018 — Medium — spec.md:1-11 / plan.md:1-19 — Spec/plan are empty boilerplate, duplicating an existing track.**
`spec.md` has a one-line overview and generic checkbox acceptance criteria (no functional requirements); `plan.md` is a generic 3-phase template with no teacher-dashboard-specific tasks. It overlaps heavily with the far more detailed v1 track (file 12) but neither references the other, creating duplicate/competing scope. No implementation exists. Recommend consolidating v1/v2 before work begins.

**F-GAMES-B19-019 — Low — metadata.json:3 — Missing `updated_at`/lifecycle fields.**
Beyond the schema mismatch (F-017), the v2 metadata lacks `updated_at`, `description`, and task-count fields used elsewhere for progress tracking.

### Village Guardian audit (files 16–20)

**F-GAMES-B19-020 — Critical — plan.md:53 — Referenced commit `c513109` does not exist.**
`plan.md:53` tags the closeout `[c513109]`. `git log c513109` → "unknown revision." Last commit touching `villageGuardian.ts` is scaffold `1c448546`. Completion evidence unverifiable (same systemic issue as F-001, F-007).

**F-GAMES-B19-021 — High — report.md:57 — "Difficulty Tiers easy/normal/hard/extreme — PASS" contradicts the spec's required easy/medium/hard.**
`report.md:57` marks Difficulty Tiers PASS while explicitly documenting tiers `easy/normal/hard/extreme`; the spec (`spec.md:41`) requires **Easy/Medium/Hard** standardized presets. Marking PASS while listing a four-tier `normal/extreme` scheme is an internal contradiction — the game does not meet the stated standardized tier contract. (Source `villageGuardian.ts:184` confirms default `'normal'`, and no `medium`/`extreme` standardization was applied.)

**F-GAMES-B19-022 — Medium — report.md:48,109 — Sentence-data spec marked PARTIAL but counted toward "COMPLIANT."**
`report.md:13,20` summarizes "1 partial (SentenceItem typing)" yet concludes "24/25 fully passing ... COMPLIANT" and `report.md:48` shows spec #9 as PARTIAL using `VocabularyItem[]` instead of the spec-required `SentenceItem` with `{ sentence, words }` (`spec.md:35`). A PARTIAL on a data-contract item is being treated as effectively passing; this is a real importability gap for Reading/Primary which expect the uniform `SentenceItem` shape.

**F-GAMES-B19-023 — Medium — report.md:14 — Pass/fail arithmetic is inconsistent.**
The executive table (`report.md:11-20`) lists Pass 22, Partial 1, Fail(initial) 9, Fail(final) 0 — 22+1 = 23 of 25 accounted in the "current" columns, and "Fail(initial) 9" cannot coexist with "Pass 22" out of 25 unless overlapping counting is used. The figures are not internally reconcilable, reducing confidence in the headline result.

**F-GAMES-B19-024 — Medium — report.md:88,93 — API-factory and asset-dir fixes tied to phantom commit; asset dir absent.**
Fix #4/#9 (`report.md:88,93`) claim API routes were converted to `createSentencesRoute`/`createCompleteRoute` and `public/games/sentence/village-guardian/` was created. The asset directory does not exist in the tree; the route conversion is attributed to the missing commit `c513109` and thus unverifiable here. (Positive corroboration: `calculateXP` exists at `villageGuardian.ts:611` with accuracy/speed/survival bonuses and a `Math.min(maxXP, …)` cap, matching report #12; registry entry and cover image both exist — `gameCards.ts:126-130`.)

**F-GAMES-B19-025 — Low — report.md:103 vs report.md:17 — Coverage figures differ within the same report.**
Executive summary reports final coverage 94.58% (`report.md:17`); Test Summary reports "94.58% statements, 80% branch, 78.26% functions" (`report.md:103`). The headline 94.58% omits the materially lower function/branch coverage (below the 80%+ implied bar for functions). Not necessarily a failure, but the summary is optimistic relative to the detail.

---

## Cross-Cutting Observations

- **Systemic phantom-commit problem (F-001, F-007, F-020):** All three completed compliance audits reference commit hashes absent from the repository. The audited game source predates these hashes (scaffold `1c448546`). Either these audits were performed in a pre-monorepo-migration repo and their fix commits were lost during migration, or the completion records are inaccurate. Either way, **none of the three "COMPLIANT" conclusions are reproducible in the current tree**, and several specific fix claims (difficulty renames, asset dirs) are demonstrably not present.
- **Asset-directory claims uniformly false (F-004, F-012, F-024):** None of the three claimed `public/games/sentence/<game>/` directories exist. Games still load (covers + registry present), so this is a documentation-vs-reality gap rather than a runtime break.
- **Data-contract divergence (F-011, F-022):** Two games are documented as using `VocabularyItem[]` while specs demand `SentenceItem`/`{term,translation}`. This inconsistency is the single most relevant item for **importability into Reading/Primary**, which would expect one uniform sentence shape.
- **Difficulty standardization not achieved (F-002, F-008, F-021):** Despite reports claiming easy/medium/hard standardization, all three games retain `normal` (and two retain `extreme`). The real post-audit commit `85ecfd8f` standardized toward `normal`+`extreme` (shared `Difficulty` = `'easy'|'normal'|'hard'|'extreme'`, `api/types.ts:5`), the opposite of what these reports assert — indicating the reports were written against a different/abandoned standardization plan.
- **Teacher dashboard tracks (F-014–F-019):** Both remain unimplemented and overlap; v2 has non-conforming metadata and empty boilerplate specs. No false completion claims (acceptable), but scope duplication and an auth design that conflicts with monorepo adapter rules should be resolved before any build.

---

## Limitations

- This batch is **artifacts only**; the review judged the four games' readiness *indirectly* via report claims plus targeted read-only source spot-checks. A full source-level review of `SpellweaversRunGame.tsx`, `StormCastleTowerGame.tsx`, `VillageGuardianGame.tsx` and their logic/test files was **out of batch scope** and is needed to confirm runtime readiness, performance (rAF/delta clamping), mobile responsiveness, accessibility hooks, and test quality.
- No tests, lint, or builds were executed; coverage/pass figures in the reports were not re-run (only checked for internal consistency and existence of named symbols/files).
- Commit-history checks reflect the current monorepo only; if these tracks were authored in a prior standalone repo, the referenced hashes may have existed there. This could not be confirmed from the available tree.
- Browser/audio/performance/mobile-device behavior and age-appropriate UX could not be exercised; assessments are limited to what the artifacts assert and what static source confirms.
- `tracks.md` shows all four/five tracks still `Status: New`/`Planned`/`Pending`, inconsistent with the "completed" plans/reports — noted but a full registry reconciliation was outside this file list.

---

## Coverage Statement

All **20** files in `/tmp/opencode/games-batch-19` were read and reviewed. Findings `F-GAMES-B19-001` through `F-GAMES-B19-025` are recorded with file/line anchors and severities. No source code was modified. This report makes **no acceptance or closeout determination** for any track; it is a line-review input only.
