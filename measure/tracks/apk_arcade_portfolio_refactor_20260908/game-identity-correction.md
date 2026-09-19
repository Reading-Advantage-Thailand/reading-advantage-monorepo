# Dragon and Griffin identities

## Owner direction

The owner selected Dragon Flight as the retained dragon title.
The owner clarified that Dragon Rider uses two lanes for two vocabulary choices.
The owner rejected combining vocabulary and sentence games under one flight game.
The owner identified Griffin gameplay as a Joust-style mechanic.

## Historical evidence

Dragon Rider was explicitly a cosmetic Dragon Flight reskin with identical mechanics.
Its [specification](/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/measure/archive/dragon-rider-reskin-20260131/spec.md:3) establishes this relationship.
The [Dragon Flight specification](/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/measure/archive/dragon-flight/spec.md:34) defines two translation gates, dragon growth, and a final boss comparison.

Griffin Rider's Escape has a separate [runner specification](/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/measure/archive/griffin-riders-escape/spec.md:1).
Its [historical controller](/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/src/lib/games/griffinRidersEscape.ts:9) implements three lanes, sentence gates, and obstacles.
The current generic APK controller reduces this game to two direction choices and loses those mechanics.

Griffin Sky-Joust has a separate [combat specification](/home/daniebo/Desktop/reading-advantage-monorepo/apps/advantage-games/measure/archive/griffin-sky-joust-20260320/spec.md:1).
Its [current controller](/home/daniebo/Desktop/reading-advantage-monorepo/packages/game-cartridges/src/griffin-sky-joust.ts:659) implements flapping, drift, and top strikes.
This identity matches the owner's stated Joust mechanic.

## Corrected implementation boundary

Consolidate only the two dragon vocabulary lane games under Dragon Flight.
Preserve their historical result identifiers and score scopes.
Retain the Griffin Joust mechanic as a separate game.
Evaluate Escape's runner lineage separately before changing its route or behavior.
Share APK controls, screens, audio services, and suitable assets across these games.
Preserve each retained game's distinct player decisions.

The earlier proposal to combine all three games under one flight engine is withdrawn.
Shared visual themes and degraded current controllers do not establish redundant gameplay.
