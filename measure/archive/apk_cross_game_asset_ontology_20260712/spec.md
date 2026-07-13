# Specification: APK Cross-Game Requirements and Capability Ontology

## Overview

Advantage Play Kit must be designed from the complete `apps/advantage-games`
corpus. This track determines what each game is, which behavior must survive a
Phaser rebuild, which repeated development concerns belong in APK, which logic is
genuinely bespoke, how compact and wide compositions differ, and which semantic
assets both themes must provide.

This is a requirements and product-modeling track. It does not implement shared
systems, generate art, rewrite cartridges, or reopen production routes.

## Fixed product boundary

- Input is the established vocabulary or sentence array.
- Output is the established `GameResults` object.
- Identity, tenancy, authoritative XP, idempotency, and persistence remain
  host/server-owned.
- Gameplay between those boundaries is bespoke unless a repeated corpus-backed
  capability is accepted into APK.
- Phaser 4 is the target runtime; Konva/R3F/React implementation details are
  evidence, not compatibility requirements.

## Source-of-truth order

When evidence conflicts, record the conflict and use:

1. Current playable implementation and behavioral tests.
2. Current raw implementation plus current app routes and data modules.
3. Active Measure specification for genuinely in-development work.
4. Archived baseline, APK blueprint, browser evidence, or cutover evidence.
5. Catalog title/description only when no stronger evidence exists; such rows
   remain provisional until product-owner review.

The corpus includes all entries in `apps/advantage-games/src/lib/gameCards.ts`,
all raw game components and logic modules, Reading/Primary imported copies, APK
W0-W4 evidence, and discovered active/in-development games.

## Functional requirements

### FR1: Reconcile the complete game corpus

- Record game ID, title, input mode, catalog state, route state, implementation
  paths, imported copies, Measure evidence, confidence, and discrepancies.
- Distinguish playable, withdrawn, in development, planned, missing, stale, and
  duplicate claims.
- Do not omit deleted or withdrawn games when their requirements remain relevant.
- Record exact source revision when current files no longer contain the strongest
  implementation evidence.

### FR2: Produce mechanic and learning blueprints

For every game, record:

- Recognizable fantasy/product identity and core player fantasy.
- Learning prompt, correct/incorrect action, content progression, repetition,
  feedback, and terminal loop.
- Controls, camera/view, world model, actors, targets, hazards, and interactions.
- Scoring, accuracy, XP display, health/lives, combo, timer, waves, and win/loss.
- Difficulty and audience tuning.
- Deterministic state transitions and evidence suitable for Red tests.
- Behavior that must survive, behavior that may change, and accidental renderer
  assumptions that must not survive.

### FR3: Inventory current developer effort

- Decompose raw game implementations into lifecycle, state, controllers, physics,
  cameras, rendering, UI, content handling, audio, accessibility, persistence
  mapping, tests, and game-specific rules.
- Record repeated code, repeated concepts implemented differently, unused shared
  utilities, and components copied into Reading/Primary.
- Measure representative implementation size and complexity so later kit work can
  demonstrate reduced developer effort.
- Record the current steps required to add, run, test, theme, host, and ship a game.

### FR4: Define the developer-capability ontology

Normalize repeated needs across at least these domains:

- Lifecycle and scene/session orchestration.
- Educational progression and result calculation.
- Input and controls.
- Movement, collision, combat, collection, sequencing, defense, runner, arena,
  puzzle/matching, escort, and turn-based mechanics.
- Camera, spawning, pooling, animation, VFX, audio, and timing.
- Start, instruction, pause, HUD, prompts, feedback, and results.
- Difficulty, audience tuning, accessibility, diagnostics, and performance.
- Deterministic testing, simulation, browser QC, and cartridge scaffolding.

For each capability, record:

- Exact game/scene consumers.
- Required behavior and extension points.
- Similarities and meaningful differences.
- `retain`, `standardize`, `extend-existing`, `bespoke`, or `retire` disposition.
- Proposed owning package/module and dependency boundary.
- Minimum tests and acceptance evidence.

Do not standardize a mechanic merely because two games share nouns or artwork.
Do not leave repeated infrastructure bespoke merely because legacy implementations
used different code.

### FR5: Define responsive composition requirements

