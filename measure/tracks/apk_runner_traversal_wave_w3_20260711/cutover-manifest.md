# APK Runner Traversal Wave W3 Cutover Manifest

## Policy

This manifest records the reviewed W3 cutover. The four Phaser replacements, generic authenticated host, server-owned completion path, graph and text caller checks, and replacement tests are complete. Browser acceptance remains the final track gate, not a reason to restore dead per-game code.

The only production destination is `/[locale]/student/arcade/[cartridgeId]`. W3 must not add a copied per-game APK page, a per-game completion transport, or a provider SDK dependency.

## Candidate disposition matrix

| Public ID | Legacy page | Legacy component | Legacy state/config | Legacy API routes | Planned disposition | Current gate |
|---|---|---|---|---|---|---|
| `dragon-rider` | `apps/advantage-games/src/app/[locale]/(student)/student/games/vocabulary/dragon-rider/page.tsx` | `apps/advantage-games/src/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx` | `apps/advantage-games/src/lib/games/dragonRider.ts` | `apps/advantage-games/src/app/api/v1/games/dragon-rider/{vocabulary,complete}/route.ts` | Deleted page, component, state module, colocated tests, and per-game APIs after caller-free proof. Retained shared `RankingDialog` because Dragon Flight still imports it. | `deleted` |
| `spellweavers-run` | `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/spellweavers-run/page.tsx` | `apps/advantage-games/src/components/games/sentence/spellweavers-run/` | `apps/advantage-games/src/lib/games/spellweaversRun.ts` and `spellweaversRunConfig.ts` | `apps/advantage-games/src/app/api/v1/games/spellweavers-run/{sentences,complete}/route.ts` | Deleted page, component/index, state/config, tests, and per-game APIs after caller-free proof. | `deleted` |
| `griffin-riders-escape` | `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/griffin-riders-escape/page.tsx` | `apps/advantage-games/src/components/games/sentence/griffin-riders-escape/GriffinRidersEscapeGame.tsx` | `apps/advantage-games/src/lib/games/griffinRidersEscape.ts` and `griffinRidersEscapeConfig.ts` | `apps/advantage-games/src/app/api/v1/games/griffin-riders-escape/{sentences,complete}/route.ts` | Deleted page, component, state/config, tests, and per-game APIs after caller-free proof. | `deleted` |
| `storm-castle-tower` | `apps/advantage-games/src/app/[locale]/(student)/student/games/sentence/storm-castle-tower/page.tsx` | `apps/advantage-games/src/components/games/sentence/storm-castle-tower/` | `apps/advantage-games/src/lib/games/stormCastleTower.ts` and `stormCastleTowerConfig.ts` | `apps/advantage-games/src/app/api/v1/games/storm-castle-tower/{sentences,complete}/route.ts` | Deleted page, component/index, state/config, tests, and per-game APIs after caller-free proof. | `deleted` |

## Caller-free proof

- `build-graph callers` returned no consumers for `DragonRiderGame`, `SpellweaversRunGame`, `GriffinRidersEscapeGame`, or `StormCastleTowerGame` after the production card registry moved to the generic host.
- A bounded `rg` search outside the candidate route, component, and state trees returned no imports of those components/state modules and no calls to their per-game APIs.
- The recursive deletion guard in `runner-wave-contract.test.ts` fails if any retired page, component, state/config module, or API directory reappears.
- The catalog, generic route, authenticated host, QC host, and shared completion adapter tests cover all four replacement IDs.

## Required evidence before changing a row to `delete-approved`

- Package catalog and literal dynamic loader resolve the exact public ID.
- Cartridge manifest agrees with the frozen blueprint input mode, controls, semantic slots, and result mapping.
- Primary Chibi and Secondary Epic both complete through the generic host at desktop and 390x844.
- Keyboard and touch/pointer controls are behaviorally equivalent and visible/accessible where needed.
- Server completion is idempotent and awards server-owned XP; no legacy per-game completion route is used.
- `build-graph callers` and bounded `rg` searches show no remaining consumer of each candidate path.
- Replacement tests cover the legacy mechanic identity and every retained educational content contract.
- Final mandatory review reports no Critical or High finding.

## Non-candidates

- W2 generic arcade page, session hook, completion route, catalog UI, and APK host are retained shared infrastructure.
- Shared GameStart/GameEnd screens and unrelated legacy games are outside W3 deletion scope.
- `RankingDialog` is not a Dragon Rider deletion candidate until Dragon Flight ownership is separately resolved.
