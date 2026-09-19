# Griffin actor candidate review

## Result

The bounded review found no complete Griffin rider and mounted enemy pair.
The inspected Platformer World actors use coherent pixel art and real animation frames.
However, none depicts a rider on an aerial mount.

Do not bind these assets as the final Griffin Sky-Joust actors.
They can support a temporary mechanics comparison with the missing mounted identity stated explicitly.

## Useful unseen candidates

| Possible role | Exact source | Frame data | Direct inspection |
| --- | --- | --- | --- |
| Small aerial opponent | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/enemies/enemy-002/enemy-002-source-232a34058533.png` | 288×336 sheet; 48×48 cells | A purple, one-eyed winged creature carries a small blade. It has readable side poses and several action rows. It is not mounted. |
| Armored opponent | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/enemies/enemy-019/enemy-019-source-8084ff2efe1e.png` | 288×336 sheet; 48×48 cells | A red armored creature carries two axes. The sheet includes attack, damage, fall, idle, jump, and walk strips. It is a ground actor. |
| Armored opponent variant | `packages/advantage-play-kit/assets/standard/side-view/native/platformer-world/enemies/enemy-027/enemy-027-source-7efefc432614.png` | 288×336 sheet; 48×48 cells | This brown variant matches enemy 019 in scale and animation coverage. It is also a ground actor. |

Enemy 002 has the strongest aerial silhouette in the inspected side-view set.
Its blade gives the clearest combat cue among the small flying actors.
Its body shape does not read as a Griffin, knight, or mount.

Enemies 019 and 027 have useful weapon actions and clear 48-pixel silhouettes.
Their feet and jump poses make the ground-actor design clear.
They do not satisfy the mounted aerial enemy requirement.

## Other inspected groups

I inspected the 28 complete Platformer World enemy sheets.
Several sheets contain bats, eyes, slimes, plants, mushrooms, and humanoid monsters.
The set contains no visible saddle, rider, horse body, or Griffin body.

I also inspected the ten Turn-Based RPG Monsters pack previews under `packages/advantage-play-kit/assets/standard/world/native/turn-based-rpg-monsters/`.
These packs contain front-facing monster families and color variants.
They do not provide side-view mounted actors.
Their perspective does not fit the current Joust arena.

## Provenance

The import receipt maps all three useful candidates to `Platformer World.zip` from ElvGames.
The standard pack requires the existing ElvGames credit.
The receipt supplies source identity but does not establish gameplay approval.

## Remaining gap

The repository still needs a coherent side-view pair with these traits:

- One Griffin with a visible rider.
- One mounted aerial opponent with a clear weapon.
- Matching perspective, pixel scale, palette, and animation quality.
- Distinct flight, strike, damage, and defeat poses.
- Clear silhouettes behind moving word labels at compact size.

This review covered the named side-view actor collection and ten monster pack previews.
It does not prove that every repository image lacks a suitable actor.
No candidate from this bounded set meets the final binding requirement.
