# Griffin Sky-Joust rebuild packet

## Identity and compatibility boundary

Griffin Sky-Joust remains a sentence game with Joust-style aerial combat.
Dragon Flight remains the selected two-choice vocabulary lane game.
Dragon Rider can share the Dragon Flight engine while retaining its historical identity.
This packet does not combine either dragon game with Griffin Sky-Joust.

Keep `griffin-sky-joust` as the cartridge, route, result, and score identity.
Keep `griffin-riders-escape` separate until its runner lineage receives a product decision.
Preserve the current sentence input and the five-field result.
Preserve one completion delivery for each session.

## Source-backed gameplay findings

`packages/game-cartridges/src/griffin-sky-joust.ts` owns the active APK controller and scene.
The public game card routes to `/student/games/apk/griffin-sky-joust`.
The older React and Konva implementation remains in the repository but does not own this route.

The controller provides gravity, flap impulse, horizontal drift, air damping, and horizontal wrap.
It moves each knight horizontally and reverses the knight at the arena edge.
It classifies a strike from the player's vertical position relative to the knight.
The current combat rule rewards the higher player.
A descending-only requirement would change that rule and needs a separate gameplay decision.

The controller creates one knight for every word across every supplied sentence.
It places all those knights in the arena when the session starts.
Later sentence words can therefore crowd the active sentence and create unrelated contacts.
The prompt changes when the global word index enters the next sentence.
The game has no sentence wave transition or completed-sentence display.

The scene resolves the first overlapping knight in array order.
Two clustered knights can therefore produce an ambiguous contact result.
The target knight receives full alpha, while other knights receive lower alpha.
The HUD also names the target word.
The scene has no strong marker that connects the HUD target to one moving knight.

A wrong-word top strike records an incorrect language attempt and removes one health point.
A side or lower collision removes health without recording a language attempt.
This separation prevents a control error from reducing language accuracy.
Keep this accounting boundary during the rebuild.

## Current test evidence and missing cases

The cartridge tests cover finite input, deterministic placement, physics bounds, and horizontal knight movement.
They cover correct strikes, wrong strikes, control damage, immunity, victory, defeat, and one completion delivery.
They also cover tutorial actions, normalized input, responsive restore, cleanup, and rejected state changes.

The tests do not cover these required cases:

1. Only the active sentence supplies knights.
2. One sentence transition removes stale actors before the next wave starts.
3. Duplicate words retain stable sentence and word identities.
4. Long decks keep the active arena within a defined actor limit.
5. A clustered contact resolves one clear knight by a documented priority.
6. A control collision does not change language attempts or accuracy.
7. A target marker stays attached during movement and horizontal wrap.
8. A higher strike remains fair near the collision threshold.
9. Victory still emits one exact five-field result after several sentence waves.

The existing scripted keyboard completion proves a deterministic source path.
It does not establish control quality or collision clarity in a browser.

## Exact asset inspection

The following observations come from direct image inspection.
They do not approve a binding change.

