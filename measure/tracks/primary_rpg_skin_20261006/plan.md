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
- [x] Capture of the fall: needs a real completed run (the committed damage comes from verified completions); taken in Phase 5 from a rehearsal class

## Phase 4: the rest (pages 7 to 19 of the spec)
- [x] Story list in the library: filter steps as gold, wood, and iron buttons on parchment
- [x] Story view in the blurred library: desk tools on parchment, the lesson link in gold
- [x] Lesson path and Reedy in the clearing; class book on the library desk with pinned current lesson and sealed lessons
- [x] Assignments as a banner over the guild hall board; games as banners on the arena wall with Forge icons
- [x] Vocabulary in the wizard tower; sentences in the archive with the practice modes as signs; history at the inn with signed sections; reports in the observatory
- [x] Me as the hero's room at the inn with the chest link to the avatar; sign-in at the gatehouse with the form on parchment and the student and teacher tabs as signs
- [x] Forge merge `753248e49` (apk3d-games-port onto lane-f): the word adventures card as the first arena banner, the story page and its list in the arena scene
- [x] Captures of the 14 pages at 375 and 1280, day and night; report `phase4/index.html`; the light-card ink fix found in the captures
- [x] Skin spec row 12 for the story games: the 3D host briefing, result, and gate panels in the kit parchment (Forge commit 98d7badd0, merged); the legacy 2D briefing screen in advantage-play-kit stays on the list below
- [x] Test repairs found by the Forge merge check: the GP ledger in the host-proof test mock (one XP row and one GP row per first completion, none on a duplicate), the db mock spread in four app tests, the local font mock in two layout tests
- [ ] Skin spec row 12 for the legacy 2D games: the play-kit frames (briefing, result, rewards, catalogs) now read their sprite frames and colours from CSS variables, and the skin maps them to the parchment; the ElvGames arcade sprites no longer show on Primary pages. Capture check after the Forge build (battle arch and games page)
- [ ] Later: lists as objects inside the client components (books on shelves, scrolls in pigeonholes, the lesson marker on the path, stamped journal pages) once the owner accepts the scene pass

## Phase 5: the five promo shots recorded from the build
- Blocker 2026-10-06 14:30: `next dev` cannot start on this machine (Turbopack panic "OS file watch limit reached"; ~63k of 65,536 inotify watches are held by the Claude sessions). Webpack mode fails on the sales-knowledge JSON asset. Way around used: `next build` + `next start` (no file watcher). The owner can still raise the limit for the dev server: `sudo sysctl fs.inotify.max_user_watches=524288`.
- [x] Shot 1: the home hero beside the Class Quest banner (phone, day)
- [x] Shot 2: the chosen hero steps into the light on the shrine pedestals (picker, step 2)
- [x] Shot 3: coins fly to the counter in the armory after a purchase
- [x] Shot 4: the boss takes a hit on the battle page (the slash and the damage number)
- [x] Shot 5: the boss falls on the projector (the live dashboard in `result` with the coin rain); the committed damage comes from real completions: three QA students each start a challenge run and post one completion through `/api/v1/apk/challenges/runs` and `/api/v1/apk/complete` (the recipe `scratchpad/boss-fall.mjs`), or the staff rehearsal
- [x] Report `phase5/index.html` with the five frames and a note per shot on the recording path for the video session
- Fixed after the captures (2026-10-06): the header purse refreshes after a purchase; a student with no hero shows the Forge silhouette on the projector (skin 1.1.0, `kit/heroes/no-hero.webp`). Still from live play at the rehearsal: the slash frame of shot 4 and the coin rain of shot 5.

## Open defects (owner, 2026-10-06)
- [ ] The side menu draws over the full-screen story game player at desktop widths (seen on the Labyrinth briefing at 1024 px). Fix the stacking, then open all 28 games at desktop width and confirm the briefing, the play screen, and the results are clear of the menu. Recapture the Phase 5 frames after the fix.
