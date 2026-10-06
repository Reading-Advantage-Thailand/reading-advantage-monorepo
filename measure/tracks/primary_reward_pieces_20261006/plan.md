# Plan — Reward emblems become avatar pieces

Waits for the Forge release of pack 1.1.0 (F4). Nothing starts before the sync lands.

## Phase 0: Fallback (only if F3 is not ready by 2026-10-13)
- [ ] B: hide the equip button on `RpgRewardPanel` for emblem rewards, with a test

## Phase 1: After the Forge sync (one commit)
- [ ] M1: `packages/avatar-kit` reads the pack version from the synced `catalog.json`; remove the second constant; test
- [ ] M2: the shop filters `"source": "reward"` items; test
- [ ] M3: `grantCompletionCosmetics` inserts the avatar inventory row (source `reward`) and handles the no-profile case; tests
- [ ] M4: `RpgRewardPanel` copy "It is in your inventory" (en, th); test

## Gates
- [ ] Tests, tsc, ESLint green
- [ ] Browser check: a completion grants a staff that shows on the hero and in the inventory
