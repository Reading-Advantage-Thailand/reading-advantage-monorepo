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

## Owner-Authorized Product Recovery - 2026-08-17

This record supersedes older process blockers for product execution. Those blockers do
not authorize removing routes, emptying the catalog, or delaying focused APK work.

- Restored ten missing legacy game routes and mechanics from
  `~/Desktop/advantage-games`.
- Published Dragon Flight, Astral Mage, and The Sorcerer's Ziggurat through the current
  Phaser APK host.
- Restored 28 unique public game links. Every card has a working launch URL.
- Replaced the generated scaffold scene stub with runnable Phaser input, progression,
  result, and cleanup behavior.
- Passed all 1,782 Advantage Games tests across 199 suites.
- Passed 17 focused public-cartridge tests and all 494 APK package tests.
- Passed full APK coverage with 91.58% lines and 88.91% statements.
- Passed Advantage Games, cartridge, and APK TypeScript checks.
- Passed the Advantage Games production build with all restored routes present.
- Kimi WebBridge confirmed 28 unique launch links, zero disabled game cards, restored
  Dragon Rider and Gryphon Patrol gameplay, and one canvas for each public APK cartridge.

The old repository-wide doctor, evidence, graph, and acceptance failures remain separate
maintenance work. They do not block playable games or the intern authoring path.

## Owner-Directed End-to-End Completion - 2026-08-17

This phase replaces the recovery-only completion claim with product verification.

- [x] Prove that a newly generated cartridge compiles, registers, launches, accepts keyboard and pointer input, completes once, and cleans up.
- [x] Connect all eight public cartridges to the standard briefing, tutorial, gameplay, and debrief lifecycle.
- [x] Keep the public arcade route in an explicit fixture-backed preview mode.
- [x] Connect authenticated cartridge routes to student-owned content and authoritative completion.
- [x] Verify compact and wide browser interactions, normal completion, tutorial suppression, and replay cleanup.
- [x] Run all affected tests, type checks, lint, builds, graph updates, and focused coverage.
- [x] Reconcile this plan and the track registry with only verified evidence.

**End-to-end evidence, 2026-08-17:** The generated-cartridge integration compiles
and launches a temporary scaffold. It uses pointer and keyboard input, emits one
result, and removes its handlers. The full APK coverage command passed 494 tests
with 91.58% line coverage and 88.91% statement coverage.

The Advantage Games Jest command passed 1,782 tests across 199 suites. The app
type check, lint, and production build passed. Lint retained only existing
warnings. All 25 cartridge files passed 129 tests.

System Chrome passed ten Playwright cases on a clean port. The cases cover all
eight public cartridges, compact and wide layouts, real input, results,
attribution, replay cleanup, and unauthenticated failure.

The authenticated case used an isolated migrated PostgreSQL database. It authenticated a
student, loaded saved flashcards, completed Dragon Flight, and received a
server-owned completion result. Database inspection found the student completion
with computed XP and a unique activity identifier.

The latest incremental code graph update processed 11 goal files. It increased
that slice from 39 to 222 nodes and from 51 to 238 edges. The graph now contains
34,233 nodes, 59,982 edges, and 3,707 files.

The APK-owned domain unit files passed all 36 tests. The full domain run passed
710 tests and failed 104 concurrent Sales and Finance Red tests. A Finance
append-only trigger also blocks the shared PGlite reset before five game
integration assertions can run.

Eight games are public APK cartridges. They include the original three cartridges
and the five accepted legacy traversal ports. The other 20 catalog games remain
legacy application routes.

## Phase S1: Standard Game Briefing [checkpoint: 0a2e845]

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

- [x] Task: Implement the standardized briefing screen `a97d280`
  - [x] Preserve the legacy mission-briefing information architecture
  - [x] Add responsive, host-neutral styling through APK tokens and data attributes
  - [x] Avoid Next.js, application aliases, shadcn, and app-specific state dependencies
  - [x] Export the component and public prop contracts

