# Game Specification: Devourer Slime

**ID:** `devourer-slime`  
**Theme:** Magical Slime / Forest Arena  
**Mechanic:** Arena Growth (Hole.io style)  

## Gameplay

1. **Objective:** Grow the Slime by "eating" words from a sentence in the correct order.
2. **Movement:** 
   - Control the Slime using DPad or virtual joystick.
   - Smooth, fluid movement in a bounded arena.
3. **Eating Mechanics:**
   - Approach a "Word Orb" to absorb it.
   - If the word is the **correct** next word in the sentence:
     - Slime grows visually (radius increase).
     - Absorption radius increases.
     - Gain Score/XP.
   - If the word is **incorrect**:
     - Slime shrinks (radius decrease).
     - Score penalty.
     - Slime turns red/flashes.
4. **Enemies:**
   - Knight Guards patrol the arena.
   - If the Slime is **smaller** than a Knight:
     - Collision results in life loss / size reduction.
   - If the Slime is **larger** than a Knight:
     - The Slime can eat the Knight for bonus XP/Score.
5. **Sentence Completion:**
   - A translation of the sentence is shown at the top.
   - Once the final word is eaten, the sentence is complete.
6. **Game Over:**
   - Slime's size reaches zero or lives run out.
   - Win by completing all target sentences.

## Educational Integration

- Focus on sentence structure and word order.
- Immediate visual feedback on correctness through growth/shrink mechanics.

## Visuals

- **Background:** Forest floor / Meadow.
- **Slime:** Translucent green blob with wobbly edges and eyes.
- **Word Orbs:** Floating energy orbs with words inside.
- **Knight Guards:** Small armored figures that scale relative to the Slime.
- **Effects:** Absorption ripples, slime trails, scaling animations.

## Controls

- **DPad / Arrow Keys / Virtual Joystick:** Move the Slime.
- Mobile-friendly (touch optimized).
