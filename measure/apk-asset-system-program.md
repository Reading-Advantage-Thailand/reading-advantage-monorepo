# Advantage Play Kit Delivery Program

## Objective

Create Advantage Play Kit (APK) as the standard way to develop, test,
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
  - one standard semantic asset library
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
7. `packages/advantage-play-kit/assets/standard` is the sole production-art
   source for all past and future APK games. A cartridge may not introduce a
   competing source, theme, or external art without an explicit product decision,
   canonical import, attribution, and pinned successor pack version.
8. Build-time host deployment copies are deterministic selected outputs of that
   canonical source and include only assets required by selected cartridges; APK
   does not ship the whole approximately 287 MB standard pack by default.
9. Physical asset formats follow proven semantic and gameplay requirements.
10. Cartridge cohorts must improve shared APK capabilities when repeated needs
   appear; they must not recreate one-off controllers and infrastructure.
11. Production exposure returns one verified game at a time.

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
Shared APK developer kit      Standard asset-library contract
and authoring workflow        and curated ingestion batches
              |                     |
              +----------+----------+
                         |
                         v
Asset Contract v2: semantic identity, physical descriptor,
and presentation-behavior adapter
                         |
                         v
Suitability dossier: reuse canonical, canonically ingest legacy, or block
                         |
                         v
Ready cartridge rebuild cohorts
                         |
                         v
