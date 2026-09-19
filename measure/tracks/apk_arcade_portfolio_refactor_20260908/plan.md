# Detailed implementation plan

## Status

Implementation is active under the owner instruction to use subagents.
Use completed readiness tasks as inputs for bounded implementation assignments.

## Current objective — updated 2026-09-09

Complete the APK and retained game portfolio refactor across all three hosts.
Preserve standard educational input, the five-field result contract, historical game identities, and scores.
Use the best reviewed APK assets and restore common retro arcade start screens, end screens, and controls.
Add listening, persistent RPG progression, and collaborative and competitive options.
Evaluate every game and consolidate only games with confirmed redundant gameplay.

Apply these owner corrections throughout implementation:

- Present a prominent Thai target with English answers.
- Place gameplay instructions outside the live board so students can identify the target immediately.
- Build a characterful Wizard graveyard with useful obstacles and independent zombie behavior.
- Keep Dragon Flight as a two-choice vocabulary lane game.
- Keep Griffin Sky-Joust as a separate sentence game with Joust gameplay.
- Verify actual gameplay, visual clarity, and complete host flows before reporting a finished experience.
- Run narrowly scoped local checks sequentially, with at most one preview server.

Current work covers RPG integration across hosts and catalogs, gameplay review, and the remaining portfolio rebuilds.
Authenticated reward persistence, portfolio completion, social gameplay, and owner acceptance remain unfinished.
Passing technical checks alone does not satisfy this objective.

The app's stored goal still contains the earlier pilot-focused objective.
The available goal tools cannot edit an active objective; this section defines the current working scope.

## Execution rules

For each implementation package, define contracts before behavior tests, then implement the minimum complete experience.
Run local checks for changed behavior, one at a time. Keep at most one local preview server active.
Review critical behavior independently before integration.
Defer graph updates and whole-application checks under the owner testing constraint.
Use existing adapters and avoid new dependencies unless existing capabilities cannot meet the requirement.
Do not commit unrelated workspace changes.
Do not add hashes or modify supervisor infrastructure.
Sol with low reasoning is the current owner-selected model for delegated work.
Use separate file ownership for concurrent assignments.
Phase completion follows Measure review and user verification requirements.
Customer validation remains pending until actual users participate.

## Phase 0: Baseline and execution packets

- [x] P0.1: Record the owner requirements and exact educational contracts.
- [x] P0.2: Audit APK shell and control ownership; produce `handoff-apk.md`.
- [x] P0.3: Audit audio services and evidence boundaries; produce `handoff-listening.md`.
- [x] P0.4: Audit Wizard map behavior and all portfolio identities; produce `handoff-portfolio.md`.
- [x] P0.5: Reconcile findings, assign file ownership, and publish the first implementation batches.

Exit met: Three source-backed execution packets identify reuse, gaps, tests, dependencies, and unresolved decisions.
The primary agent consolidated the portfolio packet from Sol findings and reconciled ownership in `execution-order.md`.
Do not call a planning packet an implementation or a completed game.

## Phase 1: Contracts and shared interaction design

Dependencies: Phase 0.

- [~] P1.1: Trace all input, result, completion, session, and host consumers.
- [~] P1.2: Add behavioral compatibility cases for old hosts, duplicate terms, and one completion per session.
- [x] P1.3: Specify optional modality configuration, host confirmation receipts, and typed learning evidence without altering the five-field result.
- [~] P1.4: Define common action meanings, device layouts, focus rules, and capability-based hints.
- [~] P1.5: Define speech timing, replay assistance, failure, and fallback state transitions.
- [~] P1.6: Review the contracts and run affected contract tests, type checks, and builds.

Exit: Existing callers remain compatible; new optional settings have validated defaults and explicit ownership.

## Phase 1A: New APK asset selection

Dependencies: Phase 0 inventory. Runs beside Phase 1 contract work.

- [~] P1A.1: Inventory new terrain, actor, animation, prop, effect, UI, icon, font, music, and sound collections.
- [~] P1A.2: Inspect representative source images, animations, and existing approval records.
- [~] P1A.3: Shortlist competing candidates for Wizard maps and the shared arcade shell.
- [~] P1A.4: Compare perspective, pixel scale, palette, animation coverage, semantic clarity, and mobile readability.
- [~] P1A.5: Build a small playable comparison using existing APK bindings and shortlisted assets.
- [~] P1A.6: Check collision alignment, occlusion, texture loading, animation behavior, and speech intelligibility on target layouts.
- [~] P1A.7: Record selections, rejected alternatives, exact paths, remaining gaps, and reasons for retained older assets.
- [ ] P1A.8: Review the visual comparison with the owner through the existing phase verification process.

Exit: Selected assets demonstrate a coherent, readable arcade experience at gameplay size.
File presence, visual novelty, and image resolution alone do not satisfy selection.
Use `asset-selection.md` for evaluation criteria and required evidence.

## Phase 2: Shared retro arcade shell

