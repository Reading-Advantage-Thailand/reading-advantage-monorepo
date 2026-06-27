# Line-by-Line Review — games-batch-15

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-15`
**Scope source:** `/tmp/opencode/games-batch-15` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (index, metadata, plan, report, spec) for four compliance-audit tracks under `apps/advantage-games/measure/tracks/`. No `.ts`/`.tsx` runtime, component, or test files are in this batch. Source files were read-only inspected to validate the claims made by these documents.
**Finding ID scheme:** `F-GAMES-B15-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `griffin-riders-escape-compliance-audit_20260426/index.md` | griffin-riders-escape | index |
| 2 | `griffin-riders-escape-compliance-audit_20260426/metadata.json` | griffin-riders-escape | metadata |
| 3 | `griffin-riders-escape-compliance-audit_20260426/plan.md` | griffin-riders-escape | plan |
| 4 | `griffin-riders-escape-compliance-audit_20260426/report.md` | griffin-riders-escape | report |
| 5 | `griffin-riders-escape-compliance-audit_20260426/spec.md` | griffin-riders-escape | spec |
| 6 | `griffin-sky-joust-compliance-audit_20260426/index.md` | griffin-sky-joust | index |
| 7 | `griffin-sky-joust-compliance-audit_20260426/metadata.json` | griffin-sky-joust | metadata |
| 8 | `griffin-sky-joust-compliance-audit_20260426/plan.md` | griffin-sky-joust | plan |
| 9 | `griffin-sky-joust-compliance-audit_20260426/report.md` | griffin-sky-joust | report |
| 10 | `griffin-sky-joust-compliance-audit_20260426/spec.md` | griffin-sky-joust | spec |
| 11 | `gryphon-patrol-compliance-audit_20260426/index.md` | gryphon-patrol | index |
| 12 | `gryphon-patrol-compliance-audit_20260426/metadata.json` | gryphon-patrol | metadata |
| 13 | `gryphon-patrol-compliance-audit_20260426/plan.md` | gryphon-patrol | plan |
| 14 | `gryphon-patrol-compliance-audit_20260426/report.md` | gryphon-patrol | report |
| 15 | `gryphon-patrol-compliance-audit_20260426/spec.md` | gryphon-patrol | spec |
| 16 | `haunted-library-compliance-audit_20260426/index.md` | haunted-library | index |
| 17 | `haunted-library-compliance-audit_20260426/metadata.json` | haunted-library | metadata |
| 18 | `haunted-library-compliance-audit_20260426/plan.md` | haunted-library | plan |
| 19 | `haunted-library-compliance-audit_20260426/report.md` | haunted-library | report |
| 20 | `haunted-library-compliance-audit_20260426/spec.md` | haunted-library | spec |

All four tracks are self-described compliance audits of `sentence`-type games against a shared 25-point platform spec. The batch is documentation; runtime quality is asserted by the reports, so findings below focus on (a) internal consistency of the documents, (b) verifiability of claims against the actual repo, and (c) readiness/portability signals these documents surface.

---

## Cross-Batch Verification Performed

The following claims were spot-checked against the live repo (read-only). Results feed several findings:

- Logic, component, and test files exist for all four games (`src/lib/games/*.ts`, `src/components/games/sentence/*/`). Confirmed.
- `calculateXP` exists in all four logic files. Confirmed.
- `useGameFullscreen` and `requestAnimationFrame` present in all four components. Confirmed.
- Registry entries exist in `src/lib/gameCards.ts` for all four IDs. Confirmed (lines 166, 190, 230, 238).
- Cover images exist as `cover-<id>.png` (NOT `<id>-cover.png` as specs request).
- `gryphonPatrol.ts` contains **zero** `difficulty` references — corroborates the report's own tech-debt admission that difficulty is not consumed by logic.
- `griffin-sky-joust` cover is a **symlink to an absolute path outside the monorepo**.
- `griffin-riders-escape` asset dir contains **0-byte `gate.png` and `obstacle.png`** files.

---

## Findings

