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

- [x] Task: Define target-action contracts and Astral Mage blueprint (c378c3cc)
  - [x] Specify deterministic rounds, stable duplicate token IDs, hit transitions, scoring, required semantic slots, and Phaser capabilities (c378c3cc)
  - [x] Specify strict sentence preflight and exact five-field completion (c378c3cc)
- [x] Task: Add Red target-action and Astral cartridge tests (c378c3cc)
  - [x] Cover wrong/correct/unknown/repeated hits, multiple sentences, duplicate words, deterministic seeds, and malformed input (c378c3cc)
  - [x] Require public manifest, loader identity, slots, capabilities, and completion-once behavior (c378c3cc)
- [x] Task: Implement reusable target-action systems and Astral scene (c378c3cc)
  - [x] Build pure target state plus real Phaser movement, aim/fire, projectile collision, camera, pools, timers, particles, and indicator (c378c3cc)
  - [x] Keep edition data outside gameplay source (c378c3cc)
- [x] Task: Verify Astral package quality (c378c3cc)
  - [x] Run focused tests, coverage, lint, type-check, build, and architecture guard (c378c3cc)
- [x] Task: Measure - User Manual Verification 'Phase S1: Build Astral Mage target action' — approved 2026-07-10 (6ca2220c)

## Phase S2: Build Ziggurat step traversal
_Story ref: spec.md#story-s2_

- [x] Task: Define step-graph, projection, and Ziggurat contracts (c378c3cc)
  - [x] Specify deterministic reachable graphs, legal adjacency, isometric coordinates, transitions, scoring, slots, and capabilities (c378c3cc)
  - [x] Specify strict sentence preflight and exact five-field completion (c378c3cc)
- [x] Task: Add Red graph, projection, and cartridge tests (c378c3cc)
  - [x] Cover reachability, no dead ends, wrong/correct/nonadjacent/repeated steps, duplicates, multiple sentences, and malformed input (c378c3cc)
  - [x] Require public manifest, loader identity, slots, capabilities, and completion-once behavior (c378c3cc)
- [x] Task: Implement reusable step-graph systems and Ziggurat scene (c378c3cc)
  - [x] Build pure graph/projection rules plus Phaser interactive cubes, keyboard/touch selection, depth, tween jumps, camera, particles, and ritual feedback (c378c3cc)
  - [x] Keep edition data outside gameplay source (c378c3cc)
- [x] Task: Verify Ziggurat package quality (c378c3cc)
  - [x] Run focused tests, coverage, lint, type-check, build, and architecture guard (c378c3cc)
- [x] Task: Measure - User Manual Verification 'Phase S2: Build Ziggurat step traversal' — approved 2026-07-10 (6ca2220c)

## Phase S3: Prove editions and hosts
_Story ref: spec.md#story-s3_

- [x] Task: Define dual-edition and host-consumption contracts (c378c3cc)
  - [x] Add the required semantic slots and bounded Chibi/Epic tuning with provenance (c378c3cc)
  - [x] Add both public IDs to typed Reading and Primary sentence registries (c378c3cc)
- [x] Task: Add Red edition, QC, and host tests (c378c3cc)
  - [x] Require both editions, all five catalog IDs, public result identity, and unchanged sentence/result mappings (c378c3cc)
  - [x] Require no copied scene/assets or app-private package imports (c378c3cc)
- [x] Task: Implement edition manifests and host registry additions (c378c3cc)
  - [x] Resolve both cartridges through the shared loaders under the correct host edition (c378c3cc)
  - [x] Preserve tree-shaking and client-only Phaser isolation (c378c3cc)
- [x] Task: Run component and browser acceptance (c378c3cc)
  - [x] Complete representative keyboard/pointer and touch flows at desktop and 390x844 (c378c3cc)
  - [x] Verify both editions, one canvas, clean relaunch, no overflow, diagnostics, and exact result identity (c378c3cc)
- [x] Task: Measure - User Manual Verification 'Phase S3: Prove editions and hosts' — approved 2026-07-10 (6ca2220c)

## Phase S4: Cut over unfinished catalog entries
_Story ref: spec.md#story-s4_

- [x] Task: Define query deep-link and catalog-cutover contracts (c378c3cc)
  - [x] Require `/qc?cartridge=astral-mage|sorcerer-ziggurat` selection and unknown-ID fallback (c378c3cc)
  - [x] Require playable catalog cards only after reachable QC launches while authoritative completion remains excluded (c378c3cc)
- [x] Task: Add Red deep-link, card, and completion-boundary guards (c378c3cc)
  - [x] Prove both cards resolve to working shared-package cartridges and no nonexistent legacy route (c378c3cc)
  - [x] Preserve rejection at the server completion boundary until production persistence exists (c378c3cc)
- [x] Task: Implement QC deep links and catalog card cutover (c378c3cc)
  - [x] Synchronize selected public ID with the query string without leaking canvases (c378c3cc)
  - [x] Mark only the two completed cards playable and retain both covers (c378c3cc)
- [x] Task: Run final W1 acceptance and update graph/evidence (c378c3cc)
  - [x] Run package, host, QC, browser, build, architecture, no-copy, and Measure gates (c378c3cc)
  - [x] Record exact retained/deleted/deferred surfaces and successor ownership (c378c3cc)
- [x] Task: Measure - User Manual Verification 'Phase S4: Cut over unfinished catalog entries' — approved 2026-07-10 (6ca2220c)
