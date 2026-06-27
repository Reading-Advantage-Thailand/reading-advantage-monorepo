# Line-by-Line Review — games-batch-13

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-13`
**Scope source:** `/tmp/opencode/games-batch-13` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure track documents** (reports, specs, plans, metadata, index) for four compliance-audit tracks plus one feature track inside `apps/advantage-games/measure/tracks/`. No `.ts`/`.tsx` runtime, component, or test source files are in this batch. Where claims in these documents were independently checkable against the working tree, I spot-verified them (results noted inline) without modifying any file.
**Finding ID scheme:** `F-GAMES-B13-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Track | Type |
|---|------|-------|------|
| 1 | `astral-mage-compliance-audit_20260426/report.md` | astral-mage-compliance-audit | report |
| 2 | `astral-mage-compliance-audit_20260426/spec.md` | astral-mage-compliance-audit | spec |
| 3 | `babel-architect-compliance-audit_20260426/index.md` | babel-architect-compliance-audit | index |
| 4 | `babel-architect-compliance-audit_20260426/metadata.json` | babel-architect-compliance-audit | metadata |
| 5 | `babel-architect-compliance-audit_20260426/plan.md` | babel-architect-compliance-audit | plan |
| 6 | `babel-architect-compliance-audit_20260426/report.md` | babel-architect-compliance-audit | report |
| 7 | `babel-architect-compliance-audit_20260426/spec.md` | babel-architect-compliance-audit | spec |
| 8 | `castle-defense-compliance-audit_20260426/index.md` | castle-defense-compliance-audit | index |
| 9 | `castle-defense-compliance-audit_20260426/metadata.json` | castle-defense-compliance-audit | metadata |
| 10 | `castle-defense-compliance-audit_20260426/plan.md` | castle-defense-compliance-audit | plan |
| 11 | `castle-defense-compliance-audit_20260426/report.md` | castle-defense-compliance-audit | report |
| 12 | `castle-defense-compliance-audit_20260426/spec.md` | castle-defense-compliance-audit | spec |
| 13 | `competitive_multiplayer_20260425/metadata.json` | competitive_multiplayer | metadata |
| 14 | `competitive_multiplayer_20260425/plan.md` | competitive_multiplayer | plan |
| 15 | `competitive_multiplayer_20260425/spec.md` | competitive_multiplayer | spec |
| 16 | `devourer-slime-compliance-audit_20260426/index.md` | devourer-slime-compliance-audit | index |
| 17 | `devourer-slime-compliance-audit_20260426/metadata.json` | devourer-slime-compliance-audit | metadata |
| 18 | `devourer-slime-compliance-audit_20260426/plan.md` | devourer-slime-compliance-audit | plan |
| 19 | `devourer-slime-compliance-audit_20260426/report.md` | devourer-slime-compliance-audit | report |
| 20 | `devourer-slime-compliance-audit_20260426/spec.md` | devourer-slime-compliance-audit | spec |

---

## Cross-Batch Verification Snapshot

Spot-checks performed against the live working tree (read-only) to ground the documents in this batch:

- `astral-mage`: `src/components/games/sentence/astral-mage/` and `src/lib/games/astralMage.ts` **do not exist**; page/API dirs absent. Registry entry exists at `gameCards.ts:197-204` with `status: 'coming-soon'`. Cover at `public/games/cover/cover-astral-mage.png`. → Astral Mage report is accurate.
- `babel-architect`: `src/components/games/sentence/babel-architect/` **does not exist**; registry entry `gameCards.ts:213-220` is `status: 'playable'`; cover `cover-babel-architect.png` exists; `src/lib/games/babelArchitectCompliance.test.ts` exists. → Babel report accurate; the playable-but-unimplemented mismatch is a real shipping hazard (F-GAMES-B13-006).
- `castle-defense`: component dir present (`CastleDefenseGame.tsx`, `BackgroundLayer.tsx`, tests, `index.ts`); `castleDefense.ts` uses `easy|medium|hard` and `calculateCastleDefenseXP` returns `Math.min(10, …)` with accuracy/survival/speed/wave bonuses. → Report claims corroborated.
- `devourer-slime`: component dir present; page uses `calculateXP` from `@/lib/xp`. **However** `DevourerSlimeGame.tsx:91` uses `useInterval`, not `requestAnimationFrame` (F-GAMES-B13-019).

---

## Findings

### File 1 — `astral-mage-compliance-audit_20260426/report.md`