### File 1 — `griffin-riders-escape/index.md`

**F-GAMES-B15-001 · Info · index.md:1-5**
Minimal three-link stub (spec/plan/metadata). Consistent but does not link `report.md`, which is the document carrying the actual audit evidence and the only artifact a reader needs. The most important deliverable of the track is undiscoverable from its index.

### File 2 — `griffin-riders-escape/metadata.json`

**F-GAMES-B15-002 · High · metadata.json:4 vs plan.md:52, report.md**
`"status": "new"` while `plan.md:52` marks "Update track metadata.json status to completed" as done `[x]` and `report.md` declares the audit complete ("Compliant", 24/25). The metadata flatly contradicts the plan and report. A reader scanning track status sees "new" and cannot tell the work occurred. (Same defect recurs in B15-008 and B15-017.)

**F-GAMES-B15-003 · Low · metadata.json:9-10**
`"actual_tasks": null` and empty `deviation_notes` despite the plan showing all 7 phases / 35+ tasks checked off. Completion bookkeeping was never reconciled, undermining trust in the track's audit trail.

### File 3 — `griffin-riders-escape/plan.md`

**F-GAMES-B15-004 · Medium · plan.md:4-53 (all tasks share commit `c8d4e2f`/`fb340e0`)**
Every task across Phases 1–7 is attributed to one of just two commit hashes. A 7-phase TDD audit collapsing into two commits means discovery, fixes, tests, and the report were not committed incrementally; the per-task `[hash]` annotations are decorative rather than traceable. This weakens the "strict TDD" claim the project AGENTS.md requires.

**F-GAMES-B15-005 · Low · plan.md:36 vs report.md:71**
Plan asserts "Verify test coverage ≥ 80%" passed; report shows component coverage at **79.11%** (report.md:71) — below the 80% threshold — yet the overall blended number (87.99%) is used to claim a pass. The component layer (the player-facing game UI) is the riskiest surface and is technically non-compliant; the blended metric masks it.

### File 4 — `griffin-riders-escape/report.md`

**F-GAMES-B15-006 · Medium · report.md:13,52,159 (SentenceItem typing)**
Report admits the game still uses `VocabularyItem[]` not `SentenceItem[]` (spec item 9, `spec.md:35`). It is scored as "PARTIAL/PASS-with-note" and the overall verdict is "24/25 compliant," but the spec acceptance criterion (`spec.md:61`) requires all 25 audited pass/fail — a partial is a fail. Importability into Reading/Primary depends on a stable shared sentence contract; divergent per-game types (`VocabularyItem` here, `SentenceItem` in sky-joust per B15-009) is a real cross-app integration risk, not a cosmetic naming note.

**F-GAMES-B15-007 · Medium · report.md:81-82 vs repo asset dir**
Report claims assets at `public/games/sentence/griffin-riders-escape/` are `background.png` and `player-3x3-sheet.png`. The directory **also contains 0-byte `gate.png` and `obstacle.png`** (empty placeholder files). If the game references gate/obstacle sprites, these will render as broken/blank at runtime — an asset/performance/readiness defect the report neither lists nor flags. Cover claim (report.md:82) cites `cover-griffin-riders-escape.png` while spec (`spec.md:56`) asks for `griffin-riders-escape-cover.png`; the file exists under the former name, so the spec's stated path is unmet though a cover does exist.

### File 5 — `griffin-riders-escape/spec.md`

**F-GAMES-B15-008 · Info · spec.md:36,56**
Spec references `createSentenceRoute` (singular) and cover path `griffin-riders-escape-cover.png`, while the report and codebase use `createSentencesRoute` (plural) and `cover-griffin-riders-escape.png`. The spec was never reconciled to the platform's actual factory/asset naming, so the spec is an unreliable compliance yardstick across this whole batch (it is copy-pasted with the same drift into all four tracks).

---

### File 6 — `griffin-sky-joust/index.md`

**F-GAMES-B15-009 · Info · index.md:1-5**
Same stub pattern as B15-001; `report.md` not linked. No new issue beyond the recurring index gap.

