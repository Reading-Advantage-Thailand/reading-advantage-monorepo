# Plan — Primary Avatar Shop, GP, Inventory, Loadout (semester 2)

Starts after the Primary cutover (Oct 14-16, 2026) and after Lane F ships the profile table,
the picker, and the portrait package. Measure TDD workflow; one commit per task.

## Phase 0: Discovery
- [ ] Read the Lane F avatar code (profile table, picker, portrait package) and the Forge pack `catalog.json`
- [ ] Decide where `catalog.json` and the full piece portrait layers live in Primary (`public/packs/avatar/<version>/`) and how a pack version bump is deployed

## Phase 1: Contracts and schema
- [ ] `avatar.ts` contracts: ledger, inventory, loadout, purchase (strict zod); tests
- [ ] Additive migrations: `primary_gp_ledger`, `primary_avatar_inventory`, `primary_avatar_loadout`; `--required-migration` in the Primary `cloudbuild.yaml`

## Phase 2: Domain (tests first)
- [ ] `grantGpForXp` inside the XP transaction; idempotent on `sourceKey`
- [ ] `purchaseAvatarItem` (one transaction; double-spend test), `setLoadout` (ownership, slot, two-handed), `getAvatarState` (browser-safe)
- [ ] Starter set grant on the first visit; level gate by tier

## Phase 3: API and pages
- [ ] Routes: avatar state, loadout, purchase, catalog; teacher class avatars and reset
- [ ] Avatar page (portrait, loadout, GP) and the shop (popularity order, slot filter, dyes); en and th; 48 px; 375 and 768
- [ ] Me tab and student home entry points (request to the UX owner if needed)

## Phase 4: Games and verify
- [ ] Launch context `avatar` field in `game-contracts` and the APK host; the portrait as the default player image where a game shows a fixed hero
- [ ] Browser walk-through: buy, equip, teacher list; vision QA at 375 and 1280
- [ ] Separate-agent review; close with a retrospective

## Gates
- [ ] Tests, tsc, ESLint green; Tutor read test unaffected
