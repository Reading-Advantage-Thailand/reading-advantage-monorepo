# Listening contracts implementation report

## Result

L1 listening contracts and completion validation are complete.
The feasible L2 domain response work is also complete.
No host, APK shell, runtime, storage, or cartridge file changed.

## Exported contracts

`@reading-advantage/game-contracts` now exports these schemas and types:

- `listeningSessionConfigSchema` and `ListeningSessionConfig`
- `listeningEvidenceSchema` and `ListeningEvidence`
- `completionMetadataSchema` and `CompletionMetadata`
- `listeningLocaleSchema`
- `MAX_LISTENING_SESSION_ITEMS`

The session configuration supports the current Listen to Select use case.
It requires explicit source and target locales.
It also requires an explicit fallback policy.
Scored listening always requires `targetLocaleFallback: "reject"`.

The evidence schema records item-position assistance, fallback, replay, and audio failures.
It limits each session to 50 items.
It rejects duplicate or out-of-range item positions.
Reading fallback requires `effectiveModality: "reading-fallback"`.

## Completion boundary

Both completion schemas now use `completionMetadataSchema`.
The schema validates the reserved `metadata.learningEvidence` value.
It preserves unrelated legacy metadata.
The route denylist remains responsible for protected server keys.

This change does not alter educational item schemas.
It does not alter the five-field `GameResults` schema.
It adds no database column and no hash.

## Learning content response

`listGameLearningContent` now returns these adjacent fields:

- `requestedTargetLocale`
- `selectedTargetLocales`
- Optional `listeningSession`

`selectedTargetLocales` aligns by index with `content`.
Each content item still contains only `term` and `translation`.
The result schema rejects mismatched array lengths.
Both arrays have a 50-item limit.

The query now reports each actual fallback locale.
It rejects fallback whenever the explicit policy is `reject`.
This rule applies to scored and unscored sessions.
Scored sessions cannot select `allow-explicit` during configuration validation.
The query does not validate the actual source language of each term.
`sourceLocale` remains explicit host configuration until content provenance supplies that fact.

## Red and green evidence

The initial game-contract run failed 13 new tests because the exports did not exist.
The initial domain run failed five tests because locale truth and evidence validation did not exist.

The final game-contract command passed 36 tests:

```bash
node ../../node_modules/vitest/vitest.mjs run src/__tests__/listening.test.ts src/__tests__/educational-io.test.ts --maxWorkers=1 --no-file-parallelism
```

The final domain command passed 43 tests:

```bash
node ../../node_modules/vitest/vitest.mjs run src/__tests__/game-learning-content.test.ts src/__tests__/games.test.ts --maxWorkers=1 --no-file-parallelism
```

Both package type checks passed:

```bash
node ../../node_modules/typescript/bin/tsc --noEmit
```

Focused ESLint checks passed for every changed source and test file.
The local game-contract build succeeded before domain tests.

## Graph update

The graph update completed for five structural source files.
It changed the indexed set from 33 to 49 nodes.
It changed the indexed set from 51 to 59 edges.

## Host integration note

The host parsers currently read and validate only `payload.content`.
The added adjacent response fields do not enter strict educational items.
Host adapters must validate the full response before using listening configuration.
Their route tests must add the required locale response fields.

The APK host owner received the exact exported names and shapes.
The host can persist `ListeningEvidence` as validated learning evidence metadata.
Authoritative completion receipts remain a separate host boundary.

## Shared audio module

The APK package now exports a provider-neutral `ListeningAudioController`.
The controller accepts indexed URL clips and injected preparation, playback, and ducking ports.
The native browser adapter uses `HTMLAudioElement` behind those ports.
It reports readiness after `canplay` and reports load, playback, and browser policy failures.

Preparation uses a configurable timeout from 100 through 30000 milliseconds.
Lookahead preparation accepts zero through three following clips.
Active readiness waits only for the active clip.
Speculative failure does not fail the active item.
Completed lookahead clips serve later rounds without another load.
The controller releases clips outside the current bounded window.
Playback uses a 30-second default timeout and accepts an explicit bounded override.
Pause, restart, and destroy cancel active preparation and playback.
Restart and destroy release all prepared clips.
Late preparation results also release their prepared resources.

The controller lowers background audio during prompt playback.
It restores the prior background state after completion, cancellation, or failure.
Successful replays increase replay counts.
Failed replays preserve failure evidence without increasing replay counts.
Playback completion records an audio operation, not proof that the learner heard it.

The controller records explicit transcript assistance and unscored reading fallback.
It rejects reading fallback for every scored listening session.
The host can set the controller mute state.
Muting cancels active playback and blocks play or replay until unmuting.
Muted requests report a structured failure without adding audio failure evidence.
Its `getEvidence()` result passes the strict `listeningEvidenceSchema`.
The controller preserves the educational content arrays and five-field `GameResults`.

The initial focused run failed because the new audio modules did not exist.
The final focused run passed 21 tests across two files:

```bash
node ../../node_modules/vitest/vitest.mjs run src/audio/__tests__/playback-controller.test.ts src/audio/__tests__/browser-playback.test.ts --maxWorkers=1 --no-file-parallelism
```

Focused ESLint passed for `src/audio` and `src/index.ts`.
The full APK package type check passed.

The final audio graph update completed for five structural files.
It changed the indexed set from 27 to 28 nodes.
The indexed set kept 27 edges.

## Remaining audio integration

The runtime owner must pass an optional controller through the game factory context.
The runtime must call pause, restart, and destroy during matching lifecycle events.
The host must create the browser ports for listening sessions.
The host must connect its existing music control to `AudioDuckingPort`.
The Wizard must await successful prompt completion before it enables collection.
The Wizard must hide the source term until explicit transcript assistance or fallback.

The host must map each selected prompt to its approved URL clip.
The host must persist the controller evidence under `metadata.learningEvidence`.
Pilot review must verify speech clarity, ducking, replay, cancellation, and audible playback.
The module adds no speech service and makes no hearing claim.