### File 7 — `griffin-sky-joust/metadata.json`

**F-GAMES-B15-010 · High · metadata.json:4 vs plan.md:52 & report.md:11**
`"status": "new"` while plan marks metadata-update-to-completed done and report claims "25/25 passing after fixes." Status/report contradiction (same class as B15-002).

### File 8 — `griffin-sky-joust/plan.md`

**F-GAMES-B15-011 · Medium · plan.md:4-53 (single commit `52f9ca8`)**
All tasks across all 7 phases share one commit hash `52f9ca8`. The entire audit + fixes + new test suite + report landed in a single commit — no incremental TDD history. Combined with the report's claim of going 10→25 passing, the lack of a Red/Green commit trail makes the "strict TDD" assertion unverifiable.

### File 9 — `griffin-sky-joust/report.md`

**F-GAMES-B15-012 · High · report.md:68 & repo symlink (cover image / portability)**
Report (report.md:68, "Created symlink at `/public/games/cover/griffin-sky-joust-cover.png`") matches a real symlink, but that symlink targets an **absolute path outside the repository**: `/home/daniel-bo/Desktop/advantage-games/public/games/cover/cover-griffin-sky-joust.png`. This resolves only on the original author's machine. In CI, Docker, another developer's checkout, or when imported into Reading/Primary, the cover is a dangling symlink → broken image. This is a concrete importability/build-portability defect presented in the report as a satisfied requirement. (Note: registry `gameCards.ts:169` actually points at `cover-griffin-sky-joust.png`, a real file, so the menu cover may still resolve — but the symlink the report created is dead weight that can break asset-copy build steps.)

**F-GAMES-B15-013 · Medium · report.md:26 vs spec.md:24 (reference viewport)**
Report states "Mobile-First Portrait | PASS | **390×700** reference" while the spec mandates **390×844** (`spec.md:24`). A 390×700 canvas is scored PASS against an 844-tall spec. Either the game uses a non-standard portrait height (mobile-layout/age-UX inconsistency vs every other game in the batch) or the report's number is wrong; either way it is an undetected non-compliance.

**F-GAMES-B15-014 · Medium · report.md:67-68,83,104 (asset readiness)**
Asset location "fixed" by creating an empty dir with only `.gitkeep` (confirmed in repo). Spec item 23 asks for "PNGs/sprite sheets" (`spec.md:55`); a `.gitkeep` satisfies the *path* but not the *content*. Scoring this PASS conflates "directory exists" with "assets exist." The game renders without art assets — acceptable functionally, but the report should mark this N/A-procedural rather than PASS to avoid a misleading readiness signal.

### File 10 — `griffin-sky-joust/spec.md`

**F-GAMES-B15-015 · Info · spec.md:17,35**
Unlike the other three tracks, this spec's API path is `.../sentences/route.ts` (plural) and the data item softens to "sentence data with `{term, translation}`" rather than naming `SentenceItem[]`. The per-track specs are inconsistent with each other on both API directory naming (singular vs plural `sentence(s)`) and the data-type contract. For a "shared 25-spec" standard this internal divergence means the four games are not actually being held to one common bar — a shared-runtime governance gap.

---

### File 11 — `gryphon-patrol/index.md`

**F-GAMES-B15-016 · Info · index.md:1-5**
Stub; `report.md` not linked. Recurring index gap (see B15-001).

### File 12 — `gryphon-patrol/metadata.json`

**F-GAMES-B15-017 · Low · metadata.json:4,9**
This is the **only** track in the batch with `"status": "completed"` and `"actual_tasks": 8` correctly reconciled. Noted as the correct baseline that the other three (B15-002, B15-010, B15-027) fail to meet. Info-level positive; downgraded to Low because it highlights the inconsistency of bookkeeping discipline across a single batch authored the same day.

### File 13 — `gryphon-patrol/plan.md`

**F-GAMES-B15-018 · Medium · plan.md:4-53 (single commit `4f3974f`)**
Same single-commit collapse as B15-004/B15-011. The plan claims a `setInterval`→`requestAnimationFrame` refactor plus XP, accessibility, and new component tests, all in one hash. No incremental verification trail.

