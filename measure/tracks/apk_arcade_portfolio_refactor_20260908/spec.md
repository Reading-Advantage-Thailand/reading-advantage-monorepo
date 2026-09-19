# APK Arcade Portfolio Refactor

## Purpose

Rebuild the game portfolio and APK around enjoyable language practice, familiar controls, and a shared retro arcade experience.
Wizard vs. Zombie establishes the first complete implementation because the owner identifies it as a likely customer favorite.
Customer popularity remains an owner observation, not a measured ranking.

## Owner requirements

- Completely refactor retained games and APK.
- Combine redundant games, including overlapping dragon games.
- Preserve standard educational input and standard game output.
- Restore common start and end screens through APK.
- Establish a coherent retro arcade experience.
- Select the best suitable new APK assets through comparison and actual gameplay inspection.
- Add listening as an actual learning modality.
- Build a navigable Wizard vs. Zombie map with useful survival obstacles.
- Introduce shared RPG progression, cooperative play, and competitive options.
- Use Sol subagents with medium reasoning for this handoff.

## Scope and authority

This program replaces the earlier prohibition on rebuilding catalog games for this owner-requested refactor.
It does not reopen unrelated evidence programs or permit supervisor changes.
The current request authorizes planning and subagent handoff.
The initial handoff covers implementation readiness and execution packets; production implementation remains separately tracked below.
Production deployment, destructive data changes, and irreversible retirement require concrete review before execution.
Primary production cutover remains prohibited before 2026-10-11, under the existing portfolio instruction.
That date does not automatically authorize cutover.
Preserve concurrent workspace changes and existing customer access during development.

## Verified baseline

- The public cartridge catalog contains 28 games: ten vocabulary games and eighteen sentence games.
- Five traversal titles share one direction-choice controller and renderer.
- That renderer displays direction names rather than candidate learning answers.
- APK already contains briefing, tutorial, debrief, and host lifecycle components.
- Restore and strengthen those components instead of creating a second shell.
- Wizard vs. Zombie already contains crypts, graves, collision footprints, vocabulary pickups, and shockwaves.
- Existing props do not establish that enemy navigation or tactical map play is complete.
- The earlier cartridge test run passed 621 tests in 48 files.
- That result proves neither browser usability nor student enjoyment.

## Stable contracts

`packages/game-contracts/src/educational-io.ts` defines strict input items with exactly `term` and `translation` strings.
Vocabulary and sentence inputs both use arrays of those items.
`GameResults` contains exactly `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts`.
Accuracy uses the range zero through one.
Duration and victory belong to host completion context, not `GameResults`.
The host completion mapper excludes client display XP from the persistence payload.
Preserve these shapes, validators, and existing callers.

Optional modality settings belong in validated host/session configuration.
Audio references and learning evidence must not add fields to strict educational items or `GameResults`.
Identify duplicate terms through session item positions or existing stable host identifiers.
Do not introduce cryptographic hashes for identity or reporting.
Use an existing metadata boundary only after verifying its server validation and persistence behavior.
Metadata already reaches completion JSONB storage, but learning evidence lacks a strict nested schema.
Reserve and validate `metadata.learningEvidence` without changing the educational arrays or result shape.
Validate evidence against the server-owned session wherever it affects rewards or ranked eligibility.
Client playback events describe reported behavior; they cannot prove that a student heard or understood speech.

## Functional requirements

### FR-1: Common arcade shell

Every retained cartridge uses the same entry, practice, play, pause, results, replay, and exit lifecycle.
The entry screen shows recognizable artwork, the objective, modality, controls, and audio readiness.
Returning students can start directly or choose practice.
Practice never saves a scored result or awards XP.
Results show victory or defeat, learning accuracy, score, confirmed rewards, and clear replay and exit actions.
Separate pending persistence from confirmed rewards.
Retry failed persistence without duplicating rewards or blocking safe navigation.
Return validated host confirmation receipts without extending `GameResults`.
Treat persistence as not applicable, pending, confirmed, or failed.
Reject ambiguous terminal outcomes in every host.
Bound pending save time so a network stall cannot indefinitely block replay.
Reset input, timers, audio, and completion state when replay starts.
Use coordinated pixel artwork, readable text, short transitions, sound cues, and responsive feedback.
Support Thai text without forcing an unreadable pixel font.
Reduced motion and independent speech, music, and effects settings remain available.

