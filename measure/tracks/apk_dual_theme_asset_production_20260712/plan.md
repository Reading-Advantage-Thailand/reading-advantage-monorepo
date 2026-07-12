# Implementation Plan: APK Dual-Theme Asset Contract and Production

> **Track ID:** `apk_dual_theme_asset_production_20260712`
> **Blocked by:** exact accepted `apk_independent_acceptance_handoff_20260712` manifest hashes

## Phase 0: Enforce the predecessor gate [checkpoint: pending]

- [~] Task: Validate the T10 acceptance record and accepted manifest, then record the
  corpus, mechanic/capability links, responsive matrix, usage-matrix, ontology,
  variant, environment-kit, audio-role, and gap-analysis SHAs
- [~] Task: Write a dependency test that rejects contract or production entries
  without an accepted ontology/gap ID and source game coverage
- [~] Task: Audit prior APK physical-ABI and authoring-pipeline commits against
  the accepted ontology; classify each piece as retain, revise, replace, or remove
- [~] Task: Remove or disable speculative physical requirements that are not
  supported by the accepted predecessor artifacts
- [b] Task: Measure - User Manual Verification 'Phase 0' (Protocol in workflow.md) — deferred:product-owner

## Phase 1: Define semantic-to-physical type contracts [checkpoint: pending]

- [~] Task: Write failing tests for every accepted semantic family and its
  required states, directions, sizing, origins/collisions, tiling/slicing, and usage
- [~] Task: Select a physical format for each accepted actor, creature/mount,
  environment, target, prop/hazard, pickup/weapon, projectile, VFX, UI, and
  background family based on the usage matrix
- [~] Task: Define stable semantic IDs and state names independently of theme
  paths and physical filenames
- [~] Task: Define mirrored Chibi Quest/Riven Lands parity and substitutions
  without requiring unrelated asset families to share one layout
- [~] Task: Define responsive UI/control physical contracts with text capacity,
  nine-slice, safe-padding, compact/wide, and cropping/focal rules
- [~] Task: Define physical audio contracts for every accepted semantic audio role
- [~] Task: Implement typed schemas and validators for the accepted contracts
- [~] Task: Publish `semantic-to-physical-contracts.md` with source-usage links
  and no unresolved Must-have physical decision
- [b] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md) — deferred:product-owner

## Phase 2: Freeze bounded production batches [checkpoint: pending]

- [~] Task: Convert the accepted coverage plan into batches with exact semantic
  IDs, both-theme outputs, dependent games/scenes, and completion criteria
- [~] Task: Verify each batch is small enough for exhaustive state/frame/manual
  inspection and maximizes shared game coverage without conflating roles
- [~] Task: Create one child Measure track per production batch; each child track
  must link its ontology rows, physical contracts, expected files, and game coverage
- [~] Task: Publish `production-batches.md` with dependency order and child-track links
- [b] Task: Obtain product-owner acceptance before the first generation call — deferred:product-owner
- [b] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md) — deferred:product-owner

## Phase 3: Harden shared production and inspection tooling [checkpoint: pending]

- [~] Task: Retain or repair deterministic chroma cleanup, assembly, inventory,
  paired-theme comparison, and byte/hash validation according to Phase 1 contracts
- [~] Task: Write Red tests for each physical contract family and all rejection cases
- [~] Task: Make the inspection harness load real manifest entries and expose
  state playback/stepping, grid/tile/slice overlays, anchors, collisions, and theme swap
- [~] Task: Add compact/wide safe-region and real Thai/English text-capacity
  inspection for UI, prompts, controls, HUD, and result assets
- [~] Task: Prove the harness never turns a whole sheet into one frame and never
  accepts placeholders as production evidence
- [~] Task: Run coverage, lint, syntax/type, and Kimi browser checks using test fixtures
- [b] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md) — deferred:product-owner

## Phase 4: Execute paired production child tracks [checkpoint: pending]

- [~] Task: For each batch, approve theme references and palettes before dependent states
- [~] Task: Generate only the batch's accepted semantic assets with the built-in
  image generator on a flat chroma field
- [~] Task: Normalize, validate, hash, inventory, and manually inspect every output
- [~] Task: Reject/regenerate identity, silhouette, state-readability, boundary,
  chroma, pair-parity, or environment-cohesion failures
- [~] Task: Complete each child track independently before marking its batch available
- [~] Task: Keep `production-batches.md` synchronized with child-track status and hashes
- [b] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md) — deferred:product-owner

## Phase 5: Assemble and accept both packs [checkpoint: pending]

- [~] Task: Build versioned Chibi Quest and Riven Lands manifests from accepted
  batch outputs and prove complete ontology coverage
- [~] Task: Record provenance, license, prompt/generator lineage, dimensions,
  hashes, byte size, review disposition, and replacement history for every file
- [~] Task: Run automated semantic parity, structural, state, path, hash, and
  no-fallback validation across both packs
- [~] Task: Use Kimi WebBridge to inspect every real state/animation, environment
  kit, prop/hazard, projectile/VFX/audio sequence, responsive UI slice/state,
  worst-case text fixture, and theme swap
- [~] Task: Run independent review and remediate every Critical, High, and Medium finding
- [b] Task: Obtain explicit product-owner acceptance and publish immutable pack versions — deferred:product-owner
- [b] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md) — deferred:product-owner
