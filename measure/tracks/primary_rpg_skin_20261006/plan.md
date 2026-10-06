# Plan — Primary RPG skin (track primary_rpg_skin_20261006)

Spec: `spec.md`. Review page: `review.html`. Owner approved the plan on 2026-10-06.

## Phase 0: kit, backdrops, mocks (owner gate: the look)
- [x] Backdrops: 13 Forge scenes shot at 1080x1920 and 1920x1080 with a standing camera (`phase0/backdrops/`)
- [x] Kit: SVG/CSS chrome (parchment panel, plank sign, banner, meter frame, hearts) in `phase0/kit/`
- [x] Kit: Forge pictorials collected (studio grey keyed out with `cutout.py`; Phase 1 wants transparent renders from the pipeline) (coin, 10 slot icons, 3 relics, blacksmith idle, boss idle) in `phase0/kit/`
- [x] Mocks: home (guild hall), shop (armory), battle play (boss arena) as static HTML at 375 and 1280 (`phase0/mocks/`)
- [x] Captures of the three mocks and a `phase0/index.html` for the owner
- [x] Owner review of the look: approved 2026-10-06 ("Looks right"); the look and the interaction model are codified in `docs/primary-rpg-skin.md`

## Phase 1: scene system and the shell
- [ ] `Scene`, `Panel`, `Sign`, `Meter`, `Coins`, `Hearts` components with the 2D/3D selector
- [ ] The toolbar, the sidebar signpost, the header purse and gem
- [ ] Home in the guild hall; captures at 375 and 1280, light and night

## Phase 2: the avatar
- [ ] Picker in the shrine (3D composer, portrait fallback)
- [ ] Paper-doll inventory with the paged drawer
- [ ] Armory shop with the blacksmith, shelves, the try-on card, the purchase animation

## Phase 3: the battle
- [ ] Phone battle page in the arena: boss sprite, meter frame, hearts, relics, archway game
- [ ] Projector dashboard on the teaser field (2D sprite field fallback)

## Phase 4: the rest (pages 7 to 19 of the spec)

## Phase 5: the five promo shots recorded from the build
