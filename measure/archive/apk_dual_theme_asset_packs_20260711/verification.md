# APK Dual-Theme Asset Pack Verification

Verification is pending implementation. This file will record exact commands,
pack metrics, animation and autotile inspection results, the 28-combination
browser matrix, Kimi evidence paths, and the final independent-review verdict.

## Preliminary contract audit — 2026-07-11

- `SemanticAsset.type` and `preloadSemanticAssets()` provide Phaser loader
  dispatch, including a generic `spritesheet` branch.
- The edition schema has no animation-definition contract, directional frame
  map, origin, collision box, source-file identity, shared-source binding, static
  frame selection, or view-variant model.
- `GAMEPLAY_ASSET_SLOTS` exposes one view-ambiguous `player.hero` role even though
  the source pack requires separate `knight_top.png` and `knight_side.png` sheets.
- Current production scenes generally create semantic hero textures as static
  images; a loaded spritesheet would therefore display a default frame rather
  than fulfilling the specified animation contract.
- Both editions map all required slots to `procedural`, and those entries pass
  required-slot validation. Slot presence therefore did not prove asset delivery.
- The archived foundation's S3 claim that it provided every required semantic
  animation/presentation slot is not supported by the implementation.

Status: the educational/runtime foundation remains useful, but the production
asset ABI is incomplete and is a blocking defect owned by this remediation track.


## Scoped teardown verification — 2026-07-11

Removed:

- all 14 cartridge implementations, family helpers, blueprints, tests, catalog
  entries, dynamic loaders, and procedural editions from the cartridge package;
- Advantage Games APK production arcade routes and QC lab;
- the W2/W4/QC Playwright suites that asserted those invalid product surfaces;
- Reading and Primary cross-host smoke modules built against the invalid catalog;
- playable catalog links and login redirects into the removed arcade routes.

Retained:

- the independent `@reading-advantage/game-contracts` educational I/O ABI;
- server-authoritative completion code for future compliant cartridges;
- legacy games and unrelated application work;
- an empty `@reading-advantage/game-cartridges` quarantine package that exposes
  no cartridge or loader.

Evidence:

| Gate | Result |
|---|---|
| Quarantine Vitest | 1 file, 1 test passed |
| Quarantine TypeScript | Passed |
| Advantage Games focused Jest | 5 suites, 20 tests passed |
| Advantage Games TypeScript | Passed after `next typegen` removed stale generated route references |
| Scoped ESLint | Cartridge package and affected Advantage Games files passed |
| Advantage Games production build | Passed; route table contains no `/qc` or `/student/arcade/*` route |

The remaining `/api/v1/apk/complete` endpoint is retained only as independently
tested server-authoritative completion infrastructure. It does not expose a game,
edition, asset, catalog, or client route.


## Physical sprite asset ABI checkpoint — 2026-07-11

The retained APK runtime now validates a production physical-pack model instead
of generic loader records:

- physical file IDs and safe versioned pack-relative paths;
- immutable PNG metadata, alpha, byte size, SHA-256, provenance, and dimensions;
- exact 4x8 top-down and 4x4 side-scroll 128px character grids;
- exact directional/action frame sequences and playback metadata;
- bottom-center origin and 32x48 body at offset 48x80;
- exact 4x4 64px Wang grid with bitmasks zero through fifteen;
- view-specific semantic bindings to image, frame, animation, tileset, or
  nine-slice usage;
- one physical preload for multiple semantic bindings;
- deterministic Phaser texture and animation keys;
- exact paired-theme parity across file paths, dimensions, grids, animations,
  origins, collisions, Wang masks, UI insets, and semantic bindings;
- schema rejection of `procedural` as a physical production kind.

Evidence:

| Gate | Result |
|---|---|
| Focused edition/asset contract | 10 tests passed |
| Complete Advantage Play Kit suite | 6 files, 27 tests passed |
| TypeScript check | Passed |
| Package build | Passed |
| Package ESLint | Passed |
| Graph update | 8 files updated; 58 to 150 nodes and 71 to 162 edges |

No cartridge is reintroduced by this checkpoint. The empty public catalog remains
the guard until physical assets and the corrected inspection pipeline exist.


## Exhaustive production inventory checkpoint — 2026-07-11

The earlier physical ABI could validate files presented to it but did not define
the complete pack. That gap is now closed by an executable 75-file requirement
for each audience pack (150 PNGs across the pair).

Contract decisions made explicit:

- separate 4x8 top-down and 4x4 side-scroll sheets for all four heroes, four
  standard enemies, and three NPCs;
- one 256x256 static boss sprite plus the required boss portrait;
- seven exact 16-mask Wang sheets, including 512x256 isometric sheets with
  128x64 cells;
- exact chest, torch, spike, door, and VFX animation grids, including spike
  yoyo playback;
- view-neutral `world` assets for props and VFX instead of falsely labeling
  them as one camera projection;
- exact dimensions and slice insets for all ten UI files;
- all five 1280x720 parallax layers.

Evidence:

| Gate | Result |
|---|---|
| Complete Advantage Play Kit suite | 7 files, 31 tests passed |
| Exhaustive inventory tests | 4 tests passed; 75 unique IDs and paths |
| TypeScript check | Passed |
| Package ESLint | Passed |
| Existing asset enumeration | Zero retained image files |
| Kimi WebBridge | Blocked before navigation: daemon started, browser extension reported `no extension connected` |

The Kimi failure is not waived. Theme Bench manual acceptance remains open.
