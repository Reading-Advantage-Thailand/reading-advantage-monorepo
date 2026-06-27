# Line-by-Line Review — games-batch-11

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-11`
**Scope source:** `/tmp/opencode/games-batch-11` (20 files, read exactly as listed)
**Reviewer constraint:** Documentation-only review. No source code was edited. This batch contains **only Measure governance/process documents** for `apps/advantage-games/measure/` — root-level Measure files (index, product, product-guidelines, tech-stack, tech-debt, tracks, lessons-learned, review/current directives, cover-image spec, setup state), concept/design notes, and the four artifacts of one *new* compliance-audit track (`abyssal-well-compliance-audit_20260426`). No `.ts`/`.tsx` runtime, component, or test source files are present in this batch.
**Finding ID scheme:** `F-GAMES-B11-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Category | Type |
|---|------|----------|------|
| 1 | `measure/cover-image-spec.md` | Asset/brand spec | spec |
| 2 | `measure/current-directive.md` | Process directive | directive |
| 3 | `measure/current_directive.md` | Process directive | directive |
| 4 | `measure/index.md` | Measure root | index |
| 5 | `measure/lessons-learned.md` | Project memory | memory |
| 6 | `measure/notes/dungeon-liberator-assets.md` | Design note | asset note |
| 7 | `measure/notes/game-fidelity-checklist.md` | Design note | checklist |
| 8 | `measure/notes/sentence-game-concepts.md` | Design note | concept |
| 9 | `measure/notes/vocabulary-game-concepts.md` | Design note | concept |
| 10 | `measure/product-guidelines.md` | Product spec | guidelines |
| 11 | `measure/product.md` | Product spec | vision |
| 12 | `measure/review-prompt.md` | Process directive | prompt |
| 13 | `measure/setup_state.json` | Measure state | state |
| 14 | `measure/tech-debt.md` | Debt registry | registry |
| 15 | `measure/tech-stack.md` | Tech spec | spec |
| 16 | `measure/tracks.md` | Track registry | registry |
| 17 | `measure/tracks/abyssal-well-compliance-audit_20260426/index.md` | Track artifact | index |
| 18 | `measure/tracks/abyssal-well-compliance-audit_20260426/metadata.json` | Track artifact | metadata |
| 19 | `measure/tracks/abyssal-well-compliance-audit_20260426/plan.md` | Track artifact | plan |
| 20 | `measure/tracks/abyssal-well-compliance-audit_20260426/report.md` | Track artifact | report |

All paths are relative to `apps/advantage-games/`.

---

## Context for the review focus areas

The requested focus areas (game readiness, shared runtime, scoring/XP/leaderboards/progress/difficulty, importability into Reading/Primary, asset/audio/performance/mobile/browser compatibility, accessibility, age-appropriate UX, test quality) are **runtime concerns**. This batch contains **no runtime code** — only the Measure documents that *describe* those concerns. Findings below therefore assess documentation accuracy, internal consistency, and the evidentiary quality of the claims these documents make about runtime behavior, since downstream readers (and future audits) treat these as the source of truth. Where a document asserts a runtime fact, I cross-checked the filesystem where cheaply possible.

---

## Findings

### F-GAMES-B11-001 — Duplicate, conflicting "current directive" files
**Severity:** Medium
**Files:** `measure/current-directive.md` (1 line); `measure/current_directive.md` (lines 1–10)
**Observation:** Two near-identically named directive files coexist with divergent content and naming conventions (hyphen vs. underscore). `current-directive.md` says "fix 5-7 lint warnings each round until they are no longer present"; `current_directive.md` is a `Status: COMPLETE` changelog of recent tracks. Neither references the other, and `index.md` (lines 5–18) lists *neither* — it points to `autonomous_prompt.md` and `review-prompt.md` as the canonical prompt files.
**Impact:** Ambiguity about which file is authoritative. An automation/agent could load the wrong directive. The hyphen/underscore collision is also a footgun on case/separator-insensitive tooling.
**Recommendation:** Consolidate into a single canonical directive file referenced from `index.md`; delete or archive the other. (Documentation fix only — out of scope to edit here.)

