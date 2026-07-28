# Specification: APK Asset Contract v2

## Overview

Introduce a reusable, fail-closed APK asset contract that separates product
semantics from physical source metadata and from cartridge presentation behavior.
A cartridge must be able to request `player:walk` without assuming a three-frame
sheet, a physical file path, or a particular animation cadence.

This is an additive successor to the accepted standard-pack and developer-kit
tracks. Their receipts and historical claims remain immutable.

## Functional Requirements

- FR-1: Define a typed semantic requirement as a stable role/state identity
  independent of a file, sheet layout, clip length, or game implementation.
- FR-2: Define a validated physical presentation descriptor for an accepted
  catalog entry, including media kind, dimensions, atlas/sheet layout, clip
  frames/order, directions, FPS/timing defaults, anchor/pivot, render scale,
  collision/readability envelope, and applicable audio/tile metadata.
- FR-3: Define a typed cartridge presentation adapter. Gameplay selects a
  semantic state; the adapter selects and plays the descriptor-defined clip.
  Gameplay movement, collision rules, and educational logic remain cartridge
  owned.
- FR-4: Extend accepted-release resolution and selected-union materialization so
  registrations expose validated descriptor metadata while retaining release,
  catalog-digest, source-receipt, attribution, deduplication, and no-direct-path
  enforcement.
- FR-5: Reject missing, incompatible, stale, unsafe, or fixed-frame-only
  registrations before a cartridge can load them. A descriptor with six walk
  frames must not be coerced into a three-frame semantic contract.
- FR-6: Provide descriptor-driven animation helpers, deterministic fixtures,
  QC diagnostics, scaffold output, and documentation for image, animation,
  tileset, UI, and audio registrations.
- FR-7: Version the public contract and publish an explicit compatibility and
  migration policy for existing T11 consumers. No legacy or production cartridge
  becomes consumable merely by importing v2.

## Non-Functional Requirements

- Contracts use Zod at external/configuration boundaries and infer TypeScript
  types from schemas.
- New exported APIs have JSDoc and focused unit tests; relevant package lint,
  type-check, build, coverage, and browser/QC gates must pass.
- The design must preserve selected-union-only delivery and must never expose
  a private asset tree, direct physical paths, or the full pack to a cartridge.

## Acceptance Criteria

- A test fixture proves the same `player:walk` semantic requirement can use a
  three-frame and a six-frame descriptor without changing the semantic contract.
- Invalid frame counts, frame order, FPS, atlas bounds, anchors, collision or
  readability metadata, release identity, and direct paths fail closed.
- A selected-union receipt contains descriptor metadata and required credit while
  remaining deterministic and deduplicated.
- A generated cartridge and QC surface use descriptor-driven playback rather
  than a hard-coded frame count.
- Independent review and owner acceptance bind only the new v2 artifacts and
  preserve all predecessor disclosures.

## Out of Scope

- Per-title suitability decisions, legacy asset ingestion, visual replacement,
  cartridge migration, catalog exposure, host cutover, and legacy retirement.
