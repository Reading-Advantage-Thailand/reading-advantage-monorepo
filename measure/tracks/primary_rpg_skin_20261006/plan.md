# Plan — Primary RPG skin (track primary_rpg_skin_20261006)

Spec: `spec.md`. Review page: `review.html`. Owner approved the plan on 2026-10-06.

## Phase 0: kit, backdrops, mocks (owner gate: the look)
- [x] Backdrops: 13 Forge scenes shot at 1080x1920 and 1920x1080 with a standing camera (`phase0/backdrops/`)
- [x] Kit: SVG/CSS chrome (parchment panel, plank sign, banner, meter frame, hearts) in `phase0/kit/`
- [x] Kit: Forge pictorials collected (studio grey keyed out with `cutout.py`; Phase 1 wants transparent renders from the pipeline) (coin, 10 slot icons, 3 relics, blacksmith idle, boss idle) in `phase0/kit/`
- [x] Mocks: home (guild hall), shop (armory), battle play (boss arena) as static HTML at 375 and 1280 (`phase0/mocks/`)
- [x] Captures of the three mocks and a `phase0/index.html` for the owner
- [x] Owner review of the look: approved 2026-10-06 ("Looks right"); the look and the interaction model are codified in `docs/primary-rpg-skin.md`

## Phase 1: scene system and the shell (done 2026-10-06, report `phase1/index.html`)
- [x] `Scene`, `Panel`, `Sign`, `Meter`, `Coins`, `Hearts` components (`components/rpg/`, `styles/rpg.css`) with the shared 2D/3D selector in the play kit (`@reading-advantage/advantage-play-kit/responsive`)
- [x] The toolbar, the sidebar signpost, the header purse and gem (`components/rpg/toolbar.tsx`, `hud.tsx`, the student shell in `app-layout.tsx`)
- [x] Home in the guild hall; captures at 375 and 1280, light and night (`phase1/captures/`)
- [x] Fonts Fredoka and Mitr served from `public/rpg/fonts/`; the Forge peer owns the rebuild of `public/rpg/`

## Phase 2: the avatar (done 2026-10-06, report `phase2/index.html`)
- [x] Picker in the shrine: 15 heroes on pedestals, the chosen one steps forward, dye pots on the stone table (`avatar-picker.tsx`); the hero is the 2D portrait until the games port lands the 3D composer
- [x] Paper-doll inventory with the paged drawer, eight per page (`avatar-home.tsx`)
- [x] Armory shop with the blacksmith, hanging signs, two shelves of six per page, the try-on card with dye pots, flying coins on buy (`avatar-shop.tsx`)
- [x] Item icons read `/rpg/items/<id>.webp` and fall back to the slot icon until the Forge build ships the views (`components/rpg/item-icon.tsx`)

## Phase 3: the battle (done 2026-10-06, report `phase3/index.html`)
- [x] Phone battle page in the boss arena: boss sprite with idle, hit, and death clips, the wood-iron meter, hearts, relics that glow when armed, the game inside a stone archway, coin rain on the fall (`battle-client.tsx`, `boss-sprite.tsx`)
- [x] Projector dashboard on the 2D sprite field: the boss east, the heroes west with HP bars, the lunge and the floating number on a hit, the fall with coin rain (`live-dashboard.tsx`); the 3D field waits for the games port and reads the same renderer switch
- [ ] Capture of the fall: needs a real completed run (the committed damage comes from verified completions); taken in Phase 5 from a rehearsal class

## Phase 4: the rest (pages 7 to 19 of the spec)

## Phase 5: the five promo shots recorded from the build
