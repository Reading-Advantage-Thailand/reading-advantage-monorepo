# APK shell, controls, and ABI handoff

## Readiness verdict

The APK has a strong lifecycle base, but it does not yet meet the new shell and control requirements.
Implementation should refactor `APKGameHost`, its presentation components, and the three existing host adapters.
The work must preserve the educational arrays and the five-field `GameResults` ABI.
The first implementation batch should establish lifecycle and persistence behavior before visual work begins.

The code graph was current on 2026-09-08 and contained 37,484 nodes across 3,881 files.
Graph inspection identified `apk-game-host.tsx` as the lifecycle owner.
Its direct dependencies include the briefing, tutorial, runtime, responsive, and standard experience modules.
Source searches then confirmed the host adapters and cartridge consumers described below.

## Existing ownership

| Concern | Existing owner | Verified behavior | Decision |
|---|---|---|---|
| Shell state | `packages/advantage-play-kit/src/react/apk-game-host.tsx` | Owns briefing, tutorial, demo, countdown, play, pause, results, replay, cleanup, and navigation. | Refactor this host. |
| Entry contract | `packages/advantage-play-kit/src/presentation/game-briefing-contract.ts` | Validates localized text, learning previews, control hints, and lifecycle transitions. | Extend this contract carefully. |
| Entry screen | `packages/advantage-play-kit/src/presentation/game-briefing-screen.tsx` | Shows the objective, all learning items, controls, Start, and Demonstrate. | Restyle and add explicit Play and Practice actions. |
| Tutorial | `game-tutorial-*` files under `packages/advantage-play-kit/src/presentation/` | Runs a deterministic preview and suppresses results, persistence, XP, leaderboards, and failure effects. | Preserve and integrate as Practice. |
| Result screen | `packages/advantage-play-kit/src/presentation/game-presentation.tsx` | `GameResultPanel` shows outcome, score, accuracy, attempts, display XP, credit, replay, and exit. | Extend it with persistence states and confirmed rewards. |
| Standard experience | `packages/game-cartridges/src/standard-experience.ts` | Creates one briefing, tutorial, and debrief for each cartridge. | Refactor this factory. Do not duplicate it. |
| Runtime lifecycle | `packages/advantage-play-kit/src/runtime/runtime.ts` | Validates input and results, accepts one completion, handles visibility, and destroys runtime resources. | Preserve its completion authority. |
| Raw browser input | `packages/advantage-play-kit/src/runtime/input.ts` | Tracks global keyboard state and one pointer gesture. | Add focus safety and release semantics. |
| Semantic actions | `packages/advantage-play-kit/src/systems/input-actions.ts` | Maps physical input to eight shared action identifiers. | Add required actions and continuous controls. |
| Responsive layout | `packages/advantage-play-kit/src/responsive/responsive-composition.ts` | Resolves compact and wide layouts with input capabilities and safe rectangles. | Reuse this resolver. |
| Advantage host | `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx` | Loads student content, measures duration, persists completion, and records a local leaderboard session. | Normalize its receipt and retry behavior. |
| Reading host | `apps/reading-advantage/components/apk/StudentCartridgeHost.tsx` | Loads student content and validates a successful completion receipt. | Return the normalized receipt to APK. |
| Primary host | `apps/primary-advantage/components/apk/StudentCartridgeHost.tsx` | Loads student content and validates a successful completion receipt. | Correct terminal outcome handling. |
| Public preview | `apps/advantage-games/src/components/apk/PublicCartridgeHost.tsx` | Uses fixtures, skips persistence, and maps every binding to one preview image. | Keep it unscored and replace the placeholder edition. |
| Host layout | Three `components/apk/apk-host-layout.ts` files | Each app repeats the same canvas size policy. | Move shared styling into APK. |

## Exact ABI boundary

`packages/game-contracts/src/educational-io.ts` defines both educational inputs as strict arrays.
Each item contains exactly `term` and `translation` strings.
Empty arrays remain a cartridge-level concern.
The normalizers may remove a legacy optional `id`, but they reject all other extra fields.

`GameResults` contains exactly five fields.
Those fields are `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`.
Accuracy remains between zero and one.
The result schema rejects extra identity, difficulty, duration, victory, and metadata fields.

`packages/game-contracts/src/completion.ts` owns the host completion mapping.
`mapGameResultsToCompletionInput` combines validated results with host-owned context.
The context owns `gameType`, difficulty, duration, victory, the idempotency key, the timestamp, and optional metadata.
The mapper deliberately removes display XP from the server payload.