Dependencies: P1.1, P1.2, P1.4, and Phase 1A selection.

- [~] P2.1: Trace the existing briefing, tutorial, play, completion, replay, and exit paths across all three game hosts.
- [~] P2.2: Design shared screens using existing pixel assets, readable locale fonts, and responsive layout rules.
- [~] P2.3: Test direct play, practice, defeat, victory, replay, exit, stale receipts, malformed receipts, save timeouts, and idempotent retries.
- [~] P2.4: Refactor existing shell components and route every retained cartridge through them.
- [~] P2.5: Add consistent sound cues, reduced motion, keyboard focus, and touch controls.
- [~] P2.6: Verify compact and wide screens in a real browser, including Thai labels and long titles.
- [ ] P2.7: Review the phase and complete owner verification under `measure/workflow.md`.

Exit: A student reaches play quickly, receives clear results, and replays without duplicate completion or stale input.

## Phase 3: APK audio and listening

Dependencies: P1.3, P1.5. Runs beside Phase 2 after shared interfaces stabilize.

- [~] P3.1: Inventory existing recordings, speech adapters, storage, browser audio, and host locale data.
- [~] P3.2: Define audio references, truthful locale reporting, strict modality evidence, and the minimal internal synthesis port.
- [~] P3.3: Test autoplay restrictions, late loads, failed loads, replay, pause, focus loss, target changes, and unmount.
- [~] P3.4: Implement shared speech playback, bounded preloading, cancellation, and coordinated speech, music, and effects channels.
- [~] P3.5: Implement Thai targets with English audio choices, completed-playback confirmation, and explicit reading fallback.
- [~] P3.6: Validate reserved learning evidence at host and server boundaries before existing metadata persistence.
- [~] P3.7: Verify Thai targets, English audio answer choices, mobile activation, and rejected silent fallback.
- [ ] P3.8: Review pronunciation, timing, tests, type checks, builds, and owner verification.

Exit: Students hear English answer choices for a Thai target; failure never silently changes the measured modality.

## Phase 4: Wizard vs. Zombie complete rebuild

Dependencies: Phases 1–3 and Phase 1A for integration. Map design can begin after Phase 0.

- [~] P4.1: Document the existing favorite's movement, collection, shockwave, pressure, and result behavior.
- [~] P4.2: Use Phase 1A selections for terrain and sprites; document semantic bindings and consistent scale.
- [~] P4.3: Design one connected graveyard with alternative routes, narrow passages, and clear landmarks.
- [~] P4.4: Define reusable collision, navigation, spawn, pickup, and camera boundaries in APK.
- [~] P4.5: Test map reachability, all four spawn approaches, obstacle avoidance, stuck recovery, corner movement, and invalid placements.
- [~] P4.6: Test elapsed-time movement, equal diagonal speed, immunity, collision-safe knockback, visible touch abilities, and safe spawns.
- [~] P4.7: Implement map simulation and navigation; keep cartridge-specific rules inside the Wizard module.
- [~] P4.8: Implement readable art, animations, feedback, and common action controls.
- [~] P4.9: Integrate reading and listening rounds with the shared start, pause, results, and replay screens.
- [~] P4.10: Test long and short decks, duplicate translations, wrong choices, audio failure, and terminal cleanup.
- [~] P4.11: Run real browser sessions on compact touch and wide keyboard layouts.
- [ ] P4.12: Compare route use and replay interest with the existing game through customer sessions.
- [ ] P4.13: Review the complete experience and record owner verification.

Exit: One complete game validates the shared foundation. A map screenshot alone does not satisfy this phase.

## Phase 5: Shared RPG progression

Dependencies: Pilot gameplay and trusted completion from Phase 4.

- [x] P5.1: Inspect current identity, mastery, XP, quests, and inventory consumers before selecting ownership.
- [~] P5.2: Define a small cosmetic reward set and concrete quest rules.
- [~] P5.3: Define Zod contracts, permissions, transaction boundaries, and retry semantics.
- [~] P5.4: Test tenant isolation, replayed submissions, interrupted grants, and untrusted reward values.
- [~] P5.5: Implement backend commands and queries through existing database and auth adapters.
- [~] P5.6: Show confirmed progression in shared entry and result screens.
- [ ] P5.7: Verify reward behavior across the supported host apps and complete phase review.

Exit: Progress persists correctly; client display XP cannot grant authoritative rewards.

P5.1 records preparatory source review in `rpg-readiness.md`.
It identifies inconsistent XP views and missing persistent quest and cosmetic services.
This review does not establish Phase 5 implementation or acceptance.

## Phase 6: Comparable challenges and class cooperation

Dependencies: Phases 4–5 and validated modality evidence.

