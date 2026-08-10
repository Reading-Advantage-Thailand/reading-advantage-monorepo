# Implementation Plan: APK Standard Game Experience

## Dependency Order

S1 Briefing -> S2 Tutorial -> S3 Demo -> S4 Debrief -> S5 Intern Workflow

S1 and S4 presentation-component work may proceed in parallel after the lifecycle
contract is frozen. S5 integrates and validates all preceding stories.

> Graph note: the fresh repository graph indexes the legacy `GameStartScreen` and
> `GameEndScreen` copies, but does not currently index Advantage Play Kit symbols.
> Direct repository inspection shows `APKGameHost`, `GameResultPanel`, and scaffold
> APIs currently have only package-local exports and tests. Refresh graph coverage
> before implementation and record exact callers for every edited exported symbol.

## Phase S1: Standard Game Briefing

_Story ref: spec.md#story-s1_

- [x] Task: Define the briefing and lifecycle contracts `a7648f2`
  - [x] Create runtime-validated briefing, instruction, learning-preview, control-hint, and label schemas
  - [x] Define required versus optional briefing fields
  - [x] Define the standard `briefing -> tutorial/demo/countdown/playing` transitions
  - [x] Preserve vocabulary, sentence, and `GameResults` ABI compatibility
  - [x] Document host-provided localization and optional extension boundaries

- [x] Task: Write failing briefing contract and component tests `080e2cb`
  - [x] Reject missing titles, objectives, instructions, and controls
  - [x] Verify complete vocabulary and sentence presentation
  - [x] Verify Thai/English content, semantic headings, keyboard activation, and accessible naming
  - [x] Verify compact/wide overflow and minimum touch-target behavior

- [x] Task: Write failing APK host lifecycle tests `82e4da0`
  - [x] Confirm gameplay does not accept normal input before Start
  - [x] Confirm Start transitions exactly once
  - [x] Confirm restart can return to the configured briefing phase
  - [x] Confirm remount and Strict Mode preserve one canvas

- [~] Task: Implement the standardized briefing screen
  - [ ] Preserve the legacy mission-briefing information architecture
  - [ ] Add responsive, host-neutral styling through APK tokens and data attributes
  - [ ] Avoid Next.js, application aliases, shadcn, and app-specific state dependencies
  - [ ] Export the component and public prop contracts

- [ ] Task: Integrate briefing into `APKGameHost`
  - [ ] Add the typed briefing configuration
  - [ ] Connect Start, loading, error, and lifecycle state
  - [ ] Preserve the low-level runtime boundary for tests and specialized hosts

- [ ] Task: Generate documentation and run architectural checks
  - [ ] Update developer-kit and lifecycle documentation
  - [ ] Update the code graph for changed exports and JSX
  - [ ] Run `measure/generate.sh` and `measure/doctor.sh`

- [ ] Task: Measure - User Manual Verification 'Phase S1: Standard Game Briefing' (Protocol in workflow.md)

## Phase S2: Guided Gameplay Tutorial

_Story ref: spec.md#story-s2_

- [ ] Task: Define the tutorial contracts
  - [ ] Define tutorial definitions, ordered steps, semantic targets, timing, labels, and progress
  - [ ] Define cartridge-owned deterministic demonstration actions
  - [ ] Define shared pause, advance, replay, skip, and completion-suppression behavior
  - [ ] Reject raw DOM selectors, screen coordinates, and application-specific callbacks as manifest contracts

- [ ] Task: Write failing tutorial validation and runtime tests
  - [ ] Reject empty, duplicate, malformed, or unreachable steps
  - [ ] Verify seeded deterministic playback
  - [ ] Verify tutorial runs through the real cartridge mechanic
  - [ ] Verify zero production completions, XP persistence, or leaderboard effects
  - [ ] Verify cleanup after replay, exit, remount, and interruption

- [ ] Task: Implement the shared tutorial controller
  - [ ] Add explicit tutorial runtime mode
  - [ ] Coordinate steps with cartridge-supplied mechanic actions
  - [ ] Expose current step, progress, semantic target, and lifecycle events
  - [ ] Suppress production terminal behavior while retaining educational feedback

- [ ] Task: Implement the guided tutorial presentation
  - [ ] Add step cards, progress indicators, focus/highlight treatment, and accessible narration
  - [ ] Support keyboard, pointer, and touch navigation
  - [ ] Keep prompts and highlighted mechanics unobstructed in compact and wide layouts
  - [ ] Respect reduced-motion settings

- [ ] Task: Add tutorial testing and QC fixtures
  - [ ] Add deterministic clock, input, target, and action fixtures
  - [ ] Add worst-case Thai/English tutorial content
  - [ ] Add replay, interruption, and leak assertions
  - [ ] Add an independent tutorial preview state to APK QC

- [ ] Task: Document the shared path and bespoke mechanic hook
  - [ ] Document how an intern declares steps
  - [ ] Document how cartridge code demonstrates a mechanic without recreating UI
  - [ ] Run graph update, generation, and doctor checks

- [ ] Task: Measure - User Manual Verification 'Phase S2: Guided Gameplay Tutorial' (Protocol in workflow.md)

## Phase S3: Safe Demonstration Mode

_Story ref: spec.md#story-s3_

