# Spec — Primary RPG skin: every student page inside the Chibi Quest world

**Status:** approved by the owner 2026-10-06 ("I really like this"); Phase 0 in progress. The 3D avatar on pages is approved.
**Branch:** `primary/lane-f-reedy-preview` (worktree `lane-f`).
**Review page:** `review.html` in this folder (open with file://).

## 1. The bar

The owner's test for every student screen: "How am I supposed to create an impactful marketing
video from any of this?" A screen that is not worth five seconds in a promo video is not done.
The app must feel like being half inside a Zelda-style game, on every page.

## 2. Rules

1. **Assets come from `advantage-forge` only.** No ElvGames asset appears anywhere in the app,
   pages and games alike (the owner, 2026-10-06: the games already run on Forge packs). The
   licensed APK standard library is legacy and is not a source for anything new.
2. **Reading stays protected.** The story page gets a frame and a place, not decorations in the
   text column (student experience strategy, "Reading Mode").
3. **Old phones first.** Backdrops are static renders (WebP, 1080 px wide, under 200 KB).
   Three.js runs only where the avatar must move: the picker, the inventory, the battle. Every
   three.js view has a still fallback (the portrait canvas that exists today).
4. **One system, not page art.** A `Scene` layer (backdrop, props, NPC, panel, sign, meter) that
   every page composes. New pages pick a place and a prop set; they do not invent chrome.
5. **Every 3D interaction has a 2D fallback, like the games.** The games mount 3D or 2D through
   `createCartridgeMounter`: the "2D mode (older phones)" setting or `?renderer=phaser` forces 2D,
   and a device without WebGL2 gets 2D. The pages use the same selector: the 3D avatar (picker,
   inventory, battle) falls back to the portrait canvas with CSS motion, and the projector
   dashboard falls back to a 2D sprite field. No page is 3D-only.
6. **The owner sees captures before a page is called done.** Each phase ends with 375 px and
   1280 px captures of every touched page, and the promo shot list is checked against them.

## 3. What the Forge has (verified 2026-10-06)

| Need | Forge source | State |
| --- | --- | --- |
| Places | `scenes/maps/*.ts`, 94 scenes; `docs/map-mockups/<name>-3q.png` 1500x950 | Rendered. Re-shoot at any camera with `scripts/shoot-map.mjs` (hamlet.html, vite 5199). |
| Bosses | `out/goblin-king`, `out/lich`, `out/dragon-fire`, `out/iron-golem` | 512 px views, 128 px 8-direction sprites, idle/hit/attack/death clips, color presets. |
| Heroes | 15 hero classes, `out/<hero>/sprites/presets/<preset>/` | Idle/walk/run/attack/attack2/death/hit clips, 8 directions. |
| The student's avatar | `out/packs/avatar/1.0.0` (portrait layers, in the app today); `src/apk3d/avatar/` composer | Portrait still now. The 3D composer builds the rigged avatar from a loadout. |
| Equipment icons | `out/<piece>/views/front.png` for all 140 catalog pieces | Rendered. Item icons need no new art. |
| NPCs | `shopkeeper`, `blacksmith`, `innkeeper`, `quest-giver`, `villager`, `merchant-cart` | Modeled; sprite clips per the hero pipeline. |
| Props | banner, flag, notice-board, signpost, scroll, treasure-chest, locked-chest, coin-pile, coin-purse, gold/silver/copper coin, gems, potions, lantern, torch, campfire (animated), cauldron, lectern, desk, bookshelf, tent, market-tent, statue, portal-frame | Modeled and rendered. |
| Power-up icons | `horn` (rally horn), any shield (shield), any sword (sharp blade) | Rendered. |
| Effects | `src/apk3d/stage/fx.ts` (projectile, burst), `bolt`, `magic-rune`, `dragon-fire` | 3D only. 2D pages need sprite-sheet renders of a burst, a slash, and a shield flash (new). |
| Fonts | Fredoka (Latin), Mitr (Thai), OFL | In the Forge showcase. |
| Battle field | `src/showcase/battle/` (army, field, timeline) | The teaser renderer: heroes west, horde east, charge. Reusable for the live dashboard. |

**Gap:** the Forge has no UI chrome. Phase 0 builds it as an owned kit: the parchment panel,
the plank sign, the hanging banner, the meter frame, and the hearts are SVG/CSS drawn in the
chibi style (resolution independent, themeable, no license); everything pictorial is a Forge
render: coins (`gold-coin`), slot icons (one catalog piece per slot), power-up relics (`horn`,
a shield, a sword), NPCs (sprite sheets with idle, talk, wave, work clips exist for
`shopkeeper`, `blacksmith`, `quest-giver`, `innkeeper`, `villager`). Effects are CSS keyframe
sprites (burst, slash, shield flash) for 2D and `fx.ts` in 3D.

## 4. The pages

Each page gets: a **place** (Forge scene), a **cast** (NPC or the student's avatar), **chrome**
(the panels and signs from the kit), and a **promo moment** (the five seconds a camera wants).

| # | Page | Route | Place | Cast | What changes | Promo moment |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Shell | all | — | the avatar portrait in the header | Header: GP coin purse and XP gem next to the avatar. Bottom nav: a wooden toolbar with Forge icons (cottage, book, sword, portrait). Sidebar (desktop): a signpost with plank links. Dark mode is night: same scene, lanterns lit. | The toolbar rising as the student lands in the guild hall. |
| 1 | Home | `/student/home` | guild-hall | the avatar at the quest board, the quest-giver behind the counter | Stats on a wooden plaque (streak flame, XP gem, level shield). Today's lesson is a notice pinned on the board. Class book is the open book on the map table. Class Quest is a banner with the boss portrait and the wood-iron meter. Continue reading is a scroll. Games is the arena door. Leaderboard is the hall-of-fame plaque. | The student's hero walks in and the quest banner unrolls with the boss's face. |
| 2 | Avatar picker | `/student/avatar?from=me` | shrine (or portal-chamber) | the 15 heroes standing in a half-circle | Step 1: tap a hero and they step forward and play idle (3D composer; portrait fallback). Step 2: colours as dye pots and potion bottles on a stone table; the hero changes live. Save = the hero bows. | The chosen hero stepping into the light. |
| 3 | My avatar (inventory) | `/student/avatar` | treasure-vault | the avatar, full body, turning slowly | A paper-doll: the avatar in the centre, ten slot icons around the figure (the kit). Tap a slot and a drawer opens below with the owned pieces as Forge item icons, 8 per page, paged. Tap a piece to wear it; the avatar changes. No long scroll. GP coin purse and level shield top right. | Equipping a helmet and watching it land on the hero. |
| 4 | Avatar shop | `/student/avatar/shop` | armory (gear), with a general-store tab for hair and off-hand curios | the blacksmith behind the counter, idle loop, a greeting line in en and th | Shelves, not a list: slot tabs are hanging shop signs; each shelf shows 6 item icons with coin prices; locked tiers are a chained chest with the level on the lock. Tap an item for a try-on card: the avatar wears it in the preview, price in coins, Buy. On buy: coins fly from the purse to the counter, the item drops into the pack, the blacksmith nods. 140 pieces become 24 shelves, filtered and paged. Dyes are paint pots on the try-on card. | Coins flying to the counter and the hat landing on the hero. |
| 5 | Class Quest battle (phone) | `/student/quest/battle` | boss-arena | the boss (128 px sprite, idle loop) and the student's hero | **Rally:** the hero at the campfire by the arena gate with the class portraits arriving one by one. **Play:** the boss top, its meter in the wood-iron frame, the hero below with five hearts, power-ups as relic icons (shield, sword, horn) that glow when armed, the game inside a stone archway. **Result:** the boss plays death and coins rain, or the boss roars and holds. | The boss taking a hit and the hearts flashing. |
| 6 | Live dashboard (projector) | `/teacher/quest/:id/live` | the battle field (teaser renderer) | the boss east, every student's hero west in a line | A reuse of the teaser field: the boss idles; each heartbeat makes the hero attack and the boss play hit, with a floating damage number; HP bars under the heroes; the big meter on top; rally, battle, result, done as cinematic cuts; the fall plays the death clip and the banner drops. | The boss falling in front of the whole class. |
| 7 | Story list | `/student/read` | library | a villager scholar at the desk | Stories are books on shelves, covers from the article picture, a bookmark chip for the level. Fiction and nonfiction are two shelves. | Pulling a book from the shelf. |
| 8 | Story view | `/student/read/:id` | library, blurred | none | The article is a parchment page on a desk. The audio, translation, and word-list buttons are desk objects (bell, scroll, spellbook). The text column is untouched. | Not a promo page; it is the reading moment. |
| 9 | Lesson flow | `/student/lesson/:id` | adventurer-map (the asset), rendered flat | the avatar marker | The 14-step rail becomes a path on a map; the marker walks from step to step; a done step plants a flag. | The marker walking the path. |
| 10 | Class book | `/student/books/:id` | library desk | none | The book open on the desk; lessons as pages; a locked lesson is sealed with wax. | — |
| 11 | Assignments | `/student/assignments` | guild-hall, the board close up | the quest-giver | Each assignment is a pinned notice; filters are pins; done notices have a stamp. | Taking a notice from the board. |
| 12 | Games | `/student/games` | arena (training grounds) | the avatar at the gate | Games are banners on the arena wall; the class challenge is the arena's own notice; the game host keeps its frame but the briefing screen loses the dark terminal look for the kit's parchment (a later task, APK side). | The gate opening to the arena. |
| 13 | Vocabulary | `/student/vocabulary` | wizard-tower | none | Saved words are scrolls in a spellbook; practice is "cast". Empty state: an empty spellbook and a quill. | — |
| 14 | Sentences | `/student/sentences` | archive | none | Sentences are scrolls in pigeonholes; the three practice modes are three lecterns. | — |
| 15 | My reading | `/student/history` | inn | the innkeeper | The adventurer's journal: each story read is a stamped page; "read again" is a bookmark. | — |
| 16 | Reports | `/student/reports` | observatory | none | Charts on parchment; the XP meter is a gem that fills; activity days are stars in the sky. | — |
| 17 | Reedy | `/student/reedy` | clearing with a campfire (animated) | the avatar and Reedy by the fire | The talk happens at the campfire; the timer is the fire burning down; the summary is a scroll with four stars. | The campfire talk. |
| 18 | Me | `/settings/user-profile` | inn room | the avatar resting | Profile fields on parchment; the avatar link is the hero's chest. | — |
| 19 | Sign-in | `/auth/signin`, `/auth/card` | gatehouse | the guard | The class code sign hangs on the gate; the picture password are three shields on the wall; the QR card opens the gate. | The gate opening on sign-in. |

## 5. Phases

| Phase | Deliverable | Owner gate |
| --- | --- | --- |
| 0 | **Kit and mocks.** Forge UI chrome (section 3 gap), backdrops for the 12 places at 1080x1920 and 1920x1080, NPC idle sheets, 3 effect sheets, 3 promo moment mocks as static composites: the shop, the battle play state, the home. | Look accepted or sent back. No app code before this gate. |
| 1 | **Scene system and the shell.** `Scene`, `Panel`, `Sign`, `Meter`, `Coins`, `Hearts` components; the toolbar; the home page in the guild hall. | Captures of the home at 375 and 1280, light and night. |
| 2 | **The avatar.** Picker in the shrine, the paper-doll inventory, the armory shop with the blacksmith and the try-on card. | Captures and a recorded purchase. |
| 3 | **The battle.** Phone page in the arena with the boss sprite and hearts; the projector dashboard on the teaser field. | A recorded battle with three test students: rally, hit, fall. |
| 4 | **The rest.** Pages 7 to 19 in the table, three or four per commit. | Captures per page. |
| 5 | **Promo.** The five shots recorded from the build with the Remotion pipeline. | The owner's question answered on camera. |

## 6. Open questions for the owner

1. Does "Chibi Quest" appear as a name inside Primary Advantage, or only the places and heroes?
2. The avatar in 3D on the picker, inventory, and battle pages: accepted on the target phones, or pre-rendered portrait only?
3. The story page: a frame and a desk only, or also props beside the text?
4. Thai names for the places (guild hall, armory, arena, library, campfire).
5. The teacher dashboard uses the teaser field, which is three.js on the projector laptop: acceptable?
