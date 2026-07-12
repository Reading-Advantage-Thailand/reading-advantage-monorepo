# Specification: APK Dual-Theme Asset Contract and Production

## Overview

This track converts the product-owner-approved cross-game asset ontology into
physical delivery contracts and two complete visual treatments:

- **Chibi Quest** for younger learners.
- **Riven Lands** for older learners.

The accepted ontology determines what must exist. This track determines how
each asset type is physically delivered and then produces it. It does not copy
legacy file layouts and does not force actors, creatures, terrain, projectiles,
VFX, UI, and backgrounds into one universal sheet format.

## Required predecessor artifacts

Work may not start until `apk_cross_game_asset_ontology_20260712` provides and
the product owner accepts:

- Complete game corpus.
- Scene-level asset usage matrix.
- Existing-asset audit.
- Normalized ontology and variant rules.
- Environment-kit definitions.
- Gap analysis and coverage-driven production priorities.

Any unresolved Must-have requirement blocks physical contract freeze.

## Stories

### Story S1: Define type-specific physical contracts

**As a** cartridge and asset developer
**I want** each accepted semantic family to have an appropriate physical format
**So that** rewritten games consume stable capabilities without inheriting old layouts.

Acceptance criteria:

- Every accepted semantic type declares its physical kind, dimensions or sizing
  rules, states, directions, animation semantics, origin/collision when relevant,
  scaling, slicing/tiling behavior, and runtime usage.
- Humanoid actors, large creatures, flying mounts, directional projectiles,
  environment kits, animated props, one-shot VFX, UI states, and backgrounds may
  use different contracts when their accepted usages require it.
- A previous 4x8, 4x4, Wang, strip, atlas, or static-image format is retained
  only when it satisfies the accepted type; previous formats are not normative.
- Chibi Quest and Riven Lands implement the same semantic IDs, states, and
  per-type physical structure for drop-in theme replacement.
- The contract distinguishes gameplay variants from theme treatments.

### Story S2: Plan bounded production batches

**As a** product owner
**I want** art produced in evidence-backed batches
**So that** each batch unlocks identifiable games and can be inspected completely.

Acceptance criteria:

- `production-batches.md` maps every batch to exact semantic IDs, both theme
  outputs, dependent games/scenes, shared contract types, and acceptance tests.
- Batches are prioritized by cross-game coverage, dependency order, and coherent
  art direction—not by an arbitrary knight/skeleton-first sequence.
- Each batch is small enough for complete frame/state inspection and is executed
  in its own Measure child track with explicit inputs and outputs.
- No batch contains an asset without an ontology or accepted-gap reference.

### Story S3: Use a deterministic generation and import pipeline

**As an** asset producer
**I want** generated outputs normalized and validated mechanically
**So that** attractive but unusable images cannot enter a pack.

Acceptance criteria:

- New art is produced with the built-in image generator; MMX and unrelated
  external generation tools are not used.
- Generation uses a flat unique chroma field, normally `#ff00ff`, never baked
  checkerboards or simulated transparency.
- Reference identities and palettes are approved per semantic family/theme
  before dependent animation/state production.
- Deterministic processing creates exact physical outputs, real alpha, hashes,
  provenance, and stable semantic/state mappings.
- Validators reject wrong dimensions, missing states, invalid frame boundaries,
  chroma residue, non-alpha masters, excessive bleed, pair drift, and unsafe paths.

### Story S4: Produce both theme implementations

**As a** learner
**I want** age-appropriate but mechanically equivalent visual themes
**So that** theme choice does not alter game meaning or difficulty.

Acceptance criteria:

- Each semantic type and gameplay variant exists in both themes before its batch
  is accepted.
- Actors and animated assets preserve identity, equipment, silhouette, facing,
  state readability, baseline, and scale across frames.
- Strength and behavior variants remain visibly distinguishable in both themes.
- Environment kits are internally coherent and contain every capability required
  by their mapped games.
- Existing assets are reused only according to the accepted manual audit and
  retain provenance/license evidence.

### Story S5: Assemble production-ready packs

**As a** runtime maintainer
**I want** validated manifests and inspection evidence
**So that** cartridge tracks can rely on the packs without hidden fallbacks.

Acceptance criteria:

- Both manifests contain exact semantic-to-physical mappings, content hashes,
  dimensions, state/frame definitions, provenance, and versioning.
- Pack parity is validated at the semantic capability and physical-contract level.
- Real assets are inspected in the authoring harness and Kimi WebBridge; generated
  placeholders cannot satisfy manual acceptance.
- No production binding resolves to procedural art, missing files, cover art, or
  an unreviewed substitute.
- Independent review leaves no Critical, High, or Medium finding open.

## Out of scope

- Rewriting cartridge gameplay or educational rules.
- Reopening withdrawn catalog routes.
- Adding assets not justified by the accepted ontology/change-control process.
- Audio production unless a successor decision explicitly adds it.
- Preserving legacy renderer or filename compatibility.
