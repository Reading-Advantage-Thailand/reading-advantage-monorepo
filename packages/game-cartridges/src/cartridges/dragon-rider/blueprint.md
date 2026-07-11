# Dragon Rider APK Blueprint

- Public ID: `dragon-rider`
- Input: strict vocabulary array
- Loop: resolve one seeded left/right translation gate per vocabulary item, grow or shrink the dragon flight, then evaluate it against the final boss threshold
- Inputs: ArrowLeft/A, ArrowRight/D, and visible left/right pointer or touch regions
- Editions: Primary Chibi and Secondary Epic use the same educational state with edition-owned palette, tuning, and semantic assets
- Result: exact `accuracy`, `xp`, `score`, `correctAnswers`, and `totalAttempts` ABI; persisted XP remains server-owned
- Host: generic authenticated `/[locale]/student/arcade/[cartridgeId]` only
