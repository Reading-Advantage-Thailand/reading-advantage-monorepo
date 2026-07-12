# Supersession Decision — 2026-07-12

This track is closed as **superseded, not completed**.

## Why the plan was invalid

The plan started from a proposed fantasy pack and fixed sprite-sheet layouts,
then attempted to make the games fit that inventory. It later froze an
unverified 75-file-per-theme list containing actor variants, UI dimensions, and
other physical decisions that had not been derived from actual game usage.

That reverses the required dependency order. The games are being rewritten to a
new semantic asset contract, so neither their legacy file layouts nor a generic
fantasy catalog should dictate the target pack.

## Replacement dependency order

1. Inventory every relevant developed and in-development game.
2. Extract where and how each game uses presentation assets.
3. Normalize those needs into shared semantic asset types and justified
   gameplay variants.
4. Identify coverage holes such as strength tiers, attack modes, environment
   kits, hazards, projectiles, and feedback effects.
5. Define physical delivery formats appropriate to each accepted asset type.
6. Produce mirrored Chibi Quest and Riven Lands assets.
7. Rewrite bounded cartridge cohorts against the semantic contract.

## Disposition of prior implementation

No implementation is accepted merely because this superseded track marked a
task complete. Successor tracks must audit the existing physical ABI, pipeline,
and commits against the accepted ontology. Useful pieces may be retained;
speculative requirements must be removed or replaced through normal tested
tasks. This planning correction does not itself revert application code.

## Successor tracks

- `apk_cross_game_asset_ontology_20260712`
- `apk_dual_theme_asset_production_20260712`
- `apk_cartridge_semantic_rewrite_20260712`
