# Line Review: games-batch-01

- **Track:** `advantage_games_review_20260626`
- **Batch:** games-batch-01 (20 files)
- **Reviewer focus:** game readiness; shared runtime; scoring/XP/leaderboards/progress/difficulty; importability into Reading/Primary; asset/audio/performance/mobile/browser compatibility; accessibility; age-appropriate UX; test quality
- **Scope of this batch:** app-level config and agent/docs files for `apps/advantage-games`, plus three archived Measure tracks (abyssal-well, accessibility_input_assist, archers-revenge). No runtime game source is in this batch; findings are anchored to the contracts, standards, configs, and track artifacts that govern the games.
- **Date:** 2026-06-27
- **Constraint honored:** No source code was edited. This report makes no acceptance or closeout claims.

---

## File-by-File Review

### F1: `apps/advantage-games/.gitignore`

| Aspect | Assessment |
|--------|-----------|
| Game readiness | Standard Next.js ignore set; `.env*` ignored (line 35) — good for secrets |
| Asset/perf | `nanobanana-output/` (line 26) ignored — image-gen tool scratch dir, fine |
| Test quality | `/coverage` ignored (line 14) but no coverage artifact is produced/enforced (see F10) |

| Line | Finding |
|------|---------|
| 14 | `/coverage` is git-ignored, implying coverage was intended, but the Jest config (F10) does not enable `collectCoverage` or a `coverageThreshold`, so the AGENTS.md ">80% coverage" mandate is not machine-enforced. Cross-ref **F-GAMES-B01-014**. **Severity: informational**. ✓ |
| 35 | `.env*` correctly ignored. ✓ |

No defects in this file itself.

---

### F2: `apps/advantage-games/.opencode/opencode.json`

| Aspect | Assessment |
|--------|-----------|
| All | Pure agent-tooling config (compaction settings). No game/runtime/security relevance. |

| Line | Finding |
|------|---------|
| 1–8 | Valid JSON, schema-referenced. No findings. ✓ |

---

### F3: `apps/advantage-games/AGENTS.md`

| Aspect | Assessment |
|--------|-----------|
| Game readiness | Mandates React-Konva canvas, mobile-first 390×844, strict TDD >80% coverage — strong readiness baseline |
| Shared runtime | Points to reference games for patterns but does not define the shared game-interface contract (that lives only in README) |
| Importability | Silent on the host-platform (Reading/Primary) integration contract, vocab injection, or progress/XP persistence API |

| Line | Finding |
|------|---------|
| 35 | "Strict TDD workflow with >80% coverage" is asserted as policy, but no config in this batch enforces it (see F10/F11). Policy-vs-enforcement gap. **F-GAMES-B01-001 [test-gate-gap]**. **Severity: low**. |
| 38 | Reference-game roster (Dragon Flight, Wizard vs Zombie, Rune Match, Potion Rush, Dungeon Liberator) does not match the README roster (F7: Magic Defense, RPG Battle, Dragon Flight, Wizard vs Zombie, Rune Match, Castle Defense) — neither lists the same set, and Abyssal Well / Archer's Revenge (this batch's tracks) appear in neither. Inconsistent canonical game inventory across docs. **F-GAMES-B01-002 [doc-drift]**. **Severity: low**. |
| 25–28 | Declares the project uses a `vocab-game-builder` skill and the `measure` skill "exclusively." No importability/leaderboard contract is referenced here. Scope item "leaderboards" is absent from the governing agent doc. **F-GAMES-B01-003 [missing-contract]**. **Severity: informational**. |

---

### F4: `apps/advantage-games/CLAUDE.md`

| Line | Finding |
|------|---------|
| 1 | Single `@AGENTS.md` include — correct delegation, no duplication. ✓ |

No findings.

---

### F5: `apps/advantage-games/DESIGN.md`

