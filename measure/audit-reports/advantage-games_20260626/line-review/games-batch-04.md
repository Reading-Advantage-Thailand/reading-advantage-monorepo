# Line-by-Line Review — games-batch-04

- **Track:** `advantage_games_review_20260626`
- **Batch:** `games-batch-04`
- **Reviewer:** automated line review (read-only, no source edits)
- **Date:** 2026-06-27
- **File list source:** `/tmp/opencode/games-batch-04` (20 entries)
- **Scope reminder:** game readiness, shared runtime, scoring/XP/leaderboards/progress/difficulty, importability into Reading/Primary, asset/audio/performance/mobile/browser compatibility, accessibility, age-appropriate UX, test quality.

> **Nature of this batch:** All 20 files are Measure *planning artifacts* (`plan.md`, `spec.md`, `metadata.json`, `index.md`) for archived game tracks — **not** runtime source code. Findings therefore concern documented contracts, internal consistency, scope/acceptance integrity, and what the artifacts reveal about game readiness and test quality. No `.ts`/`.tsx` source was in scope; importability and runtime behavior are assessed indirectly from these specs/plans. See **Limitations**.

> **No acceptance or closeout claims are made in this report.** It is a findings inventory only.

---

## Files Reviewed (20/20)

| # | File | Type | Reviewed |
|---|------|------|----------|
| 1 | `apps/advantage-games/measure/archive/dragon-flight/plan.md` | plan | ✅ |
| 2 | `apps/advantage-games/measure/archive/dragon-flight/spec.md` | spec | ✅ |
| 3 | `apps/advantage-games/measure/archive/dragon-rider-reskin-20260131/metadata.json` | metadata | ✅ |
| 4 | `apps/advantage-games/measure/archive/dragon-rider-reskin-20260131/plan.md` | plan | ✅ |
| 5 | `apps/advantage-games/measure/archive/dragon-rider-reskin-20260131/spec.md` | spec | ✅ |
| 6 | `apps/advantage-games/measure/archive/dungeon-liberator-20260321/metadata.json` | metadata | ✅ |
| 7 | `apps/advantage-games/measure/archive/dungeon-liberator-20260321/plan.md` | plan | ✅ |
| 8 | `apps/advantage-games/measure/archive/dungeon-liberator-20260321/spec.md` | spec | ✅ |
| 9 | `apps/advantage-games/measure/archive/dungeon-liberator-sentences-bug/metadata.json` | metadata | ✅ |
| 10 | `apps/advantage-games/measure/archive/dungeon-liberator-sentences-bug/plan.md` | plan | ✅ |
| 11 | `apps/advantage-games/measure/archive/dungeon-liberator-sentences-bug/spec.md` | spec | ✅ |
| 12 | `apps/advantage-games/measure/archive/enchanted-library_20260130/metadata.json` | metadata | ✅ |
| 13 | `apps/advantage-games/measure/archive/enchanted-library_20260130/plan.md` | plan | ✅ |
| 14 | `apps/advantage-games/measure/archive/enchanted-library_20260130/spec.md` | spec | ✅ |
| 15 | `apps/advantage-games/measure/archive/game-triage-fidelity-20260320/index.md` | index | ✅ |
| 16 | `apps/advantage-games/measure/archive/game-triage-fidelity-20260320/metadata.json` | metadata | ✅ |
| 17 | `apps/advantage-games/measure/archive/game-triage-fidelity-20260320/plan.md` | plan | ✅ |
| 18 | `apps/advantage-games/measure/archive/game-triage-fidelity-20260320/spec.md` | spec | ✅ |
| 19 | `apps/advantage-games/measure/archive/game_data_arrays_fix_20260413/metadata.json` | metadata | ✅ |
| 20 | `apps/advantage-games/measure/archive/game_data_arrays_fix_20260413/plan.md` | plan | ✅ |

---

## Severity Legend
- **Critical** — blocks readiness / data-loss / multi-tenant safety.
- **High** — significant gap likely to cause user-facing failure or block Reading/Primary import.
- **Medium** — meaningful quality/consistency gap; should be addressed before reuse.
- **Low** — minor inconsistency or documentation hygiene.
- **Info** — observation / context, no action strictly required.

