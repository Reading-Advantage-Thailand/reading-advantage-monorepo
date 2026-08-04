# Specification: APK Audio Cohort Release Acceptance

## Context

The standard-pack ingestion was image-only; `Sound Effects.zip` (241 sounds,
OGG canonical) was silently skipped. The import is now complete in the
worktree: 241 OGG files under `packages/advantage-play-kit/assets/standard/audio/native/<pack>/`,
`IMPORT-RECEIPT.tsv` 43,068 → 43,309 rows, `standard-pack-release.json`
regenerated (43,075 → 43,316 assets).

- Old accepted release: `2026.07.23`, catalogDigest `ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087`, sourceReceiptDigest `93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9`, artifact sha `ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932`, assetCount 43,075.
- New release: `2026.08.04`, catalogDigest `cd238d3310cf9136ca331ae1f20f9214e5ae3a59dfa10539f47234fff5ba751f`, sourceReceiptDigest `c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c`, artifact sha `41a8b13996f099cea7eedb84bce37c2b68fc5328ae6e768abd4d05058f378374`, assetCount 43,316.

## Owner decision (2026-08-04)

**Option B — new additive version.** No in-place re-cut of `2026.07.23`.
The change is purely additive; frozen releases remain immutable; the
competition template already cites `2026.08.04` / `cd238d33…`.

## Functional requirements

- FR-1: `accepted-standard-pack-release.ts` binds version `2026.08.04` with the
  new digests and `assetCount: 43_316`.
- FR-2: Every pinned reference to the old release identity (literal types,
  fixtures, guards, editions, react gallery test, scaffolding exemplar,
  capability manifest) advances to `2026.08.04` / new digests, enumerated by
  grepping `2026.07.23`, `ac801bae`, and `43_075` across the package.
- FR-3: Suitability evidence pins (`CATALOG_SHA256`, `IMPORT_RECEIPT_SHA256`)
  in `existing-core-suitability.ts`, `existing-action-suitability.ts`,
  `legacy-defense-suitability.ts` advance to the new artifact/receipt hashes;
  `CURATED_RECEIPT_SHA256` pins are unchanged (curated receipt untouched).
- FR-4: The audio import worktree state (241 files + receipts + catalog) is
  committed atomically as part of this track.
- FR-5: Scoped verification only: named asset/systems/scaffolding/guards test
  files + `verify:standard-pack-parity`. Package-wide `tsc`/`vitest` is
  explicitly not a gate (other agent owns editions/react/runtime mid-flight).

## Non-goals

- No changes to `src/editions/editions.ts`, `src/editions/required-pack.ts`,
  `src/react/apk-game-host.tsx`, `src/runtime/*` (other track's files).
- No audio role bindings into production cartridges (Track 2 candidate).
- No re-import or re-curation of image assets.
