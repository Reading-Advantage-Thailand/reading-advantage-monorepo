# Shared shell gap review

## Scope

This review compares the common shell requirements with current source and existing tests. It covers direct play, practice, results, replay, exit, touch, and three authenticated hosts.

This review contains source findings and test findings. It contains no live-play evidence, customer evidence, or phase acceptance claim.

The requirements come from `spec.md:69-93` and `plan.md:70-76` in this track.

## Confirmed coverage

| Area | Source evidence | Test evidence |
| --- | --- | --- |
| Direct play and practice | `packages/advantage-play-kit/src/react/apk-game-host.tsx:1787-1799` exposes separate Start and Practice actions. | `packages/advantage-play-kit/src/react/apk-game-host.test.tsx:138-169` verifies separate playing and tutorial mounts. |
| Practice isolation | `packages/advantage-play-kit/src/react/apk-game-host.tsx:1806-1820` mounts the tutorial controller outside the scored result path. | The direct-play and practice test verifies the tutorial session mode. |
| Victory and defeat | `packages/advantage-play-kit/src/react/apk-game-host.tsx:1890-1903` passes the terminal outcome into the shared result panel. | `packages/advantage-play-kit/src/react/apk-game-host.test.tsx:1320-1337` verifies defeat. `game-presentation.test.tsx:108-188` verifies victory persistence states. |
| Replay | `packages/advantage-play-kit/src/react/apk-game-host.tsx:1496-1555` cleans the old session and follows the configured replay entry. | `packages/advantage-play-kit/src/react/apk-game-host.test.tsx:941-1006` verifies briefing, tutorial, and direct-play replay targets. |
| Result exit | `packages/advantage-play-kit/src/react/apk-game-host.tsx:1900-1902` sends the configured destination to the host. | `packages/advantage-play-kit/src/presentation/__tests__/game-presentation.test.tsx:60-85` verifies the result Exit callback. |
| Input cleanup | `packages/advantage-play-kit/src/runtime/input.ts:121-141` clears input on blur, visibility loss, and pointer cancellation. | `packages/advantage-play-kit/src/runtime/input.test.ts:41-69` and `:155-211` verify these paths. |
| Host shell use | All three authenticated adapters mount `APKGameHost` with the same standard experience and responsive policy. | Each adapter test verifies the shared host prop boundary and completion persistence. |

## Implemented corrections

### S1. Normal play and practice now provide Exit

The normal control group exposes Exit game. The tutorial group exposes Exit practice.

The Exit path invalidates the session and cleans its resources before catalog navigation. Failed navigation returns to the briefing.

Evidence: `packages/advantage-play-kit/src/react/apk-game-host.tsx` and `packages/advantage-play-kit/src/react/apk-game-host.test.tsx`.

Tests cover active play, paused play, practice, results, and failed navigation.

### S2. Common live controls follow the touch policy

Common live controls use a 48-pixel minimum height. The host applies the configured target and accessibility touch scale.

Evidence: `packages/advantage-play-kit/src/responsive/responsive-composition.ts:100-111` and `packages/advantage-play-kit/src/react/apk-game-host.tsx`.

Tests verify the 48-pixel floor and a scaled 72-pixel target.

## Further corrections and remaining verification

### S3. The tutorial now follows the system motion preference

The shared host subscribes to the browser preference and passes it to the existing tutorial transition.
The host removes the subscription during cleanup.
The primary agent changed the preference in a real browser during Practice.
The computed transition changed from `none` to `border-color 0.16s` without restarting the example.
The static briefing and results need no additional motion props.

### S4. Result focus correction is implemented

The result heading receives focus when the panel mounts. Save updates preserve the learner's current focus.
Replay returns focus to Play now in the briefing.

The primary agent verified victory focus and replay focus through the public Dragon Flight preview.
The presentation tests verify focus behavior. This evidence does not establish the quality of Dragon Flight gameplay.

### S5. The runtime now measures the remaining unsafe overlap

All three adapters supply the browser inset resolver and retain the static fallback.
The resolver measures CSS environment insets against the canvas bounds.
It preserves signed page coordinates and converts CSS scaling to container coordinates.
The runtime updates after resize, visual viewport changes, and page scroll.
Unchanged geometry skips recomposition. Cleanup removes the listeners.

The focused geometry and runtime suites pass 41 tests.
The rebuilt public preview renders at phone and wide sizes with this resolver.
Actual nonzero display cutouts still need device or emulator verification.

### S6. Compact canvas rules now match across hosts

All three adapters use the same viewport sizing rules and reserve space for the common controls.
The primary agent verified the public Wizard board and controls together at 390 by 844 pixels.
Practice uses a minimum canvas height of 592 pixels. Smaller viewports permit scrolling instead of an unsupported composition.
The primary agent verified that the corrected Practice canvas renders the graveyard and English choices.

The Reading and Primary browser checks remain pending. Shared source rules and adapter tests do not prove those browser flows.

### S7. Host tests do not prove one common lifecycle matrix

The Advantage adapter tests both victory and defeat completion mapping at `AuthenticatedCartridgeHost.test.tsx:176-232`.

The Reading and Primary adapter suites focus on persistence and content loading. They do not exercise result Exit navigation or both terminal outcomes.

Evidence: `apps/reading-advantage/components/apk/StudentCartridgeHost.test.tsx:93-335` and `apps/primary-advantage/components/apk/__tests__/StudentCartridgeHost.test.tsx:131-330`.

All adapter tests mock `APKGameHost`. They do not prove direct play, practice, replay, and Exit through the real shared component.

Create one shared lifecycle contract suite for all three adapters. Cover direct play, practice, victory, defeat, replay, Exit, and cleanup.

## Owner decisions

Running-game Exit returns directly to the catalog after session cleanup.

Reduced motion follows the system preference.

Compact live play fits one viewport and keeps the common controls visible.
