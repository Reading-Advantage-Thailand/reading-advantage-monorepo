# Primary Advantage RPG skin: the look and the interaction model

**Status:** approved by the owner 2026-10-06 (track `primary_rpg_skin_20261006`). This document is
the design authority for every student-facing page of Primary Advantage. The Phase 0 kit and mocks
are in `measure/tracks/primary_rpg_skin_20261006/phase0/`.

## 1. The bar

The owner's test for every student screen: "How am I supposed to create an impactful marketing
video from any of this?" A screen that is not worth five seconds in a promo video is not done.
The app feels like being half inside a Zelda-style game, on every page. The product name the
players see for the world is Chibi Quest.

## 2. Rules

1. **Assets come from `advantage-forge` only.** Scenes, heroes, enemies, NPCs, props, item views,
   sprite strips, and fonts (Fredoka, Mitr). No ElvGames asset anywhere in the app. The licensed
   APK standard library is legacy; see the audit track `apk_elvgames_audit_20261006`.
2. **Chrome is owned SVG/CSS.** Panels, signs, banners, meters, hearts, buttons, the toolbar, and
   the 2D effects live in one stylesheet (`phase0/kit/chrome/kit.css`, class prefix `cq-`).
   Anything pictorial is a Forge render. Nobody draws a new frame per page.
3. **Every page has a place.** A page composes a `Scene`: a Forge backdrop (static WebP, 1080 px
   wide for phones, 1920 px for desktop, under 250 KB), a vignette, props, an NPC where the page
   has a host, and the content in parchment panels. New pages pick a place from the 94 maps.
4. **Reading stays protected.** The story page gets a desk and a frame; the text column has no
   decoration (student experience strategy, Reading Mode).
5. **3D with a 2D fallback, like the games.** The 3D avatar (picker, inventory, battle) and the
   projector battle field run through the games' selector: the "2D mode (older phones)" setting
   or `?renderer=phaser` forces 2D, and a device without WebGL2 gets 2D. The 2D fallback is the
   portrait canvas with CSS motion, or a sprite field. No page is 3D-only.
6. **Motion is cheap and meaningful.** CSS keyframes: a sprite strip idle (8 frames, 1 s), bob,
   glow on an armed relic, burst and slash and shield flash on a hit, shake on the boss, a
   floating damage number, coins flying on a purchase. No motion for decoration alone.
7. **Dark mode is night.** The same scene with the lanterns lit; the chrome does not change.
8. **The owner sees captures before a page is called done**, at 375 px and 1280 px.

## 3. The places

| Place (Forge map) | Pages |
| --- | --- |
| guild-hall | home, assignments (the quest board) |
| shrine | avatar picker |
| treasure-vault | my avatar (the paper-doll inventory) |
| armory | avatar shop (the blacksmith) |
| boss-arena | Class Quest battle, phone |
| arena | games, projector dashboard (the teaser field) |
| library | story list, story view (blurred), class book |
| clearing | Reedy (the campfire), lesson path |
| wizard-tower | vocabulary (the spellbook) |
| archive | sentences (the scrolls) |
| inn | my reading (the journal), Me |
| observatory | reports |
| gatehouse | sign-in |

## 4. The interaction model

- **Home** is the guild hall: the hero at the quest board, stats on a plaque, the Class Quest
  banner with the boss and the meter, lessons and reading as pinned notices, the arena door, the
  campfire, the hall of fame.
- **The shop** is a counter with a host: the NPC greets, the slot tabs are hanging signs, each
  shelf holds six items with coin prices, locked tiers are chained chests, a tap opens a try-on
  card with the hero wearing the piece and the dyes as pots, Buy sends coins to the counter.
  Shelves page; nothing scrolls for 140 items.
- **The inventory** is a paper-doll: the hero in the centre, ten slot icons around it, a drawer
  of owned pieces (eight per page) for the tapped slot. Tap to wear.
- **The picker** is a shrine: the 15 heroes stand in a half-circle; the chosen one steps
  forward; colours are dye pots on a stone table.
- **The battle** is the boss arena: the boss on the dais with its meter, the hero with five
  hearts, relics that glow when armed, the game inside a stone archway, the hit feed. Rally is
  the campfire by the gate; the result is the death clip and raining coins, or a roar.
- **Lists are objects**: books on shelves, scrolls in pigeonholes, notices on a board, stamped
  journal pages. A filter is a sign, a pin, or a shelf, never a chip row.
- **Buttons**: wood for a normal action, gold for the one primary action on a screen, iron for a
  secondary or a way out. 48 px minimum.

## 5. Phases

0 kit and mocks (done, approved) · 1 scene system, shell, home · 2 picker, inventory, shop ·
3 battle phone page and projector dashboard · 4 the remaining pages · 5 the five promo shots.
Status lives in the track plan.
