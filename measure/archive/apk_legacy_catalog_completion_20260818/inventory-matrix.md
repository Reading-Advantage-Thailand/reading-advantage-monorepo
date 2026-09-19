# Legacy Catalog Contract Matrix

## Shared Decisions

- Every legacy route becomes a finite APK session.
- Vocabulary games use one target per input item.
- Sentence games use every ordered word from every input item.
- Correct choices advance one target and add 100 score.
- Incorrect choices count as attempts and keep the current target active.
- Every normal session finishes after all targets advance.
- Hazard-based games can also finish in defeat when lives reach zero.
- Accuracy is a fraction from zero through one.
- XP comes from the APK result accountant, not a legacy client payload.
- Keyboard input and pointer or touch input call the same controller actions.
- The session seed controls target choices, placements, and hazard order.
- Tutorial and demo sessions use the real controller without result delivery.
- Replay and destroy seal completion and release every owned resource.

## Per-Title Freeze

| ID | Mode | Recognizable mechanic | Primary actions | Incorrect consequence | Terminal rule |
|---|---|---|---|---|---|
| `castle-defense` | sentence | Collect ordered words and build defenses | move, confirm | reset the current word chain | finish all sentences or lose the base |
| `magic-defense` | vocabulary | Type or choose translations before missiles land | choose, confirm | lose combo and castle health | clear all words or lose all castles |
| `rpg-battle` | vocabulary | Cast translated attacks in a turn battle | choose, confirm | enemy counterattack | defeat the enemy or lose player health |
| `wizard-vs-zombie` | vocabulary | Collect matching orbs and charge shockwave | move, confirm | lose score and retain target | clear all words or lose health |
| `enchanted-library` | vocabulary | Collect the matching book and use a shield | move, confirm | lose mana and retain target | collect every word or lose mana |
| `rune-match` | vocabulary | Match adjacent target runes against a monster | move, confirm | lose player health | clear all words or lose health |
| `alchemists-synthesis` | vocabulary | Select the term matching a translation | move, confirm | no score and retain target | answer every word |
| `potion-rush` | sentence | Brew ordered sentence ingredients for customers | move, confirm | spoil the current cauldron | serve all sentences or lose reputation |
| `dungeon-liberator` | sentence | Rescue ordered prisoners and reach the exit | move | reset the prisoner trail | rescue all sentences or lose lives |
| `rune-forge-chamber` | sentence | Select orbiting words in order | move, confirm | lose forge health | forge all sentences or lose health |
| `village-guardian` | sentence | Rescue ordered villagers and reach sanctuary | move | reset the villager trail | rescue all sentences or lose lives |
| `abyssal-well` | sentence | Rotate and shoot ordered word enemies | move, confirm | remove the wrong enemy and retain target | clear all words or lose rim lives |
| `archers-revenge` | vocabulary | Aim at the unshielded matching enemy | move, confirm | trigger enemy fire | clear all words or lose health |
| `storm-castle-tower` | sentence | Climb and collect word windows in order | move, confirm | close the wrong window and lose a life | collect all words or lose lives |
| `griffin-sky-joust` | sentence | Flap and strike word knights from above | move, confirm | lose health and retain target | strike all words or lose health |
| `realm-carver` | sentence | Draw territory loops around ordered words | move, confirm | lose health and score | capture all words or lose health |
| `paladins-twin-soul` | vocabulary | Shoot target enemies and rescue the twin | move, confirm | retain target and expose counterfire | clear all words or lose health |
| `devourer-slime` | sentence | Eat ordered words, grow, and overpower knights | move | shrink and lose score | eat all words or lose lives |
| `haunted-library` | sentence | Open ordered doors while avoiding ghosts | move, confirm | lose a life and spawn a hazard | open all doors or lose lives |
| `gryphon-patrol` | sentence | Shoot target enemies and collect dropped word orbs | move, confirm | remove the wrong enemy and retain target | collect all words or lose health |

## Shared Controller Contract

Each title module exports a named cartridge factory and a named controller
factory. Every controller exposes `snapshot`, `choose`, `applyHazard`, `capture`,
`restore`, and `destroy` methods.

Every snapshot includes phase, target index, target count, prompt, answer,
correct action, available actions, lives, energy, score, result counters, last
outcome, and destroyed state.

Every `choose` result reports whether the action was accepted, correct,
progressed, or terminal. It includes the first terminal `GameResults` value.

## Source Boundaries

Current mechanic evidence comes from the matching files under
`apps/advantage-games/src/lib/games/`, `src/components/games/`, and student game
routes. The Abyssal Well fallback evidence comes from
`~/Desktop/advantage-games` at
`e4a3e6839706fbfcb8b7754788ec24ca29286950` because its restored files remain
untracked in this worktree.