| Aspect | Assessment |
|--------|-----------|
| Age-appropriate UX | Defines a "Vercel Core" monochrome, developer-tool aesthetic — black/white/gray with red as the only accent |
| Importability | Design tokens differ sharply from a child-facing reading platform's palette |

| Line | Finding |
|------|---------|
| 4–22, 104–137 | The design system is an austere monochrome developer aesthetic ("rejects decorative excess," "prioritize typography over icons or images," no gradients/shadows, palette 100% grayscale + red). This is **misaligned with age-appropriate UX for K–12 educational games**, which the game specs themselves describe as colorful dark-fantasy with "glowing cyan/green words, orange fire accents" (see F14, spec lines 87–89). A monochrome dev-tool system is unlikely to be the right token source for child-facing games and conflicts with the games' own visual direction. **F-GAMES-B01-004 [age-ux-mismatch]**. **Severity: medium**. |
| 19, 113 | `destructive`/Vercel Red `#FF0000` "reserved strictly for destructive actions" — but arcade games routinely use red for damage/enemies/fire. The single-accent constraint is impractical for the stated game themes. **F-GAMES-B01-005 [design-constraint-conflict]**. **Severity: low**. |
| N/A | Importability: if a game is embedded into Reading/Primary, it should inherit the host's design tokens, not impose "Vercel Core." No guidance reconciling this with host theming. **F-GAMES-B01-006 [import-theming]**. **Severity: low**. |

---

### F6: `apps/advantage-games/GEMINI.md`

| Line | Finding |
|------|---------|
| 1 | File is **empty (0 lines)**. A committed empty agent-instruction file is a dead artifact that can confuse tooling that expects parity with AGENTS.md/CLAUDE.md. Either populate with `@AGENTS.md` (matching CLAUDE.md) or remove. **F-GAMES-B01-007 [dead-file]**. **Severity: low**. |

---

### F7: `apps/advantage-games/README.md`

| Aspect | Assessment |
|--------|-----------|
| Scoring/XP | Defines the "Game Interface Standard" XP formula — but it contradicts the per-game specs |
| Importability | Defines input (VocabularyItem) and output (XP) contract, but it is under-specified for multi-tenant host integration |
| Asset/audio/perf | Documents preloader/sprite-sheet *recommendations* but does not mandate them |
| Leaderboards/progress | Not mentioned anywhere — scope gap |

