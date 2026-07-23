# Specification: APK Standard Asset Library Contract and Production

## Overview

APK will use the purchased ElvGames pixel-art collection as the single standard
visual library for all present and future mini-games. This replaces the previous
two-theme, generated-art plan. The work establishes a curated, filesystem-first
library rather than making every game choose a visual style or maintain a private
asset folder.

The library's source of truth is its directory tree. A file path encodes its stable
semantic key, projection/view, intended cell size, and semantic category. Build-time
generated indexes are allowed as derived artifacts; an application database or a
hand-maintained monolithic JSON manifest is not.

## Source, license, and credit

- Source archives are the purchased `Asset Packs/` ElvGames collection.
- Every ingested asset retains its source archive and included license record.
- Shipped APK games and customer applications that use the library display the
  credit `Pixel art assets by ElvGames` in their shared Credits/About or end screen.
- The library does not resell, relicense, or claim ownership of the source assets.
- Windows creator tools, engine cache files, executables, and engine-specific
  project metadata are not runtime APK assets.

## Stories

### Story S1: Define the standard filesystem contract

**As a** game developer
**I want** assets to have stable paths and semantic keys
**So that** every mini-game can reuse consistent art without a database lookup.

Acceptance criteria:

- The canonical path is `<view>/<cell-size>/<semantic-category...>/<asset-name>.<ext>`.
- `top-down`, `side-view`, `ui`, `world`, `effects`, `audio`, and `font` are
  supported views; cell size is a grid/cell declaration such as `8x8`, `16x16`,
  or `32x32`, not the outer PNG dimensions.
- Semantic keys are the normalized relative path without the extension.
- The library validates safe paths, supported extensions, normalized names,
  view/cell-size combinations, and duplicate semantic keys.
- The contract supports animation sheets, tile sheets, static sprites, UI assets,
  audio, and fonts without incorrectly treating a sheet's full image dimensions as
  its cell size.

### Story S2: Curate a licensed APK-standard source library

**As a** platform maintainer
**I want** selected source assets organized under the standard filesystem contract
**So that** cartridges can browse and adopt approved assets consistently.

Acceptance criteria:

- Ingestion excludes executable tools, engine caches, generated project metadata,
  duplicate engine exports, and raw nested archive bundles.
- The initial library contains representative UI, item, VFX, top-down, side-view,
  and audio assets, each in a semantic directory with a source record.
- The source license and the required ElvGames credit are retained beside the library.
- Broader ingestion proceeds in bounded semantic batches; source files are never
  dumped into individual games.

### Story S3: Expose a browser-safe discovery contract

**As a** cartridge author
**I want** to validate and resolve standard asset keys
**So that** game code uses stable semantics instead of vendor filenames or ad-hoc paths.

Acceptance criteria:

- `@reading-advantage/advantage-play-kit/assets` exports parsing and validation
  helpers for standard asset paths and keys.
- The helpers do not read the server filesystem at runtime.
- Tests cover valid keys, grid-size semantics, invalid paths, unsafe traversal,
  unsupported formats, and duplicate-key detection.

## Out of scope

- Migrating existing games to the library.
- Rebuilding cartridge mechanics, educational rules, or host integrations.
- A second audience theme, generated artwork, SVG replacement art, or a new 3D
  sprite-production workflow.
- Treating preliminary source filenames as final gameplay semantics without curation.
