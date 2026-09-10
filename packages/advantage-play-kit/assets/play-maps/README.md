# Standard Play Maps

Derived top-down play-map PNGs for the Advantage games. Each PNG is generated
from a typed `StandardPlayMap` module in `packages/game-cartridges/src/maps/`.
The typed layout is the source of truth. The PNG is a review and marketing
artifact, not a runtime input.

Pixel art assets by ElvGames. License: `LicenseRef-ElvGames`.

## Why this folder is outside the standard pack

`packages/advantage-play-kit/assets/standard` is the version-pinned canonical
ElvGames pack. Its release record prohibits private pack trees. These composed
maps are project-derived art. Keeping them in `assets/play-maps/` leaves the
accepted pack digest unchanged.

## Maps

| Map | Layout module | Canvas | Games |
|---|---|---|---|
| `wizard-graveyard.png` | `wizard-graveyard-map.ts` | 960×540 | Wizard vs. Zombie |
| `shadow-gate-dungeon.png` | `maps/shadow-gate-dungeon-map.ts` | 960×540 | Shadow Gate Dungeon |
| `dungeon-liberator.png` | `maps/dungeon-liberator-map.ts` | 960×540 | Dungeon Liberator |
| `enchanted-library.png` | `maps/enchanted-library-map.ts` | 960×540 | Enchanted Library |
| `village-guardian.png` | `maps/village-guardian-map.ts` | 960×540 | Village Guardian |
| `devourer-slime.png` | `maps/devourer-slime-map.ts` | 960×540 | Devourer Slime |
| `astral-mage.png` | `maps/astral-mage-map.ts` | 960×540 | Astral Mage |
| `realm-carver.png` | `maps/realm-carver-map.ts` | 960×540 | Realm Carver |
| `labyrinth-goblin-king.png` | `maps/labyrinth-goblin-king-map.ts` | 352×480 | Labyrinth of the Goblin King |

## Inspected source sprites

The composer resolves semantic keys to these inspected source files.

Graveyard, crypt, and dungeon (rogue-adventure-world):
- `ra-crypt-review-parts/ra-crypt-review-parts-floor-1-2.png` — 16×16 tan crypt floor.
- `ra-crypt-review-parts/ra-crypt-review-parts-floor-4-1.png` — 16×16 crypt floor variant.
- `ra-crypt-review-parts/ra-crypt-review-parts-stone-tombstone-2-1.png` — 16×32 grave.
- `ra-crypt-review-parts/ra-crypt-review-parts-stone-tombstone-3-2.png` — 16×32 grave.
- `ra-crypt-review-parts/ra-crypt-review-parts-moss-tombstone-5-1.png` — 16×32 mossy grave.
- `ra-crypt-review-parts/ra-crypt-review-parts-wall-inner-0.png` — 48×64 crypt wall inner.
- `ra-crypt-review-parts/ra-crypt-review-parts-gate-3-1.png` — 16×16 gate.
- `ra-crypt-review-parts/ra-crypt-review-parts-moss-tomb-animation-640.png` — 64×32 tomb animation.

Halloween props (fantasy-dreamland-world):
- `remastered-halloween/remastered-halloween-plain-memorial-96.png` — 32×32 memorial.
- `remastered-halloween/remastered-halloween-large-bare-tree-64-0.png` — 48×64 dead tree.
- `remastered-halloween/remastered-halloween-small-bare-tree-160-16.png` — 48×48 dead tree.
- `remastered-halloween/remastered-halloween-gray-burning-fence.png` — 16×32 fence frame.
- `halloween-objects/halloween-objects-candle-sequence-272.png` — 16×16 lantern frame.

Catalog tiles and props (materialized standard pack):
- `asset-ddb2d3c226e2ebaa.png` — 16×16 grass ground.
- `asset-52310a95c4c3016a.png` — 32×32 dirt path.
- `asset-ab8ed48e49d778a5.png` — 32×32 stone tile.
- `enchanted-library-bookshelf.png` — 16×32 bookshelf.
- `asset-1a2d909a506fd6c9.png` — 16×16 crystal frame.
- `asset-84663e69de1c831d.png` — 32×80 tower.
- `asset-aac6ef52552b8d68.png` — 64×64 ruins.
- `asset-2bd2454d7f15581b.png` — 192×192 grave dirt.

Dungeon floors (rogue-adventure-world and sewers-tileset):
- `ra-crypt-review-parts/ra-crypt-review-parts-floor-1-1.png` — 16×16 sandstone floor.
- `sewers-tileset/processed/sewers-tileset/sewers-tiles-floor-tile-0.png` — 16×16 dark stone.
- `sewers-tileset/processed/sewers-tileset/sewers-tiles-floor-tile-5.png` — 16×16 dark stone variant.

The three dungeon maps use distinct seamless floors: `dungeon:stone` (dark
sewers stone), `dungeon:stone-alt` (dark sewers stone variant), and
`dungeon:sandstone` (tan crypt stone). The open-field maps use three distinct
grounds: grass for Village Guardian, mud for Devourer Slime, and sandstone for
Realm Carver.

## Regenerating a PNG

From `packages/game-cartridges`:

```bash
pnpm exec tsx scripts/export-play-map.ts src/maps/<module>.ts <EXPORT_NAME> > /tmp/<id>.json
python3 scripts/compose-play-map.py /tmp/<id>.json ../../packages/advantage-play-kit/assets/play-maps/<id>.png
```

`scripts/compose-play-map.py` holds the semantic-key resolver. Add a key there
before using a new sprite.