- [x] Task: Integrate briefing into `APKGameHost` `18a9a86`
  - [x] Add the typed briefing configuration
  - [x] Connect Start, loading, error, and lifecycle state
  - [x] Preserve the low-level runtime boundary for tests and specialized hosts

- [x] Task: Generate documentation and run architectural checks `c594d79`
  - [x] Update developer-kit and lifecycle documentation
  - [x] Add a compact/wide, Thai/English briefing preview to the existing APK QC route
  - [x] Update the code graph for changed exports and JSX
  - [x] Run `measure/generate.sh` and `measure/doctor.sh`

- [x] Task: Measure - User Manual Verification 'Phase S1: Standard Game Briefing' (Protocol in workflow.md) `0a2e845`

## Phase S2: Guided Gameplay Tutorial

_Story ref: spec.md#story-s2_

_Development resumed by user request on 2026-08-11 with maximum safe parallelism.
Contract decisions, the recoverable RED checkpoint `fa01f9b30`, and the frozen contract
boundary are recorded in
[s2-progress-handoff-20260811.md](./s2-progress-handoff-20260811.md). The canonical
test strategy is [test-strategy.md](./test-strategy.md). S2.1 through S2.5 are
evidenced complete; S2.6 remains in progress for repository-wide structural
closure, while S2.7 remains blocked on product-owner manual verification._

- [x] Task: Define the tutorial contracts `86a2a13ee`
  - [x] Define tutorial definitions, ordered steps, semantic targets, timing, labels, and progress
  - [x] Define cartridge-owned deterministic demonstration actions
  - [x] Define shared pause, advance, replay, skip, and completion-suppression behavior
  - [x] Reject raw DOM selectors, screen coordinates, and application-specific callbacks as manifest contracts

  **Green evidence (2026-08-11, implementation `86a2a13ee`):** The S2.1 focused Vitest
  command in `test-strategy.md` exited 0 with 3 test files and 92 tests passing. The
  package type check and build exited 0. Package lint exited 0 with four existing warnings
  outside the S2.1 files. Focused coverage executed the S2.1 tests and reported 100% for
  `game-tutorial-contract.ts`; the package global coverage threshold still failed because
  the focused run did not cover unrelated package files.

  **Red evidence (2026-08-11, recoverable checkpoint `e8ec81905`):** The direct focused
  command from `test-strategy.md` was run after reapplying the test-only checkpoint:

  ```bash
  cd packages/advantage-play-kit
  CI=true ../../node_modules/.bin/vitest run \
    src/presentation/__tests__/game-tutorial-contract.test.ts \
    src/presentation/__tests__/game-briefing-contract.test.ts \
    src/scaffolding/__tests__/cartridge-manifest.test.ts
  ```

  Expected Red confirmed: exit `1`; 3 test files failed, with 4 failed tests and 42
  existing assertions passing. The tutorial contract suite cannot resolve the missing
  `../game-tutorial-contract.js` module; lifecycle lacks `tutorial-skip` to `countdown`
  and `playing`; and the manifest rejects the optional `tutorial` field, so its nested
  error is not prefixed with `tutorial.`. No production implementation was added.