The refactor must not add modality, persistence, reward, duration, or victory fields to `GameResults`.
It must not add audio references or identifiers to educational items.
Use a separate validated host/session contract for launch preference, modality, assistance, and persistence state.
Use session item positions when duplicate terms require local identity.

## Lifecycle audit

`APKGameHost` already provides transaction-like mount and cleanup behavior.
It rejects stale callbacks by mount generation.
It pauses the renderer before it shows results.
It suppresses completion for tutorial and demo sessions.
It validates lifecycle transitions before it publishes them.

The shared experience currently forces every Start action into the tutorial.
`createCartridgeStandardExperience` sets `briefing.startPhase` to `tutorial` for every cartridge.
It also sends every replay back to the briefing.
No host supplies a returning-player state or a direct-play choice.

The entry screen should always offer `Play now` and `Practice`.
`Play now` should emit `briefing -> playing` and mount one scored session.
`Practice` should emit `briefing -> tutorial` and mount one unscored tutorial session.
Tutorial completion should clean its preview before it mounts scored play.
The UI may recommend Practice for a first session, but it must not block direct play.

The result screen appears before the host persistence promise settles.
It always labels cartridge XP as `Display XP`.
It cannot show the confirmed server reward because every host callback returns `void`.
A rejected save appears through the generic start-error alert.
The result screen provides no Retry Save action.

The shell needs four explicit persistence states: `not-applicable`, `pending`, `confirmed`, and `failed`.
Public and practice sessions use `not-applicable`.
Authenticated sessions enter `pending` after cartridge completion.
The host must return a normalized confirmation containing confirmed XP and duplicate status.
The shell must display rewards only after confirmation.

Pending persistence may briefly disable replay while it keeps Exit available.
A bounded save timeout must expose retry and unsaved replay instead of blocking the arcade indefinitely.
A successful save should enable replay and show confirmed rewards.
A failed save should show Retry Save with the original idempotency key.
It should also offer Exit and an explicit unsaved replay action.
The unsaved replay action must explain that the previous reward remains unconfirmed.

Replay must destroy the old renderer, clear held input, cancel audio, and reset completion state.
Replay must create a new host idempotency key only after the replay transition begins.
Retries for the old result must retain its original key.
The current Reading and Primary tests already verify this key split.

## Host integration findings

The Reading host and the Primary host validate `xpEarned`, `activityId`, `duplicate`, and `status`.
They currently discard the validated receipt.
The Advantage host accepts any successful response and records the cartridge display XP locally.
That host should validate the same receipt before it updates its local leaderboard.

The Advantage and Reading hosts reject the legacy `complete` outcome.
The Primary host treats `complete` as victory.
Primary must reject that ambiguous outcome before shared result work begins.
All rebuilt cartridges must emit explicit `victory` or `defeat` outcomes.

Each host starts its duration clock when the lifecycle enters `playing`.
This behavior correctly keeps tutorial time outside the scored duration.
Each host creates a new key after a result replay transition.
The implementation must keep both behaviors.

## Control audit

The semantic action list currently contains movement, confirm, cancel, pause, and restart.
It lacks distinct primary ability, interaction, and audio replay actions.
Wizard vs. Zombie maps Space and Enter to `confirm`, then interprets `confirm` as shockwave.
This overload prevents stable hints and capability-based button placement.

The raw controller listens for keyboard events on `window`.
It does not ignore text inputs, textareas, selects, or editable content.
It does not clear held keys on window blur.
Visibility changes pause the runtime, but they do not clear keyboard state.
A released movement key during a hidden period can therefore leave stale state.

The pointer controller supports one active pointer.
It correctly distinguishes a completed release from cancellation.
The action normalizer resolves horizontal drag before vertical drag.
It does not emit a continuous movement vector or a release action for drag movement.
Each cartridge still interprets gesture regions and control meaning.

Wizard vs. Zombie normalizes diagonal keyboard movement in `heldVelocity`.
This prevents faster diagonal movement in that cartridge.
The behavior does not yet exist as a shared movement primitive.
Elapsed-time movement also remains cartridge-owned.

The shell renders generic Pause, Mute, and Restart buttons.
It does not render a shared movement pad, ability button, interaction button, or audio replay button.
The cartridge capability list does not declare those supported actions.
The three hosts also pass broad touch, pointer, and keyboard capability claims without live detection.

## Asset and presentation audit

The current briefing uses inline colors and browser font stacks.
The result panel uses plain DOM controls without an arcade frame.
The standard semantic bindings expose only one generic panel and one confirm-control image.
Existing bindings therefore cannot define the new shared presentation.

