# Implementation Plan: APK Standard Asset Library Contract and Production

> **Track ID:** `apk_dual_theme_asset_production_20260712` (historic identifier retained)
> **Scope decision (2026-07-23):** the purchased ElvGames library replaces the
> dual-theme and generated-art plan. This track implements the shared asset
> foundation only; game adoption remains out of scope.

## Phase 0: Rebase the asset decision and source contract [checkpoint: c21e402]

- [x] Task: Replace the dual-theme/generation premise in the APK program, registry,
  specification, and technical architecture with the single licensed standard library (c21e402)
- [x] Task: Record attribution, source-archive, and runtime-exclusion rules (c21e402)
- [x] Task: Define the filesystem taxonomy and semantic-key grammar (c21e402)

## Phase 1: Implement filesystem-first discovery [checkpoint: c21e402]

- [x] Task: Write red contract tests for valid semantic paths, cell-size semantics,
  invalid paths, unsupported formats, duplicate keys, and runtime-safe resolution (c21e402)
- [x] Task: Implement the browser-safe asset-path parser, key creator, and catalog validator (c21e402)
- [x] Task: Export the contract from `@reading-advantage/advantage-play-kit/assets` (c21e402)

## Phase 2: Ingest the first curated standard batch [checkpoint: c21e402]

- [x] Task: Create the standard library root, source/license record, attribution copy,
  and semantic-directory README (c21e402)
- [x] Task: Ingest representative ElvGames UI, item, VFX, top-down, side-view, and audio assets (c21e402)
- [x] Task: Verify dimensions, paths, source records, and public contract coverage (c21e402)

## Phase 3: Complete the purchased-library import [checkpoint: f25ee0d]

- [x] Task: Import every PNG from every top-level and nested purchased archive by view,
  inferred cell size, and source-derived semantic category; preserve every source record (f25ee0d)
- [x] Task: Verify the import receipt exactly covers every discovered PNG (43,068) and retain
  source duplicates until an explicit deduplication decision (f25ee0d)

The complete import makes derived build-time indexing necessary, so Phase 4 owns
that implementation while the filesystem remains authoritative. Import completion
does not authorize game integration or a private production-art tree.

## Phase 4: Generate and verify the canonical-pack release [checkpoint: pending]

- [x] Task: Define the deterministic catalog/index and release schema rooted at
  `packages/advantage-play-kit/assets/standard/`, including pack version, catalog
  digest, source-receipt digest, typed physical metadata, and attribution binding
- [x] Task: Write Red contract tests for deterministic catalog bytes, stable
  semantic resolution, stale digest rejection, duplicate/missing keys, unsafe
  physical paths, and filesystem/catalog/source-receipt parity
- [x] Task: Implement the browser-safe typed resolver and generated catalog/index;
  retain the filesystem as source of truth and prohibit runtime filesystem reads
- [x] Task: Build a searchable browser gallery and Advantage Games QC asset view
  from the generated catalog without exposing vendor paths as cartridge APIs
- [x] Task: Implement a build materializer that accepts validated cartridge
  semantic requirements and emits only their deduplicated selected asset union
- [x] Task: Add static/build guards rejecting direct physical imports, private pack
  trees, unpinned releases, source-root escapes, and materialized files outside
  the selected union

## Phase 5: Accept the standard-pack release [checkpoint: pending]

- [x] Task: Verify the release catalog, source receipt, filesystem, materialized
  union, resolver metadata, and attribution records reconcile exactly
- [x] Task: Run focused unit, browser/QC, build-materializer, lint, type, package-
  boundary, and generated-artifact gates; no per-file visual review of all 43,068
  imported PNGs is a release prerequisite
- [x] Task: Publish an accepted versioned pack-release record with catalog and
  source-receipt digests, required credit text, and downstream consumption rules
- [x] Task: Expose the accepted release as the prerequisite for T9 canonical
  adoption mapping, T10 pack-binding acceptance, shared-kit implementation,
  cartridge readiness, host cutover, and future-game scaffold adoption
