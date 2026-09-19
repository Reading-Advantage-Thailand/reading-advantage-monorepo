# Listening implementation handoff

## Scope and status

This packet covers Listen to Select in Wizard vs. Zombie and its host evidence dependencies.
It plans production work but changes no production code.
The first pilot speaks English terms and shows Thai translations.
The host must supply both locales explicitly.
The language direction remains a reversible pilot setting.

## Protected contracts

- Keep `VocabularyInput` and `SentenceInput` as strict arrays of `{ term, translation }`.
- Keep `GameResults` at `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`.
- Keep audio references outside each educational item.
- Keep learning evidence outside `GameResults`.
- Use item positions for duplicate terms.
- Do not create content hashes or audio hashes.
- Do not generate prompt audio during a gameplay request.

## Confirmed source findings

| Boundary | Exact source | Confirmed behavior | Implementation effect |
|---|---|---|---|
| Educational ABI | `packages/game-contracts/src/educational-io.ts` | Both input schemas contain only `term` and `translation`. `gameResultsSchema` is strict. | Add no audio or evidence fields here. |
| Completion mapping | `packages/game-contracts/src/completion.ts` | `mapGameResultsToCompletionInput` removes display XP. It copies optional metadata from host context. | Keep the five-field result unchanged. Validate a reserved evidence value separately. |
| Server completion | `packages/domain/src/games/schema.ts` | `gameCompletionInputSchema` accepts an open metadata record. | Current validation does not validate learning evidence. |
| HTTP guard | `apps/advantage-games/src/lib/apk/completion-route.ts` | The route rejects nested identity, tenant, permission, and XP metadata keys. | The guard does not validate modality, locales, assistance, or fallback. |
| Persistence | `packages/domain/src/games/mutations.ts` | `recordGameCompletion` writes metadata to `gameCompletions`. | Valid metadata reaches durable storage. |
| Database | `packages/db/src/schema/analytics.ts` | `game_completions.metadata` is a JSONB column. | A validated nested evidence record needs no new column. |
| Host completion | `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx` | The host writes `contentSource` and `inputMode` metadata. | This host must own the evidence accumulator. |
| Reading host | `apps/reading-advantage/components/apk/StudentCartridgeHost.tsx` | The host also writes its host name into metadata. | Apply the same validated evidence path here. |
| Primary host | `apps/primary-advantage/components/apk/StudentCartridgeHost.tsx` | The host also writes its host name into metadata. | Apply the same validated evidence path here. |
| Content query | `packages/domain/src/games/learning-content.ts` | The result returns mode, source, and the strict content array. | Add session configuration beside `content`, never inside it. |
| Locale selection | `packages/domain/src/games/learning-content.ts` | `selectTranslation` can silently use a fallback locale. The result omits the chosen locale. | The host cannot currently prove the target locale. Fix this before scored listening. |
| APK runtime | `packages/advantage-play-kit/src/runtime/types.ts` | Mount options carry input, edition, host, mode, seed, and responsive settings. | No session modality or speech service exists. |
| APK lifecycle | `packages/advantage-play-kit/src/runtime/runtime.ts` | APK owns mount, pause, restart, mute, completion, and destroy behavior. | Extend this lifecycle for speech cancellation and cleanup. |
| APK host | `packages/advantage-play-kit/src/react/apk-game-host.tsx` | The React host owns the runtime handle and presentation phases. | Put readiness and retry UI at this shared boundary. |
| Music | `apps/advantage-games/src/hooks/useBackgroundMusic.ts` | One `HTMLAudioElement` plays at fixed volume. It supports start, pause, and stop. | It has no gain control or speech ducking. |
| Effects | `apps/advantage-games/src/hooks/useSound.ts` | Each effect creates audio independently. A synthesizer handles failed file playback. | It has no shared bus, cleanup, or independent setting. |
| Reading TTS | `apps/reading-advantage/server/utils/generators/audio-words-generator.ts` | It calls Google TTS directly, chooses a random voice, writes a combined MP3, and stores timestamps. | Reuse its proven service knowledge only. Do not import this generator into APK. |
| Primary TTS | `apps/primary-advantage/server/utils/genaretors/audio-word-generator.ts` | It repeats the direct Google request and app storage helper. | This duplicate is not a provider-neutral adapter. |
| AI package | `packages/ai/src/types.ts` | The adapter supports audio transcription. It has no speech synthesis method. | Do not claim an internal TTS adapter exists. |
| Storage | `packages/storage/src/client.ts` | `StorageClient` supports put, get, URL, signed URL, existence, and delete. | Reuse this provider-neutral object boundary for generated audio. |
| Storage factory | `packages/storage/src/factory.ts` | `getStorageClient` validates configuration and creates the S3-compatible driver. | Keep provider details outside games and hosts. |
| Wizard learning state | `packages/game-cartridges/src/wizard-vs-zombie.ts` | The snapshot exposes a written term prompt and written translations. | Scored listening must hide the written term by default. |
| Wizard timing | `packages/game-cartridges/src/wizard-vs-zombie.ts` | Zombie time and spawning begin whenever `advance` runs. | Gate challenge pressure on required speech playback. |
| Duplicate identity | `packages/game-cartridges/src/wizard-vs-zombie.ts` | `targetIndex` and orb identifiers include item positions. | Use positions for audio references and evidence. |

