# Implementation Plan: Rune Match

This plan outlines the steps to build the "Rune Match" match-3 RPG vocabulary game using **React-Konva (Canvas)** for high-performance rendering.

## Phase 1: Setup & Infrastructure [checkpoint: 7e9f070]
*   [x] Task: Create configuration file `src/lib/runeMatchConfig.ts` with all balance values. a20e9c0
*   [x] Task: Define `RuneMatchState`, `Monster`, `Rune`, and related types in `src/lib/runeMatch.ts`. d10c86e
*   [x] Task: Create `src/app/games/rune-match` route and page structure. 0d293b3
*   [x] Task: Create `RuneMatchGame` container component with React-Konva Stage. 3c2ce4d
*   [x] Task: Register game in Main Menu (using placeholder cover image). 8f35e75
*   [x] Task: Measure - User Manual Verification 'Phase 1: Setup & Infrastructure' 7e9f070

## Phase 2: Monster Selection Screen [checkpoint: e06f9ae]
*   [x] Task: Implement Monster Selection UI with 4 difficulty options. 790aa9b
*   [x] Task: Display monster stats (HP, Attack, XP reward) for each option. 790aa9b
*   [x] Task: Implement selection logic and transition to game screen. 790aa9b
*   [x] Task: Measure - User Manual Verification 'Phase 2: Monster Selection Screen' e06f9ae

## Phase 3: Grid & Match-3 Core [checkpoint: 7fb626f]
*   [x] Task: Implement grid initialization with vocabulary runes (infinite stack model). ff61b3f
*   [x] Task: Implement tile swap mechanic (tap two adjacent tiles). 4f801ae
*   [x] Task: Implement match detection (3+ horizontal/vertical, L-shapes, T-shapes). 4135a99
*   [x] Task: Implement tile clearing and gravity (tiles fall from top). 3bc0532
*   [x] Task: Implement cascade detection (chain reactions after gravity). a91ce5e
*   [x] Task: Implement invalid swap reversion. 1e99219
*   [x] Measure - User Manual Verification 'Phase 3: Grid & Match-3 Core' 7fb626f

## Phase 4: Combat System [checkpoint: 2777c7c]
*   [x] Task: Increase board and text size by ~50% for better readability. 83529d5
*   [x] Task: Implement player HP and monster HP state. ccb55e1
*   [x] Task: Implement damage calculation from matches (3/4/5/L/T + cascades). 39bbdbd
*   [x] Task: Implement monster attack timer (every 5 seconds). 0afdbc7
*   [x] Task: Implement random damage (1 to monster ATK stat). 0afdbc7
*   [x] Task: Implement screen shake on monster attack. ccb55e1
*   [x] Task: Implement Power Word system (target term, bonus damage for matching). 42947e8
*   [x] Task: Implement Power Word rotation (changes every 5 sec with attack). 42947e8
*   [x] Measure - User Manual Verification 'Phase 4: Combat System' 2777c7c

## Phase 5: Power-Up Runes [checkpoint: cff2b38]
*   [x] Task: Implement Heal rune spawning (configurable spawn rate). 42947e8
*   [x] Task: Implement Shield rune spawning. 42947e8
*   [x] Task: Implement Heal effect (restore HP on match). 42947e8
*   [x] Task: Implement Shield effect (block next attack). 42947e8
*   [x] Task: Implement visual feedback for power-up activation. 42947e8
*   [x] Measure - User Manual Verification 'Phase 5: Power-Up Runes' cff2b38

## Phase 6: UI & HUD [checkpoint: 51939a9]
*   [x] Task: Implement Player HP bar display. ccb55e1
*   [x] Task: Implement Monster HP bar display. ccb55e1
*   [x] Task: Implement Power Word display panel. 42947e8
*   [x] Task: Implement damage numbers / combo indicators. 42947e8
*   [x] Task: Implement monster sprite display with state animations. 51939a9
*   [x] Measure - User Manual Verification 'Phase 6: UI & HUD' 51939a9

## Phase 7: Game States & Polish [checkpoint: fce0df4]
*   [x] Task: Implement Victory state (monster HP = 0, show XP earned). fce0df4
*   [x] Task: Implement Defeat state (player HP = 0, game over). fce0df4
*   [ ] Task: Implement match explosion effects.
*   [x] Task: Implement monster attack/hurt/death animations. fce0df4
*   [x] Final balance tuning (adjust config values based on playtesting). fce0df4
*   [x] Measure - User Manual Verification 'Phase 7: Game States & Polish' fce0df4

---

## Configuration Reference

All balance values are stored in `src/lib/runeMatchConfig.ts` for easy tuning:

```typescript
export const RUNE_MATCH_CONFIG = {
  player: {
    maxHp: 100,
  },
  monsters: {
    goblin:   { hp: 50,  attack: 2,  xp: 3  },
    skeleton: { hp: 80,  attack: 4,  xp: 6  },
    orc:      { hp: 120, attack: 6,  xp: 9  },
    dragon:   { hp: 160, attack: 8,  xp: 12 },
  },
  combat: {
    attackIntervalMs: 5000,
    match3Damage: 10,
    match4Damage: 20,
    match5Damage: 30,
    lShapeDamage: 25,
    cascadeBonus: 5,
    powerRuneMultiplier: 2,
  },
  powerUps: {
    healAmount: 5,
    shieldDuration: 1, // blocks 1 attack
    spawnRate: 0.10,
  },
  grid: {
    columns: 6,
    rows: 8,
  },
};
```

---

## Technical Notes

* Follow architecture patterns from DragonFlight and WizardZombie games.
* Use pure state object with `advanceTime` / `tick` function for game logic.
* React-Konva for canvas rendering (performance with many tiles).
* All runes use identical visual design - text is the only differentiator.
