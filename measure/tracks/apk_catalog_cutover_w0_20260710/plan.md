# Implementation Plan: APK Catalog Cutover W0

> **Track ID:** `apk_catalog_cutover_w0_20260710`
> **Foundation:** `advantage_play_kit_20260710` implementation commit `01fe1f1f`

## Planning Evidence

- The updated graph contains 23,642 nodes across 2,854 files and locates `GameCartridgeDefinition` in `packages/game-cartridges/src/internal/types.ts`.
- Public temporary IDs currently occur in the cartridge catalog/loaders/manifests, the Advantage Games QC host/tests, and one smoke configuration per consuming app.
- `CartridgeId` is derived from literal loader keys, so the catalog cutover has a bounded type blast radius while internal mechanic helpers can remain stable.
- The foundation package-consumption proofs cover only one game per app; W0 must make them table-driven across all three games and the appropriate edition.

## Phase S1: Publish product game identities
_Story ref: spec.md#story-s1_
_Blast radius: `CartridgeId` and `GameCartridgeDefinition` flow through the shared catalog, three manifests, QC host, Playwright test, and two host smoke modules._

- [~] Task: Define the exact public-ID and legacy-rejection contracts
  - [ ] Add Red tests for exact catalog/loader IDs, manifest-key parity, and old-ID rejection
  - [ ] Assert vocabulary arrays, sentence arrays, and five-field `GameResults` remain unchanged
- [b] Task: Implement the public identity cutover — deferred:sequence
  - [ ] Map `dragon-flight`, `dungeon-liberator`, and `magic-defense` to the three Phaser mechanics
  - [ ] Remove temporary IDs from public types, catalog keys, manifests, and completion-facing values
  - [ ] Retain internal mechanic helpers only where they remain useful implementation details
- [b] Task: Verify the cartridge package — deferred:sequence
  - [ ] Run lint, type-check, tests with coverage, build, and architecture scans
- [b] Task: Measure - User Manual Verification 'Phase S1: Publish product game identities' (Protocol in workflow.md) — deferred:sequence

## Phase S2: Cut over the QC testbed
_Story ref: spec.md#story-s2_

- [b] Task: Add Red QC identity and route tests — deferred:sequence
  - [ ] Require exact public labels and public result IDs
  - [ ] Reject temporary IDs in user-visible QC output
- [b] Task: Implement QC catalog and URL cutover — deferred:sequence
  - [ ] Launch all public IDs in both editions through the shared loader
  - [ ] Preserve restart, diagnostics, fixture, and one-canvas behavior
- [b] Task: Run component and browser acceptance — deferred:sequence
  - [ ] Cover desktop keyboard flow and 390x844 touch affordances
  - [ ] Verify public-ID completion, no overflow, and no leaked canvas
- [b] Task: Measure - User Manual Verification 'Phase S2: Cut over the QC testbed' (Protocol in workflow.md) — deferred:sequence

## Phase S3: Prove both production hosts
_Story ref: spec.md#story-s3_

- [b] Task: Define table-driven host registry and trust-boundary contracts — deferred:sequence
  - [ ] Require all three product IDs in Reading Secondary Epic and Primary Chibi
  - [ ] Require server-owned identity, tenant, awarded XP, timing validation, and abuse controls
- [b] Task: Add Red cross-host package-consumption tests — deferred:sequence
  - [ ] Load every cartridge from public package exports without copied code or assets
  - [ ] Map every public result through the unchanged completion boundary
- [b] Task: Implement all-game host smoke registries — deferred:sequence
  - [ ] Support vocabulary and sentence fixtures through their stable array contracts
  - [ ] Preserve literal dynamic loading and client-only Phaser isolation
- [b] Task: Measure - User Manual Verification 'Phase S3: Prove both production hosts' (Protocol in workflow.md) — deferred:sequence

## Phase S4: Lock legacy deletion evidence
_Story ref: spec.md#story-s4_

- [b] Task: Define the exact cutover/deletion manifest schema — deferred:sequence
  - [ ] Record replacement, public ID, internal mechanic, host proofs, and completion boundary per game
  - [ ] Require a retain/delete/defer disposition with evidence for every listed legacy path
- [b] Task: Produce and validate W0 cutover evidence — deferred:sequence
  - [ ] Scan graph callers and text references before any deletion
  - [ ] Delete only caller-free paths owned by this track and defer production legacy routes to named waves
- [b] Task: Run final acceptance and update generated knowledge — deferred:sequence
  - [ ] Run all package, host, QC, browser, build, architecture, and Measure gates
  - [ ] Update `graph.db` for changed structural files and record bounded deviations
- [b] Task: Measure - User Manual Verification 'Phase S4: Lock legacy deletion evidence' (Protocol in workflow.md) — deferred:sequence
