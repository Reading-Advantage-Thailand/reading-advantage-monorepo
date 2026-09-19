# Wizard Map and Navigation Review

## Scope

This review covers stable map, navigation, fairness, restore, and compact control behavior. It excludes the active listening implementation.

The focused Wizard suite passed all 33 tests. Gate routes and the four current orb goals remained reachable during those tests.

Command: `node ../../node_modules/vitest/vitest.mjs run src/wizard-vs-zombie.test.ts --maxWorkers=1 --no-file-parallelism`

## Findings

### P1: A fresh controller rejects a valid later active snapshot

Restore validates prompt content with the snapshot target at `packages/game-cartridges/src/wizard-vs-zombie.ts:1236`. It validates orb fairness with the controller target at line 1246.

The controller assigns the snapshot target at line 1302. A fresh controller therefore checks later active snapshots against item zero.

The existing active restore test restores into the source controller at `packages/game-cartridges/src/wizard-vs-zombie.test.ts:676`. The terminal test uses a one-item deck.

- Validate fairness with `target.translation`.
- Add a fresh-controller restore test after one correct answer.
- Compare the full restored snapshot with the source snapshot.

### P1: Restore discards the partial spawn interval

The snapshot stores `spawnTimerMs` at `packages/game-cartridges/src/wizard-vs-zombie.ts:1298`. Restore then resets the internal spawner at line 1308.

The next advance replaces the saved value with the reset spawner value at lines 1054-1055. Responsive restore therefore delays the next zombie.

- Add spawner state restoration or a bounded elapsed-time setter.
- Restore 750 milliseconds, advance 250 milliseconds, and expect one spawn.
- Verify repeated pause and restore cycles keep the same spawn schedule.

### P1: Crypt collision boxes exceed the displayed crypt width

The north crypt draws at 48 pixels wide but uses a 96-pixel solid at `packages/game-cartridges/src/wizard-vs-zombie.ts:410-417`. Each side gains 24 hidden pixels.

The west and east crypts draw at 48 pixels but use 84-pixel solids at lines 420-435. Body radii increase each hidden blocking area.

The wizard can stop 44 pixels before the north sprite edge. This gap makes visible corners disagree with navigation corners.

- Derive each crypt footbox from its displayed base.
- Render a matching base when the extra collision padding is intentional.
- Add approach tests from four sides and two diagonal corners.

### P1: Restore accepts blocked and unreachable entity positions

Orb validation checks finite coordinates and positive radius at `packages/game-cartridges/src/wizard-vs-zombie.ts:1166-1179`. Zombie validation applies similar checks at lines 1181-1194.

Wizard validation checks arena bounds at lines 1196-1203. None of these checks reject a solid overlap.

`slidePosition` returns the original point when both axis moves collide at lines 707-720. A restored body can remain inside a crypt.

- Reject restored bodies that overlap `GRAVEYARD_SOLIDS`.
- Reject restored zombies outside `HORDE_BOUNDS`.
- Reject restored orbs without a wizard route.
- Test blocked wizard, zombie, and orb snapshots.

### P2: Short decks repeat the same wrong answer

Any deck with one distinct distractor still creates four orbs at `packages/game-cartridges/src/wizard-vs-zombie.ts:764-780`. A two-item deck shows three identical wrong answers.

A three-item deck repeats one wrong answer. The duplicate-label tests only cover equal correct labels and zero distinct distractors.

- Set the orb count to the distinct answer count plus one.
- Cap the count at four.
- Test one-item, two-item, three-item, and duplicate-label decks.
- Require one correct orb and unique displayed wrong labels.

### P2: Dynamic sprite origins disagree with circle positions

Gameplay treats wizard, zombie, and orb coordinates as circle centers. `bodyRect` confirms this model at `packages/game-cartridges/src/wizard-vs-zombie.ts:619-625`.

`placeImage` uses a bottom origin at lines 1371-1385. Dynamic sprites inherit that origin at lines 1462-1478 and 1642-1673.

The collision circle therefore surrounds each sprite foot position. Orb and zombie art can overlap the wizard before gameplay detects contact.

- Center orb sprites on orb collision points.
- Define explicit lower-body boxes for actor sprites.
- Add a visual overlay check for sprite and collision alignment.

### P2: The compact control test measures base canvas pixels

The cartridge always creates a 960-by-540 canvas at `packages/game-cartridges/src/wizard-vs-zombie.ts:2084-2087`. Compact composition does not change these dimensions.

The compact test declares 390 pixels but requests 960-pixel bounds at `packages/game-cartridges/src/wizard-vs-zombie.test.ts:899-943`. Its 48-pixel assertion measures logical pixels.

This test does not prove a 44-pixel screen target after canvas scaling. It also does not test HUD overlap.

- Measure the rendered button rectangle at a 390-pixel viewport.
- Require at least 44 screen pixels in both dimensions.
- Check overlap with prompt, progress, health, and feedback text.

## Confirmed Stable Behavior

The current tests cover routes from all four gates at `packages/game-cartridges/src/wizard-vs-zombie.test.ts:477-495`. They also cover each current orb route at lines 513-520.

The focused suite found no ordinary gate reachability failure. Runtime pause can freeze the controller because time enters only through `advance`.

Restart creates a new controller and resets game state. Restore needs the corrections above before it preserves an equivalent active session.

## Dispositions

### Partial spawn interval: implemented

`DeterministicSpawner.setElapsed` now restores a finite value from zero through the interval's exclusive upper bound. Invalid values preserve the prior state.

Three new tests cover partial timing, repeated restoration, and invalid values. The focused system suite passed nine tests after three expected red failures.

The package type check and focused lint check passed. The graph received the two changed system files.
