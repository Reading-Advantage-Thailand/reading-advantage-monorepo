# Wizard vs. Zombie Implementation Record

## Result

The Wizard graveyard now uses deterministic cached grid navigation. Zombies route around visible solids from all four cardinal gates.

The scene shows a labeled shockwave button. The shockwave displays a radial ring and keeps every pushed zombie outside solids.

The listening pilot hides the source term before assistance. Game time, movement, spawning, damage, and collection wait for the indexed prompt.

Audio failure shows Retry and Reading mode actions. Reading mode records fallback evidence and returns zero score and XP.

## Map and navigation

`grid-navigation.ts` builds one breadth-first field for the current target cell. Each zombie reads at most four neighboring distances per frame.

The navigator rebuilds after the wizard enters another grid cell. Segment checks prevent corner cuts.

A 262,144-cell limit bounds typed-array allocation. Restore now preserves the partial zombie spawn interval.

Crypt and grave solids match their visible bases. Restore rejects blocked wizards, blocked zombies, out-of-bounds zombies, and unreachable orbs.

Orb sprites use centered origins. Player and enemy sprites use explicit lower-body origins for consistent foot placement.

## Learning behavior

Orb generation removes distractors with the current displayed translation. A contiguous cursor assigns every distinct distractor once.

One-item, two-item, and three-item decks show only their distinct answer count. Each active layout has exactly one correct answer.

Fresh controllers can restore later active targets. Fairness validation uses the restored target translation.

The strict vocabulary input and five-field result remain unchanged.

## Listening behavior

The scene calls `play(itemPosition)` when each round starts. Only a completed snapshot with the matching position unlocks the round.

Retry repeats required playback. Replay uses `replay(itemPosition)` after successful playback.

Transcript assistance records the active item before it reveals the term. Reading fallback cancels pending playback before it unlocks the round.

A generation token rejects stale async completion. The next target starts its own playback and freezes the new round.

Muted cancellation remains blocked. An explicit successful retry resumes the simulation.

## Compact layout

The compact scene removes the duplicate title. Prompt, status, health, ability, and audio controls use separate rows.

Compact buttons exceed 44 screen pixels at 360×704. Text uses at least 14 pixels.

The cartridge declares a 960×540 default. `phaser-factory.ts` overrides both dimensions with the active composition safe rectangle.

The scene uses one bottom status line. It hides the competing instruction line in compact mode.

The scene projects the complete arena between the opaque top HUD and footer.

The same projection controls ground, features, actors, crystals, labels, and shockwave effects.

The inverse projection maps screen taps back into the unchanged 960×540 collision world.

Tests prove that wizard bounds, every solid, and every crystal stay inside the visible arena.

Each responsive update refreshes text widths, font sizes, and alignment for the current scene size.

Compact progress uses one short row. A compact-to-wide test verifies fresh header and footer widths.

Compact crystal labels use a 72-pixel minimum width and a 14-pixel font.

The label bounds stay inside separate left and right choice columns.

Responsive recomposition refreshes the display immediately while the simulation remains paused.

The contact latch records a physical crystal zone. It blocks repeated answers until the wizard leaves that zone.

Responsive capture and restore preserve the active contact latch and its zone.

The controls stay above every gameplay sprite.

Props keep their source aspect ratios. The player renders at least 48 pixels, and enemies render at least 64 pixels.

## RED evidence

The navigation helper initially did not exist. Four gate, route, pickup, and touch tests failed.

Four listening tests failed before scene integration. The timer advanced before playback, and the controls had no handlers.

Five review tests failed before the correction batch. They covered short decks, later restores, spawn timing, blocked state, and crypt solids.

The visibility test failed while the HUD covered the initial wizard and upper crystals.

## GREEN evidence

- Wizard suite: 55 tests passed.
- Grid navigation and gameplay primitives: 13 tests passed.
- APK type check: passed.
- Game cartridges type check: passed.
- Game cartridges build: passed.
- Focused lint: passed.
- Diff check: passed.
- Full Game Cartridges suite: 650 tests passed after the Thai label correction and before immediate paused reflow.
- Wizard coverage: 93.54% statements, 86.19% branches, 97% functions, and 97.26% lines.
- Graph update: two Wizard files updated.

## Browser evidence

The browser scene showed all four crystals and the player below the wide HUD.

Eight contact taps advanced only once. Standing still after resume did not submit another answer.

Successful audio completion started the horde and advanced the second prompt after collection.

Run the final rebuild at 360×704. Confirm unique labels, sprite origins, compact spacing, replay, transcript, and Reading mode.

Confirm the complete graveyard stays between the top controls and the footer at 360×704 and 960×540.

Confirm that compact-to-wide resizing keeps progress, health, feedback, and instructions inside their rows.
