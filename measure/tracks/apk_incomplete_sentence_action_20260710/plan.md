# Implementation Plan: APK Incomplete Sentence Action W1

> **Track ID:** `apk_incomplete_sentence_action_20260710`
> **Predecessor:** `apk_catalog_cutover_w0_20260710`

## Planning Evidence

- Both catalog cards are `coming-soon` and point to nonexistent student routes; neither game has source, API, tests, or runtime assets.
- The only retained artifacts are catalog descriptions, cover images, and obsolete compliance-audit records. The APK roadmap, not the old React-Konva audit, is the mechanic contract.
- Astral Mage establishes target-action: free movement, aim/fire, projectile-target collision, ordered sentence crystals, and off-screen guidance.
- Ziggurat establishes deterministic adjacent-step graphs and isometric projection: only reachable rune cubes can be selected, and the correct path never dead-ends.
- `CartridgeId` changes affect the shared catalog, QC host, both consumer registries, editions, and catalog tests. Authoritative domain completion remains intentionally unchanged in this track.

## Phase S1: Build Astral Mage target action
_Story ref: spec.md#story-s1_
_Blast radius: shared cartridge catalog/loaders, QC catalog, edition slots, and both host smoke registries._

- [~] Task: Define target-action contracts and Astral Mage blueprint
  - [ ] Specify deterministic rounds, stable duplicate token IDs, hit transitions, scoring, required semantic slots, and Phaser capabilities
  - [ ] Specify strict sentence preflight and exact five-field completion
- [b] Task: Add Red target-action and Astral cartridge tests — deferred:sequence
  - [ ] Cover wrong/correct/unknown/repeated hits, multiple sentences, duplicate words, deterministic seeds, and malformed input
  - [ ] Require public manifest, loader identity, slots, capabilities, and completion-once behavior
- [b] Task: Implement reusable target-action systems and Astral scene — deferred:sequence
  - [ ] Build pure target state plus real Phaser movement, aim/fire, projectile collision, camera, pools, timers, particles, and indicator
  - [ ] Keep edition data outside gameplay source
- [b] Task: Verify Astral package quality — deferred:sequence
  - [ ] Run focused tests, coverage, lint, type-check, build, and architecture guard
- [b] Task: Measure - User Manual Verification 'Phase S1: Build Astral Mage target action' (Protocol in workflow.md) — deferred:product-owner

## Phase S2: Build Ziggurat step traversal
_Story ref: spec.md#story-s2_

- [b] Task: Define step-graph, projection, and Ziggurat contracts — deferred:sequence
  - [ ] Specify deterministic reachable graphs, legal adjacency, isometric coordinates, transitions, scoring, slots, and capabilities
  - [ ] Specify strict sentence preflight and exact five-field completion
- [b] Task: Add Red graph, projection, and cartridge tests — deferred:sequence
  - [ ] Cover reachability, no dead ends, wrong/correct/nonadjacent/repeated steps, duplicates, multiple sentences, and malformed input
  - [ ] Require public manifest, loader identity, slots, capabilities, and completion-once behavior
- [b] Task: Implement reusable step-graph systems and Ziggurat scene — deferred:sequence
  - [ ] Build pure graph/projection rules plus Phaser interactive cubes, keyboard/touch selection, depth, tween jumps, camera, particles, and ritual feedback
  - [ ] Keep edition data outside gameplay source
- [b] Task: Verify Ziggurat package quality — deferred:sequence
  - [ ] Run focused tests, coverage, lint, type-check, build, and architecture guard
- [b] Task: Measure - User Manual Verification 'Phase S2: Build Ziggurat step traversal' (Protocol in workflow.md) — deferred:product-owner

## Phase S3: Prove editions and hosts
_Story ref: spec.md#story-s3_

- [b] Task: Define dual-edition and host-consumption contracts — deferred:sequence
  - [ ] Add the required semantic slots and bounded Chibi/Epic tuning with provenance
  - [ ] Add both public IDs to typed Reading and Primary sentence registries
- [b] Task: Add Red edition, QC, and host tests — deferred:sequence
  - [ ] Require both editions, all five catalog IDs, public result identity, and unchanged sentence/result mappings
  - [ ] Require no copied scene/assets or app-private package imports
- [b] Task: Implement edition manifests and host registry additions — deferred:sequence
  - [ ] Resolve both cartridges through the shared loaders under the correct host edition
  - [ ] Preserve tree-shaking and client-only Phaser isolation
- [b] Task: Run component and browser acceptance — deferred:sequence
  - [ ] Complete representative keyboard/pointer and touch flows at desktop and 390x844
  - [ ] Verify both editions, one canvas, clean relaunch, no overflow, diagnostics, and exact result identity
- [b] Task: Measure - User Manual Verification 'Phase S3: Prove editions and hosts' (Protocol in workflow.md) — deferred:product-owner

## Phase S4: Cut over unfinished catalog entries
_Story ref: spec.md#story-s4_

- [b] Task: Define query deep-link and catalog-cutover contracts — deferred:sequence
  - [ ] Require `/qc?cartridge=astral-mage|sorcerer-ziggurat` selection and unknown-ID fallback
  - [ ] Require playable catalog cards only after reachable QC launches while authoritative completion remains excluded
- [b] Task: Add Red deep-link, card, and completion-boundary guards — deferred:sequence
  - [ ] Prove both cards resolve to working shared-package cartridges and no nonexistent legacy route
  - [ ] Preserve rejection at the server completion boundary until production persistence exists
- [b] Task: Implement QC deep links and catalog card cutover — deferred:sequence
  - [ ] Synchronize selected public ID with the query string without leaking canvases
  - [ ] Mark only the two completed cards playable and retain both covers
- [b] Task: Run final W1 acceptance and update graph/evidence — deferred:sequence
  - [ ] Run package, host, QC, browser, build, architecture, no-copy, and Measure gates
  - [ ] Record exact retained/deleted/deferred surfaces and successor ownership
- [b] Task: Measure - User Manual Verification 'Phase S4: Cut over unfinished catalog entries' (Protocol in workflow.md) — deferred:product-owner