---

## Findings

### 1. `dragon-flight/plan.md`

- **F-GAMES-B04-001** — *Low* — Line 27. Phase 4's final "Measure - User Manual Verification" task is marked `[x]` but, unlike Phases 1–3 (lines 8, 14, 21 each carry a `[commit: …]`/checkpoint hash), it carries **no checkpoint commit hash**. Verification completion for the final integration phase is therefore unauditable from the plan.
- **F-GAMES-B04-002** — *Info* — Lines 24–26. App integration relies on `useGameStore` + "XP completion flow" (line 24) and accessibility/mobile-touch tuning (line 26) but these are single bullet tasks with no sub-criteria; depth of accessibility work cannot be confirmed from the plan.

### 2. `dragon-flight/spec.md`

- **F-GAMES-B04-003** — *Medium* — Lines 56–58 (XP) + 8–11 (static export). XP is exposed only "via the game completion callback/store so the main platform can persist it." There is **no tenant/`schoolId` scoping or progress-record contract** defined. For importability into Reading/Primary (multi-tenant, `schoolId`-scoped per root `AGENTS.md`), a bare callback/store is insufficient — the persistence boundary, schema, and tenant scoping are undefined.
- **F-GAMES-B04-004** — *High* — Lines 8–11 vs Lines 38–40. The track mandates **Next.js `output: 'export'` static build**, yet the game depends on per-run vocabulary (prompt + distractor translations). A statically-exported app cannot run server-side, tenant-scoped sentence/vocabulary fetching; this architectural tension (static export + dynamic per-student content) is unaddressed and directly impacts Reading/Primary import. (Corroborated by the recurring `force-static` API bugs in F-GAMES-B04-029.)
- **F-GAMES-B04-005** — *Medium* — Line 57. `XP = Math.floor(correctAnswers * accuracy)`. With `accuracy` as a 0–1 fraction this collapses XP heavily (e.g., 10 correct @ 0.8 → 8 XP) and is non-monotonic vs raw effort; with `accuracy` as a percentage the formula explodes. The unit of `accuracy` is **not specified**, leaving scoring ambiguous and inconsistent with other games in this batch (Dungeon Liberator caps at 10 XP; Enchanted Library uses mana-as-score that can go negative).
- **F-GAMES-B04-006** — *Medium* — Lines 51–52. Difficulty/win uses `bossPower = max(3, ceil(totalAttempts*0.6))`, victory if `dragonCount >= bossPower`. Because both `totalAttempts` and dragon gains scale with play, the threshold is self-referential; balance/age-appropriateness is asserted, not validated. (See divergence introduced by the reskin, F-GAMES-B04-013.)
- **F-GAMES-B04-007** — *Low* — Lines 71–73. Two **Open Questions remain unanswered** (Dragon Flight–specific assets; whether correct gate grants more than +1) in a track whose plan (file 1) is fully checked off. Open questions should be resolved or migrated before archival.
- **F-GAMES-B04-008** — *Info* — Lines 60–64. Visual/UX notes ("Modern Clean", distinct success/failure feedback, responsive portrait+desktop, Framer Motion) are aesthetic-only; **no accessibility requirements** (keyboard-only completeness beyond arrows, focus states, ARIA, color-contrast, reduced-motion) are specified despite Framer Motion animations.

### 3. `dragon-rider-reskin-20260131/metadata.json`

- **F-GAMES-B04-009** — *Low* — Lines 7–8. `created` `2026-01-31` but `completed_at` `2026-03-20T12:00:00Z` — a ~7-week span for a declared "cosmetic reskin," consistent with the substantial gameplay changes later added in Phase 5 (see F-GAMES-B04-013). Metadata `description` (line 9: "maintaining the same gameplay mechanics") is **contradicted** by the eventual scope.

### 4. `dragon-rider-reskin-20260131/plan.md`

