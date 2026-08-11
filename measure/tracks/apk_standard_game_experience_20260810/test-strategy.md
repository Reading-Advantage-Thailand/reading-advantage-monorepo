# Phase S2 Test Strategy: Guided Gameplay Tutorial

**Track:** `apk_standard_game_experience_20260810`
**Phase:** S2 - Guided Gameplay Tutorial (spec.md#story-s2)
**Strategy revision:** 2026-08-11 (initial canonical strategy for the resumed S2 cycle)
**Resume basis:** User explicitly resumed S2 on 2026-08-11 and requested maximum safe
parallelism. S1 is accepted at checkpoint `0a2e845d`. No unfinished S2 production code is
in the tree. The recoverable RED checkpoint `fa01f9b30` (449 lines of test-only work) is
preserved in Git history and is the reapply target for the S2.1 contract cycle.

## 0. Baseline validation and current phase state

### 0.1 SHA anchors (all verified against this repository)

| Anchor | SHA | Resolution |
|--------|-----|------------|
| Accepted S1 checkpoint (supplied phase base) | `0a2e845d226b6b4997af0a92e176d3583fc88515` | Valid commit: `chore(measure): checkpoint S1 briefing` (2026-08-11). This is the immutable accepted-S1 anchor; S2 builds on it. |
| Recoverable S2 RED checkpoint | `fa01f9b30aa9cc8dd201b6200c26be21904cdb80` | Valid commit: `test(apk): capture S2 tutorial contracts` (2026-08-11). Ancestor of HEAD. Contains 449 lines of test-only work across three files. Removed from the final merge tree (`d16165dc1`) but preserved in history for cherry-pick reapply. |
| S1 merge (removed RED from tree) | `d16165dc1` | Valid commit: `feat(apk): merge standard briefing` (2026-08-11). Merged S1 and excluded the intentionally-failing S2 RED draft. |
| role_base_sha / current HEAD | `1b9c9cb54acacb747d83ec0241318d97eb02400a` | Valid commit: `docs(measure): cite P4 ceiling adversarial` (2026-08-11). The revision this strategy is authored against. |

The supplied `phase_base_sha` `0a2e845d` resolves as a real commit and is the accepted S1
checkpoint. No SHA substitution is required. The RED checkpoint `fa01f9b30` is verified as
an ancestor of HEAD and is the cherry-pick target documented in
`s2-progress-handoff-20260811.md`. The current HEAD tree contains zero S2 production code
and zero S2 test files (verified: `game-tutorial-contract.test.ts` does not exist at HEAD).

### 0.2 Frozen contract boundary (from handoff, not re-negotiated)

The S2 contract boundary was frozen from three sources before the pause and is NOT
reopened by this strategy:

- **APK ownership:** tutorial sequencing, pause/resume, ordered advance, replay, skip,
  progress, lifecycle events, and suppression of production effects.
- **Cartridge ownership:** serializable semantic target IDs and deterministic action IDs
  only. A non-serializable runtime driver executes those actions against the real Phaser
  mechanic.
- **Linear step array:** array position is the only order. Branch fields, dangling
  successors, and unreachable nodes cannot enter the contract.
- **Resolved strings:** resolved Thai or English strings cross the APK boundary. Locale
  maps, translation callbacks, React nodes, and application navigation callbacks do not.
- **Rejected manifest fields:** DOM selectors, test IDs, physical key codes, file paths,
  screen coordinates, rectangles, Tutor lesson/session state, sockets, and persistence
  APIs are not manifest fields.
- **Production-effect suppression:** tutorial completion, skip, correct feedback, and
  incorrect feedback may be demonstrated, but tutorial mode must emit no `GameResults`,
  persisted progress, authoritative XP, leaderboard write, or normal failure consequence.

### 0.3 RED checkpoint surface (fa01f9b30, reapply target for S2.1)

Commit `fa01f9b30` contains 449 lines across three files:

- `packages/advantage-play-kit/src/presentation/__tests__/game-tutorial-contract.test.ts`
  (385 lines, new): strict schemas for semantic IDs, target kinds (`control`, `mechanic`,
  `learning-item`, `feedback`), deterministic actions, consequences (`neutral`, `correct`,
  `incorrect`), timing, resolved labels, steps, lifecycle policy, progress, commands, and
  the complete tutorial definition. Requires a uint32 seed, bounded `leadInMs`/
  `demonstrationMs`/`lingerMs` (0-120000), declared target/action registries with unique
  IDs and no unused declarations, literal safety policy values, and fail-closed rejection
  of selectors, coordinates, callbacks, locale maps, and unknown keys.
- `packages/advantage-play-kit/src/scaffolding/__tests__/cartridge-manifest.test.ts`
  (60 lines added): optional `tutorial` validation with nested error-path prefixing
  (`tutorial.labels.progress`), backward compatibility (tutorial not mandatory), and
  existing manifest gates.
- `packages/advantage-play-kit/src/presentation/__tests__/game-briefing-contract.test.ts`
  (4 lines added): `tutorial-skip` lifecycle event valid only from `tutorial` to
  `countdown` or `playing`.

The focused direct Vitest run intentionally stopped RED with one unresolved
tutorial-contract import, two lifecycle failures, and two manifest failures; 42 existing
assertions passed.

### 0.4 Open S2 gates (NOT closed by this strategy)

This strategy authorizes only the S2.1 contract cycle. The following remain explicitly
open and must not be claimed closed (A5/A6 defense):

1. S2.2 runtime tests for seeded playback through the real cartridge mechanic.
2. S2.3 tutorial runtime mode and cartridge-owned Phaser mechanic driver.
3. S2.4 accessible tutorial presentation (step cards, progress, focus, narration).
4. S2.5 QC fixtures (deterministic clock/input/target/action, worst-case Thai/English,
   replay/interruption/leak assertions, independent QC preview state).
5. S2.6 documentation, graph update, generation, and doctor checks.
6. S2.7 product-owner manual verification.
7. Live browser verification at compact 390x844 and wide 1440x900 with real keyboard,
   pointer, and touch interactions.

## 1. Purpose and proof standard

Phase S2 is complete only when executable tests prove that (a) the tutorial contract is a
strict serializable schema that rejects DOM selectors, coordinates, callbacks, locale maps,
and unknown keys at every boundary; (b) the tutorial runs a deterministic demonstration
through the same Phaser cartridge rather than a separately reimplemented game; (c) tutorial
mode emits zero `GameResults`, persisted progress, authoritative XP, leaderboard entries,
or normal failure consequences; (d) replay, exit, remount, and interruption leave no
timers, listeners, input handlers, or Phaser objects behind; and (e) guidance does not
obscure the highlighted mechanic or required learning content in compact and wide layouts.

A test that merely finds the string `"deterministic"` in the tutorial source is not proof
of deterministic playback. Source-text checks may supplement a behavioral test, but the
determinism contract is proven only by seeding the tutorial clock, executing the cartridge
mechanic driver against controlled input, and asserting the exact step sequence, timing,
and consequence for a given seed. Refutation: a different seed that produces the same step
output, or the same seed that produces different output on replay, is a determinism bug.

The following anti-patterns are explicit phase gates:

- **A1**: semantic-ID validation must not be a substring match; `tutorialSemanticIdSchema`
  must reject DOM selectors (`#id`, `.class`, `[attr]`, descendant combinators) and
  physical key codes via structured regex, not `includes("#")`.
- **A3**: seed must be a labeled uint32 integer (0-4294967295), progress must be labeled
  bounded integers (`completed` 0..`total`, `total` >= 1), not digit-only regexes.
- **A4**: each Red command records non-zero test and assertion counts; a missing test file
  is a failure, not a vacuous filtered success.
- **A5/A6**: plan, registry, and strategy claims must match the recorded command exit
  status; "tutorial contracts implemented" must not be inflated to "tutorial complete" or
  "gameplay transition proven."
- **A7**: the manifest validator must not use broad exclusions that hide an unused target
  declaration or a dangling step reference.
- **A8**: plan task markers must use `[~xb]`, not legacy `[ ]`; the S2 first task is
  converted to `[~]` by this strategy commit and the remaining tasks retain `[b]`.
- **A10**: `measure/generate.sh` + `git diff --exit-code -- measure/generated` must be
  clean after any structural change (S2.6 gate).
- **A14**: every detector uses `rg -n '<regex>'` (ripgrep default engine), never `rg -nE`.
- **A15**: any role receipt published for this strategy must bind the real strategy-commit
  SHA and current output hashes; a placeholder is not accepted.
- **A16**: one shared master worktree only; `git worktree list` must show exactly one entry.

## 2. Anti-pattern coverage per sub-tier (falsifiability)

Every test in this strategy must have a falsification condition: a named assertion that
fails on a named regression. S2.1 is the only executable sub-tier at this revision. The
remaining sub-tiers are recorded with their defense shape so the Mid-Red and Jr-Green roles
can execute them without re-negotiating the contract.

| Sub-tier | Defends against | Defense (falsification condition) |
|----------|-----------------|-----------------------------------|
| **S2.1 Tutorial contract definition** (executable `[~]`) | A1 (substring), A3 (digit-only), A4 (vacuous), A5/A6 (false claim), A7 (broad filter) | `tutorialSemanticIdSchema.safeParse("#answer-choice")` returns `success:false`; `gameTutorialDefinitionSchema.safeParse({...validTutorial, seed: 4_294_967_296})` returns `success:false`; `validateGameTutorialDefinition` with a blank `labels.progress` throws `/tutorial definition validation failed: labels\.progress:/i`; `gameTutorialDefinitionSchema.safeParse({...validTutorial, targets:[...validTutorial.targets, {id:"mechanic:unused", kind:"mechanic"}]})` returns `success:false` (no unused declarations). Refutation: an unused target that parses, or a DOM selector that passes, is a contract leak. |
| **S2.1 Production-effect suppression literals** | A5/A6 (false claim), A1 | `gameTutorialLifecyclePolicySchema.safeParse({...validTutorial.lifecycle, productionEffects:{...validTutorial.lifecycle.productionEffects, emitGameResults:true}})` returns `success:false` for all five effects. Refutation: any production effect that flips to `true` and parses is a suppression bug. This is a contract-level guard; the behavioral proof is in S2.2. |
| **S2.1 Lifecycle `tutorial-skip` event** | A5/A6 | `gameLifecycleTransitionSchema` accepts `{from:"tutorial", event:"tutorial-skip", to:"countdown"}` and `{from:"tutorial", event:"tutorial-skip", to:"playing"}`; rejects `{from:"tutorial", event:"tutorial-skip", to:"results"}` and `{from:"playing", event:"tutorial-skip", to:"countdown"}`. Refutation: a skip-to-results transition that parses is a production-completion leak. |
| **S2.1 Optional manifest `tutorial` field** | A7 (broad filter), A5/A6 | `validateCartridgeManifest(validManifest)` returns `tutorial:undefined` (backward compat); `validateCartridgeManifest({...validManifest, tutorial:validTutorial})` returns a validated tutorial; `validateCartridgeManifest({...validManifest, tutorial:{...validTutorial, labels:{...validTutorial.labels, progress:" "}}})` throws `/tutorial\.labels\.progress/i` (nested path prefix). Refutation: a malformed tutorial that parses without the nested path is an error-masking bug. |
| **S2.2 Runtime validation and runtime tests** (blocked on S2.1 Green) | A4, A5/A6, A1 | Seeded playback through the real cartridge produces the exact step sequence for seed N; same seed on replay produces identical output; zero `GameResults` emitted; zero persistence calls; zero XP mutations; zero leaderboard writes. Refutation: a tutorial run that emits one `GameResults` or calls the persistence adapter once is a production-effect leak. |
| **S2.3 Shared tutorial controller** (blocked on S2.2 Red) | A4, A5/A6 | The controller exposes `pause | resume | advance | replay | skip` commands; `advance` is sequential only (no branch/jump); replay restarts with the same seed; skip transitions to `countdown` or `playing` only. Refutation: an `advance` that jumps to a non-adjacent step, or a replay that reseeds, is a determinism bug. |
| **S2.4 Guided tutorial presentation** (blocked on S2.3 Green) | A4, A8 | Step cards render title, explanation, progress, highlighted target, and demonstrated action; keyboard, pointer, and touch navigation are supported; reduced-motion is respected; prompts do not obscure the highlighted mechanic in compact or wide. Refutation: a compact layout where the step card covers the highlighted target is an obstruction bug. |
| **S2.5 Tutorial testing and QC fixtures** (blocked on S2.3/S2.4) | A4, A5/A6 | Deterministic clock, input, target, and action fixtures drive the controller; worst-case Thai and English content fixtures exercise layout; replay, interruption, and leak assertions verify zero timers/listeners/Phaser objects after teardown; an independent QC preview state mounts the tutorial in isolation. Refutation: a Phaser scene or input handler that survives teardown is a leak bug. |
| **S2.6 Documentation, graph, generate, doctor** (blocked on S2.5) | A10, A14 | `build-graph update ./graph.db <changed files>`; `bash measure/generate.sh`; `bash measure/doctor.sh`; `git diff --exit-code -- measure/generated` clean. Refutation: a stale `measure/generated/architecture.json` after a structural change is an A10 drift. |
| **S2.7 User Manual Verification** (blocked on S2.6) | A5/A6, A11 | Product-owner manual verification per `measure/workflow.md` protocol. Refutation: a plan/registry note that claims S2 `[x]` complete before the PO verification event is recorded is a false claim. |

## 3. Test surfaces: artifact vs live behavior

| Test file | Kind | Sub-tier | Required proof |
|---|---|---|---|
| `packages/advantage-play-kit/src/presentation/__tests__/game-tutorial-contract.test.ts` | Live behavior (Zod schema execution) | S2.1 | Execute every tutorial schema (`tutorialSemanticIdSchema`, `gameTutorialTargetSchema`, `gameTutorialActionSchema`, `gameTutorialStepSchema`, `gameTutorialStepTimingSchema`, `gameTutorialLabelsSchema`, `gameTutorialLifecyclePolicySchema`, `gameTutorialDefinitionSchema`, `gameTutorialProgressSchema`, `gameTutorialCommandSchema`) against valid and adversarial inputs. Prove DOM selectors, coordinates, callbacks, locale maps, and unknown keys are rejected at every boundary. Prove the validator throws one stable path-bearing error. |
| `packages/advantage-play-kit/src/presentation/__tests__/game-briefing-contract.test.ts` | Live behavior (Zod schema execution) | S2.1 | `gameLifecycleTransitionSchema` accepts `tutorial-skip` from `tutorial` to `countdown`/`playing` and rejects `tutorial-skip` to `results` or from `playing`. |
| `packages/advantage-play-kit/src/scaffolding/__tests__/cartridge-manifest.test.ts` | Live behavior (Zod schema execution) | S2.1 | `validateCartridgeManifest` accepts an optional `tutorial` field, validates it strictly, prefixes nested errors with `tutorial.`, and preserves backward compatibility (tutorial not mandatory). |
| `packages/advantage-play-kit/src/presentation/__tests__/game-tutorial-runtime.test.ts` (future, S2.2) | Live behavior (mocked Phaser + deterministic clock) | S2.2 | Seeded playback through a mock cartridge driver produces the exact step sequence; same seed = identical output; zero `GameResults`/persistence/XP/leaderboard emissions. |
| `packages/advantage-play-kit/src/presentation/__tests__/game-tutorial-controller.test.ts` (future, S2.3) | Live behavior (pure controller unit) | S2.3 | `pause | resume | advance | replay | skip` commands; sequential advance only; same-seed replay; skip-to-countdown/playing only. |
| `packages/advantage-play-kit/src/presentation/__tests__/game-tutorial-screen.test.tsx` (future, S2.4) | Live behavior (component + a11y) | S2.4 | Step cards, progress, focus/highlight, accessible narration, keyboard/pointer/touch, reduced-motion, compact/wide non-obstruction. |
| QC fixture and leak-assertion suite (future, S2.5) | Live behavior (deterministic fixtures) | S2.5 | Deterministic clock/input/target/action; worst-case Thai/English; replay/interruption/leak; independent QC preview. |

### 3.1 Artifact/documentation tests vs live behavior tests

- **Artifact tests** read checked-in files (e.g., the developer-kit documentation, the QC
  route registration) and assert structural properties. They prove the tutorial is
  *documented* and *registered*. They do not prove the runtime honors the contract. S2.6
  owns artifact tests for documentation and QC registration.
- **Live behavior tests** execute Zod schemas, the tutorial controller, the cartridge
  mechanic driver, and React components against controlled inputs. They prove the runtime
  *honors* the contract and *rejects* adversarial inputs. These are the falsifiable proof.
- A phase gate requires **both**: the artifact test proves the tutorial is documented and
  registered; the live behavior test proves the contract is enforced. Neither alone
  satisfies S2.
- **No Tutor/Next coupling proof:** a live behavior test must assert that the tutorial
  contract schemas reject React nodes, callbacks, navigation functions, locale maps,
  socket state, and Tutor lesson/session references. Refutation: a callback or React node
  that passes `gameTutorialDefinitionSchema.safeParse` is a coupling bug. This is the
  falsifiable defense against the spec's "APK remains independent of Next.js, application
  aliases, Tutor Advantage, and host persistence" requirement.

### 3.2 No Tutor/Next coupling guard (cross-cutting)

The contract tests in S2.1 include explicit rejection cases for every coupling vector
named in the handoff and spec:

- `onAdvance: () => undefined` (callback) -> rejected.
- `locale: { en: ..., th: ... }` (locale map) -> rejected.
- `labels: { ...labels, customRenderer: "not permitted" }` (unknown label key) -> rejected.
- `targets: [{ ...target, selector: "#answer-choice" }]` (DOM selector) -> rejected.
- `targets: [{ ...target, x: 240, y: 160 }]` (screen coordinates) -> rejected.
- `targets: [{ ...target, bounds: {...} }]` (rectangle) -> rejected.
- `actions: [{ ...action, callback: () => undefined }]` (callback) -> rejected.
- `actions: [{ ...action, deterministic: false }]` (non-deterministic action) -> rejected.
- `steps: [{ ...step, onComplete: () => undefined }]` (callback) -> rejected.
- `lifecycle: { ...lifecycle, onPersist: () => undefined }]` (persistence callback) -> rejected.

Each rejection is a falsification condition: if any of these parse successfully, the
Tutor/Next coupling guard is broken.

## 4. Fixtures, mocks, and live-behavior proof expectations

### 4.1 Fixtures (S2.1, from RED checkpoint fa01f9b30)

- **`validTutorial`** (in `game-tutorial-contract.test.ts`): a complete deterministic
  tutorial with `schemaVersion:1`, `id:"temple-word-quest-tutorial"`, `seed:4_294_967_295`
  (uint32 max), three targets (`control`, `learning-item`, `feedback`), three actions
  (`neutral`, `correct`, `incorrect`), three ordered steps, and a literal lifecycle policy
  with all five production effects set to `false`.
- **Thai-content variant**: `validTutorial` with Thai title and labels (`บทเรียนเกมภารกิจคำศัพท์`,
  `ความคืบหน้าบทเรียน`, `ขั้นตอนถัดไป`) proving resolved Unicode strings cross the boundary.
- **Boundary timing fixture**: `{leadInMs:0, demonstrationMs:120_000, lingerMs:0}` proving
  both timing boundaries (0 and 120000) are accepted.
- **`validManifest`** (in `cartridge-manifest.test.ts`): a cartridge manifest pinning the
  accepted standard-pack release, with an optional `tutorial` field for the nested-error
  and backward-compat cases.

### 4.2 Mocks (S2.1)

- S2.1 contract tests execute pure Zod schemas. No mocks are required: the schemas are
  pure functions of their input. No Phaser, no DOM, no React, no PostgreSQL.
- S2.2 (future) will mock the Phaser cartridge driver and the deterministic clock via
  `vi.fn()` and a controlled time source. No real Phaser canvas is required for the
  runtime determinism and production-effect-suppression proofs.
- S2.3 (future) will mock the cartridge action-driver interface (validated input, selected
  step, deterministic seed, tutorial mode, diagnostics) to prove the controller coordinates
  steps without granting completion, persistence, DOM, or navigation authority.

### 4.3 Live-behavior proof expectations (S2.1)

- `tutorialSemanticIdSchema.safeParse("control:answer-choice")` -> `success:true`.
- `tutorialSemanticIdSchema.safeParse("#answer-choice")` -> `success:false` (DOM selector).
- `tutorialSemanticIdSchema.safeParse("KeyA")` -> `success:false` (physical key code).
- `gameTutorialDefinitionSchema.safeParse(validTutorial)` -> `success:true`.
- `gameTutorialDefinitionSchema.safeParse({...validTutorial, seed:4_294_967_296})` ->
  `success:false` (above uint32).
- `gameTutorialDefinitionSchema.safeParse({...validTutorial, seed:-1})` ->
  `success:false` (negative).
- `gameTutorialDefinitionSchema.safeParse({...validTutorial, seed:"42"})` ->
  `success:false` (string, not integer).
- `gameTutorialDefinitionSchema.safeParse({...validTutorial, targets:[]})` ->
  `success:false` (empty targets).
- `gameTutorialDefinitionSchema.safeParse({...validTutorial, steps:[...validTutorial.steps, validTutorial.steps[0]]})` ->
  `success:false` (duplicate step IDs).
- `gameTutorialDefinitionSchema.safeParse({...validTutorial, steps:[{...validTutorial.steps[0], order:1}, ...]})` ->
  `success:false` (graph/order declaration rejected; array position is the only order).
- `gameTutorialProgressSchema.safeParse({completed:0, total:3})` -> `success:true`.
- `gameTutorialProgressSchema.safeParse({completed:-1, total:3})` -> `success:false`.
- `gameTutorialProgressSchema.safeParse({completed:4, total:3})` -> `success:false`.
- `gameTutorialProgressSchema.safeParse({completed:0, total:0})` -> `success:false`.
- `gameTutorialCommandSchema.safeParse("tutorial-complete")` -> `success:false` (not a
  tutorial-local command; only `pause|resume|advance|replay|skip`).
- `gameTutorialLifecyclePolicySchema.safeParse({...validTutorial.lifecycle, productionEffects:{...validTutorial.lifecycle.productionEffects, emitGameResults:true}})` ->
  `success:false` for all five effects.
- `validateGameTutorialDefinition({...validTutorial, labels:{...validTutorial.labels, progress:" "}})` ->
  throws `/tutorial definition validation failed: labels\.progress:/i`.
- `gameLifecycleTransitionSchema.safeParse({from:"tutorial", event:"tutorial-skip", to:"countdown"})` ->
  `success:true`.
- `gameLifecycleTransitionSchema.safeParse({from:"tutorial", event:"tutorial-skip", to:"results"})` ->
  `success:false`.
- `validateCartridgeManifest(validManifest)` -> `tutorial:undefined` (backward compat).
- `validateCartridgeManifest({...validManifest, tutorial:validTutorial})` -> validated
  tutorial with `lifecycle.complete.to === "playing"`.
- `validateCartridgeManifest({...validManifest, tutorial:{...validTutorial, labels:{...validTutorial.labels, progress:" "}}})` ->
  throws `/tutorial\.labels\.progress/i`.

## 5. Exact Red and Green commands per sub-tier

> **Direct Vitest binary (not pnpm wrapper).** The handoff documents that the pnpm wrapper
> attempts a dependency reconciliation against the repository's stale lock state and is not
> the reliable focused-test path in this worktree. All S2 commands use the installed
> Vitest binary directly: `../../node_modules/.bin/vitest` from the APK package directory,
> or `node_modules/.bin/vitest` from the repo root with `--filter @reading-advantage/advantage-play-kit`.
> The `CI=true` env prevents watch mode.

### S2.1 - Tutorial contract definition (executable `[~]`)

**Red command** (reapply the checkpoint, then run; tests fail because the contract module
does not exist yet):

```bash
# Reapply the recoverable RED checkpoint (test-only, 449 lines):
git cherry-pick fa01f9b30

# Run the focused contract tests (expect RED: import fails, lifecycle/manifest fail):
cd packages/advantage-play-kit
CI=true ../../node_modules/.bin/vitest run \
  src/presentation/__tests__/game-tutorial-contract.test.ts \
  src/presentation/__tests__/game-briefing-contract.test.ts \
  src/scaffolding/__tests__/cartridge-manifest.test.ts
```

**Green gate:** implement `packages/advantage-play-kit/src/presentation/game-tutorial-contract.ts`
with all schemas and `validateGameTutorialDefinition`; add the `tutorial-skip` lifecycle
transition variant to `game-briefing-contract.ts`; add the optional `tutorial` field to
`cartridge-manifest.ts`; export the tutorial contract surface through
`src/presentation/index.ts`. The focused command above exits 0 with non-zero test and
assertion counts. The 42 previously-passing assertions remain green; the previously-failing
assertions (contract import, two lifecycle, two manifest) now pass.

**Closeout gate:** `git show HEAD:packages/advantage-play-kit/src/presentation/game-tutorial-contract.ts`
exists and exports all schemas named in the test; `git show HEAD:packages/advantage-play-kit/src/presentation/index.ts`
exports the tutorial contract surface; no later commit weakened a schema, re-enabled a
production effect literal, or accepted a DOM selector/coordinate/callback.

**Coverage gate:** `CI=true ../../node_modules/.bin/vitest run --coverage \
  src/presentation/__tests__/game-tutorial-contract.test.ts \
  src/presentation/__tests__/game-briefing-contract.test.ts \
  src/scaffolding/__tests__/cartridge-manifest.test.ts` reports >= 80% statement coverage
for `game-tutorial-contract.ts`.

### S2.2 - Tutorial runtime validation and runtime tests (blocked on S2.1 Green)

**Red command** (author new runtime tests; they fail because the controller/driver do not
exist yet):

```bash
cd packages/advantage-play-kit
CI=true ../../node_modules/.bin/vitest run \
  src/presentation/__tests__/game-tutorial-runtime.test.ts
```

**Green gate:** seeded playback through a mock cartridge driver produces the exact step
sequence for seed N; same seed on replay produces identical output; zero `GameResults`
emitted; zero persistence calls; zero XP mutations; zero leaderboard writes; zero normal
failure consequences. The `GameInput` and `GameResults` ABI remain unchanged.

**Closeout gate:** a behavioral assertion that a full tutorial run (all steps, skip, and
replay) emits exactly zero production completion/persistence/XP/leaderboard events. This is
the load-bearing defense against A5/A6 overstatement: the contract literals in S2.1 are
necessary but not sufficient; S2.2 proves the runtime honors them.

### S2.3 - Shared tutorial controller (blocked on S2.2 Red)

**Red command:**

```bash
cd packages/advantage-play-kit
CI=true ../../node_modules/.bin/vitest run \
  src/presentation/__tests__/game-tutorial-controller.test.ts
```

**Green gate:** the controller exposes `pause | resume | advance | replay | skip`; advance
is sequential only (no branch/jump); replay restarts with the same seed; skip transitions
to `countdown` or `playing` only; the cartridge action-driver receives validated input,
selected step, deterministic seed, tutorial mode, and diagnostics but no completion,
persistence, DOM, or navigation authority.

**Closeout gate:** no Tutor/Next coupling: the controller imports no React, Next.js,
Tutor Advantage, socket, or persistence module. A `grep -r "next/" src/presentation/game-tutorial-controller.ts`
returns zero hits (artifact check supplements the behavioral test).

### S2.4 - Guided tutorial presentation (blocked on S2.3 Green)

**Red command:**

```bash
cd packages/advantage-play-kit
CI=true ../../node_modules/.bin/vitest run \
  src/presentation/__tests__/game-tutorial-screen.test.tsx
```

**Green gate:** step cards render title, explanation, progress, highlighted target, and
demonstrated action; keyboard, pointer, and touch navigation are supported; reduced-motion
is respected; prompts do not obscure the highlighted mechanic in compact (390x844) or wide
(1440x900) layouts; accessible DOM equivalents exist outside the canvas (semantic headings,
  ARIA labels, progress announced).

**Closeout gate:** the presentation component imports no legacy application screen, no
shadcn component, no Next.js alias, and no Tutor Advantage component.

### S2.5 - Tutorial testing and QC fixtures (blocked on S2.3/S2.4 Green)

**Red command:**

```bash
cd packages/advantage-play-kit
CI=true ../../node_modules/.bin/vitest run \
  src/presentation/__tests__/game-tutorial-qc-fixtures.test.ts \
  src/presentation/__tests__/game-tutorial-leak.test.ts
```

**Green gate:** deterministic clock, input, target, and action fixtures drive the
controller; worst-case Thai and English content fixtures exercise layout without overflow;
replay, interruption, and leak assertions verify zero timers, listeners, input handlers, or
Phaser objects after teardown; an independent QC preview state mounts the tutorial in
isolation.

**Closeout gate:** a leak assertion that a Phaser scene, timer, or input handler survives
teardown fails the suite. One-canvas invariant preserved across replay and remount.

### S2.6 - Documentation, graph, generate, doctor (blocked on S2.5 Green)

**Red command** (structural gates; fail if stale):

```bash
# Graph update for changed exports, JSX, schemas:
build-graph update ./graph.db \
  packages/advantage-play-kit/src/presentation/game-tutorial-contract.ts \
  packages/advantage-play-kit/src/presentation/game-tutorial-controller.ts \
  packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx \
  packages/advantage-play-kit/src/presentation/index.ts \
  packages/advantage-play-kit/src/scaffolding/cartridge-manifest.ts

# Generate and doctor:
bash measure/generate.sh
bash measure/doctor.sh

# Generated-facts drift check (A10):
git diff --exit-code -- measure/generated
```

**Green gate:** `build-graph update` succeeds; `measure/generate.sh` exits 0;
`measure/doctor.sh` exits 0 (this track not listed by any failure); `git diff --exit-code
-- measure/generated` is clean (A10 defense).

**Closeout gate:** developer documentation explains how an intern declares steps and how
cartridge code demonstrates a mechanic without recreating UI; no documentation copies
Tutor React/Konva teaching wrapper, Zustand store, fixed Potion Rush coordinates, socket
state, or legacy Next.js navigation.

### S2.7 - User Manual Verification (blocked on S2.6 Green)

**Red command:** none authored. This is a human gate per `measure/workflow.md`.

**Green gate:** product-owner manual verification event recorded with the protocol
reference and date.

**Closeout gate:** the plan/registry must not mark S2 `[x]` until the PO verification event
is recorded. A plan/registry note that claims S2 is `[x]` complete before the PO
verification is a false claim (A5/A6/A11 defense).

## 6. Architecture guardrails and changed-contract risks

- **No Tutor/Next coupling (spec NFR).** The tutorial contract, controller, presentation,
  and fixtures must not import Next.js, application aliases, Tutor Advantage, React/Konva
  teaching wrappers, Zustand stores, socket state, lesson/session state, or host
  persistence. The contract tests in S2.1 reject callbacks, React nodes, locale maps,
  navigation functions, DOM selectors, and coordinates at every boundary. This is the
  falsifiable defense; a callback that parses is a coupling bug.
- **`GameInput` and `GameResults` ABI unchanged (spec NFR).** The tutorial runtime mode
  and cartridge action-driver must not change the existing input or results contracts.
  S2.2 and S2.3 Green gates re-run the existing briefing and lifecycle tests to prove no
  regression. A change to `GameInput` or `GameResults` is a changed-contract risk requiring
  a new strategy revision.
- **Phaser 4 remains the gameplay runtime (spec NFR).** The tutorial runs through the real
  Phaser cartridge, not a separately reimplemented game. S2.2 and S2.3 prove the
  cartridge-owned mechanic driver executes against the real Phaser scene. A tutorial that
  replaces the Phaser scene with a DOM/Canvas mock for the mechanic (not just the clock) is
  a determinism risk.
- **Production-effect suppression is load-bearing.** The five literal `false` values in
  `productionEffects` (S2.1) are necessary but not sufficient. S2.2 proves the runtime
  honors them by asserting zero emissions during a full tutorial run. A tutorial that emits
  one `GameResults`, one persistence call, one XP mutation, one leaderboard write, or one
  normal failure consequence is a production-safety failure.
- **Deterministic seed is the determinism contract.** The uint32 seed drives the
  cartridge mechanic driver. Same seed = identical step sequence, timing, and consequence.
  A replay that reseeds or a run that produces non-deterministic output for a fixed seed is
  a determinism bug.
- **Cleanup invariant.** Replay, exit, remount, and interruption must leave no timers,
  listeners, input handlers, or Phaser objects behind. One canvas is preserved across
  replay and remount (same invariant as S1). S2.5 proves this with leak assertions.
- **No worktree divergence (A16).** This strategy is authored in the single shared master
  checkout. `git worktree list` must show exactly one worktree. Never `git worktree add`.
- **Optional manifest field (backward compat).** The `tutorial` field in
  `cartridge-manifest.ts` is optional. S5 remains responsible for making it mandatory in
  new scaffolds/readiness checks. S2.1 must not make it mandatory or existing cartridges
  will fail validation.

## 7. Intentionally-red aggregate-suite handling

The aggregate `pnpm turbo run test` suite has known pre-existing failures that are **not
caused by S2** and must not block the S2.1 focused Green gate:

- **Primary-advantage**: 49 pre-existing ESLint errors (pre-existing, unrelated track).
- **Webhooks suite**: pre-existing failures from tech-debt/lessons-learned line-cap issues
  (pre-existing, unrelated to S2).
- **Standalone DB type check**: blocked by an unrelated `rootDir` error (pre-existing).
- **Working-tree dirty files**: the working tree has unrelated dirty files from the
  Finance/Identity/Accounts/Sales/Mastery work in progress. These are preserved and must
  not be staged by any S2 commit (concurrent writer protocol).
- **Phaser/Playwright aggregate**: the standard Playwright config invokes a pnpm predev
  reconciliation path incompatible with the stale lock state. Browser verification uses a
  direct Next server and installed Chromium binary, without dependency or lockfile changes
  (same approach as S1, per `plan-review.md`).

The S2.1 Green gate is the **focused** command in §5 (direct Vitest binary, three test
files). The aggregate suite's pre-existing reds are labeled and excluded from the S2
acceptance signal. If a future change turns a focused S2 command red, that is a real S2
failure and must not be hidden behind the "pre-existing" label (A5 defense).

## 8. Risk classification per sub-tier

| Sub-tier | Risk | Why |
|----------|------|-----|
| S2.1 Tutorial contract definition | **critical** | The contract is the load-bearing defense against DOM-selector, coordinate, callback, locale-map, and Tutor/Next coupling leaks. A1-style substring matching or A7 broad-filter acceptance here would let a DOM selector or callback enter the contract and propagate to the runtime. The production-effect suppression literals are also contract-level; if they parse as `true`, the runtime cannot suppress them. |
| S2.2 Runtime validation and runtime tests | **critical** | The behavioral proof that tutorial mode emits zero `GameResults`/persistence/XP/leaderboard. A4 vacuous-pass or A5 false-claim here would let a tutorial run silently emit a production completion. This is the falsifiable defense against the spec's "tutorial mode must never become production scoring authority" NFR. |
| S2.3 Shared tutorial controller | **high** | The controller coordinates steps, commands, and the cartridge driver. A determinism bug (non-sequential advance, reseeded replay) or a skip-to-results leak is a tutorial-safety and determinism failure. |
| S2.4 Guided tutorial presentation | **high** | Accessibility, responsive, and obstruction guarantees. A compact layout that covers the highlighted target, or a missing keyboard path, is a UX/a11y failure. Reduced-motion must be respected. |
| S2.5 Tutorial testing and QC fixtures | **high** | The leak-assertion suite is the cleanup invariant's falsifiable proof. A Phaser scene or timer that survives teardown is a resource-leak bug that compounds across replay/remount. |
| S2.6 Documentation, graph, generate, doctor | **medium** | Structural gates. A10 drift or stale documentation is a maintainability issue, not a runtime-safety issue, but it misleads the next intern and the orchestrator. |
| S2.7 User Manual Verification | **medium** | Human gate. The risk is A5/A6/A11 overstatement (claiming S2 closed before PO verification), not a code defect. |

## 9. Review applicability

| Subagent / review track | Applicable to Phase S2 | Reason |
|---|---|---|
| Security review (review-b-security) | **YES - required** | S2.1 production-effect suppression literals and S2.2 behavioral zero-emission proof are security-relevant: a tutorial that emits a `GameResults` or persists progress is a production-safety failure. The review must inspect the contract literals, the runtime emission assertions, and the cleanup invariant. The Tutor/Next coupling guard (callbacks, persistence callbacks, socket state rejected at the contract boundary) is also security-relevant. |
| UX/API review (review-c-ux-api) | **YES - required** | The tutorial contract is a public API surface (exported schemas, validator, lifecycle events). The review must verify the contract is transport-independent (no React/Next/Tutor coupling), the `pause|resume|advance|replay|skip` command vocabulary is stable, the `tutorial-skip` lifecycle event is valid only from `tutorial` to `countdown`/`playing`, and the optional manifest field preserves backward compatibility. S2.4 presentation a11y (semantic headings, ARIA, keyboard/pointer/touch, reduced-motion) is also UX-review-relevant. |
| Adversarial testing | **YES - required** | S2.1 adversarial cases (DOM selectors, coordinates, callbacks, locale maps, unknown keys, graph/order declarations, non-deterministic actions, out-of-bound seeds, blank labels, unused declarations, duplicate IDs, missing references, production-effect flips) are all named refutations that must be exercised as adversarial fixtures. S2.2 zero-emission proof and S2.5 leak assertions are behavioral adversarial proofs. The `tutorial-skip`-to-results rejection is an adversarial lifecycle case. |
| Browser review (ux-browser-review) | **YES - required for S2.4/S2.5/S2.7 closure; NO for S2.1** | S2.1 is a pure contract cycle (Zod schemas, no browser). S2.4 presentation, S2.5 QC fixtures, and S2.7 PO verification require live Chromium verification at compact 390x844 and wide 1440x900 with real keyboard, pointer, and touch interactions, Thai and English content, reduced-motion, and no horizontal overflow (same approach as S1 per `plan-review.md`). |

## 10. Maximum safe parallelism

The user requested maximum safe parallelism. The S2 dependency chain is primarily
sequential due to TDD (tests precede implementation), but the following parallel seams are
safe once their dependency is Green:

- **S2.1 is the only executable sub-tier at this revision.** It must complete Green before
  any other S2 sub-tier begins. No parallel S2 work is authorized until S2.1 Green.
- **After S2.1 Green:** S2.2 (runtime tests) and S2.4 presentation-contract test authoring
  may proceed in parallel, because they test different surfaces (runtime emission vs.
  presentation a11y) and both depend only on the S2.1 contract. However, S2.4's Green
  depends on S2.3's Green controller, so S2.4 Red can parallel with S2.2 Red but S2.4 Green
  must wait for S2.3 Green.
- **After S2.3 Green:** S2.4 (presentation Green) and S2.5 (QC fixtures) may proceed in
  parallel, because both depend on the stable controller interface and test different
  surfaces (presentation a11y vs. leak/determinism fixtures).
- **S2.6 and S2.7 are strictly sequential** after S2.5 Green; no parallelism.
- **No parallelism with other tracks' production code.** The concurrent writer protocol
  (flock commit mutex, exact leased paths only) prevents staging foreign paths. The
  working tree's unrelated dirty files (Finance/Identity/Accounts/Sales/Mastery) are
  preserved and never staged by an S2 commit.

## 11. `phase_base_sha` capture point

The orchestrator must capture the immutable `phase_base_sha` for Phase S2 **after this
strategy commit lands** and **before any new Red commit is authored for an S2 sub-tier**.
Concretely:

1. Commit this strategy as
   `docs(measure): refresh S2 tutorial test strategy (track_id: apk_standard_game_experience_20260810)`
   on the master branch (the role-owned change, staged under the commit mutex).
2. `git rev-parse HEAD` immediately after the commit succeeds. That SHA is the truthful S2
   base for any subsequent S2 Red cycle (including the `fa01f9b30` cherry-pick reapply).
3. **Do not embed a SHA in this strategy that predicates the committed strategy.** The
   supplied accepted-S1 anchor `0a2e845d` is the historical phase base; the
   post-strategy-commit HEAD is the immutable base for future S2 work. The role must not
   speculate about a future SHA.

Until the strategy commit lands, the supplied immutable phase base remains
`0a2e845d226b6b4997af0a92e176d3583fc88515` and the reviewed HEAD remains
`1b9c9cb54acacb747d83ec0241318d97eb02400a`. After this strategy commit lands, the
orchestrator must capture the post-strategy HEAD as the truthful `phase_base_sha` for any
subsequent S2 Red cycle. The `fa01f9b30` cherry-pick is the first S2 Red commit and must
be authored on top of the post-strategy-commit HEAD, not on top of `0a2e845d`.

## 12. Phase S2 closure declaration

Phase S2 is **not closed** at this strategy revision. This strategy authorizes only the
S2.1 contract cycle (the first `[~]` task). The phase closes only after all of the
following are true at HEAD:

- The focused S2.1-S2.6 commands in §5 exit 0 with non-zero test/assertion counts.
- The S2.7 PO manual verification event is recorded with protocol reference and date.
- Live browser verification at compact 390x844 and wide 1440x900 passes with real
  keyboard, pointer, and touch interactions, Thai and English content, reduced-motion, and
  no horizontal overflow.
- `build-graph update`, `measure/generate.sh`, `measure/doctor.sh`, and
  `git diff --exit-code -- measure/generated` are clean (A10 defense).
- The plan/registry does not claim S2 is `[x]` complete while any gate in §0.4 is open
  (A5/A6/A11 defense).
- The S2 task markers in `plan.md` use `[~]` (in-progress) or `[x]` (complete with
  evidence), not legacy `[ ]` (A8 defense); only the first task is `[~]` at this revision.

Until then, the S2 closeout tasks remain `[b]`, the S2 story in `metadata.json` remains
`"in-progress"`, and `measure/tracks.md` must not mark this track as archived.