- [x] Task: Write failing tutorial validation and runtime tests `b72a632fa`
  - [x] Reject empty, duplicate, malformed, or unreachable steps
  - [x] Verify seeded deterministic playback
  - [x] Verify tutorial runs through the real cartridge mechanic
  - [x] Verify zero production completions, XP persistence, or leaderboard effects
  - [x] Verify cleanup after replay, exit, remount, and interruption

  **Mid-Red evidence (2026-08-11):** Added
  `src/presentation/__tests__/game-tutorial-runtime.test.ts`. The suite has 15 tests
  for runtime validation, seeded playback, linear sequencing, pause/resume, advance,
  replay, skip, correct and incorrect demonstrations, production-effect suppression,
  exactly-once transitions, and cleanup. The cartridge fixture uses the
  `GameTutorialActionDriver` context and a deterministic clock. It uses semantic IDs.

  The targeted Red command exited `1`:

  ```bash
  cd packages/advantage-play-kit
  CI=true ../../node_modules/.bin/vitest run \
    src/presentation/__tests__/game-tutorial-runtime.test.ts
  ```

  The command reported 15 tests failed. The expected failure is the missing
  `src/presentation/game-tutorial-runtime.ts` implementation. The test file reached
  all 15 tests and recorded assertion failures for the missing runtime module.

  The S2.1 contract command exited `0` with 3 files and 92 tests passing. The combined
  S2.1 plus S2.2 focused command exited `1`: the 3 S2.1 files passed with 92 tests,
  and the runtime file failed with 15 tests. No production file changed.

   **Green evidence (2026-08-11, implementation `b72a632fa`):** The S2.2 runtime command
   exited 0 with 15 tests passing. The combined S2.1 and S2.2 command exited 0 with 4 files
   and 107 tests passing. Package type check and build exited 0. Package lint exited 0 with
   four existing warnings outside S2.2. Focused runtime coverage exited 0 with 93.44%
   statements, 73.58% branches, 100% functions, and 100% lines for
   `game-tutorial-runtime.ts`.

- [x] Task: Implement the shared tutorial controller `58c0889cf`
  - [x] Add explicit tutorial runtime mode
  - [x] Coordinate steps with cartridge-supplied mechanic actions
  - [x] Expose current step, progress, semantic target, and lifecycle events
  - [x] Suppress production terminal behavior while retaining educational feedback

   **Green evidence (2026-08-11, implementation `58c0889cf`):** The S2.3 controller
   command exited 0 with 13 tests passing. The S2.1/S2.2/S2.3 focused command plus the
   existing host suite exited 0 with 6 files and 133 tests passing. Direct package type
   check and build exited 0. Package lint exited 0 with four existing warnings outside
   S2.3. Focused coverage reported 100% for `game-tutorial-controller.ts`; its process
   exited 1 because unrelated package-global coverage thresholds were not met. The doctor
   process exited 1 because unrelated active plans retain deprecated `[ ]` markers.

  **Mid-Red evidence (2026-08-11; phase and role base `2c20754e3e270d2a1dc57dfa785605b5d69775bd`):**
  Added `src/presentation/__tests__/game-tutorial-controller.test.ts` with 13 focused
  tests. The suite covers the explicit tutorial mode, cartridge action-driver context,
  current step and semantic target snapshots, progress, lifecycle events, pause, resume,
  sequential advance, same-seed replay, safe skip, production-effect suppression, one
  canvas and resource set, cleanup, mount-error recovery, and authority counterexamples.
  The tests keep presentation-card and responsive assertions for the later presentation
  task. The driver context rejects completion, `GameResults`, persistence, XP, leaderboard,
  failure, DOM, Next, Tutor, socket, navigation, lesson, and session authority.

  The targeted Red command exited `1` with 13 failed tests. The controller tests failed
  because `src/presentation/game-tutorial-controller.ts` is not present. The host tests
  failed because `APKGameHost` still rejects the tutorial start phase and has no tutorial
  controller, driver, control, or recovery wiring. This is the expected Red state.

  ```bash
  cd packages/advantage-play-kit
  CI=true ../../node_modules/.bin/vitest run \
    src/presentation/__tests__/game-tutorial-controller.test.ts
  ```

  The combined S2.1/S2.2 plus S2.3 Red command exited `1`: the four existing suites
  passed with 107 tests, and the new suite failed with 13 tests. The existing S2.1/S2.2
  command also exited `0` with 107 tests passing after the new test was added. Package
  type checking exited `0`. No production file changed.

  Pre-edit dirty-path classification: the APK package and this plan were clean. Existing
  `.opencode/goals/**` state was generated or ignorable. Existing Accounts, Backend, DB,
  Finance, Mastery, Sales, Storage, and lockfile changes were unrelated user work and
  remain unstaged.