| Role | Exact image | Dimensions | Observed style and suitability |
|---|---|---:|---|
| Current player | `apps/advantage-games/public/assets/apk/standard-pack-qc/asset-4beb30ab100ebfe7.png` | 96×96 | A top-down pixel dragon rider. The species and perspective do not match a side-view Griffin joust. |
| Current enemy | `apps/advantage-games/public/assets/apk/standard-pack-qc/asset-5604f2b69b454cf5.png` | 288×336 | A side-view purple bat sheet with 48×48 frames. It is not a mounted knight. |
| Existing Griffin rider candidate | `apps/advantage-games/public/games/sentence/gryphon-patrol/player_gryphon_rider_3x3_pose_sheet.png` | 384×384 | A detailed golden Griffin and rider in side view. Nine cells repeat one pose. The large painted style conflicts with the pixel platform pack. |
| Existing aerial enemy candidate | `apps/advantage-games/public/games/sentence/gryphon-patrol/sky_raider_3x3_pose_sheet.png` | 384×384 | A detailed dark dragon in side view. Nine cells repeat one pose. It is neither a mounted knight nor a coherent match for the intended opponent. |
| APK side-view hero sample | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/platformer-world/characters/hero-001-source-7f4c17677157.png` | 192×384 | A small red-haired pixel hero sheet. The style fits the platform set, but the actor is not mounted or airborne. |
| APK side-view enemy sample | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/platformer-world/enemies/enemy-011-source-3e3bb9c5e2c7.png` | 288×336 | A horned armored pixel creature with idle, attack, damage, and defeat poses. It is a ground actor, not a mounted knight. |
| Sky base | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/platformer-world/backgrounds/background-14-000-source-4fcfb2939046.png` | 240×240 | A flat cyan image. It can provide a clean sky color but lacks depth alone. |
| Cloud layer | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/platformer-world/backgrounds/ps-clouds-1-source-5208aaa2e85f.png` | 96×64 | A small transparent cyan cloud. It matches the side-view pixel collection and can repeat as a sparse parallax layer. |
| Platform candidate A | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/tilesets/sprites/cliffside-greens-source-1b8ae3a59e12.png` | 400×400 | A brown rock and bright grass pixel sheet. It contains several useful ledge shapes with clear collision edges. |
| Platform candidate B | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/tilesets/sprites/grassy-fields-source-0a0da4a520fa.png` | 256×384 | A related pixel terrain sheet with ledges and props. Its dense prop set can distract from moving word labels. |

The current player and enemy use different perspectives and depict the wrong species.
The existing Griffin rider is readable, but it lacks useful animation changes.
Its painted scale also conflicts with the inspected APK pixel enemies and platforms.
The inspected APK side-view actors do not provide a mounted Griffin and mounted-knight pair.
Do not commit a new player or enemy binding until an exact coherent pair passes a gameplay comparison.

The cliffside sheet is the stronger provisional platform source.
Its simple ledges can support recovery without filling the arena with decorative props.
The cyan base and sparse cloud can support a side-view sky arena.
This environment remains provisional until actor scale and word readability are tested together.

## Bounded implementation proposal

1. Add the missing controller cases before changing behavior.
2. Group targets by sentence while retaining `knight:<sentenceIndex>:<wordIndex>` identities.
3. Spawn only the active sentence wave.
4. Add a short transition after each completed sentence.
5. Keep total result counters across all waves.
6. Resolve clustered contacts through one documented spatial priority.
7. Add a visible target marker that follows the active knight.
8. Keep side and lower collision damage outside language attempts.
9. Keep the current higher-opponent strike rule for the first comparison.
10. Compare a bounded contact zone only if browser play shows unfair contacts.
11. Add a small set of recovery platforms through existing scene primitives.
12. Compare the exact actor and environment candidates at gameplay size.
13. Change semantic bindings only after the comparison identifies one coherent set.

Do not add a physics dependency for this work.
Do not expand the result contract.
Do not redirect the Griffin Rider's Escape route in this batch.

## Acceptance checks

The active arena contains words from one sentence only.
Completing a sentence clears its actors before the next wave appears.
The player sees the completed sentence during the transition.
Duplicate words retain distinct stable identities.
Long input decks do not create an unbounded actor field.

One clustered overlap produces one predictable outcome.
The target marker remains clear during movement and horizontal wrap.
The higher actor wins contacts within a documented contact zone.
Control damage leaves the language attempt count unchanged.
Wrong-word top strikes still record one incorrect attempt.

The scene uses a Griffin rider and mounted enemy with one coherent perspective.
Platforms, actors, effects, and labels remain readable at compact and wide sizes.
The final selected assets have exact paths, frame metadata, and usage approval.

The cartridge accepts the existing sentence input without host changes.
The cartridge emits the existing five-field result exactly once.
The `griffin-sky-joust` identifier remains unchanged.
Dragon Flight and Dragon Rider keep their vocabulary lane behavior and history.

Verify these checks through focused tests and real browser play after implementation.
Source review and image inspection do not establish gameplay quality.
