# Phase 3 Green Evidence

## Scope

This phase rebuilds five traversal games as Phaser APK cartridges in Advantage
Games. It uses `~/Desktop/advantage-games` at
`e4a3e6839706fbfcb8b7754788ec24ca29286950` as the legacy source authority.

The source manifests use file existence and SHA-256 checks. They do not treat
Git tracking as a source-presence requirement.

## Implementation

`packages/game-cartridges/src/legacy-traversal-cartridges.ts` provides one shared
engine with title-specific movement, route, learning, presentation, and result
configuration. The catalog exposes stable loaders for all five titles. They are
Dragon Rider, Spellweaver's Run, Shadow Gate Dungeon, Labyrinth of the Goblin
King, and Griffin Rider's Escape.

Advantage Games exposes each cartridge through the public preview host and the
authenticated game card list. Public content remains an explicit fixture.

## Verification

- The binding freeze passes 8 tests.
- The source manifest passes 13 tests.
- The full cartridge package passes 25 files and 129 tests.
- The cartridge build, lint, and type check pass.
- Advantage Games passes 199 suites and 1,782 tests.
- Advantage Games lint passes with zero errors and 90 existing warnings.
- The Advantage Games type check and production build pass.
- System Chrome passes all ten combined lifecycle tests on a fresh server.
- All eight public cartridges complete through real keyboard or pointer input.
- Every browser case verifies results, attribution, responsive layout, and clean replay.
- The authenticated case loads two student-owned records and persists server-computed XP.
- Database inspection finds matching `game_completions` and `xp_logs` rows.
- The graph update processes 11 goal files and produces 222 nodes and 238 edges.

The APK-owned domain unit files pass 36 tests. The full domain run passes 710
tests and fails 104 concurrent Sales and Finance Red tests. A Finance trigger
blocks the shared PGlite reset before five game integration assertions can run.

The Measure doctor passes its catalog and supervisor invariant checks. It stops
on deprecated task markers in six unrelated active tracks before the architecture
check runs.

## Remaining Work

This evidence does not claim Reading or Primary host proof. It does not authorize
legacy path retirement, deployment, or final track acceptance.