- [x] Task: Implement the guided tutorial presentation `720e1967d`
  - [x] Add step cards, progress indicators, focus/highlight treatment, and accessible narration
  - [x] Support keyboard, pointer, and touch navigation
  - [x] Keep prompts and highlighted mechanics unobstructed in compact and wide layouts
  - [x] Respect reduced-motion settings

  **Green evidence (2026-08-12, implementation `720e1967d`):** Added the host-neutral
  `GameTutorialScreen` and exported its public contracts. The S2.4 focused command exited 0
  with 1 file and 13 tests passing. The S2.1-S2.4 plus host command exited 0 with 7 files and
  146 tests passing. Direct package TypeScript check, lint, and build commands exited 0.
  Focused coverage executed successfully and reported 100% statements, functions, and lines
  for `game-tutorial-screen.tsx`; the coverage process exited 1 only because unrelated package
  global thresholds received no coverage. `measure/doctor.sh` exited 1 because other active
  plans retain deprecated `[ ]` markers. S2.5 QC, S2.6 documentation, and S2.7 manual tasks
  remain blocked as declared below.

  **Mid-Red evidence (2026-08-12; phase base `5e00eca141fd5064cc3ac7ddb158b954799732ff`; role base `0c1bfc5046f88943b81a3427fb8cd20140067cb8`):** Added
  `src/presentation/__tests__/game-tutorial-screen.test.tsx` with 13 focused tests.
  The suite covers semantic step cards, progress, semantic target/highlight metadata,
  accessible focus and live narration, keyboard/pointer/touch commands, touch target
  size, compact/wide long Thai and English content, scrollability, reduced motion,
  neutral/correct/incorrect consequence feedback, host-neutral authority boundaries,
  cleanup/remount, and an actionable error state. The new test uses semantic IDs and
  contains no raw selector or coordinate contract.

  The targeted Red command exited `1` with 13 tests failed. The expected failure is
  the missing `src/presentation/game-tutorial-screen.tsx` module; the test suite loaded
  and ran all 13 assertions through the explicit missing-module guard. The existing
  S2.1/S2.2/S2.3 plus host command exited `0` with 6 files and 133 tests passing.
  Package type checking exited `0`. No production file changed.

- [x] Task: Add tutorial testing and QC fixtures `67d46769f`
  - [x] Add deterministic clock, input, target, and action fixtures
  - [x] Add worst-case Thai/English tutorial content
  - [x] Add replay, interruption, and leak assertions
  - [x] Add an independent tutorial preview state to APK QC

  **Mid-Red evidence (2026-08-12; phase base `6c8bd63937c69ca27d8c00973449cec396aafb69`; role base `6c8bd63937c69ca27d8c00973449cec396aafb69`):** Added package QC suites
  `src/presentation/__tests__/game-tutorial-qc-fixtures.test.ts` and
  `src/presentation/__tests__/game-tutorial-leak.test.ts`, an Advantage Games QC
  component suite, and a credential/runtime-gated browser spec. The tests use the
  shared tutorial contract, controller, screen, deterministic fixture helpers, and
  cartridge driver boundary. They cover deterministic clock/input/target/action
  data, worst-case Thai/English text, compact/wide viewports, keyboard/pointer/touch,
  reduced motion, replay, interruption, timer/listener/input/Phaser cleanup, one
  canvas, and zero production effects. No production source changed.

   The targeted Red command exited `1` with 1 expected failing assertion and 16
  passing assertions. The failure requires the shared QC fixture factory that the
  Green implementation must publish. The package S2.1-S2.4 command remained green
  with 7 files and 146 tests passing. Package type checking exited `0`. The focused
  Advantage Games Jest command exited `1` because the independent QC preview state
  and controls were not implemented. Browser tests were gated by
  `APK_TUTORIAL_QC_BROWSER=1` and were not run at that historical checkpoint.

   **Green evidence (2026-08-12, implementation `67d46769f`):** Published the shared
   deterministic `createGameTutorialQcFixture` factory. The factory validates the tutorial,
   creates a deterministic queued clock and keyboard/pointer/touch input sequence, executes
   the cartridge action-driver boundary, exposes semantic target/action IDs and resource
   diagnostics, and preserves one canvas. The focused S2.5 package command exited 0 with
   2 files and 17 tests passing. The S2.1-S2.5 package command exited 0 with 8 files and
   150 tests passing. The focused Advantage Games Jest command exited 0 with 1 suite and
   4 tests passing. It verifies the independent preview, Thai/English fixtures, compact/wide,
   keyboard/pointer/touch, reduced motion, replay/interruption cleanup, one canvas, and zero
   production completions. Focused package and app TypeScript checks, lint, and package build
   exited 0. The browser spec remains opt-in and was not run because
   `APK_TUTORIAL_QC_BROWSER` was not set. The next documentation task and the manual task
   remain blocked by their declared owners.