- Apply `/measure/apk-responsive-game-composition-spec.md` to every game/scene.
- Record current compact and wide behavior, fixed-world assumptions, camera,
  persistent/transient UI, touch controls, text risks, and known failures.
- Define compact and wide composition strategies, required simultaneous
  visibility, reserved regions, camera policy, and input modes per game.
- Include short and worst-case Thai/English content requirements.
- Identify shared layout, camera, HUD, prompt, controls, text measurement, and
  diagnostic capabilities for the developer-kit track.

### FR6: Build the scene-level asset usage matrix

- Enumerate player/mount roles, enemies and strength/behavior variants, targets,
  environments, terrain, obstacles, hazards, interactables, pickups, weapons,
  projectiles, VFX, audio roles, UI/HUD, controls, backgrounds, transitions, and
  result presentation.
- Record required states, directions, view, scale, animation, collision,
  compact/wide usage, and potential reuse.
- Cite source evidence for every non-provisional row.

### FR7: Audit existing assets

- Enumerate production candidates in relevant apps, packages, public trees, and
  approved authoring sources.
- Record dimensions, format, provenance/license, visible content, current use,
  theme suitability, responsive suitability, and disposition.
- Manually inspect candidates; filenames and visual similarity are insufficient.
- Reject placeholders, cover art, baked checkerboards, unsafe text-bearing art,
  and assets that cannot meet required states or layout contracts.

### FR8: Normalize the semantic asset ontology

- Define reusable semantic families for characters, creatures/mounts,
  environments, terrain, structures, props, hazards, targets, pickups, weapons,
  projectiles, VFX, audio, UI/HUD, controls, backgrounds, and indicators.
- Define gameplay variants by meaning rather than cosmetic variety.
- Separate gameplay variants from Chibi Quest/Riven Lands treatments.
- Define environment kits from proven game settings.
- Record allowed substitutions and prohibited conflations.
- Record links from semantic roles to developer capabilities and compact/wide
  regions where relevant.

### FR9: Analyze gaps and sequence delivery

- Identify missing shared developer capabilities, missing responsive primitives,
  missing semantic assets, and unclear game requirements.
- Separate Must-have migration blockers from later polish or variety.
- Calculate which capabilities and assets unlock the most games without erasing
  meaningful distinctions.
- Recommend developer-kit implementation slices, asset batches, and candidate
  cartridge cohorts.
- Surface conflicts and unknowns for product-owner decisions; do not guess.

### FR10: Publish machine-validatable requirements

Produce schemas and human-readable documents in which:

- Every in-scope game maps to a mechanic blueprint.
- Every repeated capability maps to source consumers and a disposition.
- Every game maps to compact and wide composition requirements.
- Every asset usage maps to an ontology entry or visible unresolved gap.
- Every proposed standard capability and asset traces back to corpus evidence.
- Unresolved Must-have decisions block dependent implementation.

## Required deliverables

- `game-corpus.md` and machine-readable corpus.
- `mechanic-blueprints/` with one blueprint per game.
- `developer-effort-baseline.md`.
- `capability-usage-matrix.json`.
- `developer-capability-ontology.md`.
- `responsive-composition-matrix.md`.
- `game-asset-usage-matrix.json`.
- `existing-asset-audit.md`.
- `asset-ontology.md`.
- `gap-and-coverage-plan.md`.
- `dependent-track-inputs.md` containing accepted versions/hashes.
- `verification.md`.

## Acceptance criteria

- The complete catalog, raw implementations, imported copies, and active game
  tracks are reconciled.
- No in-scope game lacks mechanic, capability, responsive, and asset mappings.
- The analysis covers the actual raw files rather than catalog descriptions alone.
- Repeated infrastructure has an explicit standardization decision.
- Bespoke decisions include concrete reasons and extension boundaries.
- Compact and wide strategies are intentional and satisfy the responsive spec.
- Proposed shared systems and assets trace to real game/scene usage.
- Independent review finds no missing game cohort or unsupported ontology entry.
- Product owner explicitly accepts the corpus, blueprints, capability decisions,
  responsive matrix, asset ontology, gaps, and delivery priorities.

## Out of scope

- Implementing APK developer capabilities.
- Generating, importing, or editing production assets.
- Rewriting game logic or scenes.
- Reopening catalog or production routes.
- Preserving legacy renderer APIs, filenames, or physical asset layouts.
