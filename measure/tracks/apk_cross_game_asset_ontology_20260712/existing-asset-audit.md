# Existing Asset Audit

## Current decision

No current candidate is automatically accepted as a production semantic asset. Legacy files remain mechanic/visual evidence until each file has verified dimensions, provenance/license, visible-content inspection, required states, focal/crop behavior, compact/wide suitability, and both-theme contract fit.

## Inventoried roots

- `apps/advantage-games/public/games/` — legacy game and cover assets.
- `apps/advantage-games/public/sounds/` — legacy audio cues and music.
- `apps/reading-advantage/public/games/` and copied component imports — deployment evidence.
- `packages/advantage-play-kit/` and `packages/game-cartridges/` — current semantic contract/runtime evidence.

## Rejection policy

Reject cover art, placeholders, procedural stand-ins presented as final art, baked text, baked checkerboards, unverifiable provenance, incomplete directional/state coverage, unsafe fixed borders, and imagery that cannot satisfy compact and wide composition. Unknown provenance or uninspected visible content remains **unknown/gap**, never reusable.

## Usage coverage

The machine matrix contains 493 scene usages across 29 scenes. Every usage currently resolves to a visible production gap; Phase 6 may normalize these roles but cannot convert a candidate to reuse without recorded inspection evidence.

## Candidate inspection — 2026-07-12

The audit enumerated 333 files; ImageMagick decoded and measured 303 PNGs. Four contact sheets were visually inspected across covers/screenshots and sprite/environment/UI cohorts.

| Cohort                     | Finding                                                                        | Disposition                                    |
| -------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------- |
| Covers/promotional art     | Text-bearing fixed fantasy compositions; no per-file production license ledger | Reject for semantic reuse; cover-only evidence |
| Gameplay/start screenshots | Baked phone UI, prompts, controls, HUD, and backgrounds                        | Reject                                         |
| Character/enemy sheets     | Mixed styles, grids, directions, and incomplete provenance                     | Replace; visual reference only                 |
| Terrain/backgrounds        | Fixed paintings and partial tiles without complete boundaries or provenance    | Replace; visual reference only                 |
| Potion/rune UI             | Fixed-cell imagery not proven nine-slice, text-safe, or theme-equivalent       | Replace                                        |
| Fourteen MP3 files         | Roles inferable, but license, loudness, loop, and theme parity undocumented    | Unknown; do not ship in new packs              |

Three alleged PNGs are invalid: Griffin Riders Escape `gate.png` and `obstacle.png` are empty; Reading Enchanted Library `tile-library.png` is ASCII text. All are rejected. Duplicate typed, untyped, and Reading roots are copy debt, not additional coverage. No candidate is accepted for either production theme.
