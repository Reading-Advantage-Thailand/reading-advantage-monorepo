# Specification: APK Dual-Theme Production Asset Packs

## Overview

The APK runtime and W0-W4 cartridges are functionally accepted, but both audience editions still resolve every semantic slot to procedural proof artwork. This track makes the APK product-complete by producing and integrating the two packs defined in `/home/daniel-bo/Desktop/pixel-art-benchmark/dual_theme_asset_specification.md`:

- **Chibi Quest** for `primary-chibi`;
- **Riven Lands** for `secondary-epic`.

Both packs share semantic identities, filenames, dimensions, anchors, and collision contracts. Assets enter through the existing edition manifest and Phaser preload boundary. Cartridge source must never branch on edition IDs or embed pack paths.

## Stories

### Story S1: Freeze production asset contracts
**As a** game-platform developer
**I want** an exact, validated dual-pack manifest
**So that** placeholder removal is measurable and pack swaps cannot silently break gameplay.

**Acceptance Criteria:**
- Given all 40 current `GAMEPLAY_ASSET_SLOTS`, When the asset inventory is validated, Then both packs provide one versioned raster asset for every slot with matching dimensions and stable relative filenames.
- Given an imported asset, When provenance is reviewed, Then its creator, source, license, generation method, version, encoded format, dimensions, and byte size are recorded.
- Given a production edition, When its manifest is validated, Then no asset has type `procedural`, no URL is missing, and no path escapes the versioned pack root.
- Given either pack, When transparent art is inspected, Then magenta generation backgrounds and unsafe edge halos are absent.

**Estimate:** L
**Priority:** Must

### Story S2: Produce both theme packs
**As a** product owner
**I want** complete Chibi Quest and Riven Lands artwork
**So that** Primary and Secondary students receive intentional, cohesive presentation rather than code-drawn placeholders.

**Acceptance Criteria:**
- Given the approved dual-theme specification, When pack assets are generated, Then Chibi Quest uses bright rounded child-safe silhouettes and Riven Lands uses mature restrained fantasy silhouettes without gore.
- Given paired semantic assets, When compared, Then they depict the same gameplay role and retain compatible bounds while remaining visually distinct.
- Given raster outputs, When normalized, Then transparent padding, dimensions, compression, and pixel-art scaling satisfy the import contract.
- Given pack files, When repository checks run, Then every file is deterministic, local, versioned, and included in the asset inventory.

**Estimate:** XL
**Priority:** Must

### Story S3: Integrate assets into cartridges
**As a** student
**I want** every current cartridge to use its audience artwork
**So that** switching editions changes the complete visual presentation without changing educational behavior.

**Acceptance Criteria:**
- Given either edition, When a cartridge preloads its required slots, Then Phaser loads local pack URLs and reports actionable failures for missing or undecodable files.
- Given the 14 current cartridges, When their scenes create backgrounds, heroes, targets, enemies, terrain, projectiles, effects, and UI, Then available semantic textures replace the corresponding procedural primitives.
- Given an edition switch, restart, resize, or navigation, When the runtime remounts, Then one canvas remains and no stale texture, listener, or animation survives.
- Given asset presentation changes, When result tests run, Then learning input, correctness, score, XP display, completion, and server authority remain unchanged.

**Estimate:** XL
**Priority:** Must

### Story S4: Verify production presentation
**As a** product owner
**I want** exhaustive automated and real-browser evidence
**So that** the APK is not called complete until both packs are readable, performant, and visually accepted.

**Acceptance Criteria:**
- Given all 14 cartridges and both editions, When automated asset and browser matrices run, Then all 28 combinations boot with zero procedural assets, zero missing textures, one canvas, and no horizontal overflow.
- Given desktop and `390x844` viewports, When representative keyboard, pointer, and touch loops complete, Then prompts, targets, HUD, feedback, and results remain readable.
- Given pack transfer and decode metrics, When budgets are checked, Then each individual asset is at most 512 KiB, each pack is at most 12 MiB, and no cartridge preloads slots it does not require.
- Given final Kimi WebBridge screenshots, When an independent reviewer compares both editions, Then no Critical, High, or Medium finding remains and explicit visual acceptance is recorded.

**Estimate:** XL
**Priority:** Must

## Non-Functional Requirements

- PNG or WebP source art must preserve transparency and crisp scaling; JPEG is forbidden for transparent gameplay assets.
- Assets remain local and versioned under `apps/advantage-games/public/assets/apk/<pack>/v1/`.
- Manifests are browser-safe data and contain no runtime dependency on MMX, Pixel Art Benchmark, or another authoring tool.
- Tests cover manifest parity, provenance, dimensions, byte budgets, path safety, placeholder rejection, loader dispatch, and cartridge-required-slot coverage.
- All affected lint, type-check, unit, coverage, build, graph, browser, and Measure gates must pass.

## Track-Level Acceptance Criteria

- Chibi Quest and Riven Lands each contain all 40 current semantic assets.
- `primaryChibiEdition` and `secondaryEpicEdition` contain zero procedural assets.
- Both editions are visibly distinct and all 14 cartridges use real pack textures.
- The 28-combination boot matrix and scoped interaction flows pass on desktop and mobile.
- Kimi evidence and independent review accept the result with no Critical, High, or Medium finding.

## Out of Scope

- Migrating the 13 remaining legacy game cards to APK.
- Replacing the stable educational or completion ABI.
- Three.js/R3F or KayKit GLB integration.
- Per-game bespoke art that cannot be expressed through the shared semantic pack contract.
