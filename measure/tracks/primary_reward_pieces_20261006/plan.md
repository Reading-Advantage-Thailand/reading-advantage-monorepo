# Plan — Reward emblems become avatar pieces

Waits for the Forge release of pack 1.1.0 (F4). Nothing starts before the sync lands.

## Phase 0: Fallback (only if F3 is not ready by 2026-10-13)
- [ ] B: hide the equip button on `RpgRewardPanel` for emblem rewards, with a test

## Phase 1: After the Forge sync (one commit)
- [x] M1: `port-avatar-pack.py` takes the pack version from the Forge pack folder and writes `AVATAR_PACK_VERSION` and the `source` mark from `catalog.json`; the app's `public/packs/avatar/1.0.0` is gone (portraits compose from the served version, rows keep `catalogVersion`)
- [x] M2: `listAvatarShop` leaves reward pieces out; `purchaseAvatarItem` refuses them with `NOT_FOR_SALE`; tests
- [x] M3: `grantCompletionCosmetics` inserts the avatar inventory row (source `reward`, conflict-safe; no profile needed, the row waits for the first pick); test
- [x] M4: `RpgRewardPanel` and `RpgUnlockNotice` take an optional `inventoryNote` that replaces the equip action; the Primary hosts pass it (en, th `rewardInInventory`); other apps keep the equip button; tests

## Gates
- [x] Tests, tsc, ESLint green (2026-10-06: avatar-kit 12, domain shop and rpg 20, play-kit 9; tsc play-kit and the two app files clean; eslint clean)
- [ ] Browser check: a completion grants a staff that shows on the hero and in the inventory
