# Spec — Primary Avatar Shop, GP, Inventory, Loadout (semester 2)

Track ID: `primary_avatar_shop_20261005`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md) (semester 2 stub)
Source plan: `advantage-forge/docs/avatar-system.md` sections 6, 10, 11 (Phase 2) and
`advantage-forge/docs/chibi-quest-progression.md`.

## Context

Forge Phase 1 is complete (track `avatar_system_20261001`): the avatar base, 170 equipment
pieces with fit, the 15 starter sets, the 3D composer, the 2D portrait composer, and the pack
`out/packs/avatar/1.0.0/`. Lane F (`primary_reedy_preview_20261003`) ships the first monorepo
piece at cutover: the `primary_avatar_profile` table, the starter-set picker with a color
scheme, the portrait layers in Primary, and the portrait functions in a monorepo package.
This track is the rest of Phase 2. It is not a cutover item (owner decision 2026-10-05).

## Functional Requirements

- FR-1 (GP ledger): `primary_gp_ledger` (schoolId, userId, delta, reason `xp` | `purchase` |
  `battle` | `welcome` | `admin`, sourceKey, createdAt; unique schoolId + userId + sourceKey).
  `grantGpForXp` runs inside the XP transaction. Balance is the sum of deltas.
- FR-2 (inventory and loadout): `primary_avatar_inventory` (itemId text, dye, source
  `starter` | `purchase` | `reward`, catalogVersion) and `primary_avatar_loadout` (one row per
  slot, FK to the inventory row). The starter set of the chosen class is granted free on the
  first visit. `setLoadout` validates ownership, slot, and the two-handed rule.
- FR-3 (purchase): `purchaseAvatarItem` is one transaction: check the balance, insert the
  inventory row, insert the negative ledger row. Tests for double-spend and ownership.
- FR-4 (catalog): serve `catalog.json` of the pack; the client stores item ids as text and the
  catalog version on each loadout row. Prices come from the catalog (the Forge formula). Tier
  gates the level: tier 1 at level 1, tier 2 at level 5, tier 3 at level 10.
- FR-5 (shop and avatar page): the shop lists what the level opens, in popularity order
  (purchase rows in the last 30 days over all schools; ties in a per-student fixed random
  order), with a slot filter. The avatar page shows the portrait, the loadout, and the GP
  balance. Dyes are separate purchases (`<id>:<preset>`).
- FR-6 (teacher): `GET classroom/:id/avatars` for the class list portraits and a reset action.
- FR-7 (games): the launch context gains `avatar: { catalogVersion, tints, pieces }`; a 2D game
  uses the portrait; a 3D game calls the composer; a game never fetches the avatar itself.
  The Forge Phase 3 game tracks own the in-game rendering.
- FR-8 (contracts): `packages/game-contracts/src/avatar.ts` extends the Lane F schema with the
  ledger, inventory, loadout, and purchase contracts (strict zod).

## Non-goals

- Guild Mode and the weekly battle (own track).
- Real-time multiplayer. Free-text avatar names (the avatar shows the display name).
- Changes to the Forge pack format.

## Acceptance Criteria

- Ledger, purchase, and loadout functions have tests for double-spend, ownership, slot and
  two-handed rules, and the level gate. `pnpm test` and type checks pass.
- A seeded student with GP buys a tier 1 piece, equips it, and the portrait updates. The
  teacher class list shows the new portrait.
- The Tutor read test is unaffected (new tables only).