The standard pack contains several new UI families under `assets/standard/ui/native/`.
The initial comparison set includes the four `user-interface-01` through `user-interface-04` families.
The equivalent `rogue-adventure-world` families provide additional menu frames and button states.
Compare their examples, menu buttons, nine-slice suitability, focus visibility, and compact scaling.

Control candidates exist under `ui/16x16/user-interface/` and `ui/32x32/`.
They include keyboard keys, controller crosses, controller buttons, and transparent icon sheets.
Compare a consistent icon family for movement, ability, interaction, pause, and audio replay.
Never use a gamepad icon for touch when its meaning is unclear.

Effect candidates exist under `effects/native/pixel-vfx/`.
The light-spell family is a strong shockwave candidate for Wizard vs. Zombie.
The fire, ice, and buff families provide success, damage, reward, and status alternatives.
Test every effect over the selected graveyard palette at gameplay size.

The standard pack contains pixel-font license receipts, but no font binary appeared in the asset tree.
The APK briefing currently falls back to system, serif, and monospace fonts.
Use a readable Thai font for all Thai learning text and actions.
Reserve a selected arcade font for short Latin headings after license and glyph checks.
Do not force Thai text through a Latin-only pixel font.

The authenticated hosts call `createCatalogStandardEdition` with current cartridge bindings.
The public preview instead maps every asset role to one developer preview image.
That placeholder cannot support a valid visual comparison or production preview.
Replace it through the accepted asset selection and materialization flow.

The asset phase must compare candidates before it changes semantic bindings.
Record selected and rejected paths with observed reasons in `asset-selection.md`.
Verify source approval, transformations, runtime cost, Thai legibility, and visual coherence.
Do not expand existing hash machinery for this decision.

## First implementation batches

### Batch APK-1: lifecycle and persistence contracts

One Sol medium task should own this batch.
Its exclusive production files are:

- `packages/advantage-play-kit/src/presentation/game-briefing-contract.ts`
- `packages/advantage-play-kit/src/presentation/game-briefing-screen.tsx`
- `packages/advantage-play-kit/src/presentation/game-presentation.tsx`
- `packages/advantage-play-kit/src/presentation/standard-game-experience.ts`
- `packages/advantage-play-kit/src/react/apk-game-host.tsx`
- `packages/advantage-play-kit/src/presentation/index.ts`
- `packages/advantage-play-kit/src/react/index.ts`

Its exclusive tests are the matching presentation tests and `src/react/apk-game-host.test.tsx`.
The task should first define separate Play and Practice intents.
It should then define the four persistence states and a normalized confirmation result.
It must preserve old callers through additive defaults until host adapters migrate.

Behavior tests must prove these cases:

1. Play now mounts one scored session without mounting a tutorial.
2. Practice mounts one non-authoritative tutorial before scored play.
3. Practice never emits results or calls persistence.
4. A first or returning player can choose either entry action.
5. Pending persistence shows no confirmed reward and disables replay.
6. Confirmed persistence shows authoritative XP and enables replay.
7. Failed persistence retains the result and exposes Retry Save.
8. Retry Save reuses the same persistence request identity.
9. Exit remains available during pending and failed persistence.
10. Replay clears the prior result, error, input, and completion authority.
11. A stale save result cannot update a replacement session.
12. Victory and defeat remain distinct through the result screen.

### Batch APK-2: shared control semantics

A separate Sol medium task should own this batch after APK-1 stabilizes the host props.
Its exclusive production files are:

- `packages/advantage-play-kit/src/systems/input-actions.ts`
- `packages/advantage-play-kit/src/systems/capability-manifest.ts`
- `packages/advantage-play-kit/src/runtime/input.ts`
- `packages/advantage-play-kit/src/runtime/types.ts`
- `packages/advantage-play-kit/src/runtime/runtime.ts`
- a new APK control presentation module under `packages/advantage-play-kit/src/presentation/`

Its tests should remain beside those modules.
The task should add primary ability, interaction, and audio replay actions.
It should add capability-based buttons and shared continuous movement vectors.
It should clear held state after blur, visibility loss, pointer cancellation, pause, and replay.
It should ignore movement bindings while a user edits text.

Behavior tests must prove these cases:

1. Keyboard and touch produce the same semantic action.
2. Diagonal movement has the same speed as axial movement.
3. Movement uses elapsed time instead of frame count.
4. Text fields receive arrows, Space, and letters without game movement.
5. Window blur releases every held action.
6. Pointer cancellation releases every held touch action.
7. A compact layout keeps every active control inside the safe rectangle.
8. A board cartridge receives no movement or ability button without support.
9. An ability button appears only for a declared meaningful ability.
10. Audio replay remains distinct from mute and primary ability.

