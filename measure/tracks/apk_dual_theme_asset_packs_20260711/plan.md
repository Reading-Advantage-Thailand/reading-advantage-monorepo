# Implementation Plan: APK Dual-Theme Production Asset Packs

> **Track ID:** `apk_dual_theme_asset_packs_20260711`
> **Predecessors:** `advantage_play_kit_20260710`, `apk_catalog_cutover_w0_20260710`, `apk_incomplete_sentence_action_20260710`, `apk_advantage_games_arcade_host_w2_20260710`, `apk_runner_traversal_wave_w3_20260711`, `apk_arena_target_action_wave_w4_20260711`

## Phase S1: Freeze production asset contracts
_Story ref: spec.md#story-s1_
_Blast radius: `GAMEPLAY_ASSET_SLOTS`, `CartridgeEdition`, `preloadSemanticAssets`, and all cartridge `requiredAssetSlots`._

- [x] Task: Reconcile the dual-theme specification with the live 40-slot APK inventory — `22bc7ae9`
- [x] Task: Add Red manifest parity, provenance, path-safety, budget, and placeholder-rejection tests — `e912b455`
- [~] Task: Define versioned pack manifests and deterministic validation tooling
- [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze production asset contracts' (Protocol in workflow.md)

## Phase S2: Produce both theme packs
_Story ref: spec.md#story-s2_

- [ ] Task: Generate and normalize the Chibi Quest asset set
- [ ] Task: Generate and normalize the Riven Lands asset set
- [ ] Task: Record paired-file inventory, dimensions, byte size, hashes, and provenance
- [ ] Task: Measure - User Manual Verification 'Phase S2: Produce both theme packs' (Protocol in workflow.md)

## Phase S3: Integrate assets into cartridges
_Story ref: spec.md#story-s3_
_Blast radius: edition manifests, semantic preloader, 14 cartridge scenes, QC host, and production arcade host._

- [ ] Task: Replace both procedural edition manifests with local pack manifests
- [ ] Task: Add a shared semantic texture presentation helper
- [ ] Task: Adopt semantic textures in every current cartridge family without edition branches
- [ ] Task: Measure - User Manual Verification 'Phase S3: Integrate assets into cartridges' (Protocol in workflow.md)

## Phase S4: Verify production presentation
_Story ref: spec.md#story-s4_

- [ ] Task: Run manifest, package, coverage, lint, type, build, graph, and Measure gates
- [ ] Task: Run the 28-combination boot matrix plus desktop/mobile interaction flows
- [ ] Task: Capture Kimi WebBridge evidence and complete independent review remediation
- [ ] Task: Measure - User Manual Verification 'Phase S4: Verify production presentation' (Protocol in workflow.md)