Reading/Primary host cutover and exact legacy retirement
```

The standard-library import, generated catalog, resolver, gallery, and versioned
release may proceed in parallel with T8-T10 because they do not alter the frozen
legacy evidence denominator. Per-game semantic adoption remains blocked until T10
accepts the role/state mappings. The developer kit requires both T10 successor
hashes and an accepted standard-pack release. Cartridge cohorts additionally
require the shared capabilities, accepted Asset Contract v2, and accepted
suitability/ingestion evidence for every selected canonical asset used by that
cohort.

## Tracks

### 1. APK Evidence Reconstruction and Independent Acceptance

[`apk-evidence-reconstruction-program.md`](./apk-evidence-reconstruction-program.md)
defines ten bounded tracks ending at `apk_independent_acceptance_handoff_20260712`.
The former monolithic track failed and is quarantined; none of its outputs are
consumable successor dependencies.

### 2. APK Shared Developer Kit and Authoring Workflow

[`apk_shared_developer_kit_20260712`](./archive/apk_shared_developer_kit_20260712/)
turns accepted repeated capabilities into typed Phaser systems, standard UI and
responsive composition primitives, testing fixtures, cartridge scaffolding,
documentation, and an Advantage Games authoring/QC workflow.

### 3. APK Standard Asset Library Contract and Production

[`apk_dual_theme_asset_production_20260712`](./archive/apk_dual_theme_asset_production_20260712/)
turns the purchased, licensed ElvGames collection into the single canonical
production-art source at `packages/advantage-play-kit/assets/standard`. It
provides a versioned semantic catalog, grid-size and view metadata, attribution,
validation, curated ingestion, and deterministic selected-deployment outputs.

### 4. APK Asset Contract v2

[`apk_asset_contract_v2_20260728`](./tracks/apk_asset_contract_v2_20260728/)
is the additive shared-contract successor to T11. It separates a requested
semantic role/state from the selected asset's physical descriptor and the
cartridge presentation adapter. It is the owner of descriptor-driven animation
and selected-union metadata; it does not make a cartridge consumable or alter
historical T10/T11 acceptance.

### 5. APK Standard-Pack Suitability and Canonical Ingestion

[`apk_standard_pack_suitability_ingestion_20260728`](./archive/apk_standard_pack_suitability_ingestion_20260728/)
evaluates each required role/state and behavior contract against the standard
pack. Its accepted outcome is exactly one of reuse a suitable canonical asset,
canonically ingest an approved legacy asset with provenance, or block the role.
It publishes additive release/binding evidence only; it does not migrate a game.

### 6. APK Cartridge Migration Umbrella and Vertical Cohorts

[`apk_cartridge_semantic_rewrite_20260712`](./archive/apk_cartridge_semantic_rewrite_20260712/)
is planning-only: it pins accepted T10/T11/standard-pack artifacts and their
disclosures, then requires its foundation child track to reconcile T2's
27-source-identity denominator against its 29-assignment partition before any
completeness claim. It delegates all implementation to bounded 20260727 tracks:
two existing-cartridge revalidation/cutover cohorts, three remaining legacy
rebuild/cutover cohorts, historical/cancelled disposition, planned/new-game
intake, and residual-only cross-host closeout. Every implementation cohort is
limited to five games and owns vertical Advantage Games, Reading, Primary, and
exact-retirement proof. The closeout track cannot take work owned by a cohort;
no big-bang host track is authorized.

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
- Semantic identity (`player:walk`) is independent from physical source metadata
  (sheet/atlas layout, frame count/order, timing, directions, anchors, scale,
  readability, collision envelope, and media-specific details).
- A cartridge presentation adapter maps a gameplay-selected semantic state to a
  validated descriptor-defined clip. It must not encode a legacy frame count as
  semantic meaning; gameplay movement and collision behavior remain cartridge
  owned.
- A gameplay variant exists only when behavior, strength, movement, attack,
  scale, collision/readability, or scene function requires a distinguishable
  identity.
- The standard library treatment is the licensed ElvGames pixel-art collection at
  `packages/advantage-play-kit/assets/standard`; it is the sole production-art
  source, and variant files are alternatives within its pinned canonical version.
- Environment assets form reusable, corpus-proven kits.
- UI assets must satisfy compact and wide region, text, and safe-area contracts.
- Physical sheets, atlases, strips, tiles, static images, and slice dimensions
  are selected only after states and runtime usage are known.
- Every curated asset entry traces to a source archive, license record, credit,
  and semantic filesystem path. Game-specific adoption remains separately justified.
- A deployment copy is a build-time selected output linked to an exact canonical
  pack version and semantic binding manifest. It cannot become a source of truth
  or a new app-local asset inventory.
- Before a cohort uses a role/state, an accepted suitability dossier must decide
  whether to reuse a suitable canonical asset, canonically ingest the approved
  legacy source, or block the role. Visual similarity alone is insufficient.

## Change control

If implementation discovers an absent capability or asset requirement, the
affected cartridge pauses. The requirement is added to the accepted matrices with
source evidence, classified as reusable or bespoke, and validated as a canonical
standard-library import before work resumes. New external art additionally needs
an explicit product decision and attribution. Child tracks may not introduce
private substitutes merely to keep moving.

An asset-suitability or descriptor mismatch is an absent requirement for this
purpose. A cohort may continue non-asset host infrastructure, but it may not
claim title migration, host proof completion, cutover, retirement, or deployment
until the v2 contract and accepted suitability/ingestion evidence are consumed.

## Program completion

The program is complete only when:

- The foundation crosswalk has resolved or explicitly corrected the accepted
  27-source-identity/29-assignment discrepancy; before then no corpus
  completeness claim is valid.
- Every in-scope identity is assigned once to a vertical cohort or has an accepted
  explicit historical/cancelled disposition.
- Every rebuilt or revalidated game has accepted mechanic, capability, responsive,
  semantic-adoption, and asset mapping evidence.
- APK exposes the accepted shared developer systems, components, tests, and
  authoring workflow.
- Every standard-library asset is discoverable through its semantic filesystem key,
  pinned canonical version, and ElvGames source and credit record.
- Every adopted role/state has a validated physical descriptor and an accepted
  reuse, canonical-ingestion, or blocked suitability disposition.
- Every restored cartridge uses shared capabilities where required and contains
  only justified bespoke game logic.
- Compact and wide compositions pass real-input verification with readable,
  unobstructed Thai and English content.
- Reading and Primary consume the same cartridge packages, canonical pack version,
  and semantic binding manifests through stable host adapters.
- Derived deployment outputs are selected and bounded; the whole standard pack is
  never a default production payload.
- Exact replaced legacy components, routes, logic, and copied assets are retired
  only after both hosts prove the same cartridge/binding manifest.
- A new representative game can be scaffolded, implemented, tested, and run in
  QC with standard-library assets without recreating platform infrastructure.