### FR-2: Shared control semantics

Define movement, primary ability, interaction, pause, and audio replay once in APK.
Use consistent control positions and semantic actions across devices.
Games declare supported actions and receive appropriate shared hints.
Board games retain selection controls without adopting unnecessary movement controls.
Normalize diagonal movement and elapsed-time movement.
Protect text entry from movement bindings.
Handle focus loss, pointer cancellation, held input, remapping where supported, and safe-area insets.
Do not add an ability button to a game without a meaningful ability.

### FR-3: Learning fairness

Vocabulary games in the Thai-to-English curriculum show Thai prompts and English answers.
Keep the target prominent and separate from gameplay instructions.
Remove answer-revealing colors and predictable correct-position sequences from scored play.
Hints remain explicit and recorded as assistance.
Identical visible answers must not receive different correctness outcomes without visible disambiguation.
Separate motor mistakes from submitted language answers.
Use plausible distractors and validate short, duplicate, and empty content cases.
Scale reading time and hazard pressure independently from linguistic difficulty.
Provide actionable correction and reasonable recovery after mistakes.

### FR-4: Listening

Implement Read to Select Audio first in Wizard vs. Zombie.
The owner requires Thai-to-English learning: the prompt is Thai, and the student selects the English answer.
Reading displays the Thai translation as the isolated, prominent target.
The proposed listening mode shows a written Thai target and provides English audio answer choices.
The strict input remains `{ term, translation }`, with the English term and its Thai translation.
Gameplay instructions and descriptive sentences belong in the briefing and Practice, outside the live board.
The owner's clutter feedback concerns target visibility within gameplay prose, not the number of answer choices.
The owner explicitly requires this language direction.
The host supplies explicit source and target locales; never infer language from script alone.
Report actual translation locales beside the content array, including per-item fallback when needed.
Reject or explicitly label mismatched fallback before a scored listening session starts.
Supported practice can show a transcript, but scored listening must record transcript assistance.
APK owns speech readiness, playback, replay, cancellation, volume ducking, and cleanup.
Start challenge pressure after required speech becomes ready and playback begins under the selected timing policy.
Cap replay protection so repeated replay cannot create unlimited safety.
Audio failure offers retry or an explicitly labeled reading mode.
Do not silently record reading fallback as listening.
Preload a bounded amount of audio and avoid generation during gameplay requests.
Prefer existing recordings and reuse the current storage adapter.
Current app generators call Google TTS directly and choose random voices.
Introduce a minimal internal synthesis port if recorded prompts cannot cover the pilot.
Pin the voice and synthesis settings for comparable challenges.
Browser speech may support explicitly labeled practice where pronunciation and availability remain acceptable.
Ranked listening requires consistent, validated English answer audio.
Later modalities include Listen to Sequence and supported Listen and Read.
Microphone recording and pronunciation scoring are outside the first delivery.

### FR-5: Wizard vs. Zombie map

Preserve movement, translation collection, survival pressure, and the earned shockwave.
Build one authored graveyard with connected courtyards, obstacles, alternative routes, and recognizable landmarks.
Compare the new APK packs before selecting terrain, characters, enemies, props, effects, UI, and sound.
Use the existing asset binding system with the strongest suitable, approved assets.
Current bindings are a baseline, not the required final selection.
Do not claim an asset is approved merely because its file exists.
The wizard and zombies respect compatible obstacle geometry.
Enemies navigate around obstacles without permanent trapping or wall penetration.
Test each actual spawn lane against map obstacles, including north, south, east, and west approaches.
Shockwave knockback resolves against solids and map bounds.
The touch ability target and shockwave effect remain visible during play.
Pickups and spawns remain reachable and outside solids.
Prevent spawn damage before the player can react.
Make narrow passages useful without creating permanently safe camping positions.
Provide time to read or listen while retaining meaningful survival pressure.
Add gates or breakable barricades only after the basic map demonstrates useful route decisions.
Use one shared control layout and visible ability feedback.

