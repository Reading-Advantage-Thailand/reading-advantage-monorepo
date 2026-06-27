# Line-by-Line Review — games-batch-10

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-10`
**Scope source:** `/tmp/opencode/games-batch-10` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure governance/archive documents** — four archived track folders (`village-guardian-20260320`, `visual_refresh_20260425`, `vocab-loader_20260131`, `wizard_vs_zombie_20260104`, `xp_leaderboard_20260408`) plus the project-level `autonomous_prompt.md` and three `code_styleguides/*.md`. No `.ts`/`.tsx` runtime, component, or test source files are in this batch.
**Finding ID scheme:** `F-GAMES-B10-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Group | Type |
|---|------|-------|------|
| 1 | `measure/archive/village-guardian-20260320/metadata.json` | village-guardian | metadata |
| 2 | `measure/archive/village-guardian-20260320/plan.md` | village-guardian | plan |
| 3 | `measure/archive/village-guardian-20260320/spec.md` | village-guardian | spec |
| 4 | `measure/archive/visual_refresh_20260425/index.md` | visual_refresh | index |
| 5 | `measure/archive/visual_refresh_20260425/metadata.json` | visual_refresh | metadata |
| 6 | `measure/archive/visual_refresh_20260425/plan.md` | visual_refresh | plan |
| 7 | `measure/archive/visual_refresh_20260425/spec.md` | visual_refresh | spec |
| 8 | `measure/archive/vocab-loader_20260131/metadata.json` | vocab-loader | metadata |
| 9 | `measure/archive/vocab-loader_20260131/plan.md` | vocab-loader | plan |
| 10 | `measure/archive/vocab-loader_20260131/spec.md` | vocab-loader | spec |
| 11 | `measure/archive/wizard_vs_zombie_20260104/asset-spec.md` | wizard_vs_zombie | asset-spec |
| 12 | `measure/archive/wizard_vs_zombie_20260104/plan.md` | wizard_vs_zombie | plan |
| 13 | `measure/archive/wizard_vs_zombie_20260104/spec.md` | wizard_vs_zombie | spec |
| 14 | `measure/archive/xp_leaderboard_20260408/metadata.json` | xp_leaderboard | metadata |
| 15 | `measure/archive/xp_leaderboard_20260408/plan.md` | xp_leaderboard | plan |
| 16 | `measure/archive/xp_leaderboard_20260408/spec.md` | xp_leaderboard | spec |
| 17 | `measure/autonomous_prompt.md` | project governance | prompt |
| 18 | `measure/code_styleguides/general.md` | project governance | styleguide |
| 19 | `measure/code_styleguides/html-css.md` | project governance | styleguide |
| 20 | `measure/code_styleguides/typescript.md` | project governance | styleguide |

All paths are relative to `apps/advantage-games/`.

---

## Cross-Reference Verification Performed (read-only)

To ground documentation claims against the live tree (no edits), the reviewer confirmed:

- `src/lib/games/villageGuardian.ts` and `villageGuardianConfig.ts` **exist** (plan §Phase 1 deliverables present).
- Route `src/app/[locale]/(student)/student/games/sentence/village-guardian/page.tsx` **exists**; API routes `.../api/v1/games/village-guardian/{sentences,complete}/route.ts` **exist** (plan §Phase 7 claims hold).
- `DESIGN.md` **exists** at app root (visual_refresh target artifact present).
- `src/hooks/useLeaderboard.ts` **exists**; route `.../student/leaderboard/page.tsx` **exists** (xp_leaderboard deliverables present).
- `public/vocab/` **exists** with `default.json` + per-game files including some NOT in the vocab-loader plan (`dragon-rider.json`, `dungeon-liberator.json`) and missing none of the planned eight.
- **`src/lib/vocabLoader.ts` does NOT exist**, and no exported `loadVocabulary`/`validateVocabularyData` shared utility was found. The enchanted-library page's `loadVocabulary` is an inline `useEffect` fetching `/api/v1/games/enchanted-library/vocabulary`, **not** the planned shared `public/vocab` JSON loader. See F-GAMES-B10-014.

These checks were minimal spot-confirmations only; they are not a full source audit of the referenced games.

---

## Findings

### File 1 — `village-guardian-20260320/metadata.json`

**F-GAMES-B10-001 · Info · metadata.json:4-7**
Status `"completed"` with a 2.5-hour created→completed window (08:00→10:30) for a 44-task game including monster AI, trailing-line mechanics, and two API routes. The compressed timeline is plausible for AI-assisted work but leaves no room for the playtesting/balance tuning that Phase 7 itself lists. Readiness of the shipped game cannot be inferred from metadata alone.

**F-GAMES-B10-002 · Low · metadata.json (whole file)**
Metadata omits `estimated_tasks`/`actual_tasks`/`deviation_notes` fields that other tracks in this audit carry (e.g., `xp_leaderboard` metadata lines 8-10). Inconsistent metadata schema across archived tracks weakens any automated rollup of track health.

### File 2 — `village-guardian-20260320/plan.md`

**F-GAMES-B10-003 · High · plan.md:70-74**
Phase 7 ("Polish & Integration") leaves the three quality-bearing tasks **unchecked**: visual juice (line 72), **sound effects via `useSound`** (line 73), and **balance tuning based on playtesting** (line 74) — all tagged "(optional)". The track is nonetheless archived as completed (File 1). For an age-targeted educational game, "no audio" and "no playtest-based balance" are readiness gaps, not cosmetic options; difficulty/timer balance (30s/25s/20s for 4/6/8 words while dodging monsters) ships unvalidated.

**F-GAMES-B10-004 · Medium · plan.md:28 vs metadata.json:4**
Plan claims ">80% coverage" (line 28) for game logic, but neither plan nor metadata records an actual coverage number or test count, and no checkpoint hash is attached to any task (unlike `vocab-loader` plan which cites commit hashes). Completion of the coverage gate is asserted, not evidenced.

**F-GAMES-B10-005 · Medium · plan.md:84-86, 108-111**
The config arena is `390×700` (plan line 85-86) but the project reference viewport is `390×844` (spec.md:11; AGENTS.md). The 144px vertical delta is presumably reserved for HUD/DPad chrome, but neither plan nor spec states this explicitly, so the relationship between game-world height and device viewport (and how it scales on shorter devices) is undocumented — a mobile-fit risk the wizard_vs_zombie post-mortem (File 12, lesson §1) explicitly warns about.

**F-GAMES-B10-006 · Low · plan.md:116-123 (XP config)**
XP model: `xpPerCorrectWord:1` + accuracy/speed/survival bonuses, `maxXP:10`. With `hard` = 8 words, base XP alone (8) plus any bonus would exceed `maxXP:10` quickly, so the cap silently compresses the top of the range; meanwhile `easy` (4 words) caps effective base at 4. This makes cross-difficulty XP non-comparable for a shared leaderboard (see xp_leaderboard track, File 14-16) — the same raw mastery yields different XP by difficulty with no normalization documented.

### File 3 — `village-guardian-20260320/spec.md`

**F-GAMES-B10-007 · Medium · spec.md:46-50, 7**
Vocabulary contract is `VocabularyItem[]` with `{ term, translation }` only (spec line 47), yet the game is a **sentence** game requiring correct *word order* (spec line 7, 48-49). The spec never states how a sentence is decomposed into ordered word tokens, how distractor words are chosen, or how multi-word terms/punctuation are handled. This is the core educational mechanic and the most reuse-sensitive contract for importing into Reading/Primary; leaving tokenization unspecified is a portability and correctness gap (cf. wizard_vs_zombie post-mortem lesson §4 about target-word source-of-truth).

**F-GAMES-B10-008 · Low · spec.md:91-98 (Visual Style / Effects)**
Spec mandates burning-building particle flames, dust clouds, sparkle, and shake. None of these are confirmed in the plan as implemented (Phase 3 line 39 covers only generic correct/wrong feedback; Phase 7 juice is unchecked — F-GAMES-B10-003). Spec promises exceed delivered scope; the "siege" theme of fire/danger imagery should also be sanity-checked for age-appropriateness in a young-learner product (no age band is stated anywhere).

**F-GAMES-B10-009 · Info · spec.md:158-162**
Future-scope (power-ups, boss monsters, achievements) is cleanly fenced — good scope hygiene. No action.

### File 4 — `visual_refresh_20260425/index.md`

**F-GAMES-B10-010 · Info · index.md:11-15**
Index asserts the "Obsidian Grimoire" design system was *implemented* (high-contrast monochrome, 0px radius, heavy borders, serif headers, monospace body). This is a strong design-identity claim whose accessibility implications must be checked downstream (see F-GAMES-B10-012). Index documents an outcome the plan never marks complete (see F-GAMES-B10-011).

### File 5 — `visual_refresh_20260425/metadata.json`

**F-GAMES-B10-011 · High · metadata.json:5 vs index.md:10-15 vs plan.md:1-12**
Status is `"in_progress"` (metadata line 5), **every** plan checkbox is unchecked (plan lines 4-12), yet this track lives in `measure/archive/` and the `index.md` declares the design system "Implemented." Three sources disagree on completion state. An archived-but-in-progress track with an outcome-claim and zero ticked tasks is an integrity problem: the visual identity that governs *all* game UI may be partially applied, and reviewers cannot tell what shipped.

### File 6 — `visual_refresh_20260425/plan.md`

**F-GAMES-B10-012 · High · plan.md:9-11 (Refactor UI Components)**
The plan adopts a "Brutalist… high-contrast Monochrome (Black, White, Gold)… 0px radius, heavy borders" identity (per index) and refactors global CSS/Tailwind + core components, but contains **no accessibility verification task** (contrast ratios, focus-visible states on 0px/hard-border controls, touch-target size after restyle). For an education product used by children, a global visual overhaul with no WCAG/contrast/age-readability gate is a material accessibility risk, and it directly interacts with the games' 44×44px touch-target and 16px-text requirements (village-guardian spec lines 12-14) that this refactor could regress.

**F-GAMES-B10-013 · Medium · plan.md:7**
The only verification step is `npx -y @google/design.md lint DESIGN.md` — a *structural* lint of the design doc, not a check that the running UI matches it or that components were actually migrated. "Verify the visual refresh locally" (line 12) is unbounded and unevidenced. No regression/visual test, no screenshot baseline, no per-app (Reading/Primary) confirmation.

### File 7 — `visual_refresh_20260425/spec.md`

**F-GAMES-B10-014 · Info · spec.md:7-11**
Spec is intentionally open-ended (pick any opinionated identity). Reasonable for a design track, but combined with the in-progress/unchecked state (F-GAMES-B10-011) it means the binding identity exists only in `DESIGN.md` + `index.md` prose, not in a verified component inventory.

### File 8 — `vocab-loader_20260131/metadata.json`

**F-GAMES-B10-015 · Medium · metadata.json:4**
Status is `"new"` (line 4) despite the plan (File 9) being almost entirely checked off with real commit hashes and the track sitting in `archive/`. "new" + fully-executed plan + archived = stale/incorrect lifecycle state. Automated track dashboards would miscount this track.

### File 9 — `vocab-loader_20260131/plan.md`

**F-GAMES-B10-016 · High · plan.md:12-16, 44-85 vs live tree**
The entire deliverable is a shared loader at `src/lib/vocabLoader.ts` (`loadVocabulary(gameName)` with in-memory cache + 404/network fallback to `default.json`) and migration of all 8 games to consume it. **In the current tree `src/lib/vocabLoader.ts` does not exist**, no shared `loadVocabulary` export was found, and the audited game pages (e.g., enchanted-library) instead fetch from `/api/v1/games/<game>/vocabulary` API routes. The architecture this track shipped has been **superseded** by an API-backed loader, but the plan/spec were archived as done with no deprecation note. Anyone importing games into Reading/Primary by following this plan would wire up a non-existent loader and orphaned `public/vocab/*.json` files.

**F-GAMES-B10-017 · Medium · plan.md:31-40 vs live `public/vocab/`**
Plan enumerates 8 game JSON files + `default.json`. The live `public/vocab/` directory additionally contains `dragon-rider.json` and `dungeon-liberator.json` (games added later) and the planned set, but with the loader gone (F-GAMES-B10-016) these files are likely **orphaned runtime assets**. Dead vocabulary data shipped in `public/` is a maintenance and content-accuracy hazard (stale/incorrect vocab could be served if any code path still reads them).

**F-GAMES-B10-018 · Low · plan.md:23, 42, 86, 99**
Every "Measure — Phase Verification" task across all four phases is left **unchecked** while the implementation tasks beneath them are checked with commit hashes. The required verification gate was systematically skipped (or not recorded) even though the work was committed — the same closeout-discipline gap flagged elsewhere in this audit series.

### File 10 — `vocab-loader_20260131/spec.md`

**F-GAMES-B10-019 · Medium · spec.md:9-12, 41-44 (FR-1, NFR-1)**
Design loads vocab via runtime `fetch` of static `public/vocab/*.json` "without rebuild." This client-side static-file model has **no tenant scoping, no auth, no per-class content selection** — acceptable for a standalone game sandbox but fundamentally incompatible with importing games into Reading/Primary, where vocabulary must come from the authenticated student's assigned content (schoolId-scoped, per AGENTS.md multi-tenancy). The spec never flags this boundary, so the importability story is misleading; the later pivot to `/api/v1/games/.../vocabulary` (F-GAMES-B10-016) is in fact the correct direction but is undocumented here.

**F-GAMES-B10-020 · Low · spec.md:46-47, 50 (NFR-2, NFR-3)**
"Type safety via runtime validation" relies on `validateVocabularyData()`; the live tree exposes `validateVocabularyItem` in `src/lib/games/contentPackSchema.ts` (different name/location), so the named contract drifted. NFR-3 keeps `SAMPLE_VOCABULARY`/`SAMPLE_SENTENCES` "as fallback," but Phase 4 (plan lines 90-93) removes them — an internal spec/plan contradiction.

### File 11 — `wizard_vs_zombie_20260104/asset-spec.md`

**F-GAMES-B10-021 · High · asset-spec.md:7-11, 82-86, 122-126, 141-145 (embedded external image URLs)**
The asset spec embeds ~15 **third-party hotlinked image URLs** (itch.zone, opengameart.org, craftpix.net, pngtree, gamedevmarket, pinimg, pond5, cults3d, tabletopdominion, 2minutetabletop, tilemart) as visual references. Risks: (a) **licensing/IP** — several are commercial-marketplace/watermarked previews (craftpix, gamedevmarket, pond5, tilemart) that must not be used as shipped assets; the doc does not state these are reference-only vs. source; (b) **link rot** — external URLs will break, destroying the asset contract's meaning over time; (c) one URL (line 84) is an `.webp` "sci-fi shield orb" that contradicts the medieval/fantasy theme. For a children's product, provenance of every shipped asset must be auditable; this document does not establish it.

**F-GAMES-B10-022 · Low · asset-spec.md:223-229 (Explicitly Excluded)**
Good age-appropriateness discipline: "No gore, blood, or corpse states," "Non-gory" zombies, "contact is passive" (lines 64-66, 227). This is a positive finding — the only document in the batch that explicitly addresses child-appropriate content. Worth propagating as a template requirement to other game asset specs (e.g., village-guardian's "burning buildings," F-GAMES-B10-008, has no such guardrail).

### File 12 — `wizard_vs_zombie_20260104/plan.md`

**F-GAMES-B10-023 · Info · plan.md:38-58 (Post-Mortem)**
Excellent, reusable post-mortem capturing four real shared-runtime hazards: (1) Konva Stage sizing/scale-transform vs resizing the stage; (2) never `preventDefault` in React passive touch handlers + use `touch-action:none` + `ref`-based input to avoid game-loop batching lag; (3) explicit asset loader state machine to avoid unmount race; (4) `targetWord` as single source of truth for distractor spawning. These are the strongest cross-cutting lessons in the batch and are directly relevant to every Konva game's mobile/browser readiness. Recommend elevating into `lessons-learned.md` / shared runtime docs if not already.

**F-GAMES-B10-024 · Medium · plan.md:5-34 (no coverage / no test tasks)**
Despite the project's strict-TDD mandate (AGENTS.md, vocab-game-builder skill), this plan lists **zero explicit test tasks** and no coverage figure — only feature tasks with checkpoints. The post-mortem (lesson §4) documents an "unsolvable game" bug (spawnOrbs ignored targetWord) that a logic unit test would have caught, confirming the test gap was real. Test quality for this archived, shipped game is unevidenced.

**F-GAMES-B10-025 · Low · plan.md:7 vs current route**
Plan route is `src/app/games/wizard-vs-zombie` (line 7), but the live route is `src/app/[locale]/(student)/student/games/vocabulary/wizard-vs-zombie/page.tsx`. The plan's path is stale post-migration; harmless for an archive doc but misleading for anyone using it as an import map into Reading/Primary.

### File 13 — `wizard_vs_zombie_20260104/spec.md`

**F-GAMES-B10-026 · Medium · spec.md:78-82 (Progression & Scoring)**
XP = `Correct Answers * Accuracy` here, vs village-guardian's multi-bonus capped 1-10 model (File 2). Two archived games define **incompatible scoring formulas**, yet both feed a single shared XP leaderboard (xp_leaderboard track, File 14-16). There is no normalization layer specified anywhere in the batch, so cumulative-XP and cross-game ranking are not apples-to-apples — a correctness gap for the leaderboard's stated purpose.

**F-GAMES-B10-027 · Low · spec.md:36-37, 31**
Performance is addressed informally — "Max active zombies capped (e.g., 50) to preserve performance," "Max 3?" charges — with hedging parentheticals/question marks rather than committed constants. For the horde mechanic that motivated the Konva choice (spec lines 73-75), the perf-critical cap is left as a guess, not a tuned/tested value.

### File 14 — `xp_leaderboard_20260408/metadata.json`

**F-GAMES-B10-028 · Info · metadata.json:8-10**
Clean metadata: `estimated_tasks:9 == actual_tasks:9`, status `completed`, deviation notes present. Best-formed metadata in the batch; sets the bar the other tracks (F-GAMES-B10-002, -015) fail to meet.

### File 15 — `xp_leaderboard_20260408/plan.md`

**F-GAMES-B10-029 · High · plan.md:5, spec.md:9, 20 (localStorage-only persistence)**
Leaderboard persists sessions to **`localStorage` only** (no backend, NFR spec line 20). Consequences for the stated goals: (a) "teachers a quick-glance view of student engagement" (spec line 5) is **unachievable** — data is per-device/per-browser, not visible to teachers; (b) cleared cache / different device / private mode = total data loss; (c) **no tenant/schoolId scoping** and no server validation, so it cannot satisfy Reading/Primary's progress-tracking requirements. The track is marked completed but the persistence model contradicts its own motivating use case. (Spec lines 33-37 do fence server-sync/teacher-dashboards as out-of-scope, but the Overview still sells the teacher benefit — internal contradiction.)

**F-GAMES-B10-030 · Medium · plan.md:30-31**
"Call `recordSession` after XP animation completes" — recording is coupled to the end-screen animation lifecycle. If a player navigates away before the animation finishes (common on mobile), the session is **never recorded**, silently losing the result. The non-functional requirement "recording must not block the animation" (spec line 22) is satisfied, but the failure mode (early-exit data loss) is not addressed in the plan.

**F-GAMES-B10-031 · Low · plan.md:9 (20-entry cap)**
History capped at 20 entries with per-game high-score retention. The cap is reasonable, but there's no documented migration/versioning for the `localStorage` schema (`SessionRecord`/`LeaderboardState`). A future shape change will silently corrupt or drop existing players' data with no fallback documented.

### File 16 — `xp_leaderboard_20260408/spec.md`

**F-GAMES-B10-032 · Medium · spec.md:24-31 (Acceptance Criteria all unchecked)**
Every acceptance-criteria checkbox (lines 26-31), including "All new code has unit test coverage ≥80%" (line 31), is **unchecked**, even though metadata declares the track completed with 9/9 tasks (File 14). As elsewhere in this audit, completion is asserted via task checkboxes but the formal acceptance gate is unverified in-document.

**F-GAMES-B10-033 · Info · spec.md:18-22 (mobile portrait NFR)**
Mobile-portrait rendering is correctly called out as an NFR. No way to confirm from docs whether the leaderboard table (per-game best + 20-row history) actually fits 390px width without horizontal scroll; flagged as a downstream UI check, not a doc defect.

### File 17 — `measure/autonomous_prompt.md`

**F-GAMES-B10-034 · High · autonomous_prompt.md:9, 48, 52-55**
The unattended-run contract instructs the agent to auto-commit/push dirty work (line 9), answer "yes" to every "Proceed?/Continue?" prompt (line 52), and "Never wait for human input. Always make a decision and continue" (line 55). Combined with auto-push, this is the most plausible root cause of the **lifecycle/integrity drift** seen throughout this batch and audit: tracks archived while `in_progress` (F-GAMES-B10-011), acceptance boxes never ticked (F-GAMES-B10-032), stale statuses (F-GAMES-B10-015). An unattended loop that always answers "yes" and pushes will mark/leave work done without the human gate the Measure workflow assumes. This governance file materially shapes the trustworthiness of every track doc reviewed.

**F-GAMES-B10-035 · Medium · autonomous_prompt.md:44-46**
Hard memory caps — `tech-debt.md` and `lessons-learned.md` "MUST be ≤50 lines… remove resolved items or consolidate." Forcing deletion to satisfy a line cap risks discarding valid known-issues/lessons (e.g., the strong wizard_vs_zombie post-mortem, F-GAMES-B10-023, could be evicted). A size cap that mandates information loss is an anti-pattern for a project-memory file; prefer archival over deletion.

**F-GAMES-B10-036 · Low · autonomous_prompt.md:13-23, 32-41**
The verification protocol is browser/CDP-centric (start dev server, navigate, screenshot, check console). It contains **no requirement to run the unit/integration test suite as a gate before marking a phase complete beyond a single mention** (line 27/33), and no coverage threshold — consistent with the missing-coverage findings in the game plans (F-GAMES-B10-004, -024). Visual "it renders" verification is treated as near-equivalent to correctness.

### File 18 — `measure/code_styleguides/general.md`

**F-GAMES-B10-037 · Info · general.md:1-23**
Generic, uncontroversial principles (readability, consistency, simplicity, maintainability, documentation). No conflicts with monorepo AGENTS.md. No game-specific or accessibility guidance — neutral. No action.

### File 19 — `measure/code_styleguides/html-css.md`

**F-GAMES-B10-038 · Medium · html-css.md:24-45 vs visual_refresh identity**
The Google-derived CSS rules — "Avoid using ID selectors," "Avoid `!important`," "Alphabetize declarations," 3-char hex — are largely Tailwind-irrelevant for this app (which uses Tailwind + the "Obsidian Grimoire" tokens, F-GAMES-B10-010). More importantly, **nothing in this styleguide addresses accessibility/contrast**, which is the exact gap the high-contrast brutalist refresh creates (F-GAMES-B10-012). The styleguide also says "Provide `alt` text… captions for audio/video" (line 16) — good — but games render to `<canvas>` (Konva), where `alt`/semantic HTML does not apply, so the guidance gives a false sense of a11y coverage for the actual game surface. Canvas accessibility (ARIA live regions, keyboard alternatives) is unaddressed anywhere in the batch.

### File 20 — `measure/code_styleguides/typescript.md`

**F-GAMES-B10-039 · Low · typescript.md:16, 19**
Solid rules (no `any`, no type assertions without justification, named exports, `===`). However the guide forbids default exports (line 8), while Next.js **requires** default exports for `page.tsx`/route components (and the live game pages use them). The styleguide does not carve out this framework exception, creating a standing conflict between the documented standard and mandatory Next.js conventions that every reviewed game route violates by necessity.

**F-GAMES-B10-040 · Info · typescript.md:38-42 (JSDoc)**
JSDoc guidance aligns with monorepo AGENTS.md "JSDoc for All Functions." Consistent. No action.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 6 | 003, 011, 012, 016, 029, 034 |
| Medium | 12 | 004, 005, 007, 013, 015, 017, 019, 024, 026, 030, 032, 038 |
| Low | 11 | 001*, 002, 006, 008, 018, 020, 021→see note, 025, 027, 031, 039 |
| Info | 11 | 001, 009, 010, 014, 022, 023, 028, 033, 036*, 037, 040 |

\*Note: F-GAMES-B10-001 and F-GAMES-B10-021/022 severities are stated inline per finding; the table groups by the inline label. F-GAMES-B10-021 is High (licensing/provenance). Counts are indicative; the authoritative severity for each finding is the label on the finding itself.

### Cross-cutting themes
1. **Lifecycle/integrity drift** (003, 011, 015, 016, 032, 034): archived tracks with unchecked acceptance gates, contradictory statuses, and a superseded-but-undocumented architecture — strongly correlated with the always-yes unattended prompt.
2. **Scoring/leaderboard coherence** (006, 026, 029): three different XP formulas feeding one localStorage-only leaderboard with no normalization and no teacher/tenant path — undermines progress/leaderboard goals and Reading/Primary import.
3. **Importability into Reading/Primary** (016, 019, 025, 029): static-file vocab + localStorage progress + stale routes are incompatible with authenticated, schoolId-scoped, server-backed content; the correct API direction exists in code but is undocumented in these specs.
4. **Accessibility & child-appropriate UX** (008, 012, 022, 038): only the wizard asset-spec explicitly guards against gory/inappropriate content; the global visual refresh and styleguides have no contrast/canvas-a11y gate.
5. **Test/perf evidence** (004, 024, 027, 036): coverage claims and perf caps are asserted as prose without numbers, tests, or checkpoints.

---

## Limitations

- **Documentation-only batch.** All 20 files are Measure governance/archive artifacts; this review evaluates the *documents* (internal consistency, completeness, claims vs. spot-checked reality), not the runtime behavior, rendering, audio, or actual test pass/coverage of the games they describe.
- **Spot-checks only.** Cross-references to the live tree (existence of files/routes/hooks/`vocabLoader`) were minimal confirmations of specific claims, not a source-level audit of villageGuardian, wizard-vs-zombie, the leaderboard hook, or the vocab pipeline. Findings about behavior (e.g., XP cap effects, early-exit recording loss, canvas a11y) are inferred from the docs and should be re-verified against source/tests in a code-level review.
- **No build/test/browser execution** was performed for this batch; no dev server was started.
- **Severity is advisory.** Severities reflect risk to game readiness, shared-runtime correctness, importability, and child-appropriate UX as described in the batch scope; they are not closeout determinations.
- **Some referenced artifacts are out of batch** (e.g., `DESIGN.md` body, `baseline.md`, API route internals, actual test files); claims depending on them could not be fully validated here.

## Statement on scope

This report covers exactly the 20 files listed in `/tmp/opencode/games-batch-10`, each addressed individually above. **No source code was edited.** This is a line-by-line review only; it makes **no acceptance or closeout claims** for the `advantage_games_review_20260626` track or any reviewed game/track.