### Batch APK-3: authenticated host receipts

A third Sol medium task should own the app adapters after APK-1 defines the confirmation contract.
Its exclusive production files are:

- `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx`
- `apps/reading-advantage/components/apk/StudentCartridgeHost.tsx`
- `apps/primary-advantage/components/apk/StudentCartridgeHost.tsx`
- the three matching host test files

The task should return validated persistence confirmations to APK.
It should validate the Advantage response before local leaderboard updates.
It should reject ambiguous Primary completion outcomes.
It should preserve host-owned duration and idempotency behavior.

Behavior tests must prove these cases:

1. All hosts omit display XP from persistence payloads.
2. All hosts measure duration only during scored play.
3. A failed retry retains the original idempotency key.
4. A confirmed replay creates a new idempotency key.
5. Invalid success responses produce failed persistence state.
6. Duplicate success responses display one confirmed reward.
7. Advantage records a leaderboard session only after receipt validation.
8. Primary rejects the `complete` terminal outcome.

### Batch APK-4: selected arcade presentation

This batch must start after the asset comparison produces an accepted shortlist.
One Sol medium task should own the shared shell visuals.
Do not let this task edit cartridge gameplay files.

Its production scope should include the presentation modules, approved asset bindings, and shared theme styles.
It should remove duplicated host layout styling where the APK can own it.
It should use one frame family across entry, pause, and results.
It should use one icon family across keyboard and touch hints.

Visual acceptance must prove these cases:

1. Entry and result screens use the same frame, palette, spacing, and focus language.
2. Thai text remains legible at the smallest supported compact layout.
3. English headings use the selected arcade font without harming body text.
4. Every control has a visible focus, pressed, disabled, and loading state.
5. Reduced motion removes nonessential transitions and reward effects.
6. New effects remain readable over the selected map palette.
7. The public preview loads real selected assets instead of one placeholder image.

## Critical plan corrections

1. Treat the current briefing, tutorial, and debrief as refactor targets.
2. Add explicit Play and Practice actions before visual shell work.
3. Add a host confirmation contract outside `GameResults`.
4. Block confirmed reward display until the server response validates.
5. Add Retry Save before styling the final result screen.
6. Correct Primary outcome handling before cross-host acceptance tests.
7. Expand semantic action identifiers before shared touch controls.
8. Add blur and text-entry safety before keyboard rollout.
9. Complete the asset comparison before binding new frames, icons, effects, or fonts.
10. Replace the public preview placeholder before using it for visual approval.

## Risks and review points

| Risk | Evidence | Required control |
|---|---|---|
| Duplicate rewards | Replay rotates the key, while failed results lack a retry state. | Keep one key per result and retry that result explicitly. |
| False reward display | `GameResultPanel` shows cartridge XP before persistence finishes. | Show server-confirmed XP only after a validated receipt. |
| Stale input | Global keyboard state survives blur and visibility pauses. | Release all actions on focus loss, pause, teardown, and replay. |
| Control drift | Cartridges interpret `confirm` and pointer regions differently. | Declare capabilities and map shared semantic actions once. |
| ABI expansion | New modality evidence could enter strict educational or result objects. | Keep new state in a validated host/session boundary. |
| Shell duplication | Three hosts repeat layout policy, while APK already owns lifecycle presentation. | Move reusable presentation into APK and keep adapters thin. |
| Incoherent assets | Current bindings cover only a generic panel and confirm image. | Compare complete UI families before selection. |
| Thai font failure | The standard asset tree has licenses but no shipped font binary. | Use a verified Thai font and test actual Thai strings. |
| Misleading preview | The public host maps every role to one preview image. | Materialize the accepted selected union for preview. |
| Large blast radius | The action normalizer has many cartridge consumers. | Make additions compatible and run all cartridge tests. |

## Verification gates

Run focused APK and contract tests after each batch.
Then run the full game-cartridge suite because shared actions affect many cartridges.
Run type checks for APK, contracts, cartridges, Advantage Games, Reading, and Primary.
Run each affected app lint task.
Verify compact touch and wide keyboard sessions in a real browser.

The browser review must cover English and Thai entry, practice, play, pause, results, retry, replay, and exit.
It must inspect focus loss, pointer cancellation, long text, duplicate translations, and failed persistence.
The asset review must compare accepted candidates inside the real shell.
Production cutover remains outside this planning packet.

## Pending checks

The asset families still need a rendered comparison inside the real shell.
Thai typography still needs browser checks with actual learning content.
Touch controls still need checks on a compact device.
Persistence retry still needs an end-to-end host test.
No production code or browser behavior changed during this audit.