- **F-GAMES-B04-010** — *Medium* — Lines 6–9, 24, 38, 48, 59. The entire game is built by **copy-paste** (`dragonFlight.ts` → `dragonRider.ts`, component, page, and tests all copied). This duplicates game logic, tests, and XP code rather than sharing a runtime module — a maintainability/shared-runtime concern: divergence (Phase 5) now lives in only one copy, and bug fixes must be applied twice.
- **F-GAMES-B04-011** — *High* — Lines 47–53 (spec non-requirements) **violated by** Lines 102–161 (Phase 5 "Gameplay Adjustments"). The reskin spec explicitly says "No gameplay changes / No changes to scoring or XP systems," yet Phase 5 changes duration 30s→150s (line 115), redesigns boss battle with proximity + health meter (lines 122–136), and raises the victory multiplier 0.6→0.75–0.8 / adds a `max(50, …)` floor (lines 143–145). Scope crept well beyond a reskin without a spec update.
- **F-GAMES-B04-012** — *Medium* — Lines 104–110. Phase 5.1 reveals the reskin **shipped with player and army sprites rendered upside-down** (scaleY sign bug) requiring a later fix — an asset-orientation defect that passed the Phase 4 "manual testing complete" gate (line 92). Indicates visual QA gaps in the copy workflow.
- **F-GAMES-B04-013** — *High* — Lines 138–148. Difficulty target raised to require **75–80% accuracy across a 2.5-minute run** (≈90–120 attempts, boss power 54–72). For a game family intended to be importable into **Primary** (young learners), a long-duration, high-accuracy-floor win condition is an age-appropriateness/difficulty-balance risk; the plan sets the threshold by arithmetic estimate (lines 140–141) with no playtest evidence cited.
- **F-GAMES-B04-014** — *Low* — Lines 18, 42, 63, 71. Repeated ">80% coverage" claims are self-asserted in checkboxes with no coverage figure or report artifact referenced; test-quality cannot be verified from the plan.

### 5. `dragon-rider-reskin-20260131/spec.md`

- **F-GAMES-B04-015** — *Medium* — Lines 53–61. **Acceptance Criteria are all left unchecked `[ ]`** even though `metadata.json` (file 3, line 6) reports `status: "completed"`. Either the acceptance was never recorded or the spec was not updated on closeout — an audit-trail integrity gap.
- **F-GAMES-B04-016** — *Low* — Lines 20–22 vs plan lines 27–30, 104–107. Spec lists both `player-3x3-sheet-facing-camera.png` and `player-3x3-sheet-facing-down.png`; the plan picks "facing-camera" then immediately fixes orientation. Asset-set selection rationale is unclear and at least one provided sprite appears unused (dead asset).
- **F-GAMES-B04-017** — *Info* — Lines 29, 44, 67. Vocabulary is loaded from a hardcoded `'dragon-rider'` dataset key; no tenant/curriculum-source contract — same importability gap as F-GAMES-B04-003.

### 6. `dungeon-liberator-20260321/metadata.json`

- **F-GAMES-B04-018** — *Low* — Lines 5–6. `created_at 16:15` and `completed_at 17:30` the same day — a full overhead snake game with movement, trailing-line, monster AI, HP, win/lose, and (claimed) strict TDD implemented in **~75 minutes**. The compressed timeline is inconsistent with the 5-phase TDD plan and casts doubt on test depth (see F-GAMES-B04-022).

### 7. `dungeon-liberator-20260321/plan.md`

