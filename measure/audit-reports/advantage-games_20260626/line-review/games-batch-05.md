# Line Review — games-batch-05

- **Track:** `advantage_games_review_20260626`
- **Batch:** `games-batch-05` (20 files)
- **Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
- **Reviewer mode:** Read-only line-by-line review. No source code edited.
- **File list source:** `/tmp/opencode/games-batch-05`
- **Report path:** `measure/audit-reports/advantage-games_20260626/line-review/games-batch-05.md`

## Batch Character

All 20 files in this batch are **Measure process documents** (track `spec.md`, `plan.md`, `metadata.json`, `index.md`) living under `apps/advantage-games/measure/archive/`. None are executable source, tests, or assets. Therefore findings here are documentation-quality, traceability, and **claims-vs-implementation** observations rather than runtime defects. Where a doc asserts a game state (e.g., "COMPLETE", coverage %, unchecked verification), I flag the readiness/traceability risk it implies for the parent review; I did **not** open the referenced source files (out of this batch's scope) to confirm or refute — those confirmations are explicitly listed under Limitations.

Severity scale: **High** (blocks game-readiness/import decisions or asserts unverified completion), **Medium** (traceability/quality gap that can mislead readiness assessment), **Low** (doc hygiene / minor inconsistency), **Info** (context for the matrix, no action).

---

## Files Reviewed

| # | File | Type | Verdict |
|---|------|------|---------|
| 1 | `measure/archive/game_data_arrays_fix_20260413/spec.md` | bug spec | Findings |
| 2 | `measure/archive/games-qa-qc_20260328/index.md` | track index | Findings |
| 3 | `measure/archive/games-qa-qc_20260328/metadata.json` | metadata | Findings |
| 4 | `measure/archive/games-qa-qc_20260328/plan.md` | plan | Findings |
| 5 | `measure/archive/games-qa-qc_20260328/spec.md` | spec | Findings |
| 6 | `measure/archive/griffin-riders-escape/metadata.json` | metadata | Findings |
| 7 | `measure/archive/griffin-riders-escape/plan.md` | plan | Findings |
| 8 | `measure/archive/griffin-riders-escape/spec.md` | game design doc | Findings |
| 9 | `measure/archive/griffin-sky-joust-20260320/metadata.json` | metadata | Clean |
| 10 | `measure/archive/griffin-sky-joust-20260320/plan.md` | plan | Findings |
| 11 | `measure/archive/griffin-sky-joust-20260320/spec.md` | game design doc | Findings |
| 12 | `measure/archive/griffin_sky_joust_any_type_fix_20260408/metadata.json` | metadata | Findings |
| 13 | `measure/archive/griffin_sky_joust_any_type_fix_20260408/plan.md` | plan | Findings |
| 14 | `measure/archive/griffin_sky_joust_any_type_fix_20260408/spec.md` | spec | Clean |
| 15 | `measure/archive/gryphon-patrol-20260321/metadata.json` | metadata | Clean |
| 16 | `measure/archive/gryphon-patrol-20260321/plan.md` | plan | Findings |
| 17 | `measure/archive/gryphon-patrol-20260321/spec.md` | game design doc | Findings |
| 18 | `measure/archive/gryphon_patrol_deps_fix_20260417/metadata.json` | metadata | Clean |
| 19 | `measure/archive/gryphon_patrol_deps_fix_20260417/plan.md` | plan | Findings |
| 20 | `measure/archive/gryphon_patrol_deps_fix_20260417/spec.md` | bug spec | Clean |

---

## Findings

### F-GAMES-B05-001 — Archived bug track left in unfinished `SPEC` status (Medium)
**File:** `measure/archive/game_data_arrays_fix_20260413/spec.md:11`
The track is in the `archive/` directory (implying done) yet line 11 reads `## Status: SPEC`. There is no completion record in this file. An archived-but-unstarted/unverified data-fix track means the two defects it names are of **unknown resolution status**:
- L4: `gryphon-patrol/sentences/route.ts has only 3 sentences (needs >= 10)` — directly affects game-readiness (insufficient content → game cannot run a full session).
- L6: `public/vocab/default.json has 0 valid sentences for haunted-library` — readiness blocker for the default/fallback content path that import targets (Reading/Primary) would rely on.

**Impact:** Content-sufficiency for `gryphon-patrol` and `haunted-library` cannot be assumed ready from docs alone. Cross-check needed against the actual route file (noted as confirmed-fixed elsewhere — see F-GAMES-B05-014) and `default.json`.
**Recommendation:** Confirm against source whether the ≥10 sentence and default.json fixes landed; reconcile the dangling `Status: SPEC` marker in the readiness matrix.

### F-GAMES-B05-002 — QA/QC metadata: status `in_progress` but plan declares "TRACK COMPLETE" (High)
**Files:** `measure/archive/games-qa-qc_20260328/metadata.json:4` vs `measure/archive/games-qa-qc_20260328/plan.md:553`
`metadata.json` line 4 `"status": "in_progress"` contradicts `plan.md` line 553 `## QA/QC TRACK COMPLETE`. The track is archived. This is the master QA evidence trail for **all 26 games**; an ambiguous completion state undermines using it as a readiness source.
**Impact:** The single most load-bearing QA artifact for the gallery has an inconsistent terminal state. Readiness rows that cite "QA complete" inherit this ambiguity.
**Recommendation:** Treat QA/QC completion as **unverified** in the matrix until reconciled.

### F-GAMES-B05-003 — QA/QC estimated vs actual task gap unexplained (Low)
**File:** `measure/archive/games-qa-qc_20260328/metadata.json:8-10`
`estimated_tasks: 131`, `actual_tasks: 124`, `deviation_notes: ""`. 7 tasks short with an empty deviation note. Several `Measure - User Manual Verification` tasks remain unchecked in the plan (see F-GAMES-B05-005), plausibly the missing 7, but this is not documented.
**Recommendation:** Document the 7-task deviation; likely the unchecked manual verifications.

### F-GAMES-B05-004 — Typos in QA metadata/index reduce traceability quality (Low)
**Files:** `measure/archive/games-qa-qc_20260328/index.md:10` ("screenshotcapture"); `metadata.json:7` ("all26 games").
Cosmetic but indicates docs were not proofread; minor confidence signal for the QA artifact.

### F-GAMES-B05-005 — Manual verification gates left unchecked across QA phases (High)
**File:** `measure/archive/games-qa-qc_20260328/plan.md`
Multiple `Measure - User Manual Verification` gates are still `[ ]` (unchecked) despite the track being archived/"complete":
- Phase 1 archers-revenge: L44 `[ ]`
- Phase 2 dragon-flight: L67 `[ ]`
- Phase 3 dragon-rider: L89 `[ ]`
- Phase 4 enchanted-library: L100 `[ ]`
- Phase 5 magic-defense: L111 `[ ]`
- Phase 6 paladins-twin-soul: L125 `[ ]`

**Impact:** Six games' human-in-the-loop QA verification was never recorded as performed, yet the track was archived as complete. This is a direct **game-readiness** evidence gap for archers-revenge, dragon-flight, dragon-rider, enchanted-library, magic-defense, and paladins-twin-soul.
**Recommendation:** Mark these six as "automated-tested, manual-verification-missing" in the readiness matrix.

### F-GAMES-B05-006 — paladins-twin-soul coverage below threshold, phase left partial (High)
**File:** `measure/archive/games-qa-qc_20260328/plan.md:115-125`
L115 `[~]` (in-progress) task; L118 records `75.38% overall / 91.43% component / 94.80% logic slice - STILL BELOW THRESHOLD` against the stated >80% bar (spec.md L56, L88). L119 notes persistent Konva prop warnings in the DOM test renderer. Phase manual verification (L125) unchecked.
**Impact:** paladins-twin-soul fails the project's own ≥80% coverage gate (test-quality finding) and carries unresolved test-renderer warnings. **Test-gap** entry required.
**Recommendation:** Record paladins-twin-soul as below-coverage; flag Konva-in-jsdom warning pattern as a shared test-harness smell (see F-GAMES-B05-007).

### F-GAMES-B05-007 — Konva/DOM test-renderer warnings noted as accepted noise (Medium)
**File:** `measure/archive/games-qa-qc_20260328/plan.md:119`
"Test run still emits Konva prop warnings in the React DOM test renderer." This is a recurring shared-runtime test-quality issue (React-Konva components rendered under jsdom/React-DOM rather than a canvas-aware renderer). Likely affects many games' unit suites, not just paladins.
**Impact:** Noisy, potentially masking real prop-type regressions across the shared canvas component layer.
**Recommendation:** Track as a shared test-infrastructure finding; consider a Konva-aware test renderer/mocks audit.

### F-GAMES-B05-008 — realm-carver coverage below threshold + `any` tech-debt accepted (Medium)
**File:** `measure/archive/games-qa-qc_20260328/plan.md:420,424`
L420 `75.51% - below threshold, documented in tech-debt`; L424 `Known issue with 'any' usage in Konva mock (tech-debt)`. Coverage gate and `any`-type policy both waived to tech-debt.
**Impact:** realm-carver is below the coverage bar and carries `any` typing in test mocks — test-quality and type-safety gaps relevant to import readiness.
**Recommendation:** Carry into test-gaps; verify tech-debt entries still open.

### F-GAMES-B05-009 — squires-gauntlet skipped: game not implemented (High / Info for readiness)
**File:** `measure/archive/games-qa-qc_20260328/plan.md:503-507`, also `spec.md:35` and `index.md:24` list it as game #24.
L503 `(SKIPPED - NOT IMPLEMENTED)`; L506 "only empty placeholder directory exists." The game is advertised in the inventory (26 games) but does not exist.
**Impact:** The "26 games" count is effectively 25 shippable. Readiness matrix must mark squires-gauntlet as **not implemented / placeholder only**.

### F-GAMES-B05-010 — Build blocked by pre-existing lint errors outside slice (Medium)
**File:** `measure/archive/games-qa-qc_20260328/plan.md:34`
"`npm run build` is still blocked by pre-existing lint errors in unrelated files outside the archers-revenge slice." Indicates the app may not produce a clean production build — a **performance/deploy/import** concern for any consumer expecting `advantage-games` to build cleanly.
**Recommendation:** Verify current build status as part of Phase 4 gates; this predates the batch but is a standing risk.

### F-GAMES-B05-011 — QA spec explicitly de-scopes accessibility, i18n, cross-browser, perf (High for parent scope)
**File:** `measure/archive/games-qa-qc_20260328/spec.md:94-100`
Out-of-scope list: Performance/load testing (L96), Accessibility/WCAG (L97), Localization/i18n (L98), Cross-browser (L100, "Chrome-focused"). The QA track therefore provides **no evidence** on four dimensions the parent review explicitly requires (accessibility, performance, mobile/browser compatibility, age-appropriate UX is partially design-doc only).
**Impact:** The existing QA artifact cannot be cited as accessibility/browser/perf coverage. These dimensions are unaudited gallery-wide.
**Recommendation:** Treat accessibility, cross-browser, and performance as **net-new audit surface** in the review; do not inherit QA-track green status for them.

### F-GAMES-B05-012 — Known-issues list documents unresolved lint/type/hook debt across named games (Medium)
**File:** `measure/archive/games-qa-qc_20260328/spec.md:102-110`
Enumerates standing issues: unescaped entities (griffin-sky-joust, storm-castle-tower, L106), missing hook deps (dragon-flight, magic-defense, L107), `any` usage (griffin-sky-joust, realm-carver, L108), unused vars (gryphon-patrol, potion-rush, L109), and inconsistent `onComplete`/`onEnd` callback naming across games (L110).
**Impact (import/readiness):** The **callback-naming inconsistency (L110)** is the most consequential for embeddability — a non-uniform completion callback contract (`onComplete` vs `onEnd`) directly complicates a single import shim for Reading/Primary. Some of these (griffin-sky-joust `any`, gryphon-patrol hook deps) were later fixed by tracks in this very batch (F-GAMES-B05-012 cross-refs #12-13, #19); others (storm-castle-tower unescaped entities, dragon-flight/magic-defense hook deps, potion-rush unused vars, callback naming) have **no corresponding fix track in this batch**.
**Recommendation:** Add the callback-naming divergence to import-contract gaps; verify which named lint/type issues remain open in current source.

### F-GAMES-B05-013 — griffin-riders-escape archived while metadata `in_progress` and plan incomplete (High)
**Files:** `measure/archive/griffin-riders-escape/metadata.json:5` (`"status": "in_progress"`, `actual_tasks: 19` of `estimated_tasks: 26`); `measure/archive/griffin-riders-escape/plan.md`.
The track sits in `archive/` yet is `in_progress` with substantive unchecked deliverables in plan.md:
- L39 `[ ] Implement lane switching animations (interpolation)` — core control polish.
- L41 `[ ] Verification: Manual check of rendering and lane switching` — never verified.
- L45-47 `[ ]` feedback effects (correct-word sparkles/speed/chime) unimplemented.
- L50 `[ ] Complete 3 full game sessions on different difficulties` — playthrough verification not done.
- L54 `[ ] Create cover image cover-griffin-riders-escape.png` — **asset missing** (gallery card art).
- L55 `[ ] Final build check: npm run build` — not run.
- L56 `[ ] Measure sync: Mark track completed and move to archive` — ironically unchecked though file is archived.

**Impact:** griffin-riders-escape is **not demonstrably ready**: missing cover asset, no build check, no playtest verification, incomplete lane-switch animation and correct-word feedback. High-priority readiness blocker; the archive placement is misleading.
**Recommendation:** Matrix row = "incomplete / archived prematurely"; list missing cover image under asset gaps and the build-check omission under gates.

### F-GAMES-B05-014 — gryphon-patrol sentence-count fix confirmed in QA build note (Info, positive)
**File:** `measure/archive/games-qa-qc_20260328/plan.md:413`
"Fixed missing `export const dynamic = "force-static"` in griffin-riders-escape and devourer-slime API routes during build verification." This is the static-export contract that matters for the GitHub Pages / static-site deploy path (see batch-00 `next-static-site.yml`). It partially corroborates that route work occurred, but note it does **not** confirm the gryphon-patrol/haunted-library sentence-count fixes from F-GAMES-B05-001.
**Recommendation:** Verify all game API routes declare `dynamic = "force-static"` consistently (static-export readiness) — a shared-runtime/import concern.

### F-GAMES-B05-015 — griffin-riders-escape XP/accuracy formula has divide-by-zero and integer-truncation risk (Medium)
**File:** `measure/archive/griffin-riders-escape/spec.md:41-42`
L41 `Math.floor(sentencesCompleted * 2 + correctWords * accuracy)`; L42 `accuracy = correctHits / (correctHits + wrongHits + obstacleHits)`. If the player completes/ends with zero hits of any kind, the denominator is 0 → `NaN` accuracy → `NaN` XP. Spec does not define the zero-hit guard. Also XP cap (other games cap at 10, e.g. griffin-sky-joust spec L46) is not stated here, so XP could exceed the gallery-standard 1–10 band, creating **inconsistent scoring/XP semantics across games** (leaderboard fairness/import concern).
**Impact:** Scoring divergence + potential NaN XP submitted to the complete/ranking endpoint.
**Recommendation:** Confirm the implementation guards `accuracy` denominator and caps XP; flag XP-band inconsistency vs the 1–10 convention used by sky-joust/gryphon-patrol.

### F-GAMES-B05-016 — Two distinct "griffin/gryphon" runner games with near-identical concept (Medium, import/dup risk)
**Files:** `griffin-riders-escape/spec.md:1-7`, `griffin-sky-joust-20260320/spec.md:1-7`, `gryphon-patrol-20260321/spec.md:1-7`
Three griffin/gryphon-themed sentence games with overlapping pseudo-3D / aerial / wrap-around mechanics and near-duplicate config structures (e.g., griffin-sky-joust config L93-121 and gryphon-patrol config L62-77 both define `gameWidth/gameHeight/player.initialHp`). This signals **reusable-runtime opportunity** (shared physics/lane/wrap-around module) and potential learner confusion (three similar flight games).
**Impact:** Duplicated game code → larger bundle, more maintenance, harder single import contract.
**Recommendation:** Note as a reusable-package opportunity (shared aerial-runner core) in migration-tracks; not a correctness defect.

### F-GAMES-B05-017 — griffin-riders-escape config example diverges from spec narrative (Low)
**File:** `measure/archive/griffin-riders-escape/spec.md:104` vs `:14`/`:21`/`:60`
Config (L100-113) defines `initialLives: 3` and L72-73 "3 Hearts", consistent. However the spec mixes "swipe/tap lane" (L13-14, L60) with desktop "Arrow keys or A/D" (L16); no defined behavior for when neither touch nor keyboard available (e.g., assistive switch input). Minor; relevant to accessibility/age-appropriate UX review downstream.

### F-GAMES-B05-018 — griffin-sky-joust spec contains stream-of-consciousness/uncertain text in normative section (Low)
**File:** `measure/archive/griffin-sky-joust-20260320/spec.md:69-70`
L70 "Wait, in Konva Y increases downwards. So player is higher if `player.y < enemy.y`." This is editorial musing left inside the Jousting Logic spec. Harmless but indicates the collision-direction rule was reasoned in-place; worth confirming the implemented above/below check matches (jousting fairness was called out as the "core differentiator" in plan.md L64).
**Recommendation:** Confirm implementation matches `player.y < enemy.y` = above; precise hitbox correctness was a stated risk.

### F-GAMES-B05-019 — griffin-sky-joust line-number drift between fix spec/plan (Low, traceability)
**Files:** `griffin_sky_joust_any_type_fix_20260408/spec.md:4` (cites "Line 151") vs `metadata.json:10` ("line 94") vs `plan.md:14` ("Line: 151").
The metadata techDebtItem says line 94; spec and plan say line 151. Inconsistent line anchors for the same `any` defect reduce traceability confidence, though the fix is marked completed (plan L30-39). Outcome plausibly fine; anchors are just contradictory.

### F-GAMES-B05-020 — Fix-track verification relies on "build succeeds" in lieu of passing the targeted tests (Low)
**File:** `measure/archive/griffin_sky_joust_any_type_fix_20260408/plan.md:32`
L32: "verify tests pass (unit tests pass, build succeeds)" — phrasing conflates build success with test success. Given F-GAMES-B05-010 (build sometimes blocked by unrelated lint), "build succeeds" is a weak gate. Minor; the unit-test claim is also present.

### F-GAMES-B05-021 — gryphon-patrol hook-deps fix is correct but signals a class of stale-closure bugs (Medium)
**File:** `measure/archive/gryphon_patrol_deps_fix_20260417/spec.md:4-12`, `plan.md:5-8`
The fix added `gameState.collectedWords.length` and `gameState.sentence.length` to a completion `useEffect` (spec L4, L15). The root-cause (L11-12) is a **stale-closure accuracy-calculation pattern in the end-of-game effect** — the exact pattern likely repeated in every game that computes accuracy/XP in a status-gated effect. Combined with F-GAMES-B05-015 (sky-joust/riders-escape accuracy formulas), this is a recurring **scoring-correctness** smell across the shared game-completion path.
**Impact:** Other games may submit stale accuracy/XP on completion.
**Recommendation:** Shared-runtime finding — audit all game completion `useEffect`/`onComplete` paths for the same dependency-array stale-closure pattern.

### F-GAMES-B05-022 — gryphon-patrol config gameHeight 844 vs sky-joust 700 — inconsistent reference viewport (Low)
**Files:** `gryphon-patrol-20260321/spec.md:65` (`gameHeight: 844`) vs `griffin-sky-joust-20260320/spec.md:95` (`gameHeight: 700`).
The project reference viewport is 390×844 (per AGENTS.md and riders-escape spec L11). griffin-sky-joust uses `gameHeight: 700`, deviating from the 844 mobile reference. Could cause letterboxing or scaling inconsistencies on the standard portrait device.
**Recommendation:** Verify sky-joust responsive scaling fills 390×844; flag under mobile-support review.

---

## Cross-Cutting Observations (for the parent review's shared sections)

- **Scoring/XP inconsistency:** XP caps and accuracy guards are not uniform across griffin-riders-escape (no cap stated, divide-by-zero risk — F-GAMES-B05-015), griffin-sky-joust (capped 10, spec L46), gryphon-patrol (capped 10, spec L39). → feeds findings.md "Scoring/XP" + leaderboard fairness.
- **Completion callback contract:** `onComplete` vs `onEnd` divergence (F-GAMES-B05-012) is a concrete **import-contract gap** for Reading/Primary embedding. → migration-tracks.md.
- **Stale-closure completion effects:** F-GAMES-B05-021 + F-GAMES-B05-015 suggest a shared-runtime audit of end-of-game accuracy/XP effects. → shared runtime findings.
- **Static-export contract:** `export const dynamic = "force-static"` was retrofitted (F-GAMES-B05-014); verify uniformity → embeddability/deploy.
- **Unaudited dimensions:** Accessibility, i18n, cross-browser, and performance were explicitly out-of-scope for the only gallery-wide QA track (F-GAMES-B05-011). These remain net-new audit surface.
- **Readiness exceptions surfaced by this batch:** squires-gauntlet (not implemented), griffin-riders-escape (archived prematurely, missing cover asset + build check + playtest), paladins-twin-soul & realm-carver (below coverage threshold), six games missing manual-verification sign-off.

---

## Limitations

1. **Documentation-only batch.** All 20 files are Measure specs/plans/metadata. No game source, test, asset, or runtime file is in this batch, so all "readiness" findings are derived from documented claims, not from inspecting implementation. Confirmation requires the corresponding source files (in later batches), e.g.:
   - `src/app/api/v1/games/gryphon-patrol/sentences/route.ts` (sentence count ≥10 — F-GAMES-B05-001).
   - `public/vocab/default.json` (excluded by manifest, `public/**`) — haunted-library sentence validity cannot be checked in this review at all.
   - `src/components/games/sentence/griffin-riders-escape/GriffinRidersEscapeGame.tsx` and `src/lib/games/griffinRidersEscape.ts` (XP guard/cap — F-GAMES-B05-015; lane-switch animation — F-GAMES-B05-013).
   - `src/lib/games/griffinSkyJoust*.ts` (jousting above/below check — F-GAMES-B05-018; gameHeight scaling — F-GAMES-B05-022).
   - `GryphonPatrolGame.tsx` completion effect (stale-closure class — F-GAMES-B05-021).
2. **Claim verification not performed.** Coverage percentages, "all pass", and "COMPLETE" markers in the QA plan were taken at face value and not re-run. The `metadata.status=in_progress` vs `plan=COMPLETE` contradiction (F-GAMES-B05-002) is unresolved by docs alone.
3. **No edits made.** Per instructions, no source or doc files were modified; the dangling `Status: SPEC` (F-GAMES-B05-001) and metadata/plan contradictions were reported, not corrected.
4. **No build/test/lint executed** in this batch; build-blocked claim (F-GAMES-B05-010) is reported from docs and should be confirmed in Phase 4 gates.
5. **Scope boundary:** This report makes **no acceptance or closeout claims** for the games or the parent track; it records findings only for downstream aggregation.

## Coverage Confirmation

All 20 files listed in `/tmp/opencode/games-batch-05` were read in full and are accounted for in the Files Reviewed table above: 5 marked Clean (griffin-sky-joust-20260320 metadata; griffin_sky_joust_any_type_fix spec; gryphon-patrol-20260321 metadata; gryphon_patrol_deps_fix metadata; gryphon_patrol_deps_fix spec) and 15 with findings.