## Corrections required before implementation

The current metadata path validates only a generic record and forbidden server keys.
It persists arbitrary remaining values without a learning-evidence contract.
P3.6 must add strict nested validation before the pilot uses this path.

The content query can return a fallback translation without reporting its locale.
Scored English-to-Thai listening must reject or label a non-Thai fallback.
The query must return the selected target locale beside the strict content array.

No reusable speech synthesis adapter exists in APK or `packages/ai`.
The Reading and Primary generators couple Google requests, random voices, local files, and app storage helpers.
They cannot provide ranked prompt consistency without refactoring.

APK mute state reaches the renderer through `setMuted`.
Background music remains outside that runtime in host hooks.
Speech ducking needs one shared audio coordination boundary.

The accepted standard pack contains one confirmed audio cue: `audio/native/combat/hit-01.ogg`.
The public game app also contains music and legacy effect files.
These files do not prove that each cue is the best pilot selection.

## Proposed contract placement

Create `packages/game-contracts/src/listening.ts` for browser-safe schemas and types.
Export the new contracts from `packages/game-contracts/src/index.ts`.
Do not change `educational-io.ts` shapes.

Define `listeningSessionConfigSchema` as a strict optional session configuration.
It should contain these values:

- `modality`: `read-to-select` or `listen-to-select`.
- `sourceLocale`: an explicit BCP 47 language tag.
- `targetLocale`: an explicit BCP 47 language tag.
- `timingPolicy`: a named pressure-start policy.
- `promptAudio`: a bounded array of item-position references.
- `transcriptPolicy`: explicit practice and scored rules.
- `fallbackPolicy`: explicit retry and reading-mode rules.
- `replayPolicy`: a bounded replay count and protection policy.

Each prompt reference must identify one `itemIndex`.
It should contain a browser-safe URL or opaque host reference.
It should also contain a stable voice identifier, duration, and media type.
Validation must reject duplicate positions, missing positions, and deck-length mismatches.

Define `listeningEvidenceSchema` as a strict versioned record.
Record the declared modality, effective modality, locales, and timing policy.
Record assisted item positions, fallback item positions, and replay counts by item position.
Record audio failures by item position and stable failure code.
Bound every array and counter to the session deck.

Reserve `metadata.learningEvidence` for the validated record.
Keep existing metadata keys compatible.
Make both game-contract and domain schemas validate this reserved value.
Keep the route denylist after schema validation.

## Shared playback design

Add a focused audio module under `packages/advantage-play-kit/src/audio/`.
Use `contracts.ts`, `playback-controller.ts`, and `browser-playback.ts` as initial files.
Export the module through the APK public entry points.

