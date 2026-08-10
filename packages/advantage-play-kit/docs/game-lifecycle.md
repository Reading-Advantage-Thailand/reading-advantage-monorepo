# APK Standard Game Lifecycle

This document describes the Phase S1 lifecycle boundary for
`@reading-advantage/advantage-play-kit`. It is host-neutral: the cartridge keeps
owning its Phaser scene and mechanic, while APK owns the accessible briefing gate
and the validated phase-transition vocabulary.

## Phases and transitions

`gameLifecycleTransitionSchema` accepts only these strict, serializable
transitions:

| From | Event | Allowed target |
| --- | --- | --- |
| `briefing` | `start` | `tutorial`, `demo`, `countdown`, or `playing` |
| `tutorial` | `tutorial-complete` | `countdown` or `playing` |
| `demo` | `demo-complete` | `tutorial`, `countdown`, or `playing` |
| `countdown` | `countdown-complete` | `playing` |
| `playing` | `game-complete` | `results` |
| `results` | `replay` | `briefing`, `tutorial`, `demo`, `countdown`, or `playing` |

The lifecycle schema rejects unknown phases/events, backward transitions, and
extra object fields. `GameLifecycleTransition` is the inferred TypeScript type;
`onLifecycleTransition` on `APKGameHost` receives the validated transition.

The default S1 path is:

```text
briefing --start--> playing --game-complete--> results
```

If `GameBriefing.startPhase` is omitted, use
`resolveGameBriefingStartPhase(briefing)`, which returns `playing`. A configured
`tutorial`, `demo`, or `countdown` target is a valid contract transition, but the
corresponding controllers are deferred to Phases S2 and S3. The current S1 host
reports that those phases are unavailable rather than mounting gameplay under a
false phase.

## Briefing gate and restart

When `APKGameHost` receives a valid `briefing`, it validates the briefing and the
selected vocabulary/sentence input before rendering `GameBriefingScreen`. The
cartridge factory is not called while the briefing is visible. A single Start
activation validates `briefing + start -> configured phase`; the default
`playing` transition then creates the cartridge mount. The screen's Start guard
and the host's lifecycle guard make repeated activation one transition.

When a briefing-enabled host restarts, it destroys the active cartridge handle,
clears the runtime mount, and returns to the briefing surface. This is the S1
restart-to-briefing behavior; future tutorial/demo controllers may choose a
different validated replay target. If no `briefing` prop is provided, the host
retains the low-level immediate-launch behavior and mounts the cartridge when the
host effect runs.

## Presentation and extension boundary

The briefing contract is data-only. All authored text must already be resolved
by the application host into nonempty Unicode strings before
`gameBriefingSchema` validation. Locale maps, message keys, translation
callbacks, `onStart`, and arbitrary extension properties do not belong in the
validated object.

The host may pass one bounded `ReactNode` through `briefingExtension` for
presentation-only content in the briefing footer. This is a host prop, not a
cartridge-facing lifecycle or briefing contract. `layoutProfile` selects
`compact` or `wide`; `inputMode` selects `touch`, `pointer-keyboard`, or `hybrid`.
The briefing screen uses those values to preserve readable, scrollable content
and show applicable control hints across compact/wide and touch/keyboard flows.

## ABI and ownership guarantees

This lifecycle layer is additive. It does not change `RuntimeCartridgeManifest`,
`RuntimeCartridge`, `CartridgeGameConfigContext`, `mountCartridge`, or the
injected `GameFactory` boundary. The cartridge still creates its Phaser config
through `createGameConfig` only after the host has validated the launch path.

It also does not change the established vocabulary/sentence input shapes or the
five-field `GameResults` contract (`accuracy`, `xp`, `score`, `correctAnswers`,
and `totalAttempts`). The cartridge remains the gameplay owner; the host remains
responsible for presentation, lifecycle gating, navigation, and forwarding the
validated result.
