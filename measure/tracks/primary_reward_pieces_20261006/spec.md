# Spec — Reward emblems become avatar pieces (M1 to M4)

**Status:** approved by the owner 2026-10-06 through the Forge session. Plan A, with plan B as the
fallback if the Forge pieces are not ready by 2026-10-13.
**Forge track:** F1 to F4 in advantage-forge (pack version, reward mark, the two staffs, pack 1.1.0).
**Branch:** `primary-parity-integration` after the Forge sync (one commit for M1 to M4).

## Problem

Completion rewards grant the cosmetics `apprentice-wand`, `graveyard-staff`, and `echo-staff` as
emblems (slot `profile-emblem`). The app never renders that slot, so a student earns a reward that
never shows. The RPG skin promises that every reward is visible on the hero.

## Decision

A. A reward is an avatar piece. Each cosmetic id names a mainhand piece of the same id in the Forge
avatar pack. The grant inserts the avatar inventory row with source `reward`; the shop does not
sell reward pieces. B (fallback): hide the equip button on the reward panel until A lands.

## Requirements

- M1. The app reads the pack version from the synced `catalog.json`; `packages/avatar-kit`
  keeps no second version constant. Rows keep their `catalogVersion`; the games fall back to the
  synced catalog's version.
- M2. The shop leaves out items with `"source": "reward"`.
- M3. `grantCompletionCosmetics` also inserts the avatar inventory row (source `reward`) for the
  piece of the same id. A student with no profile receives the piece on the first pick.
- M4. `RpgRewardPanel` says "It is in your inventory" in place of "equip".

## Out of scope

The pack content itself (F3), the pack versioning rule (F1), and the catalog mark (F2) are Forge work.