### F-GAMES-B11-002 — `index.md` references files not present / not in batch
**Severity:** Low
**File:** `measure/index.md` (lines 10, 14, 15)
**Observation:** The resolution table points to `./workflow.md`, `./code_styleguides/`, and `./autonomous_prompt.md`. `workflow.md` and `autonomous_prompt.md` exist on disk (confirmed), but the index does not list the directive files, `product-guidelines.md` is listed (line 8) — good. The `code_styleguides/` directory is referenced by both `index.md` and `review-prompt.md` line 14 but was not part of this batch and not independently verified here.
**Impact:** Minor — readers relying on the index to discover canonical files will miss the two directive files in this batch.
**Recommendation:** Add the canonical directive file to the index table once F-GAMES-B11-001 is resolved.

### F-GAMES-B11-003 — `setup_state.json` indicates setup never advanced past initial track generation
**Severity:** Low (Info-adjacent)
**File:** `measure/setup_state.json` (line 1)
**Observation:** `{"last_successful_step": "3.3_initial_track_generated"}`. Despite dozens of completed tracks in `tracks.md`, the setup state still reports the very first setup milestone.
**Impact:** Stale/misleading state file. Harmless to runtime, but undermines confidence that Measure state is being maintained; an idempotent setup re-run keyed off this value could behave unexpectedly.
**Recommendation:** Treat as known stale state or update on setup completion.

### F-GAMES-B11-004 — `tracks.md` has two separate "Upcoming Tracks" sections with divergent path conventions
**Severity:** Medium
**File:** `measure/tracks.md` (lines 231, 663–668)
**Observation:** There are two `## Upcoming Tracks` headers. The first (line 231) precedes completed and planned tracks; the second (line 663) lists four more planned tracks. The second block's links use `./tracks/...` while the rest of the file uses `./measure/tracks/...` and `./measure/archive/...` (e.g., line 369 vs. line 665). These cannot both be correct relative to the same file location.
**Impact:** Broken relative links for at least one set; duplicate section headers reduce machine-parseability of the registry. Some "Planned" tracks (e.g., Multiplayer Competitive Mode at line 368 and Competitive Multiplayer Mode at line 665; Teacher Dashboard at 386 vs. Teacher Dashboard v2 at 666; Sentence Game Expansion at 395 vs v2 at 667; Accessibility at 251/668) appear duplicated/overlapping.
**Recommendation:** Deduplicate the upcoming-tracks list and normalize link prefixes to a single convention.

### F-GAMES-B11-005 — `tracks.md` link-prefix inconsistency (`./measure/tracks/...` from inside `measure/`)
**Severity:** Low
**File:** `measure/tracks.md` (e.g., lines 8, 17, 76, 369, 405)
**Observation:** Links are written as `./measure/archive/...` and `./measure/tracks/...`, but `tracks.md` itself lives *inside* `measure/`. From the file's own location the correct relative path would be `./archive/...` / `./tracks/...`. The links appear written relative to the app root rather than to the file.
**Impact:** Relative links resolve incorrectly when opened relative to `tracks.md`. Inconsistent with `index.md`, which correctly uses `./product.md` etc. (root-of-measure relative).
**Recommendation:** Pick one base (file-relative) and apply consistently. Low severity because these are navigational aids, not runtime.

