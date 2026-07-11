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