- [ ] Task: Define demo-mode contracts
  - [ ] Define deterministic content, runtime mode, host controls, and diagnostic events
  - [ ] Define scoring, completion, persistence, and failure suppression guarantees
  - [ ] Keep tutor synchronization and sockets outside APK

- [ ] Task: Write failing demo-mode tests
  - [ ] Verify the real cartridge scene and mechanics are used
  - [ ] Verify start, pause, advance, restart, and exit controls
  - [ ] Verify repeated demonstrations retain one canvas and no leaked resources
  - [ ] Verify demo mode cannot emit production `GameResults`

- [ ] Task: Implement demo runtime isolation
  - [ ] Add demo launch and teardown behavior
  - [ ] Add safe terminal-state interception and deterministic restart
  - [ ] Emit host-neutral lifecycle and diagnostic events

- [ ] Task: Integrate demo controls into the shared host and QC
  - [ ] Expose demo launch and control APIs
  - [ ] Add direct demo preview and inspection
  - [ ] Prove compatibility with an external teaching-host adapter

- [ ] Task: Document and verify demo behavior
  - [ ] Add host integration examples
  - [ ] Run focused tests, coverage, type checks, lint, graph update, generation, and doctor

- [ ] Task: Measure - User Manual Verification 'Phase S3: Safe Demonstration Mode' (Protocol in workflow.md)

## Phase S4: Standard Learning Debrief

_Story ref: spec.md#story-s4_

- [ ] Task: Define debrief contracts
  - [ ] Define outcome, standard statistics, missed-content review, custom-stat, label, and attribution schemas
  - [ ] Bound extension slots and validate all numeric result values
  - [ ] Preserve host ownership of navigation, persistence, and authoritative XP

- [ ] Task: Write failing debrief tests
  - [ ] Cover victory, defeat, and complete outcomes
  - [ ] Cover score, accuracy, XP, correct answers, attempts, and learning review
  - [ ] Cover invalid values, excessive custom statistics, replay, and exit
  - [ ] Cover Thai/English compact and wide presentation

- [ ] Task: Implement the standardized debrief screen
  - [ ] Preserve the legacy centered result-card information architecture
  - [ ] Add learning-review and required attribution regions
  - [ ] Add responsive replay and exit actions
  - [ ] Export the component and public contracts

- [ ] Task: Integrate debrief into the APK lifecycle
  - [ ] Render only validated terminal results
  - [ ] Ensure normal gameplay completes exactly once
  - [ ] Route replay through clean teardown and configured restart phase
  - [ ] Delegate exit to the host

- [ ] Task: Document and verify debrief behavior
  - [ ] Update developer and host integration documentation
  - [ ] Run focused tests, coverage, type checks, lint, graph update, generation, and doctor

- [ ] Task: Measure - User Manual Verification 'Phase S4: Standard Learning Debrief' (Protocol in workflow.md)

## Phase S5: Intern-Ready Game Workflow

_Story ref: spec.md#story-s5_

- [ ] Task: Extend cartridge manifest and readiness contracts
  - [ ] Make briefing, tutorial, demo, and debrief declarations mandatory for new-game scaffolds
  - [ ] Add actionable readiness errors for missing or placeholder definitions
  - [ ] Preserve bounded bespoke tutorial-action hooks

- [ ] Task: Write failing scaffold and readiness tests
  - [ ] Verify every generated file and export
  - [ ] Verify malformed or incomplete experience definitions fail closed
  - [ ] Verify generated cartridges compile without application imports
  - [ ] Verify readiness requires lifecycle, cleanup, accessibility, responsive, and attribution evidence

- [ ] Task: Extend the cartridge scaffold
  - [ ] Generate typed experience configuration and tutorial-action modules
  - [ ] Generate lifecycle, presentation, runtime, and browser tests
  - [ ] Generate QC registration for every lifecycle state
  - [ ] Avoid copying any legacy or Tutor Advantage source tree

- [ ] Task: Build the complete public exemplar
  - [ ] Demonstrate briefing, tutorial, demo, gameplay, victory/defeat/complete debrief, replay, and exit
  - [ ] Use the standard asset library and required attribution
  - [ ] Record authored versus generated code and duplicated infrastructure avoided

- [ ] Task: Extend APK authoring QC
  - [ ] Preview every phase independently
  - [ ] Support compact/wide, touch/keyboard, Thai/English, and reduced-motion controls
  - [ ] Inspect lifecycle events, canvas count, completion count, diagnostics, and attribution

- [ ] Task: Add focused visual and browser regression coverage
  - [ ] Capture briefing, tutorial, demo, and debrief reference states
  - [ ] Verify representative compact and wide viewports
  - [ ] Verify real keyboard, pointer, and touch interactions
  - [ ] Keep this coverage scoped to the new APK experience surfaces

- [ ] Task: Publish the intern authoring guide and readiness checklist
  - [ ] Explain which values interns configure and which systems APK owns
  - [ ] Provide one vocabulary and one sentence example
  - [ ] Document common, extension, and bespoke paths
  - [ ] Run all affected package and QC gates, graph update, generation, and doctor

- [ ] Task: Measure - User Manual Verification 'Phase S5: Intern-Ready Game Workflow' (Protocol in workflow.md)
