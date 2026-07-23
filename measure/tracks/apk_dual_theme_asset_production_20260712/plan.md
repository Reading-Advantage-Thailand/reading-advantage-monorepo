# Implementation Plan: APK Standard Asset Library Contract and Production

> **Track ID:** `apk_dual_theme_asset_production_20260712` (historic identifier retained)
> **Scope decision (2026-07-23):** the purchased ElvGames library replaces the
> dual-theme and generated-art plan. This track implements the shared asset
> foundation only; game adoption remains out of scope.

## Phase 0: Rebase the asset decision and source contract [checkpoint: pending]

- [x] Task: Replace the dual-theme/generation premise in the APK program, registry,
  specification, and technical architecture with the single licensed standard library
- [x] Task: Record attribution, source-archive, and runtime-exclusion rules
- [x] Task: Define the filesystem taxonomy and semantic-key grammar

## Phase 1: Implement filesystem-first discovery [checkpoint: pending]

- [x] Task: Write red contract tests for valid semantic paths, cell-size semantics,
  invalid paths, unsupported formats, duplicate keys, and runtime-safe resolution
- [x] Task: Implement the browser-safe asset-path parser, key creator, and catalog validator
- [x] Task: Export the contract from `@reading-advantage/advantage-play-kit/assets`

## Phase 2: Ingest the first curated standard batch [checkpoint: pending]

- [x] Task: Create the standard library root, source/license record, attribution copy,
  and semantic-directory README
- [x] Task: Ingest representative ElvGames UI, item, VFX, top-down, side-view, and audio assets
- [x] Task: Verify dimensions, paths, source records, and public contract coverage

## Phase 3: Continue bounded semantic ingestion [checkpoint: pending]

- [x] Task: Import every PNG from every top-level and nested purchased archive by view,
  inferred cell size, and source-derived semantic category; preserve every source record
- [x] Task: Verify the import receipt exactly covers every discovered PNG (43,068) and retain
  source duplicates until an explicit deduplication decision
- [ ] Task: Add derived build-time indexing only when the complete imported tree is large
  enough to require it; the filesystem remains authoritative
- [ ] Task: Open separate cartridge adoption work only after the shared-kit and
  acceptance dependencies authorize game integration
