# Plan — Primary Avatar Shop, GP, Inventory, Loadout (semester 2)

Started 2026-10-06 on the owner's instruction ("start working on the following lanes for Avatar,
Quest, etc."), on `primary/lane-f-reedy-preview` after Lane F. Measure TDD workflow; one commit per task.

## Phase 0: Discovery
- [x] Read the Lane F avatar code (profile table, picker, portrait package) and the Forge pack `catalog.json` (140 ready items with `price`, `rating`, `dyes`; 223 portrait layers; Forge HEAD `0a919a0`, pack unchanged since `3294ae5`)
- [x] Decided (`7b028f6dd`): the kit's `catalog.ts` carries every item with `price` and `rating` (the port script copies all 446 layer files to `public/packs/avatar/1.0.0/`, 1.9 MB); `GET /api/v1/avatar/catalog` serves it. A pack bump is a rerun of `scripts/port-avatar-pack.py` plus `AVATAR_PACK_VERSION`; rows keep their `catalogVersion`.

## Phase 1: Contracts and schema
- [x] `7b028f6dd` `avatar.ts` contracts: slots, ledger reason, inventory, loadout, purchase, shop item, state, class avatar, launch avatar (strict zod); tests
- [x] `7b028f6dd`, `4b211e2ac` Migration `0068_primary_avatar_shop` (three tables, FLAT in the registry, named loadout FK); `--required-migration 0068_primary_avatar_shop` in `cloudbuild.yaml`; applied to the local `primary_advantage`

## Phase 2: Domain (tests first)
- [x] `7b028f6dd`, `882fec997` `grantGpForXp` (weights: ratings 0, else 1 GP per XP; Bangkok daily cap 50; once per `xp:<activityId>`) called at the eight XP log inserts; tests
- [x] `7b028f6dd` `purchaseAvatarItem` (serializable transaction; balance, owned, retry on 40001; a dye costs its piece's price), `setLoadout` (ownership, slot, two-handed both ways), `getAvatarState`, `listAvatarShop` (popularity over 30 days, seeded tie order), `getClassAvatars`, `resetStudentAvatar`, `toLaunchAvatar`; 26 tests
- [x] `7b028f6dd` Starter set and the welcome grant (100 GP) on the first state read, worn when nothing is worn; tiers open at level 1, 5, 10 (`tierLevel` in the kit)

## Phase 3: API and pages
- [x] `3eae06b1e` Routes `/api/v1/avatar` (GET state), `/shop`, `/catalog`, `/purchase`, `/loadout`, `/api/v1/classroom/:id/avatars` (GET, POST `:userId/reset`) through `avatarController`; route tests
- [x] `3eae06b1e` `/student/avatar` is the avatar page when a hero is saved (worn portrait, GP, level, a row per slot; `?from=` opens the picker); `/student/avatar/shop` (slot filter, buy, dyes, locked tiers); messages in en, th, cn, tw, vi
- [x] Me tab link (`My avatar`) opens the avatar page, which links the shop; the home nudge is unchanged

## Phase 4: Games and verify
- [x] `3eae06b1e` `launchAvatarSchema`; the APK page reads the state and passes `avatar` to `StudentCartridgeHost` → `APKGameHost` → `mountCartridge` → the game factory context. The portrait as the default player image is left to the Forge Phase 3 game tracks (no cartridge reads `avatar` yet).
- [x] Browser walk-through (2026-10-06, production build, `avatar-walk.mjs`): starter set 5 pieces and 100 GP on the first visit only; buy `duelist-hat` 50 GP → 201, inventory 6, GP 50; a second buy → 409 `ALREADY_OWNED`; wear → head slot shows the hat; hair styles sell with no dyes; the teacher list shows 3 students and one reset button. Captures 21, 21b, 24, 46 at 375 and 1280 in the manual. Vision QA: no Critical or High. Medium: the shop at 375 is one long column of 140 pieces (about 15,800 px); the slot filter is the mitigation, paging is a follow-up.
- [ ] Separate-agent review: skipped (the owner ruled out subagents on 2026-10-05). Retrospective: the first walk-through found two defects the unit tests did not: `NULL` dye rows escaped the unique constraint (fixed with a partial unique index) and hair styles offered free dyes (fixed in `itemDyes`). Lesson: run the browser walk-through before the review, not after.

## Gates
- [x] Tests, tsc, ESLint green (2026-10-06: domain 26, kit 12, contracts 23, routes, pages; app tsc clean; lint clean); Tutor read test unaffected (no Tutor files touched)

## Decisions and open items (2026-10-06)
- Calibration placeholders until the median weekly XP is measured: welcome 100 GP, daily cap 50 GP, 1 GP per XP (ratings 0). They live in `packages/domain/src/primary-avatar/gp.ts`.
- A dye costs the price of its piece (the Forge plan sets no dye price). Owner to confirm.
- A class change in the picker keeps the worn pieces and grants the new class's starter set beside them. The teacher reset clears the hero and the worn pieces; the inventory and the GP stay.
- Piece names are the catalog ids made readable (`rogue-hood` → `Rogue hood`) in every locale. Thai names need a name table in the pack (open).
- The shop and the avatar page run on the lane-f branch and ship with the cutover build only if the owner says so; the plan said semester 2.
