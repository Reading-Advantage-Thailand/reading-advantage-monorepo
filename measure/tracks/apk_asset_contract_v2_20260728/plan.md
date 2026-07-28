# Implementation Plan: APK Asset Contract v2

## Phase 1: Contract and migration boundary

- [ ] Define Zod schemas and inferred public types for semantic requirements,
  physical presentation descriptors, clips, timing, directions, geometry,
  readability/collision envelopes, and adapter declarations.
- [ ] Publish a compatibility report that pins the accepted standard-pack release
  and T11 inputs while making v2 additive and non-consumable by default.
- [ ] Specify failure codes for missing or incompatible descriptors, stale release
  identity, unsafe paths, duplicate physical sources, and unsupported media.

## Phase 2: Red tests and fixtures

- [ ] Write failing contract tests for three-frame versus six-frame walk clips,
  clip order, FPS, directions, anchors, scaling, atlas bounds, and audio/tile
  descriptor variants.
- [ ] Write failing resolver/materializer tests for descriptor parity,
  selected-union determinism, attribution, release/source integrity, and
  rejection of direct paths or full-pack output.
- [ ] Write deterministic adapter tests proving gameplay selects semantic states
  while presentation consumes descriptor behavior without changing movement or
  educational-result contracts.
- [ ] Add adversarial fixtures for stale descriptors, missing clips, invalid
  collision/readability envelopes, duplicate sources, and fixed-frame assumptions.

## Phase 3: Resolver and adapter implementation

- [ ] Implement descriptor validation and export it through the APK asset public
  API without coupling to a provider SDK or a game title.
- [ ] Extend accepted-release resolution and selected-union materialization to
  return typed descriptor registrations and required attribution.
- [ ] Implement the descriptor-driven presentation adapter and animation helpers
  for image, clip, tileset, UI, and audio registrations.
- [ ] Add fail-closed guards that prevent a cartridge from using a physical path,
  an unpinned release, a missing descriptor, or a hard-coded semantic frame count.
- [ ] Update fixtures and package exports as an opt-in v2 surface alongside
  accepted T11 APIs; write regression tests proving v1 consumers remain green
  and non-consumable unless explicitly upgraded.

## Phase 4: QC, scaffold, and documentation

- [ ] Add QC diagnostics that display semantic identity separately from selected
  physical descriptor and animation behavior.
- [ ] Update the cartridge scaffold, developer-kit documentation, and examples
  to request semantic states and consume descriptor-driven clips.
- [ ] Add a representative six-frame walk example and verify no example encodes
  a legacy three-frame assumption.

## Phase 5: Verification and acceptance

- [ ] Run focused unit, integration, lint, type-check, build, coverage, package
  boundary, selected-union, and browser/QC checks; record exact commands/results.
- [ ] Update `graph.db` for every exported contract/API edit, regenerate required
  Measure facts, and run the applicable Measure doctor/architecture gates; record
  any environment-blocked graph or generated-document check truthfully.
- [ ] Run an independent review for architecture boundaries, semantic/physical
  separation, compatibility, security, test coverage, and predecessor disclosures.
- [ ] Obtain product-owner acceptance and publish hash-bound successor evidence;
  do not authorize suitability, ingestion, migration, or deployment in this track.
