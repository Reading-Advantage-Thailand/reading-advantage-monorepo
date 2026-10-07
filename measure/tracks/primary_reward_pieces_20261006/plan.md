# Plan — Reward emblems become avatar pieces

Waits for the Forge release of pack 1.1.0 (F4). Nothing starts before the sync lands.

## Phase 0: Fallback (only if F3 is not ready by 2026-10-13)
- [ ] B: hide the equip button on `RpgRewardPanel` for emblem rewards, with a test

## Phase 1: After the Forge sync (one commit)
- [x] M1: `port-avatar-pack.py` takes the pack version from the Forge pack folder and writes `AVATAR_PACK_VERSION` and the `source` mark from `catalog.json`; the app's `public/packs/avatar/1.0.0` is gone (portraits compose from the served version, rows keep `catalogVersion`)
- [x] M2: `listAvatarShop` leaves reward pieces out; `purchaseAvatarItem` refuses them with `NOT_FOR_SALE`; tests
- [x] M3: `grantCompletionCosmetics` inserts the avatar inventory row (source `reward`, conflict-safe; no profile needed, the row waits for the first pick); test
- [x] M4: `RpgRewardPanel` and `RpgUnlockNotice` take an optional `inventoryNote` that replaces the equip action; the Primary hosts pass it (en, th `rewardInInventory`); other apps keep the equip button; tests
- [x] M5 (bug fix in the feature freeze, 2026-10-07): the Primary reward panels showed the ElvGames staff pictures and the ElvGames credit. `RpgRewardPanel`, `RpgUnlockNotice`, and `StudentRpgCatalogPanel` take an optional `credit` (and the catalog panel `assetUrls`); the Primary game host, the cartridge host, and the games catalog pass the Forge icons `rewardIconUrls` (`/rpg/items/<id>.webp`, `lib/rpg/places.ts`) and `credit={null}`; other apps keep the reviewed icons and the credit; tests

## Gates
- [x] Tests, tsc, ESLint green (2026-10-06: avatar-kit 12, domain shop and rpg 20, play-kit 9; tsc play-kit and the two app files clean; eslint clean)
- [x] Browser check: a completion grants a staff that shows on the hero and in the inventory (2026-10-07, production build, QA student on the scratch copy): one Hero vs. Zombie victory posted to `/api/v1/apk/complete` from the student's browser (the game host's request; the 3D run itself was not played) added the Apprentice Wand and the Graveyard Staff to `primary_avatar_inventory` (source `reward`); after the hero pick both show in the Main hand drawer, and the equipped Graveyard Staff shows "Worn" and in the hero's hand. The game briefing shows the Forge reward icons (M5) with no ElvGames credit
