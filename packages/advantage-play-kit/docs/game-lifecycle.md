# APK Standard Game Lifecycle

This document describes the shared S1/S2 lifecycle boundary for
`@reading-advantage/advantage-play-kit`. It is host-neutral: the cartridge keeps
owning its Phaser scene and mechanic, while APK owns the accessible briefing gate,
guided tutorial sequencing, and the validated phase-transition vocabulary.

## Phases and transitions

`gameLifecycleTransitionSchema` accepts only these strict, serializable
transitions:

| From | Event | Allowed target |
| --- | --- | --- |
| `briefing` | `start` | `tutorial`, `demo`, `countdown`, or `playing` |
| `tutorial` | `tutorial-complete` | `countdown` or `playing` |
| `tutorial` | `tutorial-skip` | `countdown` or `playing` |
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
`tutorial`, `demo`, or `countdown` target is a valid contract transition. The
shared S2 tutorial controller now owns the `tutorial` phase; the safe demo
controller remains a later S3 capability. A host must report an unavailable
controller rather than mounting gameplay under a false phase.

## Shared tutorial path

The standard guided path is:

```text
briefing --start--> tutorial --tutorial-complete--> countdown --countdown-complete--> playing --game-complete--> results
                                      └--tutorial-skip--> countdown or playing
```

APK owns tutorial sequencing, pause/resume, ordered advance, replay, skip, and
progress. The cartridge supplies only serializable semantic target IDs and
deterministic action IDs in its tutorial definition. A runtime-only
`GameTutorialActionDriver` executes those actions against the cartridge's real
Phaser mechanic. It does not recreate the tutorial cards, accept DOM selectors
or screen coordinates, or become a second game implementation.

Tutorial playback is an educational sandbox. Its completion, skip, correct
feedback, and incorrect feedback may be demonstrated, but the tutorial policy
always suppresses `GameResults`, persisted progress, authoritative XP,
leaderboard writes, and normal failure consequences. The host owns navigation,
persistence, and authoritative XP. `tutorial-skip` can never target `results`.

For the intern declaration and action-driver example, see
[developer-kit.md](./developer-kit.md#guided-gameplay-tutorial).

## Briefing gate and restart

When `APKGameHost` receives a valid `briefing`, it validates the briefing and the
selected vocabulary/sentence input before rendering `GameBriefingScreen`. The
cartridge factory is not called while the briefing is visible. A single Start
activation validates `briefing + start -> configured phase`; the default
`playing` transition then creates the cartridge mount. The screen's Start guard
and the host's lifecycle guard make repeated activation one transition.

When a briefing-enabled host restarts, it destroys the active cartridge handle,
clears the runtime mount, and returns to the briefing surface. Tutorial replay
uses the same validated definition and seed, then returns to the tutorial's
first step without creating a second canvas or leaking timers, listeners, input
handlers, or Phaser objects. If no `briefing` prop is provided, the host retains
the low-level immediate-launch behavior and mounts the cartridge when the host
effect runs.

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
and `totalAttempts`). The cartridge remains the gameplay owner; APK remains the
tutorial presentation and lifecycle owner; the host remains responsible for
navigation, persistence, authoritative XP, and forwarding a validated result
from normal gameplay only.