- [~] Task: Document the shared path and bespoke mechanic hook
  - [x] Document how an intern declares steps `b0bc6f7b6`
  - [x] Document how cartridge code demonstrates a mechanic without recreating UI `b0bc6f7b6`
  - [x] Run the combined graph update and generated-facts refresh `390448dd2`
    - **Structural evidence (2026-08-13):** The committed graph update succeeded for exactly 71 unique TS/TSX paths. The canonical sorted, newline-terminated path-list hash is `40df25b062d742ccb715e301b4a2914a079473575e504733de7dae7d70a2fb0d`; the exact APK 24-path subset hash is `29080b546d629046ecd9e26a2b1af698bdba652d3b6558786a321768bc94f3f2`.
    - `build-graph update` reported 71 files, growing the graph from 527 to 1360 nodes and from 682 to 1538 edges.
    - Generated-facts commit `390448dd2` embeds source revision `b4b11a3057e3645e6ab29bff304c7a93a00d440b`, architecture hash `df81e0948c1f01b59b8be3ee5659075d4cba4de4fefe5f477d2a9b2a695a1555`, and routes hash `a380a66544af846ba4057267c8023089b01fc83b7a6c0f97dc2ed69cf98fb1fb`. The deterministic pre-commit rerun matched the staged bytes.
  - [x] Complete repository-wide doctor, direct-checker, and whole-repository graph-audit gates — closed 2026-08-22 as owner-deferred. Owner record 2026-08-17: repository-wide doctor, evidence, graph, and acceptance failures are separate maintenance work and do not block playable games or the intern authoring path. No product work remains in this subtask.

  **APK lane evidence (2026-08-12, Green `b0bc6f7b6`):** Updated `docs/game-lifecycle.md` and
  `docs/developer-kit.md` with the S2 shared path, strict semantic-ID intern
  declaration, runtime-only `GameTutorialActionDriver` example, deterministic
  seed/action guidance, and production-authority boundary. Added the focused
  artifact test `src/presentation/__tests__/game-tutorial-documentation.test.ts`;
  the full S2 focused package slice passes 155/155 tests. Package type check,
  lint, and build pass; lint retains four pre-existing warnings outside S2.
  The graph update and generated-facts refresh are complete as recorded above;
  repository-wide doctor, direct-checker, and graph-audit closure remains
  root-owned and deferred under `root-structural-gates`.

  **Independent browser acceptance evidence (2026-08-12, accepted at `7bab10b5f`):** The
  opt-in guided-tutorial browser suite passed 2/2 in system Chrome with
  `APK_TUTORIAL_QC_BROWSER=1`, covering the required compact `390x844` and wide `1440x900`
  surfaces. It asserted compact state before switching, wide state after resizing, actual
  tutorial-screen profile and reduced-motion attributes, keyboard `Enter`, pointer click,
  touch-capable `touchscreen.tap`, worst-case Thai/English content, target/action visibility,
  overflow and obstruction checks, and non-vacuous replay/interruption resource cleanup.
  Browser evidence truthfully asserts one QC canvas host and one tutorial screen; actual Phaser
  canvas, input-handler, and production-effect invariants remain paired with the focused
  package runtime/QC slice, which exited 0 with 6 files and 104 tests passing. Independent
  review status: **ACCEPT**. This does not satisfy the product-owner manual gate.

  **Root structural-gate result (2026-08-13):** The whole-repository build-graph audit emitted no output and was terminated after approximately four minutes with exit 130; no audit Green is claimed. `measure/doctor.sh` exited 1 on 80 deprecated `[ ]` markers in nine unrelated plans, so its fail-fast path did not run architecture checks. The separate direct checker exited 1 with `files=4247`, `findings=697`, `parseErrors=0`, debt additions 137, debt removals 0, and renames 21. Repository-wide structural Green remains deferred to `root-structural-gates`; S2.6 and S2 are not complete.

