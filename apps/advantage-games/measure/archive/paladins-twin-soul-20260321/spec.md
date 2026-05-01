# Game Design Document: Paladin's Twin-Soul

## 1. Overview
**Title:** Paladin's Twin-Soul
**Genre:** Arcade / Fixed Shooter (Galaga style)
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Control a Paladin defending against descending gargoyles. Rescue a captured "twin soul" to double your power, while matching vocabulary translations to identify the correct target for rescue.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference
- **Touch targets**: Bottom slider or DPad (44×44px)
- **Text size**: Minimum 18px for words on map

## 3. Game Flow
1. **Start Screen**: Select difficulty (enemy speed, fire rate)
2. **Gameplay**: Paladin at bottom, gargoyles in formation at top.
3. **Capture Mechanic**: A "Boss Gargoyle" periodically descends and fires a tractor beam. If hit, the player is captured and taken to the top of the formation.
4. **Rescue Mechanic**: A new Paladin spawns. The captured Paladin is held by an enemy showing a vocabulary word. Other enemies show distractors.
5. **Collection**: Shooting the enemy holding your twin soul (matching the target translation) rescues them.
6. **Power-up**: Rescued twin soul joins you side-by-side, doubling fire rate.
7. **Win Condition**: Collect all target words in correct order (or survive waves).
8. **Lose Condition**: HP reaches zero or captured twin soul is destroyed by friendly fire.

## 4. Core Gameplay Loop
1. Target word translation displayed at top.
2. Gargoyles dive and attack.
3. Boss Gargoyle captures player.
4. Player must identify the gargoyle holding the "twin soul" by matching the translation.
5. Success → Double Paladin power.
6. Failure → Loss of twin soul or damage.

## 5. Win/Lose Conditions
- **Victory:** Full set of words completed.
- **Defeat:** All HP lost.

## 6. XP & Scoring System
- **Base XP:** 1 XP per word.
- **Twin-Soul Bonus:** +2 XP if rescued.
- **Accuracy Bonus:** +2 XP if >90% hits.
- **Maximum XP:** 10.

## 7. Mechanics

### 7.1 Movement
- Horizontal movement only (Classic Galaga).
- Tilt or Virtual DPad slider.

### 7.2 Combat
- Automatic or tap-to-fire magic bolts.
- Enemies move in patterns and dive.

### 7.3 Rescue Logic
- Only one rescue attempt per session (like Galaga).
- Shooting the captured paladin instead of the enemy results in permanent loss of twin soul for that wave.

## 8. Technical Approach
- **Engine:** React + React-Konva.
- **State:** Pure state with `tickPaladinsTwinSoul`.
- **Entities:** Player, Bullets, Enemies, Particles.

## 9. Configuration

```typescript
export const PALADINS_TWIN_SOUL_CONFIG = {
  gameWidth: 390,
  gameHeight: 844,
  
  player: {
    speed: 300,
    initialHp: 3,
    bulletSpeed: 500,
    fireRate: 500, // ms
  },
  
  enemy: {
    rows: 4,
    cols: 6,
    speed: 50,
    diveProbability: 0.01,
  }
};
```