### File 14 — `gryphon-patrol/report.md`

**F-GAMES-B15-019 · High · report.md:42,114 (difficulty tiers not functional)**
Report marks Difficulty Tiers "FIXED" (report.md:42, renamed normal→medium) AND simultaneously admits in Remaining Technical Debt (report.md:114) that "Difficulty presets (easy/medium/hard) do not yet vary spawn rates, enemy counts, or player speed. The component receives difficulty as a prop but the logic does not consume it." Verified: `gryphonPatrol.ts` contains zero `difficulty` references. Spec item 13 (`spec.md:41`) explicitly requires "standardized spawn rates, word counts, and speed presets." This is a **functional difficulty/scoring defect scored as PASS** — the difficulty selector is cosmetic. Easy and Hard play identically, which directly affects age-appropriate UX and difficulty progression.

**F-GAMES-B15-020 · Medium · report.md:34 (SentenceItem typing scored PASS)**
Item 9 scored "PASS" with note that it uses `VocabularyItem[]`. The identical situation in griffin-riders-escape (B15-006) was scored "PARTIAL/fail-equivalent." Inconsistent scoring of the same condition across two reports in the same batch — the 22/25 vs 24/25 totals are not computed on a common rubric.

**F-GAMES-B15-021 · Medium · report.md:44-45 vs report.md:51 (camera/off-screen vs coverage)**
Report claims a 2000px world with cameraX wrap-around (item 15) and a mini-map for off-screen indicators (item 16), both PASS. Component coverage is 81.89% (report.md:51); camera wrap-around and mini-map projection are exactly the kind of math that needs explicit tests. The report does not evidence camera/mini-map test cases (its listed component tests at report.md:98 cover "render, phase transitions, fullscreen, rAF, end screens" — not camera math). Camera correctness is asserted, not demonstrated.

### File 15 — `gryphon-patrol/spec.md`

**F-GAMES-B15-022 · Info · spec.md:36**
Same `createSentenceRoute` (singular) drift as B15-008. Spec naming unreconciled with platform factory `createSentencesRoute`.

---

### File 16 — `haunted-library/index.md`

**F-GAMES-B15-023 · Info · index.md:1-5**
Stub; `report.md` not linked (see B15-001).

### File 17 — `haunted-library/metadata.json`

**F-GAMES-B15-024 · High · metadata.json:4 vs plan.md:52 & report.md:121**
`"status": "new"` while plan marks completion done (`plan.md:52` `[ba3c3f0]`) and report declares "fully compliant." Status/report contradiction (class of B15-002).

### File 18 — `haunted-library/plan.md`

**F-GAMES-B15-025 · Low · plan.md:4-9,17,25,33,41,48 (missing commit hashes)**
Phases 1–6 tasks carry **no commit-hash annotations** at all (only Phase 7 has `[ba3c3f0]`). The other three tracks at least stamp a hash. Here, 90% of the task list has no traceability marker, so the only evidence the audit phases ran is the prose report itself. Inconsistent annotation discipline within the batch.

**F-GAMES-B15-026 · Low · plan.md:12-48 (inline `[PASS]/[FIXED]/[N/A]` tags)**
This plan embeds verdicts inline (`[FIXED]`, `[PASS]`, `[N/A]`) — a different convention than the other three plans, which keep verdicts only in `report.md`. Not wrong, but the batch's four plans use three different annotation styles (commit-hash-per-task, single-hash, inline-verdicts), making cross-track status reads error-prone.

### File 19 — `haunted-library/report.md`

**F-GAMES-B15-027 · Medium · report.md:12,32,46 (24/25 vs "fully compliant")**
Executive summary says "24/25 items pass" (report.md:12), but the Compliance Results table shows item 9 (Sentence Data) PASS while using `VocabularyItem[]` (report.md:32) and the Conclusion declares the game "**fully compliant**" (report.md:121). 24/25 is not "fully compliant," and item 9 is the same VocabularyItem-vs-SentenceItem gap scored as a fail-equivalent elsewhere (B15-006). The headline overstates the result.