- [~] Task: Measure - User Manual Verification 'Phase S2: Guided Gameplay Tutorial' (Protocol in workflow.md)
  **First agent pass (2026-08-20):** Kimi WebBridge opened Dragon Flight on the public arcade,
  started the guided tutorial, and captured compact and wide screenshots in `evidence/`.
  Product-owner manual verification remains later.

  **Owner direction (2026-08-22):** catalog art is wrong across almost all titles; only a few
  titles were manually adjusted, and the wizard-vs-zombie board slicing is itself incorrect.
  S2.7 manual verification waits on the art-quality rework. The rework runs as a
  wizard-vs-zombie pilot first, then a per-title cohort. The baseline is
  `../apk_product_simplification_20260820/evidence/catalog-load-review/index.html`.

## Phase S3: Safe Demonstration Mode

Owner instruction 2026-08-20: teachers need a class demonstration that uses the real cartridge and does not create a scored session. S4/S5 stay dropped.

_Story ref: spec.md#story-s3_

- [x] Task: Define demo-mode contracts
  - Lifecycle already includes `demo` and `demo-complete`.
  - `demo-complete` may return to briefing so the teacher can start student play.
  - Runtime `sessionMode: "demo"` already suppresses production `GameResults`.

- [x] Task: Write failing demo-mode tests
  - Briefing exposes Demonstrate for class.
  - Host mounts `sessionMode: "demo"` and blocks `onComplete`.
  - Advance returns to briefing. `launchPhase="demo"` and `?mode=demo` open the demo.

- [x] Task: Implement demo runtime isolation
  - Demonstrate mounts the real cartridge with completion suppressed.
  - Pause, restart, advance, and exit controls are on the demo host.

- [x] Task: Integrate demo controls into the shared host and QC
  - Advantage Games, Reading, and Primary pass `launchPhase="demo"` when `?mode=demo` is present.

- [x] Task: Document and verify demo behavior
  - Focused host, briefing, and contract tests pass.

- [ ] Task: Diagnose and repair live demonstration behavior — reopened 2026-08-22
  - Owner instruction 2026-08-22: the demonstration mode needs repair in the live host.
  - Diagnose the defect in the live host, apply the minimum fix, and prove it in a browser.

- [ ] Task: Add a skip-demonstration control — owner instruction 2026-08-22
  - A player who knows the game must be able to skip the demonstration.
  - Skip transitions from demo to real play through the existing `demo-complete` → `countdown` contract edge.
  - Keep the teacher Advance control (demo → briefing) unchanged.

- [b] Task: Measure - User Manual Verification 'Phase S3: Safe Demonstration Mode' (Protocol in workflow.md) — deferred:product-owner

## Phase S4: Standard Learning Debrief — dropped

Owner instruction 2026-08-20: the live host already has debrief. Do not reopen this as a second lifecycle program.

## Phase S4 (historical): Standard Learning Debrief

_Story ref: spec.md#story-s4_

