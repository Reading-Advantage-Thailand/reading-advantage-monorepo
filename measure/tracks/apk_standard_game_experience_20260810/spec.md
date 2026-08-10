# Specification: APK Standard Game Experience

## Overview

Every APK mini-game must ship with a consistent briefing, guided tutorial,
demonstration mode, gameplay lifecycle, and learning-focused debrief without
interns rebuilding platform infrastructure.

The implementation incorporates evidence from the legacy Advantage Games
start/end screens and Tutor Advantage tutorial/demo work while remaining
Phaser-native, host-neutral, responsive, and accessible.

## Source Evidence

- `apps/advantage-games/src/components/games/game/GameStartScreen.tsx` defines
  the shared legacy briefing structure: title, subtitle, instructions, learning
  content, controls, tip, extension actions, and explicit Start action.
- `apps/advantage-games/src/components/games/game/GameEndScreen.tsx` defines the
  shared legacy debrief structure: outcome, score, accuracy, display XP, bounded
  custom statistics, replay, and exit.
- Tutor Advantage branch
  `oleang/feat/add-navigation-button-through-the-lesson` demonstrates the
  product need for an explicit `ready -> teacher_demo -> tutorial -> countdown
  -> playing -> results` sequence and game-specific deterministic demonstrations.
- APK currently exposes accessible presentation primitives, but
  `APKGameHost` mounts gameplay immediately and the scaffold does not generate a
  complete briefing/tutorial/demo/debrief lifecycle.

## Stories

### Story S1: Standard Game Briefing

**As a** student

**I want** to review the objective, rules, vocabulary or sentences, and controls

**So that** I understand what I am learning and how to play before gameplay starts

**Acceptance Criteria:**

- Given a valid cartridge and learning input, When the game opens, Then the
  standardized briefing appears before normal gameplay accepts input.
- Given vocabulary or sentence content, When the briefing renders, Then it shows
  the complete learning content without silent truncation.
- Given keyboard, pointer, or touch controls, When controls are applicable, Then
  their labels and actions appear clearly.
- Given compact or wide layouts and Thai or English content, When the briefing
  renders, Then all required information remains readable, scrollable, and
  unobstructed.
- Given an explicit Start action, When the student activates it, Then APK performs
  a single valid transition to the next configured phase.

**Estimate:** M

**Priority:** Must

### Story S2: Guided Gameplay Tutorial

**As a** student

**I want** a step-by-step demonstration using the real game mechanic

**So that** I can see how the controls, learning task, and consequences work

**Acceptance Criteria:**

- Given a cartridge tutorial definition, When tutorial mode begins, Then APK runs
  a deterministic demonstration through the same Phaser cartridge rather than a
  separately reimplemented game.
- Given tutorial steps, When each step becomes active, Then APK can show its title,
  explanation, progress, highlighted control or game target, and demonstrated action.
- Given correct and incorrect consequences, When required by the tutorial, Then
  the demonstration can safely illustrate them without affecting the real session.
- Given tutorial mode, When it runs, Then it cannot emit completion, persisted
  progress, authoritative XP, leaderboard entries, or normal failure consequences.
- Given compact and wide layouts, When the tutorial runs, Then guidance does not
  obscure the highlighted mechanic or required learning content.

**Estimate:** XL

**Priority:** Must

### Story S3: Safe Demonstration Mode

**As a** teacher, reviewer, or game creator

**I want** a safe and repeatable demonstration mode

**So that** I can explain and inspect gameplay without creating a scored session

**Acceptance Criteria:**

- Given demo mode, When the cartridge runs, Then it uses deterministic content and
  the real cartridge mechanics.
- Given host controls, When requested, Then the demo can start, pause, advance,
  restart, or exit cleanly.
- Given repeated demonstrations, When the demo restarts, Then it retains one canvas
  and leaves no timers, listeners, input handlers, or Phaser objects behind.
- Given a demo outcome, When the demonstration reaches a terminal mechanic, Then
  no production completion or persistence event is emitted.
- Given an external teaching host, When it coordinates students, Then it can use
  APK lifecycle events without APK depending on Tutor Advantage sockets or lesson state.

**Estimate:** L

**Priority:** Must

### Story S4: Standard Learning Debrief

**As a** student

**I want** a consistent summary after the game

**So that** I understand my outcome, performance, and what to review next

**Acceptance Criteria:**

- Given a validated `GameResults`, When gameplay ends, Then the debrief shows the
  outcome, score, accuracy, display XP, correct answers, and total attempts.
- Given game-specific statistics or missed learning items, When supplied, Then the
  debrief presents them through bounded extension slots.
- Given replay, When activated, Then APK performs a clean restart and returns to
  the configured briefing or tutorial phase.
- Given exit, When activated, Then APK delegates navigation to the host.
- Given canonical assets, When the debrief renders, Then required attribution is
  present and accessible.

**Estimate:** M

**Priority:** Must

### Story S5: Intern-Ready Game Workflow

**As an** intern game developer

**I want** APK to scaffold and validate the complete standard experience

**So that** I can focus on the educational mechanic rather than platform UI and lifecycle code

**Acceptance Criteria:**

- Given a new cartridge scaffold, When generated, Then it includes typed briefing,
  tutorial, demo, debrief, and lifecycle contracts with tests.
- Given missing mandatory configuration, When validation runs, Then readiness fails
  with an actionable error.
- Given the APK QC surface, When an intern previews a cartridge, Then every phase
  can be inspected independently in compact and wide layouts.
- Given a completed cartridge, When readiness checks run, Then they verify lifecycle
  transitions, exactly-once completion, tutorial/demo non-completion, accessibility,
  responsiveness, cleanup, and required attribution.
- Given the developer documentation, When an intern follows the common path, Then
  no legacy game tree, Next.js component, host state, or application-specific
  screen needs to be copied.

**Estimate:** L

**Priority:** Must

## Non-Functional Requirements

- Phaser 4 remains the gameplay runtime.
- APK remains independent of Next.js, application aliases, Tutor Advantage, and
  host persistence.
- External configuration boundaries use strict runtime validation.
- All exported APIs receive complete JSDoc.
- Required information has accessible DOM equivalents outside the canvas.
- Keyboard, pointer, and touch flows are supported.
- Compact and wide responsive compositions support Thai and English text.
- New shared code targets greater than 80% focused coverage.
- Existing input and `GameResults` contracts remain unchanged.
- Tutorial and demo modes must never become production scoring authorities.

## Track-Level Acceptance

- One scaffolded exemplar demonstrates the entire lifecycle.
- APK QC can directly preview briefing, tutorial, demo, gameplay, victory, defeat,
  and complete states.
- Tutorial and demo runs emit zero production completions.
- Normal gameplay emits one validated completion.
- No cartridge or scaffold imports legacy application screens.
- Package tests, coverage, type checks, lint, build, responsive checks, and
  browser verification pass.

## Out of Scope

- Tutor-controlled multiplayer synchronization and lesson sockets.
- Server persistence, tenancy, authentication, or authoritative XP.
- Migrating every legacy game within this track.
- Copying Tutor Advantage's React/Konva tutorial implementations.
- Mandatory leaderboards or difficulty selection; these remain bounded extensions.
- Repository-wide visual-regression migration; focused coverage for the new APK
  experience surfaces is in scope.