- **F-GAMES-B04-019** — *Medium* — Lines 17–41. Phases 2–4 are labeled "(TDD)" and every task is checked, but **no commit hashes/checkpoints** accompany any task (contrast with dragon-flight's `[commit: …]`). TDD adherence is unverifiable from the plan.
- **F-GAMES-B04-020** — *Medium* — Lines 11–12, 38–40. Movement (`speed: 200`), monster AI, and the win/lose loop are single bullets; collision/`pathHistory` mechanics (lines 53–55) are described only in "Technical Notes" pseudocode. No performance budget (FPS), no mobile input verification task, no accessibility task in the plan.
- **F-GAMES-B04-021** — *Info* — Line 11. Route `src/app/[locale]/(student)/student/games/sentence/dungeon-liberator/page.tsx` uses a `[locale]` + `(student)` segment structure that differs from dragon-flight's `src/app/games/dragon-flight/page.tsx`. Two divergent routing conventions across the games app complicate a shared runtime and Reading/Primary import.

### 8. `dungeon-liberator-20260321/spec.md`

- **F-GAMES-B04-022** — *Critical* — Whole-file vs file 10 line 13. This spec/plan claims a fully TDD-built game, but the later bug-fix track plan (`dungeon-liberator-sentences-bug/plan.md`, line 13) states **"No existing tests for this game."** This is a direct contradiction: the "strict TDD" game shipped with **zero tests**, and a field-name bug (F-GAMES-B04-024) survived into production. Major test-quality and readiness failure.
- **F-GAMES-B04-023** — *Medium* — Lines 34–38. XP/scoring: base 1/word, +2 perfect, +2 speed, **max 10**. This caps and scales completely differently from Dragon Flight (`floor(correct*accuracy)`) and Enchanted Library (mana score). Cross-game XP normalization for a unified Reading/Primary progress system is undefined — importability/scoring-consistency risk.
- **F-GAMES-B04-024** — *Low* — Lines 59–78 (config) + 9–12. Mobile-first 390×844 is correctly targeted (good), but the spec models sentence words as prisoners without defining the vocabulary field contract — the source of the later `term`/`sentence` bug (file 11).

### 9. `dungeon-liberator-sentences-bug/metadata.json`

- **F-GAMES-B04-025** — *Low* — Lines 8–9. `created 2026-04-13`, `updated 2026-04-21` for a "high" priority bug; an ~8-day open window on a game that **could not load any sentences** (i.e., was unplayable) suggests the broken game was live/archived as "complete" for a meaningful period.

### 10. `dungeon-liberator-sentences-bug/plan.md`

- **F-GAMES-B04-026** — *High* — Line 13. "**No existing tests for this game; pre-existing TS errors are unrelated.**" Confirms F-GAMES-B04-022. The fix itself (changing `.sentence`→`.term`, lines 5–10) was also **not accompanied by any new test**, so the regression (a content-loading failure) remains uncovered after the fix.
- **F-GAMES-B04-027** — *Medium* — Lines 12–13. Verification is "TypeScript compilation — no new errors" only. No runtime/integration check that sentences now actually render is recorded for a bug whose symptom was "sentences not loading." Verification is weaker than the defect class warrants.

### 11. `dungeon-liberator-sentences-bug/spec.md`

- **F-GAMES-B04-028** — *High* — Lines 15–25. Documents a **type-safety hole in the shared `createSentencesRoute` factory**: it types params as `VocabularyItem[]` but excess-property checks did not catch `{ sentence }` vs required `{ term }`, yielding `term: undefined` at runtime. This is a *shared-runtime contract* defect affecting every game using the factory, not just Dungeon Liberator — high blast radius for importability. The spec records the root cause but no factory-level guard (e.g., stricter typing/Zod validation per root `AGENTS.md` boundary-validation rule) is proposed.
- **F-GAMES-B04-029** — *Medium* — Lines 27–28. "Minimum is 5 sentences" enforced by an `INSUFFICIENT_SENTENCES` warning; the game shipped with only 3. Same insufficient-data class as `game_data_arrays_fix` (file 20) — a **recurring systemic content-array shortfall** across multiple games.
- **F-GAMES-B04-030** — *Low* — Line 5 (`Status: In Progress`) vs `metadata.json` line 7 (`status: completed`). Spec status not updated on closeout — audit-trail inconsistency.

### 12. `enchanted-library_20260130/metadata.json`

- **F-GAMES-B04-031** — *Medium* — Line 4. `status: "new"` while `plan.md` (file 13) shows **all 9 phases completed** with checkpoint hashes and a full summary. Metadata is stale/never updated — misleads any reuse-readiness query and is inconsistent with the batch's "archive" placement.

### 13. `enchanted-library_20260130/plan.md`

- **F-GAMES-B04-032** — *High* — Lines 135–141, 171–176 vs `spec.md` lines 38–42, 81. The plan **revises the shield from "freezes player" to "player can move when shield active"**, directly contradicting the spec acceptance criterion (spec line 81: "freezes player, bounces spirits"). Spec was not updated; acceptance criterion #7 is therefore unmet-as-written yet the phase is checked complete.
- **F-GAMES-B04-033** — *Medium* — Line 272. Phase 5 "Measure - User Manual Verification" is left **unchecked `[ ]`** while Phases 1–4 and 6–9 verifications are checked. The rendering/UI phase lacks recorded manual verification.
- **F-GAMES-B04-034** — *High* — Lines 426–428. Phase 8.8 documents **two performance defects fixed late**: a "performance leak in resize observer" and a "critical performance slowdown … stale state death spiral" requiring a `useRef` game-loop rewrite. These indicate the React-Konva loop pattern was a genuine readiness risk; any game reusing the earlier pattern (shared runtime) may share the defect.
- **F-GAMES-B04-035** — *Medium* — Lines 117–124, 210–217. Final score = current mana, which **"can be negative"** (lines 119, 214). A negative final score has no defined mapping to platform XP/progress; importing into Reading/Primary progress (which expects non-negative XP) is undefined and risks data anomalies.
- **F-GAMES-B04-036** — *Low* — Lines 461–476. Accessibility/cross-browser are addressed (44×44px touch targets line 466, contrast line 465, Chrome/Firefox/Safari/mobile lines 471–474) — **positive**, but all are checkbox assertions with no evidence artifact; "test with primary school age group (if possible)" (line 462) is explicitly optional, so age-appropriate UX validation is unconfirmed.
- **F-GAMES-B04-037** — *Info* — Lines 290, 298, 300. Line 300 duplicates the line-298 "Verification" sentence (copy-paste artifact). Documentation hygiene only.

### 14. `enchanted-library_20260130/spec.md`

- **F-GAMES-B04-038** — *Medium* — Line 10 (`800×600` arena) vs root `apps/advantage-games/AGENTS.md` mandate "Mobile-first, portrait, 390×844 reference." Enchanted Library targets a **landscape 800×600** arena, diverging from the platform's portrait standard used by Dungeon Liberator (390×844). Mobile-portrait fit and consistency for Reading/Primary import is a risk.
- **F-GAMES-B04-039** — *Medium* — Line 64 ("smooth 60 FPS") vs `plan.md` line 455 ("Verify 30+ FPS") and the track Summary line 491 ("30+ FPS"). The **performance target was silently lowered** from 60 to 30 FPS between spec and plan with no rationale; corroborated by the late perf fixes (F-GAMES-B04-034).
- **F-GAMES-B04-040** — *Medium* — Lines 88–94. Out of scope: **"Sound effects and background music," "Leaderboards or score persistence," and "difficulty level selection."** For platform import these are not trivial omissions — no audio (audio-readiness gap) and explicitly no score persistence/leaderboard means the game produces a score it cannot persist (compounds F-GAMES-B04-035).
- **F-GAMES-B04-041** — *Low* — Lines 48–52. "Mana can go negative" is stated as a feature; combined with mana-as-sole-meter (no HP), a player can be in deeply negative mana with no fail state tied to it — only the 2×-collection win condition ends the game, so there is **no lose condition** (spec lists none). Difficulty/engagement risk for the target age group.

### 15. `game-triage-fidelity-20260320/index.md`

- **F-GAMES-B04-042** — *Info* — Lines 1–5. Index is a minimal link stub (spec/plan/metadata). No issues; provided for completeness.

### 16. `game-triage-fidelity-20260320/metadata.json`

- **F-GAMES-B04-043** — *Info* — Lines 4–8. `type: chore`, completed same day (`created 11:05` → `completed 21:10`). A ~10-hour window to triage and fix 8 games (per spec scope) is aggressive; corroborates concern that fixes were applied broadly but lightly (see F-GAMES-B04-046).

### 17. `game-triage-fidelity-20260320/plan.md`

- **F-GAMES-B04-044** — *Critical* — Lines 66–74 (Labyrinth) + 76–78 (Abyssal). The triage discovered that shipped, "completed" games had **fatal readiness defects**: API routes missing `export const dynamic = "force-static"` causing **500 errors on sentence fetch** (line 66), `vocabulary` undefined ReferenceError on start screen (line 67), and Labyrinth's `startLabyrinthGoblinKing()` "imported but never called, so state stayed at `status:'start'`" — i.e., **the game never started at all** (line 68). Games passing their own track gates while being non-functional is a systemic readiness/test-quality failure across the suite.
- **F-GAMES-B04-045** — *High* — Lines 48–50. Triage migrated **all 6 (later "all 8") action games from `setInterval(50ms)` to `requestAnimationFrame`** and updated the `vocab-game-builder` template (line 50, commit `c1714f7`). This confirms a prior shared-runtime performance anti-pattern (20 FPS `setInterval`) was pervasive; games not re-verified after migration carry regression risk.
- **F-GAMES-B04-046** — *High* — Line 95. Phase 4 task "(If started) Audit 'Griffin Sky-Joust' and 'Realm Carver'" is **left unchecked `[ ]`**, yet the track `metadata.json` is `status: completed` and the spec (file 18 lines 13–14) lists both games in scope. **Two in-scope games were not audited**, but the track closed — incomplete coverage masked by closure.
- **F-GAMES-B04-047** — *Medium* — Lines 15, 18, 21, 55, 58, 92. Numerous "Audit … against checklist" tasks are checked with **no commit hashes**, while the corresponding "Fix" tasks carry hashes. The audit step (the evidence basis) is unverifiable.
- **F-GAMES-B04-048** — *Medium* — Lines 30–38, 65–74. Documented gameplay bugs reveal **accessibility/input defects**: "Arrow keys stop responding for ~1 second (keyboard repeat delay)" (line 33), "Arrow keys scrolled the page instead of moving the player" (lines 70, 85 `preventDefault`), and tap/click targets too small/non-responsive (line 37). Keyboard and touch input correctness was broken across multiple games — a recurring accessibility/mobile class.
- **F-GAMES-B04-049** — *Medium* — Lines 82–83. The `force-static` and `vocabulary→sentences` bugs were fixed **in the route/start-screen templates** "to prevent recurrence," confirming the defects originated in shared scaffolding — high blast radius and directly relevant to Reading/Primary import (static-export + content-fetch tension, cf. F-GAMES-B04-004).
- **F-GAMES-B04-050** — *Low* — Lines 28–29. Village Guardian "ends after one level (victory). Should continue until player dies …" — a difficulty/progression design reversal applied during triage with no spec amendment recorded in this artifact.

### 18. `game-triage-fidelity-20260320/spec.md`

- **F-GAMES-B04-051** — *Medium* — Lines 25, 31 vs the games' own specs. The audit standard here is **"30+ FPS"** (line 25) and ">80% coverage" (line 31), but Enchanted Library's spec demanded 60 FPS (file 14 line 64). The fidelity bar is inconsistent with individual game specs, so "passing triage" does not guarantee meeting a game's own stated NFRs.
- **F-GAMES-B04-052** — *Low* — Lines 17, 28–32. Acceptance is framed around "all listed games audited" and ">80% coverage," but the plan shows two listed games un-audited (F-GAMES-B04-046); the spec's acceptance criteria were therefore not fully met at closure.

### 19. `game_data_arrays_fix_20260413/metadata.json`

- **F-GAMES-B04-053** — *Low* — Lines 8–9. `created 2026-04-13`, `updated 2026-04-21`. Same dates as the Dungeon Liberator sentences bug (file 9) — a cluster of content-data defects surfacing together, reinforcing the systemic insufficient-data pattern (F-GAMES-B04-029).

### 20. `game_data_arrays_fix_20260413/plan.md`

- **F-GAMES-B04-054** — *High* — Lines 5–12. Confirms **two more games (gryphon-patrol, haunted-library) shipped with insufficient/invalid sentence data**: gryphon-patrol had <10 sentences (8 added → 11), and `public/vocab/default.json` contained **single-word entries used where 3–10-word sentences were required** (line 12). Invalid seed/content data passing as valid is a content-quality and readiness defect that the games' own test suites did not catch until a dedicated data-array test (lines 7, 13) was added.
- **F-GAMES-B04-055** — *Medium* — Lines 11–12. `public/vocab/default.json` is a **shared default vocabulary asset**; bad data there affects any game falling back to defaults (e.g., haunted-library). Shared-content correctness has cross-game blast radius for Reading/Primary import.
- **F-GAMES-B04-056** — *Low* — Lines 17–18. Verification is "gameDataArrays tests 7/7 PASSED" + a tech-debt update. The fix added data-shape tests (good) but no per-game content schema/Zod validation is introduced to prevent recurrence at the boundary (per root `AGENTS.md` external-boundary validation guidance).

---

## Cross-Cutting Themes (synthesis, no new IDs)

1. **Test quality is overstated.** "Strict TDD / >80% coverage" is asserted across plans (B04-014, B04-019, B04-051) yet Dungeon Liberator shipped with zero tests (B04-022/026), Labyrinth shipped non-functional (B04-044), and content bugs went uncaught (B04-028/054). Coverage/TDD claims in these artifacts are not independently evidenced.
2. **Shared-runtime defects with broad blast radius.** `setInterval`→rAF migration (B04-045), `createSentencesRoute` type hole + `force-static` template bug (B04-028/044/049), and `default.json` content (B04-055) all originate in shared scaffolding/templates — the most important reuse risk for Reading/Primary.
3. **Scoring/XP/progress are non-uniform and sometimes unpersistable.** Three games use three different scoring models (B04-005/023/035), some producing negative or capped scores, with **no tenant-scoped progress contract anywhere** (B04-003/017/035/040). This is the central importability gap.
4. **Static-export vs dynamic content tension** (B04-004/049) is unresolved and recurs as `force-static` bugs.
5. **Mobile/portrait and FPS standards drift** (B04-038/039/051) between specs and the triage bar.
6. **Audit-trail integrity:** stale/contradictory statuses (B04-009/015/030/031), missing checkpoint hashes (B04-001/019/047), and un-audited in-scope games closed as complete (B04-046).
7. **Accessibility is inconsistent:** Enchanted Library addresses touch targets/contrast (B04-036) while triage reveals broken keyboard/touch input elsewhere (B04-048); no ARIA/reduced-motion/screen-reader requirements appear in any spec (B04-008).

---

## Limitations

- **Artifact-only batch:** All 20 files are Measure planning/metadata documents. **No game source code, test files, assets, audio, or runtime config were included in `games-batch-04`.** Findings about readiness, performance, scoring, importability, and test quality are therefore *inferred* from documented contracts and self-reported plan/spec content — they are not verified against the actual `.ts`/`.tsx`/asset implementations.
- **Claims not independently verified:** Checkbox completions, ">80% coverage," FPS numbers, cross-browser passes, and "manual verification" markers were taken at face value from the documents; this review did not run tests, builds, or the games.
- **No source edits were made** (read-only review, per instructions).
- **Commit hashes referenced** in plans were not resolved against git history in this review.
- **Cross-batch dependencies:** Some games referenced here (e.g., the 8 triage games, gryphon-patrol, haunted-library) have their source/spec artifacts likely in other batches; this report does not duplicate or pre-empt those reviews.
- **No acceptance, sign-off, or closeout determination is made** — this document is a findings inventory only.

---

## Findings Index

`F-GAMES-B04-001` … `F-GAMES-B04-056` (56 findings).

- Critical: 002 → 022, 044 (2: B04-022, B04-044).
- High: 004, 011, 013, 026, 028, 032, 034, 044(also), 045, 046, 054 — and B04-049 (high-blast template).
- Counts by severity — Critical: 2 (022, 044); High: 11 (004, 011, 013, 026, 028, 032, 034, 045, 046, 049, 054); Medium: 19; Low: 16; Info: 8.
