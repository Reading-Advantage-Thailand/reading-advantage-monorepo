# Specification: APK Dual-Theme Sprite Asset Packs

## Overview

The APK runtime and W0-W4 cartridges are functionally accepted, but their two
audience editions still resolve gameplay presentation to procedural proof art.
This track imports and integrates the two interchangeable Phaser sprite packs
defined by `/home/daniel-bo/Desktop/pixel-art-benchmark/dual_theme_asset_specification.md`:

- **Chibi Quest** for `primary-chibi`;
- **Riven Lands** for `secondary-epic`.

This is not a one-image-per-semantic-slot project. The production units are
fixed-layout character sprite sheets, Wang autotile sheets, animated prop and
VFX strips, static icons and portraits, UI slices, and parallax layers. The two
themes must mirror physical filenames, frame grids, anchors, and collision
contracts so the runtime can swap only the pack prefix.

## Non-negotiable source contracts

- Top-down characters: 512x1024 PNG, 4x8 cells, 128x128 per frame, 32 frames.
- Side-scroll characters: 512x512 PNG, 4x4 cells, 128x128 per frame, 16 frames.
- Character origin: bottom-center `(0.5, 1.0)`.
- Character physics: `setSize(32, 48)` and `setOffset(48, 80)`.
- Wang autotiles: 256x256 PNG, 4x4 cells, 64x64 per tile, 16 edge-mask frames.
- Animated props: exact fixed-size strips (`chest` and `torch` are 4x1 at
  64x64 per frame); VFX are 4-frame 128x128 strips.
- Generation background: one flat `#ff00ff` chroma field, never a checkerboard
  or simulated transparency.
- Delivery masters: lossless PNG with real alpha after chroma cleanup. Any web
  derivative is secondary and must preserve frame boundaries exactly.

## Stories

### Story S1: Freeze the physical and semantic contracts

**As a** game-platform developer
**I want** the source-pack grid layouts and APK semantic bindings specified
**So that** a pack cannot pass by supplying attractive but unusable still images.

**Acceptance Criteria:**

- The physical manifest lists every required file, kind, dimensions, cell size,
  grid, frame count, frame ordering, origin, and collision metadata.
- Chibi Quest and Riven Lands have identical physical manifest structure.
- Semantic bindings may select a whole image, a spritesheet plus animation frame
  ranges, an autotile sheet, or a named static frame; they are not assumed to be
  one unique raster file per slot.
- View-dependent roles distinguish top-down and side-scroll sheets. A single
  undifferentiated `player.hero` binding may not conceal incompatible view grids.
- The current APK loader and scene usage are audited against the required frame
  contract before the manifest shape is changed.

### Story S2: Repair the inspection and import pipeline

**As an** asset producer
**I want** deterministic assembly and runtime inspection tooling
**So that** generated motion is evaluated as animation rather than as a contact sheet.

**Acceptance Criteria:**

- Built-in image generation produces reference-consistent frames or short strips
  on solid magenta; no MMX generator is used.
- A deterministic assembler crops and scales frames without interpolation,
  keys magenta to alpha, and writes exact grid dimensions.
- The Theme Bench reads the canonical 4x8 and 4x4 frame maps; its current 3x3
  assumptions are corrected before it is used as acceptance evidence.
- Character inspection supports frame stepping, animation playback, grid and
  anchor overlays, and collision-box overlays.
- Automated validation rejects wrong dimensions, wrong frame counts, non-alpha
  masters, magenta residue, cross-cell bleed, and mismatched paired-theme grids.

### Story S3: Produce both complete mirrored packs

**As a** student
**I want** cohesive audience-appropriate animated artwork
**So that** Primary and Secondary editions are visibly intentional while playing identically.

**Acceptance Criteria:**

- All character and enemy sheets animate with stable identity, equipment,
  silhouette, scale, baseline, and facing across frames.
- All 16 Wang edge masks connect correctly in generated maps.
- Props and VFX animate without jumps, clipping, or background halos.
- Static art and UI satisfy their exact size/slice contracts.
- Every existing asset is manually inspected before reuse or rejection; the
  decision and evidence are recorded in `asset-inventory.md`.
- Source, generator, prompt lineage, license, dimensions, byte size, hash, and
  rejection/replacement history are recorded for every delivered file.

### Story S4: Bind the sprite packs to APK cartridges

**As a** cartridge author
**I want** semantic animation and frame bindings
**So that** scenes can use the correct theme without theme branches or hard-coded paths.

**Acceptance Criteria:**

- Edition manifests contain no `procedural` production bindings.
- Phaser preloads each physical source once per scene and exposes stable semantic
  animation names and static frame bindings.
- Each cartridge requests the correct top-down, side-scroll, isometric, static,
  animated-prop, VFX, UI, and background roles for its presentation.
- Scene actors use animations where the source contract defines animation;
  defaulting every spritesheet to frame zero is not accepted.
- Edition switching changes only the pack prefix and leaves educational input,
  correctness, results, scoring, and server authority unchanged.

### Story S5: Verify the delivered system

**As a** product owner
**I want** automated, animated, and real-browser evidence
**So that** the APK is not called complete while sprite motion or theme swapping is broken.

**Acceptance Criteria:**

- Structural validators pass for every physical file and both mirrored manifests.
- Theme Bench verifies every animation cycle, Wang mask, prop strip, and theme swap.
- All 14 current cartridges boot in both editions with no missing textures,
  missing animation keys, procedural fallbacks, decode errors, or extra canvases.
- Desktop and 390x844 interaction loops keep prompts, targets, HUD, feedback,
  and results readable.
- Kimi WebBridge is used for manual browser verification and screenshots.
- Independent review leaves no Critical, High, or Medium finding open.

## Out of Scope

- Audio production; the visual pack manifest may retain the existing separately
  sourced audio-event contract.
- Migrating the 13 remaining legacy game cards to APK.
- Replacing the stable educational or completion ABI.
- Three.js/R3F or GLB assets.