**F-GAMES-B13-001 · Info · report.md:10-14**
Report honestly declares CRITICAL FAILURE (0/25) for a game with zero implementation. This is the correct outcome for an audit and is well-evidenced. No claim of false compliance. Verified accurate against working tree (no component/logic/page/API exists).

**F-GAMES-B13-002 · Medium · report.md:70 vs report.md:10 / spec.md:54**
Spec #22 (Game Registry) is scored `PARTIAL` and the row notes "No `type` field exists in gameCards structure." The summary line, however, states "0/25 specs passing." A PARTIAL is neither a clean pass nor a clean fail, so the 0/25 headline and the per-row PARTIAL are internally inconsistent. More importantly, the note reveals the **registry schema lacks the `type: 'sentence'` field** the spec assumes (`spec.md:13,54`) — a shared-runtime/importability concern that affects how Reading/Primary would discover and route sentence-type games, not just this one game.

**F-GAMES-B13-003 · Low · report.md:72 vs spec.md:56**
Cover-image filename mismatch is flagged: file is `cover-astral-mage.png` but the spec requires `astral-mage-cover.png`. This naming inconsistency (`cover-<id>.png` vs `<id>-cover.png`) is pervasive across the platform — castle-defense uses `castle-defense-cover.png` (the spec form) while astral-mage/babel/devourer use the `cover-<id>` form. A divergent cover-asset naming convention will cause broken thumbnails when games are imported into another app expecting one scheme. This is a real shared-asset-contract defect, under-rated as a single-game cosmetic note.

**F-GAMES-B13-004 · Info · report.md:81, 101-102**
Audit applied no fixes (correctly out of scope per `spec.md:67-72`) and records post-audit coverage as N/A. Transparent and appropriate. No closeout/acceptance claim is made beyond "implementation track required."

### File 2 — `astral-mage-compliance-audit_20260426/spec.md`

**F-GAMES-B13-005 · Medium · spec.md:35 vs castle-defense spec.md:35**
Sentence-data contract is specified inconsistently across the batch's own specs. Astral Mage (and Babel, Devourer) specs require `SentenceItem[]` with `{ term, translation }` (`spec.md:35`), but the castle-defense spec (`castle-defense-compliance-audit_20260426/spec.md:35`) requires `SentenceItem[]` with `{ text, words }`. These are two different shapes for the same shared type name. Any cross-game/shared-runtime `SentenceItem` contract cannot satisfy both; this ambiguity undermines importability into Reading/Primary where one canonical sentence schema is expected.

### File 3 — `babel-architect-compliance-audit_20260426/index.md`

**F-GAMES-B13-006 · Info · index.md:1-5**
Minimal three-link stub (spec/plan/metadata). Does not link `report.md`, which is the only document carrying the audit verdict. A reader following the index alone never reaches the compliance result. Consistent with the platform's index stubs but reduces navigability.

### File 4 — `babel-architect-compliance-audit_20260426/metadata.json`

**F-GAMES-B13-007 · High · metadata.json:4 vs report.md:12-20**
Metadata declares `"status": "completed"`. The audit it represents found the game **non-compliant (2/25, 0% coverage, no implementation)** and the registry lists it `status: 'playable'` (verified `gameCards.ts:219`). A "completed" audit track for a *playable-listed but entirely unimplemented* game is a release-readiness trap: a student selecting Babel Architect from the menu would hit a missing route/component. The audit correctly documents this, but nothing downgrades the registry status, so the hazard remains live. (Game-readiness: Critical for the game itself; the metadata "completed" flag here is the High signal-quality issue.)

**F-GAMES-B13-008 · Low · metadata.json:8-10**
`"actual_tasks": null` while `"estimated_tasks": 8` and the plan marks all 7 phases complete. Actual-task count was never reconciled; `deviation_notes` is empty despite a large planned-vs-actual gap (audit found nothing to fix because nothing exists). Metadata under-records the deviation.

### File 5 — `babel-architect-compliance-audit_20260426/plan.md`

**F-GAMES-B13-009 · Medium · plan.md:9,17,25,33,41,48 (all "User Manual Verification" tasks marked [x])**
Every phase's "Measure - User Manual Verification" gate is checked complete, but only Phase 7 tasks carry a commit hash `[d2f0f2e]`; Phases 1–6 verification boxes have no evidence anchor. For an audit whose entire substance is "no files exist," manual-verification ticks without artifacts are low-value and not independently auditable.

