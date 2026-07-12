# Implementation Plan: APK Dual-Theme Sprite Asset Packs

> **Track ID:** `apk_dual_theme_asset_packs_20260711`
> **Source contract:** `/home/daniel-bo/Desktop/pixel-art-benchmark/dual_theme_asset_specification.md`

## Phase S0: Tear down the invalid APK product surface

- [x] Task: Record the asset-ABI closeout failure and invalidate the production
  completion claim — `eddf99d7`
- [x] Task: Remove all 14 invalid cartridge catalog entries, dynamic loaders,
  production arcade routes, QC exposure, and cross-host smoke claims
- [x] Task: Remove the cartridge implementations and procedural edition manifests
  built against the invalid contract
- [x] Task: Retain only the stable educational I/O contracts and any independently
  verified Phaser lifecycle primitives; no old asset or cartridge API is grandfathered
- [x] Task: Add an empty-catalog guard proving no cartridge is re-exposed
  before it passes the new sprite asset ABI
- [ ] Task: Measure - User Manual Verification 'Phase S0' (Protocol in workflow.md)

## Phase S1: Freeze physical sheets and semantic bindings

- [x] Task: Audit the source specification, existing assets, Theme Bench, APK
  loader, edition manifests, and every cartridge asset consumer
- [x] Task: Define a typed physical pack manifest for sheets, frame grids,
  animations, autotiles, static art, UI slices, and parallax layers
- [x] Task: Define view-specific semantic bindings from cartridge roles to
  physical files, frames, and animations
- [x] Task: Freeze the exhaustive 75-file-per-theme production inventory with
  exact paths, dimensions, grids, playback, view, slice, and parity metadata
- [x] Task: Replace the invalid one-WebP-per-slot Red test with contract tests for
  grid parity, frame maps, loader deduplication, and semantic animation bindings
- [ ] Task: Measure - User Manual Verification 'Phase S1' (Protocol in workflow.md)

## Phase S2: Repair deterministic processing and inspection

- [ ] Task: Add validators for dimensions, grids, alpha, chroma residue,
  cross-cell bleed, paired-theme parity, hashes, and byte budgets
- [x] Task: Add deterministic frame/strip assembly around the existing chroma
  cleanup strategy, preserving nearest-neighbor pixel boundaries
- [x] Task: Correct Theme Bench character animation maps from the erroneous 3x3
  assumptions to the canonical 4x8 top-down and 4x4 side-scroll contracts
- [ ] Task: Verify frame stepping, playback, anchor, collision, autotile, prop,
  VFX, and theme-swap inspection paths
- [ ] Task: Measure - User Manual Verification 'Phase S2' (Protocol in workflow.md)

## Phase S3: Produce the minimum playable paired set

- [ ] Task: Generate one approved identity/reference pose per theme on solid magenta
- [ ] Task: Generate and assemble `knight_top` and `skeleton_top` as exact 4x8
  sprite sheets, inspecting every frame and every animation cycle
- [ ] Task: Generate and verify `dungeon_floor` and `dungeon_walls` as exact
  16-mask Wang sheets
- [ ] Task: Generate and verify the animated `chest` and `torch` strips plus
  `key_gold`, `healthbar`, `panel_9slice`, and `dialog_frame`
- [ ] Task: Run the paired-theme top-down smoke scene and hot-swap verification
- [ ] Task: Measure - User Manual Verification 'Phase S3' (Protocol in workflow.md)

## Phase S4: Complete both mirrored physical packs

- [ ] Task: Produce side-scroll hero/enemy sheets, forest tiles, parallax layers,
  and required combat VFX
- [ ] Task: Produce remaining heroes, enemies, boss, NPCs, and portraits
- [ ] Task: Produce remaining tilesets, props, items, VFX, UI, and backgrounds
- [ ] Task: Record prompt lineage, manual-inspection disposition, dimensions,
  alpha/chroma result, hashes, byte size, and provenance for every file
- [ ] Task: Run exhaustive animation, autotile, slice, and theme-parity QC
- [ ] Task: Measure - User Manual Verification 'Phase S4' (Protocol in workflow.md)

## Phase S5: Integrate sprite semantics into APK

- [ ] Task: Extend the edition manifest and semantic preloader for physical-file
  deduplication, frame selection, and stable animation definitions
- [ ] Task: Replace global view-ambiguous roles with cartridge-appropriate
  top-down, side-scroll, isometric, static-frame, and animation bindings
- [ ] Task: Adopt the semantic sprite bindings in all current cartridge families
  without edition branches or authoring-tool runtime dependencies
- [ ] Task: Prove educational and result ABI parity
- [ ] Task: Measure - User Manual Verification 'Phase S5' (Protocol in workflow.md)

## Phase S6: Full verification and closeout

- [ ] Task: Run scoped tests, coverage, lint, type-check, build, graph, and
  Measure validation gates
- [ ] Task: Run the 28-edition/cartridge boot matrix and desktop/mobile
  interaction matrix
- [ ] Task: Use Kimi WebBridge to manually inspect animation, theme swapping,
  readability, responsiveness, console output, and final result flows
- [ ] Task: Complete independent review and remediate every Critical, High, and
  Medium finding
- [ ] Task: Measure - User Manual Verification 'Phase S6' (Protocol in workflow.md)