The controller owns these states:

`idle -> loading -> ready -> playing -> completed`

`loading | ready | playing -> failed`

`loading | ready | playing -> cancelled`

The controller must use a generation token or `AbortController` for stale work.
Cancellation must stop playback and remove listeners.
Destroy must release every owned audio element.
Restart must clear readiness, replay, assistance, and failure state.

Preload the current prompt and a small next-prompt window.
Make the window a bounded configuration value.
Do not load the complete portfolio deck without a measured need.
The first required prompt must reach `ready` before scored play starts.

Start challenge pressure when required playback begins under the configured policy.
Do not wait for playback completion unless the selected policy requires it.
Pause and focus loss must cancel or pause speech through one tested rule.
Target changes must cancel stale speech before the next prompt starts.

Register music, speech, and effects as independent channels.
Speech start must lower music gain to a tested level.
Speech completion, failure, or cancellation must restore the prior music gain.
Effects must never mask the spoken term.
Expose separate speech, music, and effects settings.

The existing music hook can supply a host adapter after it gains controlled volume.
Do not duplicate its music element inside each cartridge.
Migrate the hook behind the shared coordinator in a bounded host batch.

## Readiness and failure behavior

The briefing screen must show `Preparing audio`, `Audio ready`, or `Audio unavailable`.
Disable scored Listen to Select until required audio becomes ready.
Keep practice available when the browser can provide an explicitly labeled speech preview.

An audio failure must show Retry and Reading mode actions.
Reading mode must expose the term and change the effective modality.
Persist every affected item position as fallback evidence.
Never label that completion as unassisted listening.

Practice may show a transcript through an explicit control.
Scored play may show a transcript only as recorded assistance.
The transcript action must remain visible and accessible by keyboard and touch.
The host must record the item position before it reveals the transcript.

Replay must use the shared `replay-audio` action.
The initial playback does not count as replay.
Each replay must increment evidence for the active item.
Protection must stop after the configured replay limit.
The owner must select the exact replay and protection values before implementation.

## Wizard vs. Zombie integration

Keep `createWizardVsZombieController` transport independent.
Extend its options with validated round-readiness signals or a small timing port.
Do not pass an audio provider into the controller.

For Listen to Select, speak `currentItem().term` in `sourceLocale`.
Render each candidate `translation` as the selectable answer.
Hide `snapshot.prompt` during unassisted scored listening.
Keep the written prompt available in Reading mode and assisted transcript state.

The current orb model includes both term and translation.
The renderer must choose visible text from the session modality.
Do not remove internal term data when controller tests still need it.

Suspend zombie spawning, movement, and damage before the first required playback begins.
Apply the selected timing policy again after each target change.
Keep player movement handling responsive during allowed replay protection.
Do not let repeated replay create unlimited safe time.

## Ranked audio preparation

Use `packages/storage` for provider-neutral object storage.
Add no direct provider SDK calls in cartridges, APK, or host components.
Create a minimal internal speech synthesis port before adapting Google TTS.

The existing Google code proves an available service path.
It does not prove stable voice selection, cache identity, or operational readiness.
Verify credentials, quota, voice availability, pronunciation, and licensing before ranked use.

The generation job must pin source locale, voice, encoding, and synthesis settings.
It must store one reference per session item position.
It must validate media type, nonzero duration, and successful decoding.
It must publish references only after every required prompt passes validation.

Do not use the legacy random voice selection for ranked prompts.
Do not slice a combined article MP3 during gameplay.
Do not call Google TTS from a browser route.
Browser speech may support labeled practice after pronunciation review.

## New APK asset selection

Compare available new audio, music, and UI cue assets before binding the pilot.
Use semantic roles such as `audio-feedback:correct` and `control:replay-audio`.
Do not bind a physical path directly from the cartridge.

The confirmed standard cue can enter the comparison for correct feedback.
Compare it with existing `success.mp3` and other eligible imported cues.
Test speech intelligibility with each candidate at pilot volumes.
Reject cues that mask consonants, prompt starts, or Thai answer reading.

