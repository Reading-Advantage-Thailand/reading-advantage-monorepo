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

The machine matrix contains 203 scene usages across 29 scenes. Every usage currently resolves to a visible production gap; Phase 6 may normalize these roles but cannot convert a candidate to reuse without recorded inspection evidence.

## Candidate inspection — 2026-07-12

The audit enumerated 333 files across the Advantage Games game/sound roots and the Reading game root. ImageMagick decoded and measured 303 PNG files. Four contact sheets were visually inspected: covers/gameplay screenshots and three sprite/environment/UI cohorts.

| Cohort                      | Visual finding                                                                                             | Provenance/license                                   | Responsive/state finding                                                  | Disposition                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| Covers and promotional art  | Mostly text-bearing square fantasy illustrations; several include instructions or baked labels             | No per-file production license record found          | Cannot become gameplay/UI assets; text and fixed composition are unsafe   | **Reject for semantic reuse; cover-only evidence** |
| Gameplay/start screenshots  | Baked phone UI, prompts, controls, HUD, and fixed backgrounds                                              | Derived screenshots, not source assets               | Cannot recompose, localize, animate, or support compact/wide geometry     | **Reject**                                         |
| Character/enemy pose sheets | Mixed chibi/pixel/raster styles; many useful mechanic silhouettes but inconsistent grids and directions    | No complete per-file provenance/license ledger found | State/direction coverage varies; cannot guarantee both themes             | **Replace; visual reference only**                 |
| Terrain/backgrounds         | Mixed painted fixed backgrounds and small tile fragments; duplicated between canonical/typed/Reading roots | No complete provenance/license ledger found          | Fixed focal layouts and incomplete tile/boundary contracts                | **Replace; reference only**                        |
| Potion/shop and rune UI     | Baked icon sheets with fixed cells/borders and inconsistent style                                          | No complete provenance/license ledger found          | Not proven nine-slice, text-safe, theme-equivalent, or accessibility-safe | **Replace**                                        |
| Audio (14 MP3 files)        | Semantic roles are inferable from filenames and current use                                                | No complete per-file license/provenance ledger found | Duration/loop/loudness/theme parity not contract-tested                   | **Unknown; do not ship in new packs**              |

Three alleged PNG candidates are invalid production files: `sentence/griffin-riders-escape/gate.png` and `obstacle.png` are empty; Reading's `vocabulary/enchanted-library/tile-library.png` is ASCII text. They are **rejected**.

Duplicate visual families occur across untyped, sentence/vocabulary, and Reading roots. Duplication is deployment debt, not additional ontology coverage. No candidate is accepted for either Chibi Quest or Riven Lands production packs.