- [~] P6.1: Define challenge identity, content, seed, difficulty, modality, eligibility, and expiry.
- [~] P6.2: Define personal improvement, team contribution, tie, abandonment, and replay rules.
- [~] P6.3: Test cross-school access, duplicate contribution, mismatched modality, and expired challenges.
- [~] P6.4: Implement asynchronous challenges and shared class goals through backend modules.
- [~] P6.5: Integrate entry selection, comparable results, and teacher-controlled participation.
- [ ] P6.6: Validate fairness and participation with a classroom pilot before wider exposure.

Exit: Comparable runs share the same rules, and class goals count each eligible contribution once.

## Phase 7: Live cooperative survival

Dependencies: Stable map simulation, backend ownership, and classroom challenge experience.

- [ ] P7.1: Specify an initial two-player Wizard encounter with shared objectives and clear individual contribution.
- [ ] P7.2: Specify authoritative simulation, transport adapter, reconnect, pause, timeout, and host-loss behavior.
- [ ] P7.3: Specify individual language prompts without letting another player answer for the learner.
- [ ] P7.4: Test latency, duplicate actions, disconnects, revival, abandonment, and reward reconciliation.
- [ ] P7.5: Implement the smallest complete cooperative session and shared lobby controls.
- [ ] P7.6: Run classroom device and network tests; review fairness and owner verification.

Exit: Both learners contribute and receive correct results after normal completion or interrupted sessions.

## Phase 8: Complete portfolio consolidation and rebuild

Dependencies: Phase 4 validates the foundation. RPG and social integration follow their availability.

- [ ] P8.1: Resolve the proposed dispositions in `portfolio.md` using customer evidence and owner choices.
- [ ] P8.2: Rebuild the retained puzzle games using shared controls, shell, learning rules, and suitable audio modes.
- [~] P8.3: Rebuild retained defense and shooting games with readable targets and fair action accounting.
- [~] P8.4: Rebuild retained exploration and sentence games with distinct objectives and tested recovery.
- [~] P8.5: Keep vocabulary lane flight and sentence jousting separate. Consolidate only confirmed redundant variants and preserve historical links and results.
- [ ] P8.6: Add Listen to Sequence and Read to Select Audio only where they improve the retained mechanic.
- [ ] P8.7: Verify every retained game with the common acceptance checklist and actual browser play.
- [ ] P8.8: Verify every retired or combined title has a replacement route and intact historical results.

Per-game sequence: preserve the enjoyable mechanic; define contracts; test behavior; rebuild; verify devices; review; gather customer feedback.
A completed Wizard pilot does not complete the portfolio refactor.

## Phase 9: Integration and rollout

Dependencies: Accepted release batches from the preceding phases.

- [~] P9.1: Check auth, content loading, locale, audio, completion, navigation, and progression on Advantage Games, Reading, and Primary.
- [ ] P9.2: Run targeted local checks for changed behavior, one at a time. Record coverage limits and unrelated failures.
- [ ] P9.3: Refresh only the required preview modules within the local resource limit. Verify current rendered behavior.
- [ ] P9.4: Update product documentation. Defer graph updates under the owner testing constraint.
- [ ] P9.5: Prepare reversible release batches, compatibility mapping, and a rollback procedure.
- [ ] P9.6: Obtain review for concrete deployment and retirement changes.
- [ ] P9.7: Roll out within host timing constraints and inspect completion failures, audio failures, and customer feedback.

Exit: Every retained title meets the standard, every displaced title has a migration path, and all accepted scope has evidence.

## Initial Sol handoff

Three Sol agents use medium reasoning and work only in their assigned handoff document.
APK agent owns `handoff-apk.md` and covers Phases 1–2.
Listening agent owns `handoff-listening.md` and covers Phase 3 plus evidence dependencies.
Portfolio agent owns `handoff-portfolio.md` and covers Phase 4 and the disposition matrix.
The primary agent owns this plan, specification, registry, and reconciliation.
Agents must return exact file targets, bounded first tasks, behavioral tests, dependencies, and risks.
They must report gaps without modifying production code during this planning handoff.

## Current implementation evidence

The current full contract suite passes 82 tests across seven files.
The current cartridge suite passes 650 tests across 48 files before the paused scene reflow correction.
The listening contract preserves the five-field result and validates separate learning evidence.
The three authenticated hosts carry that evidence through the existing completion metadata boundary.
Map tests and browser navigation verify the connected graveyard and obstacle routes.
These task completions do not establish phase acceptance or customer validation.

The following counts record earlier verification batches.

The shared input and renderer suites pass 42 tests before listening integration.
The listening lifecycle suites pass 30 tests after the optional runtime service was added.
The public host suite passes nine tests after the listening selector was added.
The music suite passes 11 tests, including nested ducking restoration.
The catalog art suite passes seven tests after the Wizard binding changes.

A real browser exposed mixed cell sizes in the complete wizard sheet.
The selected dedicated walking sheet fixes that metadata error.
The first browser run also exposed excessive briefing scrolling.
The shell subagent addresses that issue in the presentation batch.

Audio, map, presentation, and integrated browser verification remain active.
No phase has owner verification or a release checkpoint yet.