### FR-6: Portfolio consolidation

Give every current title a keep, combine, retire, or evidence-needed disposition.
Use customer demand, mechanic distinctiveness, learning fit, and maintenance cost.
Treat the proposed matrix as a recommendation until customer evidence and owner decisions resolve uncertainty.
Consolidation retains old identifiers for result history and maps old links to an appropriate replacement.
Do not delete history or silently combine incompatible leaderboard scores.
Rebuild each retained game through the same contract, shell, control, audio, asset, and quality checklist.
Do not replace distinct mechanics with a shared quiz renderer.

### FR-7: RPG progression

Reuse existing account, mastery, reward, and inventory services where they fit.
Start with a persistent identity, cosmetic unlocks, and a small quest loop.
Separate cosmetic identity from ranked gameplay power.
Grant rewards through authoritative, tenant-scoped, idempotent backend operations.
Keep educational mastery separate from survival score and time played.
Define concrete reward rules before creating tables or endpoints.
Do not create a general economy before the pilot needs one.

### FR-8: Cooperative and competitive play

Begin with comparable asynchronous challenges and class cooperative goals after fair individual scoring exists.
Compare equivalent game versions, challenge seeds, content sets, difficulty, and modalities.
Do not expose correct answers through public challenge payloads unnecessarily.
Use server-owned challenge definitions and server-validated rewards.
Retain the five-field result interface for each participant.
Store team context and additional evidence through a separate validated host boundary.
Plan live cooperative Wizard vs. Zombie after map simulation, reconnect behavior, and authoritative session design are proven.
Specify party membership, contribution, revival, abandonment, timeout, and reward rules before implementation.
Bound classroom and school access through existing permissions.
Use aliases where appropriate and provide teacher-controlled participation.
Open matchmaking, chat, trading, and paid power are outside the first delivery.

### FR-9: Best suitable new assets

Inventory newly available APK packs and compare plausible candidates before selecting assets.
Evaluate actual images and animations; filenames and manifests alone cannot establish visual quality.
Select assets for coherent perspective, pixel scale, palette, animation coverage, and gameplay readability.
Test player and enemy silhouettes, pickups, hazards, and collision footprints at actual mobile size.
Use the new assets wherever they provide a stronger complete experience.
Record why an older asset remains when a new alternative exists.
Prefer a coherent collection over mixing individually attractive assets with incompatible styles.
Compare at least two viable candidates per major asset role when the inventory provides alternatives.
Record unavailable alternatives instead of inventing candidates.
Verify approval, permitted usage, attribution, atlas geometry, and runtime compatibility.
Keep these checks bounded to selected assets; do not create a new provenance framework.
Use common UI assets across entry, gameplay, and results while preserving readable Thai text.
Test sound effects and music beneath spoken prompts.
Inspect a representative playable scene with the selected assets before rebuilding the remaining maps.
Record selected paths, semantic bindings, rejected alternatives, gaps, and observed device behavior in one selection table.
The owner reviews a concrete visual comparison at the existing phase verification point.

## Acceptance

All retained games preserve strict input and output compatibility.
Each game completes through shared screens with working replay and exit on supported hosts.
Tests exercise real behavior, including negative paths, rather than matching source text.
Keyboard and touch support the documented controls.
Wizard players can use alternate routes to survive, and enemies navigate the same map reliably.
Listening rounds require audible prompts and distinguish assisted or fallback play.
Reward retries never duplicate grants.
Each old title has a recorded disposition and a migration path.
Customer sessions compare the rebuild with the existing favorite before broad rollout.
Measure comprehension, control failures, meaningful map choices, unassisted accuracy, completion, and voluntary replay.
Set pilot success thresholds after observing the baseline; do not invent measured outcomes.

## Remaining product decisions

- Confirm customer favorites beyond Wizard vs. Zombie.
- Select retained identities for combined games.
- Confirm pilot age range, device mix, language direction, and typical session length.
- Choose RPG rewards after reviewing existing progression services.
- Choose the first live cooperative rules after the single-player pilot.
These decisions do not block source audits, shell planning, ABI protection, or the initial execution packets.
