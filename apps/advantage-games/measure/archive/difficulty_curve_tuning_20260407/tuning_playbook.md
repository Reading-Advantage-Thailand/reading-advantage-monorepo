# Difficulty Tuning Playbook

A guide for implementing and tuning difficulty in future game tracks.

---

## Quick Start

When creating a new game, follow these steps:

### 1. Import Shared Types

```typescript
import type { Difficulty } from '@/store/useGameStore'
import { DIFFICULTY_GUARDRAILS, FALLBACK_DIFFICULTY_CONFIG } from '@/lib/games/difficulty'
```

### 2. Define Difficulty Configuration

```typescript
export const MY_GAME_CONFIG = {
  difficulties: {
    easy: {
      name: 'Beginner',
      speed: 60,
      spawnInterval: 2000,
      wordCount: 4,
      initialHp: 5,
    },
    normal: {
      name: 'Standard',
      speed: 90,
      spawnInterval: 1500,
      wordCount: 6,
      initialHp: 3,
    },
    hard: {
      name: 'Expert',
      speed: 120,
      spawnInterval: 1000,
      wordCount: 8,
      initialHp: 2,
    },
    extreme: {
      name: 'Master',
      speed: 150,
      spawnInterval: 700,
      wordCount: 10,
      initialHp: 1,
    },
  },
}
```

### 3. Validate Configuration

Use the guardrail validation to ensure safe values:

```typescript
import { validateDifficultyConfig } from '@/lib/games/difficulty.test'

const errors = validateDifficultyConfig({
  speed: 180,
  spawnInterval: 400, // Too low!
  wordCount: 12,      // Too high!
})

if (errors.length > 0) {
  console.warn('Invalid difficulty config:', errors)
}
```

---

## Difficulty Scaling Principles

### Speed vs Spawn Rate Trade-off

As difficulty increases, you can either:
- **Increase speed** (enemies move faster) - Tests reaction time
- **Decrease spawn interval** (more frequent spawns) - Tests throughput

Never maximize both simultaneously - pick one primary challenge vector.

### HP Scaling Guidelines

| Difficulty | HP Multiplier | Rationale |
|------------|---------------|-----------|
| Easy | 1.5x | Forgiving, learning-focused |
| Normal | 1.0x | Balanced baseline |
| Hard | 0.7x | Challenging but fair |
| Extreme | 0.4x | Punishing, expert only |

### Word Count Guidelines

| Difficulty | Word Count Range | Per-word Time (Normal Mode) |
|------------|-----------------|---------------------------|
| Easy | 3-5 words | ~5 seconds |
| Normal | 5-7 words | ~4 seconds |
| Hard | 7-9 words | ~3 seconds |
| Extreme | 9-12 words | ~2.5 seconds |

---

## Guardrail Checklist

Before shipping a new game, verify:

- [ ] `speed` ≤ 200 px/s (mobile performance)
- [ ] `spawnInterval` ≥ 500ms (prevents impossible scenarios)
- [ ] `initialHp` ≥ 1
- [ ] `wordCount` ≤ 10 per round
- [ ] `timer` ≥ 5000ms (for timed modes)

---

## Common Pitfalls

### 1. Extreme = Impossible
**Wrong:** Setting extreme difficulty so hard that no human can win.
**Right:** Extreme should have ~30-40% win rate for experienced players.

### 2. Linear Scaling
**Wrong:** Increasing difficulty by fixed increments (speed +10 each level).
**Right:** Use multiplicative scaling for exponential feel.

### 3. Ignoring Mobile
**Wrong:** High speeds that look fine on desktop but are unplayable on mobile.
**Right:** Test on low-end devices. Keep max speed ≤ 200 px/s.

---

## Testing Difficulty

### Manual Testing
1. Play each difficulty for at least 2 minutes
2. Easy: Should feel relaxed, rarely lose
3. Normal: Should feel balanced, lose occasionally
4. Hard: Should feel challenging, lose regularly
5. Extreme: Should feel punishing, lose frequently but fairly

### Automated Testing
```typescript
it('should have valid easy difficulty', () => {
  const errors = validateDifficultyConfig(MY_GAME_CONFIG.difficulties.easy)
  expect(errors).toHaveLength(0)
})
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-07 | Initial playbook |