**F-GAMES-B13-010 · Low · plan.md:46**
Task states "Run full test suite to confirm no regressions. … Full suite passes (see report)." Since no fix code was written and the game has no source, "no regressions" is vacuously true. The plan presents a routine green signal that carries no real verification meaning for this track.

### File 6 — `babel-architect-compliance-audit_20260426/report.md`

**F-GAMES-B13-011 · Info · report.md:30**
Confirms registry `href: '/en/student/games/sentence/babel-architect'` resolves to a non-existent page (`spec.md:16`, verified dir absent). The report itself flags this (Fail #13/#25), so the documentation is honest; recorded here to reinforce the live navigation-break for game readiness.

**F-GAMES-B13-012 · Medium · report.md:92-111**
Report cites a compliance test file `src/lib/games/babelArchitectCompliance.test.ts` with "8 failed, 2 passed." Verified the file exists. This is a meta-test asserting file existence rather than behavior — it passes when assets/registry exist and fails for missing source. Such existence-assertion tests inflate the suite count without exercising game logic; if this game is later stubbed, the meta-test could flip green while gameplay remains broken. Test-quality concern for the shared audit pattern.

**F-GAMES-B13-013 · Low · report.md:31 vs spec.md:56**
Report's Pass row #2 accepts cover at `cover-babel-architect.png`, but the spec (`spec.md:56`) requires `babel-architect-cover.png`. The report marks the cover a PASS despite the same filename-convention violation the Astral Mage report flagged as a FAIL (F-GAMES-B13-003). Inconsistent application of the cover-naming criterion across two audits in the same batch.

### File 7 — `babel-architect-compliance-audit_20260426/spec.md`

**F-GAMES-B13-014 · Info · spec.md:35**
Same `{ term, translation }` sentence-shape assumption as Astral Mage; see F-GAMES-B13-005 for the cross-spec contract conflict with castle-defense.

### File 8 — `castle-defense-compliance-audit_20260426/index.md`

**F-GAMES-B13-015 · Info · index.md:1-5**
Three-link stub; does not link `report.md` (which exists and records 25/25). Same navigability gap as F-GAMES-B13-006.

### File 9 — `castle-defense-compliance-audit_20260426/metadata.json`

**F-GAMES-B13-016 · High · metadata.json:4,6 vs plan.md:51-54 / report.md:7**
Metadata declares `"status": "new"` and `"updated_at"` unchanged from creation (`2026-04-26T07:30:00Z`), yet the plan marks all 7 phases complete with commit hashes (`12057db`, `b255078`) and the report claims 25/25 passing with coverage raised 49.47%→80.45%. The metadata was never advanced to `completed`/`updated`. This is a state-tracking defect: the registry of record contradicts the work product. (The Devourer track has the same staleness, F-GAMES-B13-017.)

### File 10 — `castle-defense-compliance-audit_20260426/plan.md`

**F-GAMES-B13-017 · Medium · plan.md:44-47 vs report.md:91-101**
Phase 6 "Fix any failing compliance items / Write tests for any new fix code" is checked with hash `[12057db]`. Report describes substantial behavioral fixes (rAF loop replacing `useInterval`, new XP formula, difficulty-tier rename, SentenceItem retype) — these are non-trivial gameplay/scoring changes performed under a *compliance-audit* track whose spec lists "New gameplay features" and "Backend API changes" as Out of Scope (`spec.md:67-72`). Rewriting XP scaling and difficulty tiers borders on behavior change beyond pure compliance; the scope boundary is not cleanly observed and is undocumented as a deviation.

**F-GAMES-B13-018 · Low · plan.md:5-6**
Coverage commands are embedded inline (`npx jest … --coverage --collectCoverageFrom=…`). Useful for reproducibility, but the recorded baseline (49.47%, per report.md:6) means the game shipped below the platform's stated 80% threshold prior to this audit — i.e., a previously "playable" game was under-tested. Confirms the 80% gate was not enforced at original ship time for castle-defense.

### File 11 — `castle-defense-compliance-audit_20260426/report.md`

**F-GAMES-B13-019 · Medium · report.md:42,52,76-77**
Report claims XP now "returns 1-10 with accuracy/speed/survival bonuses." Verified `calculateCastleDefenseXP` (castleDefense.ts:662) returns `Math.min(10, baseXP + bonus)` where `baseXP = Math.min(5, correctWordCollections)` and bonuses add up to +5 — so the realistic floor for any non-zero play is low but the function can return `0` when `totalAttempts === 0`. The "1–10 scale" claim is therefore "0–10," not "1–10": a zero-XP outcome is reachable. Minor scoring-spec drift; consistency of the XP contract across games matters for cross-app progress/leaderboard aggregation.

**F-GAMES-B13-020 · Medium · report.md:46 ("Off-screen Indicators | N/A")**
Spec #16 requires off-screen indicators "when camera is used," and report #15 confirms a scrolling camera with clamping **is** used (report.md:45). Marking the dependent indicator requirement `N/A` while the triggering condition (camera) is PASS is contradictory: by the spec's own conditional, indicators are required, not N/A. The justification ("enemies follow visible path") may be valid game design, but the scoring should be PASS-with-rationale or a documented spec exception, not N/A. Accessibility/discoverability concern for off-screen game objects on small mobile viewports.

**F-GAMES-B13-021 · Low · report.md:111**
"API routes: 0% (tiny wrapper files, negligible impact)." API route factories (`createSentencesRoute`/`createCompleteRoute`) are the data boundary feeding the game; 0% coverage on the route wiring means the request/response contract (the part most likely to break on import into Reading/Primary) is untested. Dismissing it as "negligible" under-weights an integration-critical seam.

**F-GAMES-B13-022 · Low · report.md:54 / report.md:88-89**
Two fixes rely on `eslint-disable` comments to satisfy "Hook Dependencies" (#20) and "No Unused Variables" (#21) — specifically a `useSession()` call retained only as an unused var "pattern from other games." Suppressing lint to keep an unused session hook is a code-smell propagated across games; it signals the session integration is decorative (called but result discarded) rather than functional, which is a real concern for progress/auth wiring.

### File 12 — `castle-defense-compliance-audit_20260426/spec.md`

**F-GAMES-B13-023 · Info · spec.md:35**
Sentence-data shape declared as `{ text, words }` — conflicts with the `{ term, translation }` shape in the other three specs. Root anchor for F-GAMES-B13-005.

### File 13 — `competitive_multiplayer_20260425/metadata.json`

**F-GAMES-B13-024 · Medium · metadata.json:1-7 vs all other tracks**
This track uses a **different metadata schema** than the four audit tracks in the same batch: `{ id, name, status, created, priority }` vs `{ track_id, type, status, created_at, updated_at, description, estimated_tasks, actual_tasks, deviation_notes }`. Divergent metadata schemas in the same `tracks/` directory break any tooling that parses track metadata uniformly (status dashboards, the Measure registry). Status is `"pending"` with no `type` field.

**F-GAMES-B13-025 · Info · metadata.json:4**
`"status": "pending"` and no plan progress — track is genuinely unstarted. No false completion claim. Appropriate.

### File 14 — `competitive_multiplayer_20260425/plan.md`

**F-GAMES-B13-026 · Medium · plan.md:1-19**
Plan is a generic, un-filled template (Foundation/Integration/Polish with placeholder bullets like "Set up core infrastructure," "Wire components together"). For a feature as architecturally heavy as **real-time competitive multiplayer with matchmaking and live scoring** (spec.md:4), the plan contains zero domain-specific tasks: no transport choice (websocket/server authority), no anti-cheat/score-validation, no latency/reconciliation strategy, no leaderboard persistence model. The plan provides no actionable engineering signal and dramatically understates the effort/risk of the feature.

**F-GAMES-B13-027 · High · plan.md (whole) vs spec.md:4**
Real-time multiplayer + leaderboards is a cross-cutting concern touching the shared runtime, scoring/XP, progress persistence, and the very `SentenceItem` contract that F-GAMES-B13-005 shows is already inconsistent across games. Building competitive scoring on top of XP formulas that differ per game (castle-defense 0–10 custom vs devourer's shared `calculateXP`) will produce non-comparable leaderboard scores. The plan does not acknowledge the need to **unify scoring before** introducing competition — a foundational sequencing risk.

### File 15 — `competitive_multiplayer_20260425/spec.md`

**F-GAMES-B13-028 · High · spec.md:6-11**
Acceptance Criteria are entirely generic boilerplate ("Implementation complete / Tests passing / Build succeeds / Tech debt updated / Lessons learned updated"). There are **no measurable, multiplayer-specific acceptance criteria**: nothing on max concurrent players, matchmaking fairness, server-authoritative scoring, latency tolerance, disconnect handling, or leaderboard correctness/anti-cheat. A multiplayer feature spec with no testable behavioral criteria cannot be verified and invites scope drift. (Note: a `competitive_multiplayer` track also appears as a duplicate concept elsewhere in the platform; this batch only contains the `_20260425` instance, so duplication is not assessed here — see Limitations.)

### File 16 — `devourer-slime-compliance-audit_20260426/index.md`

**F-GAMES-B13-029 · Info · index.md:1-5**
Three-link stub, does not link the `report.md` verdict. Same navigability gap as F-GAMES-B13-006/015.

### File 17 — `devourer-slime-compliance-audit_20260426/metadata.json`

**F-GAMES-B13-030 · High · metadata.json:4 vs plan.md:51-54 / report.md:121**
Metadata `"status": "new"` while the plan marks Phase 7 report-writing `[x]` and the report ends "Audit Complete: All compliance items addressed." However, plan Phase 7 also has **three unchecked tasks** (`plan.md:52-54`: update metadata to completed, commit, manual verify) — so the metadata staleness is actually *consistent* with the plan's own admission that closeout is incomplete. The report's "Audit Complete" banner (report.md:121) therefore overstates a track whose own plan shows closeout not done. Signal conflict between report and plan.

### File 18 — `devourer-slime-compliance-audit_20260426/plan.md`

**F-GAMES-B13-031 · Medium · plan.md:4-53 (`[commit: TBD]` × ~15, `[commit: baseline]` × ~14)**
The overwhelming majority of completed tasks carry placeholder anchors `[commit: TBD]` or `[commit: baseline]` rather than real hashes. Tasks marked done with `TBD` commit references are not traceable to actual changes — the audit trail is effectively absent for the fix tasks (accessibility hook, XP standardization, shared screens, off-screen indicators). This is the weakest evidence chain of the four audits in this batch.

**F-GAMES-B13-032 · Medium · plan.md:28 vs report.md:79 vs spec.md:71**
Plan task "Fix XP/scoring to use shared `calculateXP` from `@/lib/xp`" and report (report.md:79) confirm the XP source was changed. Verified at page.tsx:77. This is a scoring-behavior change executed under a compliance-audit track whose spec lists changes beyond compliance as Out of Scope (`spec.md:67-72`). As with castle-defense (F-GAMES-B13-017), the audit performs real behavioral edits; acceptable for standardization but the scope boundary is again not formally documented as a deviation.

### File 19 — `devourer-slime-compliance-audit_20260426/report.md`

**F-GAMES-B13-033 · High · report.md:27 vs spec.md:26**
Spec #4 (Game Loop) requires `requestAnimationFrame` with delta-time clamped to 50ms. Report marks it **✅ PASS** with the note "`useInterval` at 16.6ms (~60fps) with delta-time." Verified: `DevourerSlimeGame.tsx:91` uses `useInterval`, **not** `requestAnimationFrame`. This is a **false PASS** — the implementation does not meet the literal spec, yet is scored compliant. `useInterval` (setInterval-based) does not pause with the tab/rAF, does not self-correct for frame drift, and cannot clamp delta the way the spec intends. Castle-defense was required to replace exactly this pattern (report.md:22 of castle-defense), so the two audits applied the same criterion inconsistently. Performance/mobile-correctness concern plus an audit-integrity defect.

**F-GAMES-B13-034 · Medium · report.md:40 vs spec.md:35**
Spec #9 requires `SentenceItem[]` with `{ term, translation }`; report marks PASS but the note says it "Uses `VocabularyItem[]` with `{ term, translation }`." The type name `VocabularyItem` ≠ the spec's `SentenceItem`. Scored PASS on shape while the named type contract diverges — relevant to the cross-game `SentenceItem` inconsistency (F-GAMES-B13-005) and to importability where the consuming app keys off the declared type.

**F-GAMES-B13-035 · Medium · report.md:104-107**
Function coverage is **40%** overall (component `DevourerSlimeGame.tsx` functions at **7.69%**). The report rationalizes this as shared components/hooks being counted but unexercised. Even granting that, 7.69% function coverage on the game component means the vast majority of the component's callbacks/handlers (input, collision, end-state) are never invoked by tests. The headline "92.66% coverage" (statements) masks that behavioral/branch and function coverage is weak — a test-quality overstatement. (Branch 79.01% is also *below* 80%, report.md:105.)

**F-GAMES-B13-036 · Low · report.md:65, 116**
Asset Location scored `N/A` ("procedural Konva rendering; no PNG assets"), with a recommendation to create the dir "to satisfy the spec literally." Reasonable, but note the cover image still uses the `cover-devourer-slime.png` (non-spec) naming (report.md:66) — same convention violation as F-GAMES-B13-003/013, here silently accepted as PASS (#23).

**F-GAMES-B13-037 · Low · report.md:96-97**
An E2E helper was edited (`tests/e2e/helpers/gameHelpers.ts`) to return `sentences` instead of `vocabulary`. Changing test scaffolding to match `createSentencesRoute` output is legitimate, but it confirms a prior mock/contract mismatch existed — i.e., the route output shape was previously mis-modeled in tests, suggesting other games' E2E mocks may carry the same stale `vocabulary` shape (cross-game risk not audited here).

### File 20 — `devourer-slime-compliance-audit_20260426/spec.md`

**F-GAMES-B13-038 · Info · spec.md:35,55-56**
Spec uses `{ term, translation }` shape and requires cover `devourer-slime-cover.png` (spec) vs actual `cover-devourer-slime.png` (working tree). Anchors for F-GAMES-B13-005 (shape) and F-GAMES-B13-003 (cover naming). Spec is internally well-formed; the divergences are platform-wide, not spec-local.

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 6 | F-GAMES-B13-007, -016, -027, -028, -030, -033 |
| Medium | 13 | F-GAMES-B13-002, -005, -009, -012, -017, -019, -020, -024, -026, -031, -032, -034, -035 |
| Low | 11 | F-GAMES-B13-003, -008, -010, -013, -018, -021, -022, -036, -037 (+ -018/-021 grouped) |
| Info | 8 | F-GAMES-B13-001, -004, -006, -011, -014, -015, -023, -025, -029, -038 |

*(Counts are indicative; each finding carries its own severity tag inline. The dominant themes are: false/over-stated PASS scoring, stale or schema-divergent metadata, a platform-wide `SentenceItem` shape conflict, inconsistent cover-asset naming, and a multiplayer feature whose spec/plan lack any measurable criteria.)*

## Cross-Cutting Themes (for track triage)

1. **Scoring/XP contract fragmentation** (F-GAMES-B13-005, -019, -027, -032, -034): games disagree on the `SentenceItem` shape (`{term,translation}` vs `{text,words}`) and on XP computation (custom 0–10 vs shared `calculateXP`). This directly blocks reliable cross-app progress and any future leaderboard/competitive scoring.
2. **Audit-integrity inconsistency** (F-GAMES-B13-013, -020, -033): the same criterion (cover naming, off-screen indicators, rAF game loop) is scored FAIL in one audit and PASS/N/A in another within this single batch. Devourer's `useInterval` PASS (F-GAMES-B13-033) is the most material — a false compliance pass.
3. **Metadata/state drift** (F-GAMES-B13-007, -016, -024, -030): three of four audit tracks have metadata that contradicts plan/report state, and the multiplayer track uses an entirely different metadata schema.
4. **Playable-but-unimplemented games** (F-GAMES-B13-006/007 babel-architect): `status: 'playable'` registry entries pointing at non-existent routes are live student-facing breakage; the audits document but do not remediate the registry.
5. **Test-quality overstatement** (F-GAMES-B13-012, -021, -035): existence-assertion meta-tests, 0% API-route coverage dismissed as negligible, and 7.69% component function coverage hidden behind a 92% statements headline.

---

## Limitations

- **Documentation-only batch.** All 20 files are Measure track documents; no game runtime/component/test source files were in scope. Findings about gameplay, performance, mobile/browser behavior, and accessibility are inferred from the documents' claims plus targeted read-only spot-checks, not from executing the games or running the suites.
- **Spot-verification was partial.** I confirmed selected high-impact claims against the working tree (component/dir existence, registry status, XP function body, `useInterval` usage, cover filenames). I did **not** run Jest, coverage, lint, or any build; reported coverage/test numbers (e.g., 80.45%, 92.66%, 79 tests) are taken from the documents and were not re-executed.
- **Out-of-batch artifacts unverified.** `baseline.md`-style evidence, commit contents behind hashes (`12057db`, `b255078`, `d2f0f2e`, `0c24a1e`), and the `TBD`/`baseline` placeholder anchors were not inspected; their existence/content is assumed from the plan text.
- **Cross-game/duplicate-track scope.** Comparisons to games outside this batch (e.g., the broader `SentenceItem` usage, other E2E mocks, a possible duplicate competitive-multiplayer track) are flagged as risks but not exhaustively audited, as those files are not in `games-batch-13`.
- **No acceptance or closeout determination is made or implied by this review.** This document records line-anchored findings only; it does not approve, accept, or close any track, nor does it assert any track is release-ready.
