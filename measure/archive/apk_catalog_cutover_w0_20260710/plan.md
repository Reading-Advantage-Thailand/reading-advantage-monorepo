# Implementation Plan: APK Catalog Cutover W0

> **Track ID:** `apk_catalog_cutover_w0_20260710`
> **Foundation:** `advantage_play_kit_20260710` implementation commit `01fe1f1f`

## Planning Evidence

- The updated graph contains 23,642 nodes across 2,854 files and locates `GameCartridgeDefinition` in `packages/game-cartridges/src/internal/types.ts`.
- Public temporary IDs currently occur in the cartridge catalog/loaders/manifests, the Advantage Games QC host/tests, and one smoke configuration per consuming app.
- `CartridgeId` is derived from literal loader keys, so the catalog cutover has a bounded type blast radius while internal mechanic helpers can remain stable.
- The foundation package-consumption proofs cover only one game per app; W0 must make them table-driven across all three games and the appropriate edition.

## Phase S1: Publish product game identities [checkpoint: 8b98aed0] [approval: a8f28029]
_Story ref: spec.md#story-s1_
_Blast radius: `CartridgeId` and `GameCartridgeDefinition` flow through the shared catalog, three manifests, QC host, Playwright test, and two host smoke modules._

- [x] Task: Define the exact public-ID and legacy-rejection contracts (8b98aed0)
  - [x] Add Red tests for exact catalog/loader IDs, manifest-key parity, and old-ID rejection (8b98aed0)
  - [x] Assert vocabulary arrays, sentence arrays, and five-field `GameResults` remain unchanged (8b98aed0)
- [x] Task: Implement the public identity cutover (8b98aed0)
  - [x] Map `dragon-flight`, `dungeon-liberator`, and `magic-defense` to the three Phaser mechanics (8b98aed0)
  - [x] Remove temporary IDs from public types, catalog keys, manifests, and completion-facing values (8b98aed0)
  - [x] Retain internal mechanic helpers only where they remain useful implementation details (8b98aed0)
- [x] Task: Verify the cartridge package (8b98aed0)
  - [x] Run lint, type-check, tests with coverage, build, and architecture scans (8b98aed0)
- [x] Task: Measure - User Manual Verification 'Phase S1: Publish product game identities' (Protocol in workflow.md) (a8f28029)

## Phase S2: Cut over the QC testbed [checkpoint: 8b98aed0] [approval: a8f28029]
_Story ref: spec.md#story-s2_

- [x] Task: Add Red QC identity and route tests (8b98aed0)
  - [x] Require exact public labels and public result IDs (8b98aed0)
  - [x] Reject temporary IDs in user-visible QC output (8b98aed0)
- [x] Task: Implement QC catalog and URL cutover (8b98aed0)
  - [x] Launch all public IDs in both editions through the shared loader (8b98aed0)
  - [x] Preserve restart, diagnostics, fixture, and one-canvas behavior (8b98aed0)
- [x] Task: Run component and browser acceptance (8b98aed0)
  - [x] Cover desktop keyboard flow and 390x844 touch affordances (8b98aed0)
  - [x] Verify public-ID completion, no overflow, and no leaked canvas (8b98aed0)
- [x] Task: Measure - User Manual Verification 'Phase S2: Cut over the QC testbed' (Protocol in workflow.md) (a8f28029)

## Phase S3: Prove both production hosts [checkpoint: 8b98aed0] [approval: a8f28029]
_Story ref: spec.md#story-s3_

- [x] Task: Define table-driven host registry and trust-boundary contracts (8b98aed0)
  - [x] Require all three product IDs in Reading Secondary Epic and Primary Chibi (8b98aed0)
  - [x] Require server-owned identity, tenant, awarded XP, timing validation, and abuse controls (8b98aed0)
- [x] Task: Add Red cross-host package-consumption tests (8b98aed0)
  - [x] Load every cartridge from public package exports without copied code or assets (8b98aed0)
  - [x] Map every public result through the unchanged completion boundary (8b98aed0)
- [x] Task: Implement all-game host smoke registries (8b98aed0)
  - [x] Support vocabulary and sentence fixtures through their stable array contracts (8b98aed0)
  - [x] Preserve literal dynamic loading and client-only Phaser isolation (8b98aed0)
- [x] Task: Measure - User Manual Verification 'Phase S3: Prove both production hosts' (Protocol in workflow.md) (a8f28029)

## Phase S4: Lock legacy deletion evidence [checkpoint: 8b98aed0] [approval: a8f28029] [final-verification: a8f28029]
_Story ref: spec.md#story-s4_

- [x] Task: Define the exact cutover/deletion manifest schema (8b98aed0)
  - [x] Record replacement, public ID, internal mechanic, host proofs, and completion boundary per game (8b98aed0)
  - [x] Require a retain/delete/defer disposition with evidence for every listed legacy path (8b98aed0)
- [x] Task: Produce and validate W0 cutover evidence (8b98aed0)
  - [x] Scan graph callers and text references before any deletion (8b98aed0)
  - [x] Delete only caller-free paths owned by this track and defer production legacy routes to named waves (8b98aed0)
- [x] Task: Run final acceptance and update generated knowledge (8b98aed0)
  - [x] Run all package, host, QC, browser, build, architecture, and Measure gates (8b98aed0)
  - [x] Update `graph.db` for changed structural files and record bounded deviations (8b98aed0)
- [x] Task: Measure - User Manual Verification 'Phase S4: Lock legacy deletion evidence' (Protocol in workflow.md) (a8f28029)
