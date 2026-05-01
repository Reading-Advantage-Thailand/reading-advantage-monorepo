# Sentence Practice Game Concepts

**Core Mechanic:** A sentence translation is shown on screen. Words to form the English sentence are scattered in the game area and must be collected in the correct order. Score is tracked and converted to 1-10 XP at game end.

**Required Features:**
- Translation display (sentence in target language)
- Words scattered in game world
- Collection in correct sequence
- Difficulty and/or opponent choice screens
- RPG theme

---

## Snake-Style "Trailing Line" Games

Player collects words which trail behind them in a growing line. Classic snake mechanics with RPG rescue theme.

### Royal Convoy

**Theme:** Knight escorting nobles through dangerous wilderness

**Mechanic:**
- Forest path with branching routes
- Lost nobles scattered along way with word crests
- Collect in sequence—they join caravan procession
- Wrong noble = insult to house (reputation/life loss)
- Bandit ambushes—dodge or lose caravan members
- Reach castle with full convoy to deliver royal decree (sentence)

**Difficulty Choice:** Journey length
- Short Pass (3 words)
- Long Road (5 words)
- Perilous Route (7 words)

**Opponent Choice:** Highwayman gang
- Thieves Guild (avoidance)
- Orc Raiders (chase)
- Dark Knights (hunt)

**Controls:** DPad movement, speed boost button

---

## Dragon/Serpent Variants

Classic snake with fantasy creature theme.

### Dragon's Glyph Run

**Theme:** Ancient temple corridors

**Mechanic:**
- Control growing dragon serpent through temple hallways
- Translation at top of screen
- Word orbs scattered—collect in correct order
- Wrong word = lose tail segment (lives)
- Hit wall/self = damage
- Complete sentence = advance to next chamber

**Difficulty Choice:**
- Hatchling (slow, short words)
- Wyrm (medium)
- Elder Dragon (fast, long sentences)

**Opponent Choice:** Temple Guardian
- Stone Golem (slow patrol)
- Fire Elemental (medium)
- Void Wraith (fast, tracks player)

**Controls:** DPad arrows, continuous movement

---

### Spirit Serpent Grove

**Theme:** Enchanted forest with glowing spirit serpent

**Mechanic:**
- Spirit serpent winds through mystical grove
- Word flowers bloom on ground—collect in order
- Wrong flower = spirit fades (health loss)
- Complete sentence to purify grove, unlock next area

**Difficulty Choice:**
- Moonlit Path (easy)
- Sunlit Clearing (medium)
- Starlit Depths (hard)

**Opponent Choice:** Forest spirit
- Will-o-wisps (distract)
- Shadow Sprites (block)
- Corrupted Treants (chase)

**Controls:** DPad movement

---

## Technical Notes

All sentence games should:
- Use `VocabularyItem[]` with full sentences, not just words
- Display complete translation during gameplay
- Track: correct words, total attempts, time
- XP formula: `Math.floor(correctWords * accuracy)`
- Support both touch (DPad/VirtualDPad) and keyboard

### Vocabulary File Format

```json
[
  {
    "term": "The cat sits on the mat",
    "translation": "Le chat est assis sur le tapis"
  }
]
```

### Word Display

- Each word should be visually distinct (bubble, orb, card)
- Show word order hint subtly (number, glow intensity)
- Wrong selection feedback: shake, flash red, sound
- Correct selection feedback: sparkle, chime, word joins trail
