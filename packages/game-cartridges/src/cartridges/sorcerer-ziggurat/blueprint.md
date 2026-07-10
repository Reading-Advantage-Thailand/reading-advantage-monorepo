# The Sorcerer's Ziggurat Blueprint

## Recognizable mechanic

The learner climbs an isometric cube pyramid by selecting one adjacent rune cube at
a time. Exactly one reachable cube carries the next word in the active sentence.
Correct steps tween the sorcerer upward and light the chosen rune; wrong reachable
steps count as attempts but do not move or advance the sequence. Completing a
sentence activates one ritual tier. Completing every tier ends the session.

## Educational contract

- Input: strict `Array<{ term: string; translation: string }>` in sentence mode.
- `term`: ordered sentence token sequence.
- `translation`: visible meaning prompt.
- Output: exactly `{ accuracy, xp, score, correctAnswers, totalAttempts }` once.
- Empty arrays, blank sentences, and blank translations fail preflight.

## Controls and consequences

- Keyboard: Left/A, Up/W, and Right/D choose the corresponding reachable cube.
- Pointer/touch: directly select a highlighted reachable cube.
- Correct: +100 display score, progress one token, light the rune, tween-jump.
- Incorrect: -25 internal display score, feedback/shake, remain on the current cube.
- Nonexistent and nonadjacent selections are ignored.

## Phaser and APK systems

The scene uses Phaser input, cameras, depth-sorted isometric projection, tweens, and
particles. Pure graph generation and transitions remain renderer-independent and
seeded. One scene source consumes Primary Chibi or Secondary Epic edition assets;
identity, tenancy, persistence, and authoritative XP remain host-owned.
