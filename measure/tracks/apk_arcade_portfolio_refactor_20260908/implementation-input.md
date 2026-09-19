# Shared input implementation

## Changes

The browser controller ignores composing text and keyboard events from editable or interactive elements.
Blur and document hiding clear held and queued input.
Late pointer releases cannot complete cancelled gestures.
Pause, resume, restart, and runtime visibility transitions reset the controller.
The optional reset method preserves existing injected controller fixtures.

## Verification

Input Red: six new cases failed while seven existing cases passed.
Runtime Red: the new pause, resume, and restart case failed before reset integration.
Green: 41 tests passed across input and runtime suites.

Command: `node ../../node_modules/vitest/vitest.mjs run src/runtime/input.test.ts src/runtime/runtime.test.ts`

Working directory: `packages/advantage-play-kit`.
This verifies focus safety; it does not complete shared semantic controls or visual control layouts.

## Renderer pause correction

Phaser excludes paused scenes from its active scene list.
The factory now tracks the scenes that it pauses.
Capture and recomposition include those paused scenes.
Native game pause also stops scenes that become active after the initial pause.
Resume restores the native game and the tracked scenes.

The focused factory, input, and grid suites pass 18 tests after this correction.
The browser verified that resume starts a scene paused before its first frame.

## Canvas size correction

The Phaser FIT mode retained its original buffer after a layout change.
Recomposition now calls `setGameSize` with the new safe rectangle.
The regression test failed before the change and passed after it.
The package build and focused lint passed.
The browser verified the updated buffer dimensions and preserved question progress.

## Paused canvas redraw

The browser showed a blank canvas after resizing a paused game.
The factory now renders the resized scene without resuming the game or advancing simulation.
The regression test failed before the change and passed after it.
The package build, focused lint, and graph update passed.
An independent Sol review found no blocking issue in the render sequence.
The Wizard scene now refreshes its layout before this redraw.
The browser verified both compact and wide paused layouts without resuming gameplay.