**F-GAMES-B15-028 · Medium · report.md:93-95 (state-schema change beyond audit scope)**
"State Schema Extension … Added `initialLives` and `difficulty` fields to `LibraryState`" — a structural change to game state to support `calculateXP`. Spec "Out of Scope" (`spec.md:67-72`) lists "New gameplay features" as out of scope; extending the persisted state schema is borderline scope creep and a potential save/progress-compatibility concern (existing in-flight `LibraryState` objects/serialized progress would lack these fields). The report does not address migration/back-compat of the state shape, which matters for progress tracking and importability.

**F-GAMES-B15-029 · Low · report.md:30,33 (touch/data claims)**
Item 6 PASS rationale ("VirtualDPad handles touch; progress dots non-interactive") is reasonable, but item 10 claims API factories `createSentencesRoute`/`createCompleteRoute` were adopted while the spec (`spec.md:36`) names `createSentenceRoute`. As with B15-008, the report quietly uses the real (plural) factory while the spec it is graded against names a non-existent one — the "PASS" is correct against reality but not against the written spec, which the acceptance criteria reference.

### File 20 — `haunted-library/spec.md`

**F-GAMES-B15-030 · Info · spec.md:36,56**
Same singular-`createSentenceRoute` and `<id>-cover.png` drift as the other specs. The four specs are clones with identical unreconciled naming defects (B15-008, B15-015, B15-022, B15-030), confirming the shared spec template itself is stale relative to the platform code.

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Metadata `status` not updated to completed despite plan/report claiming so (3 of 4 tracks) | B15-002, B15-010, B15-024 | High |
| `griffin-sky-joust` cover symlink points outside the repo (dead in CI/Docker/import) | B15-012 | High |
| Difficulty tiers cosmetic — logic ignores difficulty (gryphon-patrol) | B15-019 | High |
| Inconsistent scoring of `VocabularyItem` vs `SentenceItem` across reports (24/25 vs 22/25 not on a common rubric); cross-app sentence contract divergence | B15-006, B15-020, B15-027 | Medium |
| Single/absent commit hashes → no incremental TDD trail | B15-004, B15-011, B15-018, B15-025 | Medium |
| Spec template stale vs platform (factory names, cover paths, viewport) — 4 cloned specs | B15-008, B15-013, B15-015, B15-022, B15-030 | Info–Medium |
| Empty/placeholder assets scored as PASS (0-byte gate/obstacle PNGs; `.gitkeep`-only dirs) | B15-007, B15-014 | Medium |
| Component coverage below 80% but masked by blended metric | B15-005 | Low |
| Camera/mini-map correctness asserted without dedicated tests | B15-021 | Medium |
| State-schema extension vs declared out-of-scope; no back-compat note | B15-028 | Medium |

---

## Limitations

- This is a **documentation review**. The 25-point pass/fail verdicts in each report were not independently re-derived end-to-end; only the spot-checks listed under "Cross-Batch Verification Performed" were run (file existence, symbol presence via grep, asset/dir/symlink state, registry lines). I did **not** execute the games, run the Jest suites, measure runtime FPS, validate XP/scoring numeric correctness, exercise leaderboard/progress submission, or test mobile/browser rendering.
- Coverage percentages, FPS targets, "30+ FPS on mobile," accessibility-setting consumption at runtime, and actual touch-target pixel sizes are taken from the reports as claims; they were not measured.
- The four per-track `spec.md` files are clones of a shared template; I treated them as the stated yardstick even though they contain naming drift (factory names, cover paths) relative to the live platform code.
- Source files were inspected read-only to validate claims; no source was edited, per instructions.
- Findings are scoped to the 20 documents in `/tmp/opencode/games-batch-15`. Referenced-but-unbatched artifacts (the actual component/logic/test bodies, `gameCards.ts`, `@/lib/games/api` factories) were consulted only for verification and are not themselves under review here.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
