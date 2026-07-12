# APK Asset System Program

## Objective

Build a reusable semantic asset system from the actual needs of the games that
already exist or are in development, produce two mirrored visual themes for
that system, and rewrite games against it in bounded cohorts.

The program does **not** preserve accidental legacy filenames or sprite-sheet
layouts. It also does **not** begin from a generic fantasy-art shopping list.

## Dependency order

```text
Game implementations and game specifications
                  |
                  v
Cross-game usage matrix and normalized asset ontology
                  |
                  v
Gameplay gap analysis and accepted variants
                  |
                  v
Type-specific physical contracts and production batches
                  |
                  v
Mirrored Chibi Quest and Riven Lands assets
                  |
                  v
Bounded cartridge rewrite cohorts and production verification
```

## Tracks

1. [`apk_cross_game_asset_ontology_20260712`](./tracks/apk_cross_game_asset_ontology_20260712/)
   inventories the complete game corpus, records asset usage by scene, normalizes
   reusable semantic types, and identifies justified gaps and variants.
2. [`apk_dual_theme_asset_production_20260712`](./tracks/apk_dual_theme_asset_production_20260712/)
   turns the accepted ontology into type-specific physical contracts and
   produces mirrored assets in coverage-driven batches.
3. [`apk_cartridge_semantic_rewrite_20260712`](./tracks/apk_cartridge_semantic_rewrite_20260712/)
   opens and governs bounded cartridge-cohort tracks that consume the accepted
   semantic assets without hard-coded theme paths or procedural production art.

Tracks 2 and 3 remain blocked until Track 1 receives explicit product-owner
acceptance. Asset generation cannot be used to discover requirements after the
fact.

## Source corpus

The baseline includes all 27 entries currently declared in
`apps/advantage-games/src/lib/gameCards.ts`, the archived APK W0-W4 mechanics
and baselines, current playable implementations, and active/in-development game
tracks such as Babel Architect. Track 1 must reconcile discrepancies between
catalog status, source availability, route availability, and Measure claims.

## Asset modeling rules

- An **asset type** describes a reusable gameplay or presentation capability.
- A **gameplay variant** exists only when behavior, strength, movement, attack,
  scale, collision/readability, or scene function requires a distinguishable
  identity.
- A **theme treatment** is the Chibi Quest or Riven Lands visual expression of
  the same accepted semantic asset; it is not a new gameplay variant.
- Environment assets are organized into reusable kits such as plains, ruins,
  dungeons, forests, castles, or other settings proven by game usage.
- Physical sheets, atlases, strips, static images, tiles, and slice dimensions
  are selected after the semantic type and required states are known.
- Every ontology entry must trace to a real game/scene or an explicitly accepted
  cross-game gap. No orphan assets are produced.

## Change control

If a cartridge rewrite discovers an asset requirement absent from the accepted
matrix, work stops for that cartridge. The requirement is added to the ontology
with source evidence, reviewed for reuse versus a new variant, assigned to both
themes, and produced before integration resumes.

## Program completion

The program is complete only when every in-scope game has an accepted semantic
requirement mapping, every required semantic asset exists in both themes, every
rewritten cartridge consumes the contract, and browser verification demonstrates
the complete desktop/mobile and theme matrix without production fallbacks.