- [b] Task: Define debrief contracts — deferred:s3-product-acceptance
  - Define outcome, standard statistics, missed-content review, custom-stat, label, and attribution schemas
  - Bound extension slots and validate all numeric result values
  - Preserve host ownership of navigation, persistence, and authoritative XP

- [b] Task: Write failing debrief tests — deferred:s3-product-acceptance
  - Cover victory, defeat, and complete outcomes
  - Cover score, accuracy, XP, correct answers, attempts, and learning review
  - Cover invalid values, excessive custom statistics, replay, and exit
  - Cover Thai/English compact and wide presentation

- [b] Task: Implement the standardized debrief screen — deferred:s3-product-acceptance
  - Preserve the legacy centered result-card information architecture
  - Add learning-review and required attribution regions
  - Add responsive replay and exit actions
  - Export the component and public contracts

- [b] Task: Integrate debrief into the APK lifecycle — deferred:s3-product-acceptance
  - Render only validated terminal results
  - Ensure normal gameplay completes exactly once
  - Route replay through clean teardown and configured restart phase
  - Delegate exit to the host

- [b] Task: Document and verify debrief behavior — deferred:s3-product-acceptance
  - Update developer and host integration documentation
  - Run focused tests, coverage, type checks, lint, graph update, generation, and doctor

- [b] Task: Measure - User Manual Verification 'Phase S4: Standard Learning Debrief' (Protocol in workflow.md) — deferred:s3-product-acceptance

## Phase S5: Intern-Ready Game Workflow — dropped

Owner instruction 2026-08-20: the scaffold already generates runnable game code. Do not reopen this as a second lifecycle program.

## Phase S5 (historical): Intern-Ready Game Workflow

_Story ref: spec.md#story-s5_

- [b] Task: Extend cartridge manifest and readiness contracts — deferred:s4-product-acceptance
  - Make briefing, tutorial, demo, and debrief declarations mandatory for new-game scaffolds
  - Add actionable readiness errors for missing or placeholder definitions
  - Preserve bounded bespoke tutorial-action hooks

- [b] Task: Write failing scaffold and readiness tests — deferred:s4-product-acceptance
  - Verify every generated file and export
  - Verify malformed or incomplete experience definitions fail closed
  - Verify generated cartridges compile without application imports
  - Verify readiness requires lifecycle, cleanup, accessibility, responsive, and attribution evidence

- [b] Task: Extend the cartridge scaffold — deferred:s4-product-acceptance
  - Generate typed experience configuration and tutorial-action modules
  - Generate lifecycle, presentation, runtime, and browser tests
  - Generate QC registration for every lifecycle state
  - Avoid copying any legacy or Tutor Advantage source tree

- [b] Task: Build the complete public exemplar — deferred:s4-product-acceptance
  - Demonstrate briefing, tutorial, demo, gameplay, victory/defeat/complete debrief, replay, and exit
  - Use the standard asset library and required attribution
  - Record authored versus generated code and duplicated infrastructure avoided

- [b] Task: Extend APK authoring QC — deferred:s4-product-acceptance
  - Preview every phase independently
  - Support compact/wide, touch/keyboard, Thai/English, and reduced-motion controls
  - Inspect lifecycle events, canvas count, completion count, diagnostics, and attribution

- [b] Task: Add focused visual and browser regression coverage — deferred:s4-product-acceptance
  - Capture briefing, tutorial, demo, and debrief reference states
  - Verify representative compact and wide viewports
  - Verify real keyboard, pointer, and touch interactions
  - Keep this coverage scoped to the new APK experience surfaces

- [b] Task: Publish the intern authoring guide and readiness checklist — deferred:s4-product-acceptance
  - Explain which values interns configure and which systems APK owns
  - Provide one vocabulary and one sentence example
  - Document common, extension, and bespoke paths
  - Run all affected package and QC gates, graph update, generation, and doctor

- [b] Task: Measure - User Manual Verification 'Phase S5: Intern-Ready Game Workflow' (Protocol in workflow.md) — deferred:s4-product-acceptance