Compare the Wizard music track with eligible new music before final selection.
Require clean looping, clear ducking, and acceptable mobile decoding.
Use readable replay, transcript, retry, and reading-mode UI assets.
Do not treat an existing binding as the final selection.

Asset publication must follow the existing semantic selection and license process.
This packet requests no new hashes and no wider manifest work.

## First implementation batches

### L1: Listening contracts and metadata validation

Owner: one Sol medium task.

Files:

- `packages/game-contracts/src/listening.ts`
- `packages/game-contracts/src/index.ts`
- `packages/game-contracts/src/completion.ts`
- `packages/domain/src/games/schema.ts`
- Corresponding tests in both packages

Deliver strict session and evidence schemas.
Validate `metadata.learningEvidence` while preserving unrelated metadata.
Add negative tests for unknown fields, invalid locales, oversized arrays, and duplicate item positions.
Keep `GameResults` and educational items byte-for-byte compatible in shape.

Dependency: none beyond current Zod contracts.

### L2: Content locale truth and audio reference envelope

Owner: one Sol medium task after L1.

Files:

- `packages/domain/src/games/learning-content.ts`
- `apps/advantage-games/src/lib/apk/content-route.ts`
- `apps/reading-advantage/app/api/v1/apk/content/route.ts`
- `apps/primary-advantage/app/api/v1/apk/content/route.ts`
- Existing route and domain tests

Return explicit source and selected target locales beside `content`.
Return optional validated session configuration beside `content`.
Keep every content item strict.
Test requested Thai, actual Thai, explicit fallback, and rejected scored fallback.

Dependency: L1.

### L3: APK playback and audio coordination

Owner: one Sol medium task after L1.

Files:

- `packages/advantage-play-kit/src/audio/contracts.ts`
- `packages/advantage-play-kit/src/audio/playback-controller.ts`
- `packages/advantage-play-kit/src/audio/browser-playback.ts`
- `packages/advantage-play-kit/src/runtime/types.ts`
- `packages/advantage-play-kit/src/runtime/runtime.ts`
- `packages/advantage-play-kit/src/react/apk-game-host.tsx`
- APK audio, runtime, and React tests

Implement readiness, bounded preload, replay, cancellation, cleanup, and channel ducking.
Keep new mount values optional for old hosts.
Add the `replay-audio` capability without forcing it onto reading cartridges.

Dependencies: L1 and the shared control contract from Phase 1.

### L4: Ranked prompt preparation

Owner: one Sol medium task after L1.

Files require final placement during Phase 0 reconciliation.
Prefer a provider-neutral backend speech module and the existing storage client.
Adapt the proven Google service only after the operational checks pass.

Do not edit both legacy generators during the first pilot batch.
Create one bounded preparation command or worker path.
Test a fixed voice, stable item-position mapping, partial failure, retry, and publication after full validation.

Dependencies: L1, storage configuration, provider decision, and worker ownership.

### L5: Three host adapters and durable evidence

Owner: one Sol medium task after L1 through L3.

Files:

- `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx`
- `apps/reading-advantage/components/apk/StudentCartridgeHost.tsx`
- `apps/primary-advantage/components/apk/StudentCartridgeHost.tsx`
- `apps/advantage-games/src/lib/apk/completion-route.ts`
- Host tests and completion route tests

Let each host supply explicit locales and session configuration.
Aggregate validated APK evidence by item position.
Persist the evidence through `metadata.learningEvidence` at terminal completion.
Reject invalid evidence before `recordGameCompletion` runs.

Dependency: L1 through L3.

### L6: Wizard Listen to Select pilot

Owner: one Sol medium task after L2, L3, and L5.

Files:

- `packages/game-cartridges/src/wizard-vs-zombie.ts`
- `packages/game-cartridges/src/wizard-vs-zombie.test.ts`
- Wizard browser behavior tests under `apps/advantage-games/tests/e2e/`

