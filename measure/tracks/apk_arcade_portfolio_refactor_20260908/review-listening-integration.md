# Listening integration review

## Status

All four review findings are resolved in the current working tree.
The reviewed focused tests and package type checks pass.
Wizard integration remains in progress and is outside this final review.

## Final dispositions

- H1 resolved: runtime completion snapshots validated evidence and passes it separately from `GameResults`.
- M1 resolved: aborted browser preparation clears the source and reloads the element.
- M2 resolved: background music now uses the canonical base-path helper.
- M3 resolved: the Phaser adapter now pauses the game before it tracks scenes for recomposition.

The React host preserves the result, outcome, and evidence as one provisional completion.
Save retries reuse the original evidence snapshot.
All three authenticated adapters send evidence under `metadata.learningEvidence`.
Legacy completion callbacks still receive two arguments when evidence is absent.

## Scope

This review covered these boundaries:

- `packages/advantage-play-kit/src/runtime/runtime.ts`
- `packages/advantage-play-kit/src/runtime/phaser-factory.ts`
- `packages/advantage-play-kit/src/react/apk-game-host.tsx`
- `packages/advantage-play-kit/src/audio/browser-playback.ts`
- `apps/advantage-games/src/components/apk/PublicCartridgeHost.tsx`
- `apps/advantage-games/src/hooks/useBackgroundMusic.ts`

## High severity

### H1: Learning evidence cannot reach completion persistence

The controller exposes learning evidence through `getEvidence()` in `audio/contracts.ts:201` and `audio/playback-controller.ts:501`.
No production caller reads that method.
The graph caller query returned no matches.

The runtime completion callback carries only results and outcome at `runtime/types.ts:283-287`.
The React host callback has the same boundary at `react/apk-game-host.tsx:92-96`.
The host persists only those values at `react/apk-game-host.tsx:498-520`.

This gap prevents authenticated hosts from saving replay, assistance, fallback, and audio failure evidence.
The public fixture does not persist progress, so this gap does not change its stated preview behavior.

Capture validated evidence before the controller pauses or destroys.
Pass it through a host-owned completion metadata boundary.
Keep the five-field `GameResults` unchanged.

## Medium severity

### M1: Aborted browser preparation retains its source

The preparation abort handler pauses the element at `audio/browser-playback.ts:71-77`.
It does not remove `src` or call `load()` after removal.
The normal release path performs both actions at `audio/browser-playback.ts:85-90`.

An aborted active load or speculative preload can retain its network resource until garbage collection.
Repeated mode changes can increase this transient resource use.

Clear the source during preparation abort and preparation error handling.
Keep listener cleanup before source cleanup.

### M2: Background music ignores the configured base path

The application supports a deployment base path at `apps/advantage-games/next.config.ts:9-33`.
Listening prompt URLs use `withBasePath` at `PublicCartridgeHost.tsx:99-103`.
The music hook uses an absolute root path at `useBackgroundMusic.ts:63-65`.

A base-path deployment can load listening prompts while background music returns 404.
Ducking then has no audible background track to lower.

Build the music URL with the canonical base-path helper.
Add a base-path test for the music element source.

### M3: Phaser pause tracks only scenes active at the pause call

The factory snapshots active scenes at `runtime/phaser-factory.ts:78-83`.
Resume processes only that snapshot at `runtime/phaser-factory.ts:85-87`.
A scene activated later can run while the host reports a paused state.

The current factory test covers one existing scene at `runtime/phaser-factory.test.ts:7-79`.
It does not cover a scene activated after pause.
Current Wizard exposure appears low because its reviewed shell uses one scene.

Define the expected policy for scenes activated during pause.
Add a multi-scene lifecycle test before broader cartridge reuse.

## Verified behavior

The runtime gives listening controllers only to playing sessions at `runtime/runtime.ts:112` and `runtime/runtime.ts:322`.
Restart resets listening state before renderer replacement at `runtime/runtime.ts:465-482`.
Destroy cancels listening before renderer cleanup at `runtime/runtime.ts:498-518`.
Visibility loss and host pause cancel listening at `runtime/runtime.ts:404-425` and `runtime/runtime.ts:447-455`.

Mute reaches both listening and Phaser audio at `runtime/runtime.ts:486-495`.
Controller muting cancels active playback and blocks later play calls until unmuting.
Replay counts increase only after successful playback completion.

Runtime completion remains fire-once through `completionCount` at `runtime/runtime.ts:250-280`.
The React host also guards completion authority by mount generation.
This review found no duplicate completion path.

The public fixture uses four indexed vocabulary items at `public-vocabulary-fixture.ts:4-9`.
Its clip builder uses the same fixture order at `PublicCartridgeHost.tsx:99-103`.
All four expected MP3 files exist and contain MPEG audio.
This review found no public fixture pairing error.

The music duck adapter uses nested ownership at `useBackgroundMusic.ts:132-149`.
It restores the original volume only after the last owner releases.
Mute changes the element mute flag independently at `useBackgroundMusic.ts:128-130`.

## Test evidence

The focused APK run passed 119 tests across three files:

```bash
node ../../node_modules/vitest/vitest.mjs run src/runtime/runtime.test.ts src/runtime/phaser-factory.test.ts src/react/apk-game-host.test.tsx --maxWorkers=1 --no-file-parallelism
```

The focused public host run passed nine tests:

```bash
node ../../node_modules/jest/bin/jest.js src/components/apk/PublicCartridgeHost.test.tsx --runInBand
```

The final focused APK run passed 122 tests across three files.
The authenticated adapter runs passed 12, three, and four tests.
The APK and three authenticated application type checks passed.
Focused ESLint passed for every H1 and M1 implementation file.
The graph update indexed seven files, with 136 to 162 nodes and 258 to 257 edges.
Root owns browser verification and final integration.

## Save reliability follow-up

Six follow-up findings are resolved in the current working tree.

### F1: Save retries changed request timestamps

Resolved.
Each authenticated adapter now stores the complete first request for one session.
Retries reuse the same body, duration, client timestamp, evidence, and idempotency key.

### F2: Changed sessions could accept stale receipts

Resolved.
Each adapter rotates completion ownership when mounted content, route configuration, learning mode, or replay changes.
Late receipts cannot update the current result or the Advantage leaderboard.

### F3: Advantage music ignored game mute

Resolved.
Both Advantage hosts pass `onMutedChange` to the shared host.
The callback updates the current background music element.

### F4: Host cleanup retained external mute

Resolved.
The shared React host releases mute ownership during unmount and replacement.
It transfers an active mute state to the replacement observer.

### F5: Listening pause failure suppressed valid completion

Resolved.
The runtime records a pause diagnostic and continues an accepted validated completion.
The host receives the same five-field result and optional evidence argument.

### F6: Duplicate receipts reported false zero XP

Resolved.
Duplicate receipts show `Progress already saved` without a new XP claim.
The Advantage adapter records one leaderboard entry for repeated accepted receipts.
