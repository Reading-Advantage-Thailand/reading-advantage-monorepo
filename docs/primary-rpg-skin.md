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
5. **3D with a 2D fallback, through one shared setting.** The play kit owns the "2D mode
   (older phones)" setting (`@reading-advantage/advantage-play-kit/responsive`, `chooseRenderer`
   and `saveFlatMode`): the Forge demo's `chibi-quest` storage JSON with `flat: true`. The
   setting is new in the monorepo (2026-10-06); the Forge demo had it, the app's games did not.
   `?renderer=phaser` forces 2D for one visit, and a device without WebGL2 gets 2D. The 3D
   avatar (picker, inventory, battle) and the projector battle field read it; the ported 3D
   games must read it too. The 2D fallback is the portrait canvas with CSS motion, or a sprite
   field. No page is 3D-only.
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

## 6. Implementation notes (Phases 1 to 4, 2026-10-06)

- **Where the code is.** `apps/primary-advantage/styles/rpg.css` holds every `cq-` rule and is
  imported into `globals.css` in `layer(components)`, so a Tailwind utility on an element wins
  over a skin rule. `components/rpg/` holds `Scene`, the chrome (`Panel`, `Sign`, `Banner`,
  `Meter`, `Hearts`, `Coins`, `Gem`, `Plaque`, `Bubble`, the wood, gold, and iron buttons),
  `Sprite`, `ItemIcon`, the toolbar and the signpost, and the header HUD. `lib/rpg/places.ts`
  maps places, icons, item views, hero fronts, NPC and boss strips to paths under `/rpg/`.
- **A page joins the skin** by returning `<Scene place="...">`, putting its heading in a
  `cq-on-scene` element, its cards in `Panel`, its filters or tabs in signs (`Sign`, or
  `cq-tabs` on a TabsList), and its actions in `RpgLink` or `RpgButton`. A reading page passes
  `dim` to blur the backdrop. Client components that own their markup (the games host, the
  flashcard decks, the lesson rail, the report charts) keep their markup; the scene and the
  panels around them carry the look.
- **Tokens inside a panel.** A parchment panel resets `--foreground`, `--muted-foreground`,
  `--border`, `--card`, and `--muted`, so Tailwind colour utilities inside it stay ink on
  parchment in night mode.
- **Sprites.** A Forge strip is one row of 8 frames; the frame size is the strip height.
  `Sprite` scales the strip to `size × 8` in CSS, so any cell size plays at the display size.
  The keyframe moves by the strip width (`--strip-w`), never by a percentage.
- **Item views.** `ItemIcon` probes `/rpg/items/<id>.webp` once per page and shows the slot
  icon until the Forge build ships the view. A server-rendered `<img onError>` does not fire
  before hydration, so the probe is an `Image()` in an effect.
- **Clocks.** A countdown starts after mount (`useState<Date | null>(null)` and an effect), so
  the server and the client render the same text.
- **One look per character.** Every file of a character (front, 3q view, strips) uses one
  colour look: bosses and the blacksmith the default look (the games' look); role NPCs their
  role preset (quest-giver scribe, shopkeeper grocer, innkeeper hostess, villager weaver). The
  Forge build stops when two files of one character disagree.
- **Assets.** The Forge session owns the reproducible build of `public/rpg/` and
  `public/packs/avatar/`; the app never hand-copies Forge output. The avatar pack logic in
  `packages/avatar-kit` re-exports the 3D kit's `avatar/*` modules once the games port is on
  lane-f.
- **Captures.** Each phase report lives in `measure/tracks/primary_rpg_skin_20261006/phase<n>/`
  with captures at 375×812 (viewport, plus one screen down) and 1280×900, day and night.