Add modality-aware prompt rendering and readiness gates.
Add target-change playback and bounded replay protection.
Preserve movement, translation collection, shockwave behavior, and five-field completion.

Dependencies: L2, L3, L5, shared controls, and map timing ownership.

### L7: Comparative cue selection and audible verification

Owner: one Sol medium task after L3 and the Phase 1A asset shortlist.

Files:

- Existing semantic asset decision files selected during reconciliation
- Wizard music and cue host bindings
- Browser verification evidence in this track

Compare eligible new and existing assets in the live Wizard scene.
Verify speech intelligibility, ducking, decoding, loops, and accessible UI cues.
Record the selected semantic roles and rejected masking candidates.

Dependencies: L3, Phase 1A asset selection, and actual prompt audio.

## Behavioral test matrix

| Case | Required observation |
|---|---|
| First scored prompt | Pressure remains stopped until required playback begins. |
| Successful prompt | English speech plays while Thai choices remain readable. |
| Autoplay restriction | Briefing reports blocked readiness and requires one clear student gesture. |
| Late load | No zombie pressure starts while required audio remains unavailable. |
| Failed load | Retry and labeled Reading mode appear. |
| Reading fallback | Completion records the effective modality and fallback item position. |
| Transcript assistance | The term appears only after evidence records the active item position. |
| Replay | The active prompt replays and increments that item's counter once. |
| Replay limit | Additional replay gives no extra protection. |
| Target change | Stale playback stops before the next prompt begins. |
| Pause | Speech and pressure follow one documented pause policy. |
| Focus loss | Held input clears, speech follows policy, and no hidden pressure continues. |
| Restart | Playback, assistance, counters, failures, and old listeners reset. |
| Unmount | Every owned audio element stops and releases listeners. |
| Speech ducking | Music falls before speech and returns after every terminal speech state. |
| Effect overlap | Correct and damage cues do not mask the spoken term. |
| Independent settings | Speech, music, and effects settings change only their channels. |
| Duplicate terms | Item positions keep prompt references and evidence distinct. |
| Short deck | Preload and distractor logic stay bounded. |
| Missing Thai | Scored English-to-Thai listening refuses silent locale fallback. |
| Invalid evidence | The server rejects completion before persistence. |
| Valid evidence | The JSONB row contains the exact validated nested record. |
| Old reading host | It completes without session configuration or evidence. |
| Five-field result | Cartridge completion emits exactly the established fields. |
| Mobile audio | A real touch gesture unlocks audible prompt playback. |
| Cue comparison | Selected music and effects remain clear under spoken prompts. |

## Plan corrections for reconciliation

1. Expand P1.3 to reserve and validate `metadata.learningEvidence`.
2. Add selected target locale reporting to P1.3.
3. State that metadata persistence exists but evidence validation does not.
4. Split P3.1 into recordings, synthesis, storage, playback, and locale audits.
5. Add the missing internal synthesis adapter decision before P3.2 implementation.
6. Make P3.3 test item-position identity for duplicate terms.
7. Make P3.4 include a shared music, speech, and effects coordinator.
8. Make P3.5 hide the written term during unassisted scored listening.
9. Make P3.6 validate the reserved evidence record at both schema boundaries.
10. Make P3.7 reject silent locale fallback during the English-to-Thai pilot.
11. Add comparative cue selection and intelligibility checks to P3.8.
12. Coordinate P4 timing changes with the listening readiness gate.

## Pending decisions and checks

- The team must propose replay limits and protection duration for pilot review.
- The team must propose the initial timing policy and validate it during the pilot.
- The owner must confirm the pilot age range and device mix.
- The team must verify Google TTS credentials, quota, voices, and pronunciation.
- The team must decide the final internal synthesis port location.
- The team must select an audio object naming policy without content hashes.
- The team must confirm signed or public audio delivery for each host.
- The team must compare new music, effect, and UI assets in the live scene.
- The team must define practice browser-speech acceptance criteria.

These checks do not block L1 contract work or L3 controller tests with injected audio fixtures.
