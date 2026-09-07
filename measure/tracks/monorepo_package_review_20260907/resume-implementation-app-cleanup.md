# Application cleanup implementation

Date: 2026-09-07

## Result

The Advantage Games tutorial actions await controller lifecycle work before reading the next snapshot.

The interruption test verifies that timers, listeners, and Phaser objects reach zero after cleanup.

Optional capture controls record an informational message when the page does not provide them.

The Codecamp tutor action uses a regular callback name. React no longer classifies it as a hook.

## Validation

Run from `apps/advantage-games`:

```bash
CI=true node ../../node_modules/jest/bin/jest.js src/components/apk/AdvantageGamesAuthoringQc.tutorial.test.tsx --runInBand
```

Result: exit 0. One suite and four tests passed.

Focused ESLint passed for the two tutorial files and two capture scripts.

Run from `apps/codecamp-advantage`:

```bash
node ../../node_modules/eslint/bin/eslint.js components/tutor-coach.tsx
```

Result: exit 0 with no errors.

## Changed files

- `apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx`
- `apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tutorial.test.tsx`
- `apps/advantage-games/scripts/capture-one.mjs`
- `apps/advantage-games/scripts/rune-match-capture.mjs`
- `apps/codecamp-advantage/components/tutor-coach.tsx`

Root must update `graph.db` for the component edits.

## Haunted Library fixture

The door-stun failure came from unrelated random ghosts in the test state.

The target ghost remained stunned and could not damage the player.

Another active ghost could overlap the player and remove one life.

The test now keeps only the target ghost before the interaction.

Production logic and public contracts remain unchanged.

Run from `apps/advantage-games`:

```bash
node ../../node_modules/jest/bin/jest.js src/lib/games/hauntedLibrary.test.ts --runInBand
```

Result: exit 0. One suite and 20 tests passed.

Changed file:

- `apps/advantage-games/src/lib/games/hauntedLibrary.test.ts`
