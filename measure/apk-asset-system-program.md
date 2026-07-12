# Advantage Play Kit Delivery Program

## Objective

Create Advantage Play Kit (APK) as the standard way to develop, test, theme,
package, and ship Reading Advantage and Primary Advantage vocabulary and sentence
games.

The external boundary is deliberately fixed:

```text
Reading / Primary host
        |
        v
Vocabulary[] or Sentence[]
        |
        v
Advantage Play Kit cartridge
  - shared Phaser runtime and lifecycle
  - standard developer systems and components
  - responsive compact/wide composition
  - two semantic asset themes
  - bespoke game mechanics
        |
        v
GameResults
        |
        v
Host-owned identity, progress, and persistence
```

APK standardizes repeated infrastructure while preserving the game itself as a
black box. It must make a new game substantially easier to build without reducing
the catalog to reskins or generic templates.

## Source of truth

`apps/advantage-games` is the primary requirements corpus. Its catalog, raw game
implementations, deterministic logic, routes, shared screens, hooks, controllers,
assets, tests, and app-local Measure history provide evidence for:

- Recognizable mechanics and educational loops.
- Repeated developer work that APK should standardize.
- Responsive compact/wide composition requirements.
- Semantic asset and theme requirements.
- Legacy code and routes to retire after verified replacement.

Reading Advantage and Primary Advantage provide production-host and imported-game
evidence. Archived APK W0-W4 work provides reusable lessons and mechanic evidence,
but withdrawn code and archived completion claims do not override current source
reality.

## Program principles

1. The vocabulary, sentence, and `GameResults` contracts remain stable.
2. Authentication, identity, school tenancy, authoritative XP, idempotency, and
   persistence remain host/server responsibilities.
3. Phaser 4 is the canonical gameplay runtime.
4. The common developer path must be simple; bespoke Phaser remains available
   where a mechanic cannot use a standard capability.
5. Reuse is derived from the complete game corpus, not one exemplar.
6. Compact and wide compositions are intentional layouts, not scaled copies.
7. Chibi Quest and Riven Lands implement the same semantic capabilities.
8. Physical asset formats follow proven semantic and gameplay requirements.
9. Cartridge cohorts must improve shared APK capabilities when repeated needs
   appear; they must not recreate one-off controllers and infrastructure.
10. Production exposure returns one verified game at a time.

## Dependency order

```text
advantage-games raw corpus + Reading/Primary imported copies
                         |
                         v
Game, mechanic, developer-capability, responsive, and asset requirements audit
                         |
              +----------+----------+
              |                     |
              v                     v
Shared APK developer kit      Dual-theme asset contracts
and authoring workflow        and production batches
              |                     |
              +----------+----------+
                         v
Ready cartridge rebuild cohorts
                         |
                         v
Reading/Primary host cutover and exact legacy retirement
```

The developer-kit and asset-production tracks may proceed in parallel only after
the replacement evidence program's independent T10 acceptance manifest is published.
Cartridge cohorts require the shared capabilities and asset batches used by that
cohort, not necessarily unrelated later batches.

## Tracks

### 1. APK Evidence Reconstruction and Independent Acceptance

[`apk-evidence-reconstruction-program.md`](./apk-evidence-reconstruction-program.md)
defines ten bounded tracks ending at `apk_independent_acceptance_handoff_20260712`.
The former monolithic track failed and is quarantined; none of its outputs are
consumable successor dependencies.

### 2. APK Shared Developer Kit and Authoring Workflow

[`apk_shared_developer_kit_20260712`](./tracks/apk_shared_developer_kit_20260712/)
turns accepted repeated capabilities into typed Phaser systems, standard UI and
responsive composition primitives, testing fixtures, cartridge scaffolding,
documentation, and an Advantage Games authoring/QC workflow.

### 3. APK Dual-Theme Asset Contract and Production

[`apk_dual_theme_asset_production_20260712`](./tracks/apk_dual_theme_asset_production_20260712/)
turns the accepted semantic ontology into type-appropriate physical contracts and
produces mirrored Chibi Quest and Riven Lands assets in coverage-driven batches.

### 4. APK Cartridge Rebuild, Integration, and Cutover

[`apk_cartridge_semantic_rewrite_20260712`](./tracks/apk_cartridge_semantic_rewrite_20260712/)
opens bounded cartridge-cohort tracks, rebuilds games through the shared kit and
semantic assets, verifies compact/wide behavior in both themes, cuts accepted
cartridges into Reading and Primary hosts, and retires exact legacy copies.

## Required capability domains

The combined audit and developer-kit track must make an explicit retain,
standardize, extend, or bespoke decision for:

- Runtime lifecycle, one-canvas ownership, pause, restart, mute, and teardown.
- Vocabulary/sentence session progression and deterministic content selection.
- Correct/incorrect attempt handling, score, accuracy, XP display, combo, health,
  lives, timers, waves, and terminal results.
- Keyboard, pointer, tap, drag, typing, D-pad, action, and hybrid controls.
- Movement, collision, projectiles, collection, escort, defense, runner, arena,
  puzzle/matching, sequencing, and turn-based systems.
- Cameras, bounds, spawning, pooling, animation, VFX, audio, and diagnostics.
- Start, instruction, pause, HUD, prompt, feedback, and result components.
- Difficulty, accessibility, and audience-safe tuning.
- Compact/wide composition under
  [APK Responsive Game Composition Specification](./apk-responsive-game-composition-spec.md).
- Deterministic tests, simulation fixtures, browser QC, performance, and leak
  detection.
- Cartridge manifests, scaffolding, documentation, examples, and release guards.

## Asset modeling rules

- An asset type describes a reusable gameplay or presentation capability.
- A gameplay variant exists only when behavior, strength, movement, attack,
  scale, collision/readability, or scene function requires a distinguishable
  identity.
- A theme treatment is the Chibi Quest or Riven Lands expression of the same
  semantic asset; it is not a new gameplay variant.
- Environment assets form reusable, corpus-proven kits.
- UI assets must satisfy compact and wide region, text, and safe-area contracts.
- Physical sheets, atlases, strips, tiles, static images, and slice dimensions
  are selected only after states and runtime usage are known.
- Every ontology entry traces to a real game/scene or an explicitly accepted gap.

## Change control

If implementation discovers an absent capability or asset requirement, the
affected cartridge pauses. The requirement is added to the accepted matrices with
source evidence, classified as reusable or bespoke, implemented or produced for
both required themes/profiles, and validated before work resumes. Child tracks
may not introduce private substitutes merely to keep moving.

## Program completion

The program is complete only when:

- Every in-scope game has an accepted mechanic, capability, responsive, and asset
  mapping.
- APK exposes the accepted shared developer systems, components, tests, and
  authoring workflow.
- Every required semantic asset exists in both themes.
- Every restored cartridge uses shared capabilities where required and contains
  only justified bespoke game logic.
- Compact and wide compositions pass real-input verification with readable,
  unobstructed Thai and English content.
- Reading and Primary consume the same cartridge packages through stable host
  adapters.
- Exact replaced legacy components, routes, logic, and copied assets are retired.
- A new representative game can be scaffolded, implemented, tested, themed, and
  run in QC without recreating platform infrastructure.