### F-GAMES-B11-006 — Abyssal Well track marked "new" in metadata but plan/report claim full completion
**Severity:** High
**Files:** `abyssal-well-compliance-audit_20260426/metadata.json` (lines 4, 9, 10); `plan.md` (all tasks `[x]`, lines 4–54); `report.md` (lines 20, 144); `tracks.md` (lines 485–490, "Status: New")
**Observation:** `metadata.json` reports `"status": "new"`, `"actual_tasks": null`, `"deviation_notes": ""`, and `updated_at` equal to `created_at` (2026-04-26T07:30:00Z). Yet `plan.md` marks **every** task complete (including Phase 7 commit `[46ba897]`), and `report.md` declares "FULLY COMPLIANT, 25/25 PASS". `tracks.md` line 490 also still says "Status: New". The three artifacts disagree on the track's lifecycle state.
**Impact:** Status integrity failure. A reader cannot trust whether this audit actually ran/closed. Metadata that never advanced past "new" while the plan claims a commit hash strongly suggests the plan/report were authored without updating metadata — or were generated optimistically.
**Recommendation:** Reconcile metadata/tracks status with the plan/report. This is a documentation-consistency issue; do not treat the audit as closed on the strength of `report.md` alone. (Per this review's constraints, no acceptance/closeout is claimed here.)

### F-GAMES-B11-007 — Abyssal Well `index.md` links to a `spec.md` that is referenced but not in this batch; plan Phase-7 commit hash unverified
**Severity:** Low
**Files:** `abyssal-well-compliance-audit_20260426/index.md` (line 3); `plan.md` (lines 51–54)
**Observation:** `index.md` links `./spec.md` (exists on disk, confirmed, but was not in the batch file list so not reviewed here). `plan.md` Phase 7 attributes tasks to commit `[46ba897]`. The commit hash is asserted in the doc; not independently verified in this documentation-only pass.
**Impact:** Low — flagged as a verification gap, not a defect.
**Recommendation:** None beyond noting the unverified commit reference.

### F-GAMES-B11-008 — Report claims an asset directory that does not exist on disk
**Severity:** High
**File:** `abyssal-well-compliance-audit_20260426/report.md` (lines 77, 122–123); cross-ref `plan.md` line 8
**Observation:** Report check #23 ("Asset Location — PASS") states the audit "Created `/public/games/sentence/abyssal-well/`". Filesystem check: `apps/advantage-games/public/games/sentence/abyssal-well/` **does not exist** (`No such file or directory`). The report asserts a created artifact that is absent.
**Impact:** A "PASS" backed by a missing artifact. If the game expects to load sprites/audio from that path at runtime, this is a latent asset-loading/game-readiness risk; at minimum the compliance evidence is false.
**Recommendation:** Verify whether Abyssal Well actually needs a per-game asset dir (it may be fully Konva-shape rendered — see the Dungeon Liberator note pattern where portal/trail are code-drawn). Correct the report claim or create the directory. Flag the broader audit-evidence reliability concern.

### F-GAMES-B11-009 — Cover image is a symlink pointing OUTSIDE the monorepo (non-portable / import risk)
**Severity:** High
**File:** `abyssal-well-compliance-audit_20260426/report.md` (lines 78, 122–123)
**Observation:** Report check #24 ("Cover Image — PASS — Symlinked"). Filesystem check: `public/games/cover/abyssal-well-cover.png` is a **symlink** to `/home/daniel-bo/Desktop/advantage-games/public/games/cover/cover-the-abyssal-well.png` — an absolute path *outside* the monorepo. The target currently exists (~2 MB) but only on this machine.
**Impact:** Directly undermines two focus areas: **asset/browser readiness** and **importability into Reading/Primary**. Absolute, machine-local symlinks break on CI, in Docker builds, on other developer machines, and when the game is imported into the Reading/Primary apps. Next.js `public/` symlinks to outside-tree absolute paths are fragile and may not be served. The "PASS" masks a portability defect.
**Recommendation:** Replace the symlink with a real committed PNG inside the repo at the expected path. Audit other games for the same symlink pattern (lessons-learned mentions "asset dir" fixes across many games — possible systemic issue).

### F-GAMES-B11-010 — `tech-debt.md` claims "Remaining: None" while leaving a real naming inconsistency open
**Severity:** Medium
**File:** `measure/tech-debt.md` (lines 6–7, 16–17, 26–27, 37, 43)
**Observation:** The top "Remaining" block (line 7) lists an open item: `VocabularyItem[] vs SentenceItem[]` naming inconsistency in Griffin Riders Escape, Gryphon Patrol, Village Guardian. Yet each per-track subsection below declares "Remaining: None" (lines 17, 27, 37, 43). The aggregate registry contradicts itself, and the sentence-game concept note compounds it (see F-GAMES-B11-013).
**Impact:** The prop-contract naming ambiguity is a genuine **importability/shared-runtime** risk (a consumer importing these components must know whether the prop is `vocabulary` or `sentences`). Declaring "None remaining" hides it.
**Recommendation:** Keep the prop-naming item visibly open until resolved across all three games; reconcile with the fidelity checklist section C (see F-GAMES-B11-012).

### F-GAMES-B11-011 — `game-fidelity-checklist.md` "Games Under Audit" table contradicts `lessons-learned.md` and `tracks.md`
**Severity:** Medium
**Files:** `measure/notes/game-fidelity-checklist.md` (lines 109–118); `measure/lessons-learned.md` (lines 12–28, 30); `measure/tracks.md` (lines 154–168)
**Observation:** The checklist table (lines 117–118) lists **Griffin Sky-Joust** and **Realm Carver** as "❌ not built — Out of scope (Phase 4)". But `tracks.md` lines 154–168 mark both as "✅ COMPLETE", and `lessons-learned.md` line 30 lists both among completed audits. The note is stale relative to the registries.
**Impact:** A reader using the fidelity checklist as a status source gets the wrong readiness picture for two games.
**Recommendation:** Update the note's status table or mark it as a point-in-time snapshot with a date.

### F-GAMES-B11-012 — Fidelity checklist prop contract (`sentences: SentenceItem[]`) conflicts with concept-note guidance (`VocabularyItem[]`)
**Severity:** Medium
**Files:** `measure/notes/game-fidelity-checklist.md` (lines 34–35); `measure/notes/sentence-game-concepts.md` (lines 101–116); `measure/notes/vocabulary-game-concepts.md` (lines 336–337)
**Observation:** The fidelity checklist mandates sentence-game components take `sentences: SentenceItem[]` (line 34, "not `vocabulary`"). The sentence-game-concepts note (line 101) instead says sentence games "Use `VocabularyItem[]` with full sentences" and shows a `{ term, translation }` JSON shape (lines 109–116). The Abyssal Well report itself (report.md line 48) says it "Uses `{ term, translation }` from `VocabularyItem`" — i.e., it follows the *concept note*, not the *checklist*'s `SentenceItem[]` contract.
**Impact:** The platform has two competing prop/data contracts for sentence games documented as authoritative. This is the root cause of F-GAMES-B11-010's open naming item and is a real **shared-runtime/importability** hazard.
**Recommendation:** Decide a single canonical type (`SentenceItem` vs `VocabularyItem`) for sentence games and align all three notes + checklist + tech-debt.

### F-GAMES-B11-013 — Sentence-game XP formula in notes diverges from product/report XP model
**Severity:** Medium
**Files:** `measure/notes/sentence-game-concepts.md` (line 104); `measure/notes/vocabulary-game-concepts.md` (line 340); `measure/product.md` (lines 25–29); `abyssal-well-compliance-audit_20260426/report.md` (line 56)
**Observation:** Both concept notes specify `XP = Math.floor(correctWords * accuracy)` (sentence) / `Math.floor(correctAnswers * accuracy)` (vocab). Product vision (lines 26–29) describes XP as accuracy + speed/time-bonus. The Abyssal Well report (line 56) describes a "1–10 scale" `calculateXP` with "accuracy/speed/survival bonuses, capped at 10". These three XP descriptions are mutually inconsistent (the notes' formula is unbounded by 10 and has no speed/survival term).
**Impact:** **Scoring/XP/progress** focus area: the canonical XP contract is undocumented/contradictory. Leaderboard comparability across games depends on a shared XP scale (1–10 per the report and `sentence-game-concepts` line 3 "1-10 XP"), which the formula on line 104 does not enforce.
**Recommendation:** Document one canonical XP model (the 1–10 capped accuracy+speed+survival model appears to be the de-facto standard per lessons-learned line 18 and the report). Update concept notes to match or mark their formula as illustrative-only.

### F-GAMES-B11-014 — No leaderboard / progress contract documented for importability into Reading/Primary
**Severity:** Medium
**Files:** `measure/product.md` (lines 25–31); `measure/tracks.md` (lines 359–364); `abyssal-well-compliance-audit_20260426/report.md` (lines 50, 99)
**Observation:** The XP Leaderboard track (tracks.md 359–364) describes a **localStorage** leaderboard with cumulative XP and session history. Nothing in these governance docs describes how XP/progress is persisted or surfaced when a game is **imported into Reading/Primary** (the requested focus). The Abyssal Well report (lines 50, 99) shows completion POSTs `session?.user?.id` to a complete-route, implying server persistence, but no document reconciles the localStorage leaderboard with the host-app progress system.
**Impact:** **Importability** gap: a localStorage-scoped leaderboard does not integrate with a host LMS's progress/XP store, and there is no documented adapter contract. Risk of double or divergent progress tracking when embedded.
**Recommendation:** Add a short "host integration / progress contract" note describing how `onComplete({xp, accuracy})` maps to host persistence vs. the standalone localStorage leaderboard.

### F-GAMES-B11-015 — Accessibility/age-appropriateness guidance present but text-size thresholds conflict
**Severity:** Low
**Files:** `measure/product-guidelines.md` (lines 4, 10–17); `measure/notes/game-fidelity-checklist.md` (lines 66, 71); `measure/notes/vocabulary-game-concepts.md` (line 342); `abyssal-well-compliance-audit_20260426/report.md` (line 41)
**Observation:** The fidelity checklist (line 66) requires in-game text "≥ 18px at base resolution"; vocabulary-game-concepts (line 342) says "16px minimum text"; the Abyssal Well report (line 41) accepts UI `text-sm` (14px) as "minimum". Three different minimum text sizes are documented. Product guidelines target ages 7–18 (line 4) and mandate haptics/audio multi-sensory feedback (lines 12–17) — good, but no document defines the audio asset contract or a reduced-motion/mute affordance.
**Impact:** **Accessibility/age-appropriate UX** focus: inconsistent minimum-legibility bar; 14px conflicts with the 16–18px guidance for young learners. No documented audio-on/off or reduced-motion accessibility toggle (only "where supported" haptics).
**Recommendation:** Standardize a single minimum text-size policy (distinguish canvas gameplay text vs. chrome UI explicitly) and document audio mute + reduced-motion expectations.

### F-GAMES-B11-016 — Cover-image spec conflicts with stated product visual identity
**Severity:** Low
**Files:** `measure/cover-image-spec.md` (lines 18–21); `measure/product-guidelines.md` (lines 5–10); `measure/tracks.md` (lines 7–12)
**Observation:** `cover-image-spec.md` mandates an "RPG / MMORPG aesthetic" with "serif, gothic, or heroic" fantasy typography (lines 19–20). `product-guidelines.md` defines the visual aesthetic as "Modern Clean & Bright Cartoon" with "modern, sans-serif fonts" (lines 3, 10). `tracks.md` lines 7–12 say the implemented identity is "Obsidian Grimoire ... high-contrast brutalist." Three different visual-identity directions are documented as authoritative.
**Impact:** **Age-appropriate UX / branding** inconsistency. Cover art produced to the RPG/gothic spec may clash with a "Bright Cartoon" primary-school audience (ages 7–11) and with the shipped "Obsidian Grimoire" identity.
**Recommendation:** Reconcile cover-image spec with the canonical visual identity, and note per-audience (primary vs. secondary) cover variants if intended.

### F-GAMES-B11-017 — Test-quality claims in report are not independently reproducible from this batch
**Severity:** Low
**File:** `abyssal-well-compliance-audit_20260426/report.md` (lines 17, 67, 127–138)
**Observation:** Report asserts "89.28% overall, 80.91% component", "60 passed, 60 total", and names three test files. The named logic/config/component test files exist on disk (confirmed `abyssalWell.test.ts` and the `__tests__` dir), but the coverage/pass numbers are documentation assertions; no coverage artifact is included in the batch and tests were not run (review is documentation-only and must not edit/run source per scope).
**Impact:** Low — flagged as an evidence gap, not a defect. The 80.91% component figure is only marginally above the 80% gate, leaving little margin.
**Recommendation:** Attach or link a coverage report artifact to substantiate the numbers; treat the margin as a regression risk.

### F-GAMES-B11-018 — `current_directive.md` "Status: COMPLETE" is an unanchored global claim
**Severity:** Low
**File:** `measure/current_directive.md` (lines 3, 5–10)
**Observation:** The file declares `## Status: COMPLETE` then lists tracks completed up to 2026-04-17, while `tracks.md` shows ~30 compliance-audit tracks still `Status: New` (lines 404–661) as of 2026-04-26. A top-level "COMPLETE" directive contradicts a registry full of open work.
**Impact:** Misleading process state; an automation reading the directive could conclude there is nothing to do.
**Recommendation:** Scope the "COMPLETE" claim to the specific directive it refers to, or update it.

### F-GAMES-B11-019 — Dungeon Liberator asset note documents 800×600 / 4:3 canvas, contradicting mobile-first 390×844 portrait mandate
**Severity:** Low
**Files:** `measure/notes/dungeon-liberator-assets.md` (lines 4–6, 9–16); `measure/notes/game-fidelity-checklist.md` (lines 63, 68); `apps/advantage-games/AGENTS.md` (mobile-first 390×844 portrait)
**Observation:** The Dungeon Liberator asset note specifies an 800×600, 4:3 **landscape** canvas with fixed pixel layout zones. The fidelity checklist and app AGENTS mandate mobile-first **portrait** 390×844 with `ResizeObserver` scaling. A fixed 4:3 landscape asset design is at odds with portrait-first scaling.
**Impact:** **Mobile/performance** focus: portrait phones would heavily letterbox a 4:3 landscape scene; fixed-pixel layout zones (e.g., "player spawns at x:100") imply non-responsive coordinates unless scaled. Possible legibility/touch-target issues on phones.
**Recommendation:** Confirm Dungeon Liberator's runtime actually scales the 800×600 world responsively; if the note describes the shipped layout, reconcile with the portrait mandate or document the intentional exception.

### F-GAMES-B11-020 — Concept notes prescribe tilt and continuous-DPad controls without accessibility/touch-target fallback
**Severity:** Low
**Files:** `measure/notes/vocabulary-game-concepts.md` (lines 116, 224, 278); `measure/notes/sentence-game-concepts.md` (lines 40, 70, 94)
**Observation:** Several concept controls rely on device tilt ("Tilt or tap left/right", line 116) or swipe-only gestures (lines 200, 278) and continuous DPad movement. The product/checklist require ≥44×44px touch targets and keyboard support (vocabulary-game-concepts line 341, checklist line 65), but tilt-based control has no documented non-tilt fallback and conflicts with accessibility-assist expectations.
**Impact:** **Accessibility/browser-compatibility** risk: device-orientation APIs require permission on iOS Safari and are unavailable on desktop; swipe-only games exclude keyboard users. These are concept notes (not necessarily shipped), so severity is low.
**Recommendation:** Note a mandatory non-tilt/keyboard fallback for any concept that reaches implementation.

---

## Cross-Cutting Observations

- **Audit-evidence reliability:** Two report "PASS" checks in the Abyssal Well report (#23 asset dir, #24 cover image) are contradicted by the filesystem (F-GAMES-B11-008, F-GAMES-B11-009). This lowers confidence in self-reported compliance reports generally and suggests the broader `advantage_games_review` should spot-check asserted artifacts rather than trust report tables.
- **Status drift across registries:** `metadata.json` (status: new), `tracks.md` (Status: New), `plan.md` (all done), and `report.md` (fully compliant) disagree for the same track (F-GAMES-B11-006). Combined with the stale `setup_state.json` (F-GAMES-B11-003) and "COMPLETE" directive (F-GAMES-B11-018), Measure state hygiene is a recurring theme in this batch.
- **Competing canonical contracts:** Prop type (`SentenceItem[]` vs `VocabularyItem[]`), XP formula (unbounded vs 1–10 capped), minimum text size (14/16/18px), and visual identity (RPG-gothic vs Bright-Cartoon vs Obsidian-Grimoire) each have ≥2 documents claiming authority. These directly touch the requested **shared-runtime, scoring/XP, accessibility, and importability** focus areas at the documentation level.
- **Portability:** The outside-repo absolute symlink for the cover image (F-GAMES-B11-009) is the single highest concrete risk to **importability into Reading/Primary** found in this batch.

---

## Limitations

1. **Documentation-only batch.** No runtime `.ts`/`.tsx`, component, test, or asset binaries were in the file list. All findings concern document accuracy/consistency and the evidentiary quality of claims about runtime behavior. The actual game readiness, shared-runtime wiring, scoring math, leaderboard behavior, mobile/browser performance, audio, and accessibility were **not exercised** because no executable code was in scope.
2. **No source edits and no test execution.** Per task constraints, no source code was modified and the test suite was not run; reported coverage/pass figures (F-GAMES-B11-017) were not reproduced.
3. **Filesystem cross-checks were limited and cheap.** I confirmed existence/absence of the asset dir, the cover symlink and its target, the named test files, `gameCards.ts`, `workflow.md`, and `autonomous_prompt.md`. I did **not** verify `code_styleguides/`, the `spec.md` contents (referenced by the track index but outside the batch list), the `[46ba897]` commit, or any other game's assets.
4. **Concept notes vs shipped reality.** `sentence-game-concepts.md`, `vocabulary-game-concepts.md`, and `dungeon-liberator-assets.md` are design/ideation notes; some findings (F-GAMES-B11-019/020) may describe unbuilt concepts rather than shipped behavior. Severities were set low accordingly.
5. **No acceptance or closeout performed.** This report is a line-by-line review artifact only. It makes **no** acceptance, verification-pass, or track-closeout claim for `advantage_games_review_20260626` or for the Abyssal Well audit track; status-reconciliation findings (e.g., F-GAMES-B11-006) are raised for the owning track to resolve, not resolved here.

---

## Coverage Confirmation

All **20/20** files from `/tmp/opencode/games-batch-11` were read in full and reviewed. Findings `F-GAMES-B11-001` through `F-GAMES-B11-020` are line-anchored to the files above.