| Line | Finding |
|------|---------|
| 57–62 | Standard XP formula: `XP = Math.floor(correctAnswers * accuracy)` where `accuracy = correctAnswers / totalAttempts`. This yields very small XP values (e.g. 8 correct at 80% accuracy → `floor(8 * 0.8) = 6`) and is **inconsistent with the Abyssal Well spec** (F14, spec lines 36–40), which uses `baseXP + accuracyBonus + speedBonus` clamped 1–10. Two incompatible XP contracts exist. Cross-platform progress/XP comparisons will be inconsistent. **F-GAMES-B01-008 [xp-contract-conflict]**. **Severity: high**. |
| 64–65 | Output exposure is "e.g. via a callback prop like `onComplete(xp)` **or** by updating a shared store" — an ambiguous, non-normative interface. Importability into Reading/Primary requires a single stable contract; "or" leaves each game free to diverge. No `userId`/`schoolId`/`locale`/`difficulty`/`attempts` payload is specified, only a scalar XP. **F-GAMES-B01-009 [weak-import-contract]**. **Severity: high**. |
| 67–119 | Vocabulary is loaded from static `public/vocab/*.json` files hardcoded to Thai↔English. There is no documented mechanism for the host platform to inject dynamic, per-user, per-lesson, or per-locale vocabulary at runtime. This blocks clean importability into Reading/Primary, which supply their own content. **F-GAMES-B01-010 [static-vocab-coupling]**. **Severity: high**. |
| 74–84 | The `public/vocab/` file list (enchanted-library, rune-match, wizard-vs-zombie, dragon-flight, rpg-battle, magic-defense, potion-rush, castle-defense) does not match the showcased game list at lines 7–29 (Magic Defense, RPG Battle, Dragon Flight, Wizard vs Zombie, Rune Match, Castle Defense) — "enchanted-library" and "potion-rush" have vocab files but no showcase entry, and the rosters disagree with AGENTS.md (F3). **F-GAMES-B01-011 [roster-drift]**. **Severity: low**. |
| 98–99 | "Word-based (6 games)" vs "Sentence-based (2 games)" = 8 games, but other docs imply more (Abyssal Well, Archer's Revenge, Dungeon Liberator are not counted). The game count is stale. **F-GAMES-B01-012 [stale-count]**. **Severity: informational**. |
| 117–119 | Fallback-to-`default.json` is good resilience, but it is silent (console warning only) — a host embedding the game could ship the wrong vocab without a hard failure. **Severity: informational**. |
| 148–279 | ~130 lines of brainstorming prose ("casual game ideas", "technical hurdles") are committed into the README. This is LLM-style ideation, not developer guidance; it bloats the canonical doc and mixes speculative ideas with normative standards. **F-GAMES-B01-013 [readme-bloat]**. **Severity: low**. |
| 231 | "browsers have a built-in 300ms delay" — outdated: modern mobile browsers remove the 300ms tap delay when a responsive `viewport` meta / `touch-action` is set. Stating it as a current limit may mislead. **Severity: informational**. |
| 246–263 | Preloader, sprite sheets, and `touch-action: none` are presented as recommendations, not enforced standards. Given the asset/audio/performance/mobile focus of this review, these should be mandatory readiness gates, not prose. No leaderboard contract appears anywhere in the README. **Severity: informational** (gap noted under F-GAMES-B01-003). |

---

### F8: `apps/advantage-games/components.json`

| Line | Finding |
|------|---------|
| 7 | `tailwind.config` is empty string `""`. Acceptable for Tailwind v4 (CSS-first) but means the shadcn generator has no JS config target; verify this matches the actual Tailwind setup. **Severity: informational**. |
| 9 | `baseColor: "neutral"` — consistent with the monochrome DESIGN.md but reinforces the age-UX mismatch (F-GAMES-B01-004) for child-facing games. **Severity: informational**. |

No defects.

---

### F9: `apps/advantage-games/eslint.config.mjs`

| Aspect | Assessment |
|--------|-----------|
| Test/quality gate | Several correctness-relevant rules are downgraded to `warn`, so CI lint will not fail on them |

| Line | Finding |
|------|---------|
| 10 | `@typescript-eslint/no-explicit-any: "warn"` — `any` will not fail the build. For game state/scoring/XP code, untyped `any` weakens the contract guarantees the review cares about (XP/progress correctness). **F-GAMES-B01-015 [weak-lint-any]**. **Severity: low**. |
| 13 | `no-undef: "warn"` — undefined references (a genuine runtime-bug class) only warn. In canvas/game-loop code this can let real reference errors through CI. **F-GAMES-B01-016 [weak-lint-no-undef]**. **Severity: low**. |
| 14 | `react/no-unknown-property: "warn"` — relevant for React-Konva, which uses many non-DOM props; downgrading avoids false positives but also hides genuine typos in Konva node props. **Severity: informational**. |
| 11–12 | `prefer-const`, `no-constant-binary-expression` as `warn` — stylistic/minor. **Severity: informational**. |

Net: lint is effectively advisory for the rules that matter to game correctness. **F-GAMES-B01-017 [non-blocking-lint]** (rollup). **Severity: low**.

---

### F10: `apps/advantage-games/jest.config.ts`

| Aspect | Assessment |
|--------|-----------|
| Test quality | jsdom + v8 coverage provider configured, but no coverage collection or threshold |
| Shared runtime | Tests depend on prebuilt `dist/` of sibling packages |

| Line | Finding |
|------|---------|
| 11–14 | `coverageProvider: 'v8'` is set but there is **no `collectCoverage`, `collectCoverageFrom`, or `coverageThreshold`**. The AGENTS.md ">80% coverage" mandate (F3) is therefore not enforced by this config. **F-GAMES-B01-014 [coverage-not-enforced]**. **Severity: medium**. |
| 18–19 | `moduleNameMapper` resolves `@reading-advantage/utils` and `@reading-advantage/ui` to `../../packages/*/dist`. Tests require those packages to be **built first**; a clean checkout running `jest` without a prior build will fail to resolve. Fragile test bootstrap / CI ordering dependency. **F-GAMES-B01-018 [dist-dependency]**. **Severity: low**. |
| 17 | `next/server` is remapped to a local `__mocks__` — reasonable for App Router route handlers. ✓ |
| 21–23 | `transformIgnorePatterns` correctly un-ignores `konva`/`react-konva` so ESM is transformed. Good for canvas games. ✓ |
| 24–27 | e2e tests excluded from the Jest run — appropriate separation. ✓ |

---

### F11: `apps/advantage-games/jest.setup.ts`

| Aspect | Assessment |
|--------|-----------|
| Test quality | Minimal jsdom shims; insufficient for canvas/audio game testing |

| Line | Finding |
|------|---------|
| 3–8 | Only `ResizeObserver` is mocked. Canvas/Konva games typically also need `HTMLCanvasElement.getContext`, `matchMedia`, `IntersectionObserver`, and an `Audio`/`AudioContext` shim under jsdom. Their absence means either games avoid those APIs in tests (limiting coverage) or each test re-mocks ad hoc. Given the asset/audio focus, audio behavior is effectively untestable from this baseline. **F-GAMES-B01-019 [thin-test-shims]**. **Severity: low**. |
| 9 | `global.ResizeObserver = ResizeObserverMock` assigned without a TS cast; tolerable in setup but may rely on loose typing. **Severity: informational**. |

---

### F12: `measure/archive/abyssal-well-20260320/metadata.json`

| Line | Finding |
|------|---------|
| 4 | `"status": "completed"` and `completed_at` set, yet the plan (F13) leaves Phase 7 "Polish & Integration" items unchecked (sound effects, hit/visual feedback, balance tuning, cover image). A track archived as **completed with incomplete polish/audio/asset tasks** misrepresents game readiness. **F-GAMES-B01-020 [false-complete]**. **Severity: medium**. |
| 2 | Uses key `track_id` (consistent with accessibility track, but inconsistent with Archer's Revenge which uses `id` — see F20). Schema drift across tracks. Cross-ref **F-GAMES-B01-029**. **Severity: informational**. |

---

### F13: `measure/archive/abyssal-well-20260320/plan.md`

| Aspect | Assessment |
|--------|-----------|
| Difficulty | Three-tier difficulty (shallow/deep/abyss) well-defined |
| Audio/asset | Sound effects and cover image deferred and never completed |
| Accessibility/UX | Pause deferred; 44×44 touch targets and 16px text mandated |

| Line | Finding |
|------|---------|
| 60–64 | Phase 7 unchecked: visual feedback, **sound effects (fire/hit/breach/victory/defeat)**, balance tuning, and cover image placeholder. These are exactly the asset/audio/readiness items in this review's scope and remain incomplete despite the track being archived as completed (F12). **F-GAMES-B01-021 [missing-audio-assets]**. **Severity: medium**. |
| 55 | "Implement pause functionality (deferred - not essential for MVP)" but the line is marked `[x]` (done) while the parenthetical says deferred — contradictory status. A missing pause is an **accessibility/age-UX concern** for younger players who get interrupted. **F-GAMES-B01-022 [no-pause]**. **Severity: low**. |
| 39, 100 | Mandates "44×44px minimum touch targets" and "All text minimum 16px" — good mobile/accessibility baseline. ✓ |
| 99 | "test on 390×844 viewport" — mobile-first reference matches AGENTS.md. ✓ |
| 86–89 | Difficulty multipliers (speedMult 0.7/1.0/1.3, words 4/5/6) provide real progression scaling. ✓ |
| N/A | No leaderboard or cross-game progress integration task anywhere in the plan. **Severity: informational** (scope gap, rolled into F-GAMES-B01-003). |

---

### F14: `measure/archive/abyssal-well-20260320/spec.md`

| Aspect | Assessment |
|--------|-----------|
| Scoring/XP | XP formula is internally inconsistent and conflicts with the README standard |
| Age-appropriate UX | Dark-fantasy "Shadow Demons" theme |
| Mobile/perf | Pseudo-3D scaling approach documented; mobile-first |

| Line | Finding |
|------|---------|
| 36–40 | XP: `Base XP = correctWords * 10`, `Accuracy bonus = floor(accuracy*50)`, plus speed bonus, then "**clamped 1-10**." Clamping a sum that starts at `correctWords*10` (≥40 for 4 words) to a max of 10 makes the accuracy and speed bonuses **mathematically irrelevant** — any non-trivial run saturates at 10. The formula is incoherent. **F-GAMES-B01-023 [incoherent-xp-clamp]**. **Severity: high**. |
| 36–40 vs README 57–62 | This game's XP model (`base+accuracy+speed`, clamp 1–10) directly contradicts the README "Game Interface Standard" (`floor(correct*accuracy)`). Confirms the cross-game XP inconsistency. Cross-ref **F-GAMES-B01-008**. **Severity: high**. |
| 32–34, 64–84 | Theme includes "Shadow Demons," demons, spiders, a deep pit, and "rim breached" fail states. For the **Primary (younger)** audience this dark-fantasy/demonic framing may be age-inappropriate; no age-band guidance is given for import into Primary vs Reading. **F-GAMES-B01-024 [age-theme]**. **Severity: low**. |
| 42–46 | Vocabulary input is `VocabularyItem[] {term, translation}` — consistent with README input shape, but again no host-injection contract (same coupling as F-GAMES-B01-010). **Severity: informational**. |
| 50–60, 91–96 | Pseudo-3D via scaling and React-Konva canvas — sound performance approach for mobile; aligns with shared-runtime guidance. ✓ |

---

### F15: `measure/archive/accessibility_input_assist_20260407/index.md`

| Line | Finding |
|------|---------|
| 1–6 | Track index linking metadata/spec/plan. Note: it links `spec.md` and `plan.md` but not `rollout_pattern.md` (F18), which is a substantive deliverable of the track and is therefore undiscoverable from the index. **F-GAMES-B01-025 [index-incomplete]**. **Severity: informational**. |

---

### F16: `measure/archive/accessibility_input_assist_20260407/metadata.json`

| Line | Finding |
|------|---------|
| 4 | `"status": "in_progress"` — but the track lives in `measure/archive/`. **An archived track marked in_progress** is contradictory and signals it was archived before completion. **F-GAMES-B01-026 [archived-in-progress]**. **Severity: medium**. |
| 8–10 | `estimated_tasks: 7`, `actual_tasks: 6`, `deviation_notes: ""` — a deviation (6 vs 7) exists but the notes field is empty, violating the Measure expectation of explaining deviations. The missing 7th task corresponds to the unchecked Phase 2 manual verification in the plan (F17). **F-GAMES-B01-027 [empty-deviation-note]**. **Severity: low**. |

---

### F17: `measure/archive/accessibility_input_assist_20260407/plan.md`

| Aspect | Assessment |
|--------|-----------|
| Accessibility | Shared assist layer defined; only two games integrated |

| Line | Finding |
|------|---------|
| 22 | Final task "Measure - User Manual Verification 'Phase 2'" is **unchecked `[ ]`** while the track is archived. The verification gate for the integration phase was never closed. **F-GAMES-B01-028 [unverified-archive]**. **Severity: medium**. |
| 16–17 | Only **two** games (WizardZombie, DungeonLiberator) received the accessibility/touch-target/text-scaling integration. With ~8+ games in the app, accessibility coverage is minimal and the rollout (documented in F18) was not applied broadly. This is a significant accessibility-readiness gap across the game library. **F-GAMES-B01-030 [accessibility-coverage-gap]**. **Severity: medium**. |
| 21 | "Document rollout pattern for remaining games" is `[x]` done, but the actual rollout to remaining games is out of this track's scope and not tracked elsewhere in this batch — risk of perpetual partial accessibility. **Severity: informational**. |

---

### F18: `measure/archive/accessibility_input_assist_20260407/rollout_pattern.md`

| Aspect | Assessment |
|--------|-----------|
| Accessibility | Good documented integration pattern, but the text-scaling formula has a unit ambiguity |

| Line | Finding |
|------|---------|
| 48–51 | Text scaling example: `const textScale = getEffectiveTextSize(16) // base font size in pixels` then `fontSize: ${textScale * 1.875}rem`. Multiplying a **pixel** base by `1.875` and emitting it as **`rem`** mixes units: if `getEffectiveTextSize(16)` returns ~16(px), `16 * 1.875 = 30rem` ≈ 480px — clearly wrong. The intended math (16px → 1.875rem≈30px headline) is garbled by treating the px return value as a rem multiplier. Following this pattern verbatim produces broken type scales. **F-GAMES-B01-031 [unit-confusion-formula]**. **Severity: medium**. |
| 26–30 | Touch-target scaling via CSS `transform: scale(...)` with `transformOrigin: 'bottom right'` scales the visual size; this generally scales the hit area too, but reviewers should confirm Konva/pointer hit regions track the transform (canvas hit areas are not auto-scaled by CSS transforms applied to a wrapping div). **F-GAMES-B01-032 [transform-hit-area]**. **Severity: low**. |
| 54–60 | Clear scaling-formula table and game-type guidance. ✓ |
| 72–77 | Provides the exact test command — good for reproducibility. ✓ |

---

### F19: `measure/archive/accessibility_input_assist_20260407/spec.md`

| Line | Finding |
|------|---------|
| 19–26 | All acceptance criteria are `[x]` checked (including "Updated games retain existing gameplay completion flow"), yet the plan's manual-verification gate is unchecked (F17) and metadata is `in_progress` (F16). The spec's "accepted" checkboxes are inconsistent with the unfinished plan/metadata — the track presents as accepted while its verification is open. **F-GAMES-B01-033 [spec-plan-inconsistency]**. **Severity: medium**. |
| 28–31 | Out of scope: "Full WCAG certification" and "Localization overhaul." Reasonable scoping, but means accessibility remains partial and unaudited against WCAG. **Severity: informational**. |
| 9–12 | Functional requirements (larger text, touch-target sizing, assist mode, entry-point config) are sound and align with the rollout doc. ✓ |

---

### F20: `measure/archive/archers-revenge-20260318/metadata.json`

| Line | Finding |
|------|---------|
| 2 | Uses `"id"` as the track-key field, whereas abyssal-well (F12) and the accessibility track (F16) use `"track_id"`. Adds `title`/`priority`/`created` fields the others lack. **Inconsistent track-metadata schema** across the archive — any tooling parsing `track_id` would not find one here. **F-GAMES-B01-029 [metadata-schema-drift]**. **Severity: low**. |
| 9 | Description: enemies that "shoot back" on wrong targets; Space-Invaders shooter. Combat framing — age-appropriateness for Primary should be confirmed; no age-band annotation. Consistent with the broader theme concern. Cross-ref **F-GAMES-B01-024**. **Severity: informational**. |
| 6–8 | `"status": "completed"` with `completed_at` — but unlike abyssal-well, no plan/spec for this track is in the batch, so completion claims cannot be cross-checked here (see Limitations). **Severity: informational**. |

---

## Cross-Cutting Findings

| ID | Theme | Files Affected | Severity |
|----|-------|----------------|----------|
| F-GAMES-B01-001 | TDD/coverage policy stated but unenforced | AGENTS.md, jest.config.ts | Low |
| F-GAMES-B01-002 | Game-roster inconsistency across docs | AGENTS.md, README.md | Low |
| F-GAMES-B01-003 | No leaderboard / host-integration contract in governing docs | AGENTS.md, README.md | Info |
| F-GAMES-B01-004 | Monochrome dev-aesthetic design system vs colorful kid games | DESIGN.md, components.json | Medium |
| F-GAMES-B01-005 | Single red-accent constraint conflicts with arcade themes | DESIGN.md | Low |
| F-GAMES-B01-006 | No host-theming reconciliation for import | DESIGN.md | Low |
| F-GAMES-B01-007 | Empty GEMINI.md dead file | GEMINI.md | Low |
| F-GAMES-B01-008 | XP formula contract conflict (README vs game spec) | README.md, abyssal-well spec.md | High |
| F-GAMES-B01-009 | Weak/ambiguous game output (import) contract | README.md | High |
| F-GAMES-B01-010 | Static `public/vocab` coupling blocks dynamic host vocab | README.md, abyssal-well spec.md | High |
| F-GAMES-B01-011 | Vocab-file list vs showcase roster mismatch | README.md | Low |
| F-GAMES-B01-012 | Stale game count | README.md | Info |
| F-GAMES-B01-013 | Brainstorm prose bloat in canonical README | README.md | Low |
| F-GAMES-B01-014 | Coverage configured but not collected/thresholded | jest.config.ts, .gitignore | Medium |
| F-GAMES-B01-015 | `no-explicit-any` downgraded to warn | eslint.config.mjs | Low |
| F-GAMES-B01-016 | `no-undef` downgraded to warn | eslint.config.mjs | Low |
| F-GAMES-B01-017 | Lint effectively advisory for correctness rules | eslint.config.mjs | Low |
| F-GAMES-B01-018 | Tests depend on prebuilt sibling `dist/` | jest.config.ts | Low |
| F-GAMES-B01-019 | Thin jsdom shims (no canvas/audio/matchMedia) | jest.setup.ts | Low |
| F-GAMES-B01-020 | Track marked completed with incomplete polish | abyssal-well metadata.json/plan.md | Medium |
| F-GAMES-B01-021 | Missing sound effects & assets despite "complete" | abyssal-well plan.md | Medium |
| F-GAMES-B01-022 | Pause deferred (status contradictory) | abyssal-well plan.md | Low |
| F-GAMES-B01-023 | Incoherent XP clamp (bonuses irrelevant) | abyssal-well spec.md | High |
| F-GAMES-B01-024 | Dark-fantasy/demon theme age-appropriateness | abyssal-well spec.md, archers metadata | Low |
| F-GAMES-B01-025 | Track index omits rollout_pattern.md | accessibility index.md | Info |
| F-GAMES-B01-026 | Archived track marked in_progress | accessibility metadata.json | Medium |
| F-GAMES-B01-027 | Empty deviation note despite task deviation | accessibility metadata.json | Low |
| F-GAMES-B01-028 | Manual verification gate unchecked at archive | accessibility plan.md | Medium |
| F-GAMES-B01-029 | Track-metadata schema drift (`id` vs `track_id`) | archers metadata.json, others | Low |
| F-GAMES-B01-030 | Accessibility integrated in only 2 of ~8+ games | accessibility plan.md | Medium |
| F-GAMES-B01-031 | Documented text-scale formula mixes px/rem units | rollout_pattern.md | Medium |
| F-GAMES-B01-032 | CSS-transform touch scaling may not scale canvas hit areas | rollout_pattern.md | Low |
| F-GAMES-B01-033 | Spec acceptance checked while plan/metadata unfinished | accessibility spec.md | Medium |

### Severity rollup

| Severity | Count |
|----------|-------|
| 🔴 High | 4 (F-GAMES-B01-008, -009, -010, -023) |
| 🟡 Medium | 9 (F-GAMES-B01-004, -014, -020, -021, -026, -028, -030, -031, -033) |
| 🔵 Low | 14 |
| ℹ️ Informational | 6 |

---

## Key Themes for the Track

1. **XP/scoring is not a single coherent contract.** The README "standard" (`floor(correct*accuracy)`) and the Abyssal Well spec (`base+accuracy+speed` clamped 1–10, where the clamp nullifies the bonuses) are mutually inconsistent and internally incoherent. Any cross-game progress/leaderboard feature would aggregate incomparable XP values. (F-GAMES-B01-008, -023, -009)

2. **Importability into Reading/Primary is under-specified.** Games consume static `public/vocab/*.json` (hardcoded Thai↔English) and expose only a scalar XP via an "either callback or store" interface. There is no documented runtime vocab-injection API, no auth/tenant/locale/difficulty payload, and no host-theming story. (F-GAMES-B01-009, -010, -006)

3. **Accessibility rollout stalled.** The shared assist layer reached only 2 games, the track was archived while `in_progress` with an unchecked manual-verification gate, and the documented text-scaling formula has a px/rem unit bug that would break adopters. (F-GAMES-B01-026, -028, -030, -031, -033)

4. **"Completed" track artifacts overstate readiness.** Abyssal Well is `completed` with missing sound effects, visual feedback, balance tuning, and cover art. Accessibility track checkboxes claim acceptance while plan/metadata remain open. (F-GAMES-B01-020, -021, -033)

5. **Design-system / age-UX mismatch.** A monochrome "Vercel Core" developer aesthetic governs an app of colorful, child-facing arcade games whose own specs call for vivid palettes and which use dark-fantasy/demon themes without age-band guidance. (F-GAMES-B01-004, -024)

6. **Quality gates are advisory.** Lint downgrades correctness rules to `warn`, Jest configures but never collects coverage, and tests depend on prebuilt sibling `dist/`. The ">80% coverage / strict TDD" policy is not machine-enforced. (F-GAMES-B01-014, -015, -016, -018)

---

## Limitations

1. **No runtime/source in this batch.** All 20 files are configuration, agent/docs, or Measure track artifacts. No game component, state machine, scoring/XP implementation, leaderboard code, or test source is present here. Findings about XP, importability, accessibility, audio, and performance are derived from the governing **contracts and specs**, not from observed runtime behavior; the actual implementations must be confirmed in later batches.
2. **Cross-game claims rely on docs.** Roster, vocab-file, and coverage findings are based on what the README/AGENTS.md assert. The real `public/vocab/` directory, `src/lib/xp.ts`, and per-game components were not in scope and were not opened.
3. **Archer's Revenge has only metadata in this batch** (no plan/spec), so its completion and theme can only be partially assessed.
4. **No build/test execution.** Jest/ESLint configs were read, not run; coverage and lint findings are static assessments of the config, not of a live run.
5. **No acceptance or closeout claims.** This report records findings for remediation only. It does not accept, approve, or close this batch, the reviewed tracks, or the parent track.

---

## Summary

**20 files reviewed (all files in `/tmp/opencode/games-batch-01`).** The batch is dominated by governance/contract artifacts rather than runtime code, and the most consequential findings are contract-level: an inconsistent and internally incoherent XP/scoring model (High), an under-specified game→host import contract with static-only vocab coupling (High), and a stalled, partially-verified accessibility rollout with a unit-buggy scaling formula (Medium). Supporting concerns include "completed" tracks that omit audio/asset/polish work, advisory-only quality gates, and a child-game design system mismatched to a monochrome developer aesthetic. No source code was modified and no acceptance/closeout is asserted.
