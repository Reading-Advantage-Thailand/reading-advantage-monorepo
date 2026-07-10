# Astral Mage mechanic blueprint

## Recognizable loop

- **Player verb:** Move a mage through a bounded astral arena, aim, and fire real projectiles.
- **Learning mode:** Sentence pair arrays. The translation remains visible while the English `term` is reconstructed.
- **Targets:** Every term token becomes a distinct crystal with a stable sentence/token ID, including duplicate words.
- **Correct hit:** Deactivates the required crystal, advances ordered progress once, and awards score.
- **Wrong hit:** Counts an attempt and applies feedback without advancing or removing the crystal.
- **Win:** Complete every token in every supplied sentence and emit one five-field `GameResults` value.
- **Loss:** There is no hard educational lockout in the first family proof; mistakes reduce score but the session remains completable.

## Controls and Phaser systems

- Keyboard: WASD or arrows to move; Space fires toward the required crystal.
- Pointer/touch: press a world position to aim and fire.
- Phaser owns Arcade Physics, camera follow/bounds, projectile collisions and pooling, timers, particles, tweens, and feedback.
- The active target has a fixed-camera guidance label so it remains identifiable outside the current camera view.

## Semantic slots

`world.background`, `player.hero`, `target.correct`, `target.incorrect`,
`target.word-crystal`, `projectile.magic`, `feedback.correct`,
`feedback.incorrect`, `indicator.offscreen`, `portal.complete`, and `ui.panel`
are edition-owned. Gameplay contains no Primary/Secondary branch.
