# Shadow Gate Dungeon — Asset Inventory & Specification

## Platform Notes
- All assets optimized for mobile (portrait)
- Recommend @2x assets for retina displays
- All sprites PNG with transparency
- Keep file sizes small for mobile performance

---

## 1. Player Character (Knight)

### 1.1 Knight Sprite
**Purpose:** Player avatar navigating the dungeon
**Asset Type:** Single PNG (can be simple for MVP)
**Size:** 64×64px (displayed at 40×40)

**Style Notes:**
- Armored knight viewed from above
- Silver/steel armor with blue accents
- Simple but recognizable silhouette
- Direction indicator (facing front)

---

## 2. Shadow Creature

### 2.1 Shadow Creature Sprite
**Purpose:** Pursuer that chases the player
**Asset Type:** Single PNG (can be simple for MVP)
**Size:** 64×64px (displayed at 50×50)

**Style Notes:**
- Dark purple/black shadowy form
- Glowing eyes (red or purple)
- Wispy, ethereal appearance
- Can use simple geometric shape with glow effect

---

## 3. Word Crystals

### 3.1 Crystal Base
**Purpose:** Collectible word container
**Asset Type:** Single PNG
**Size:** 64×64px (displayed at 50×50)

**Style Notes:**
- Glowing crystal/gem shape
- Cyan glow for normal
- Gold glow for target (next word to collect)
- Can use Konva shapes for MVP

---

## 4. Exit Gate

### 4.1 Magical Portal
**Purpose:** Exit point displayed at top of dungeon
**Asset Type:** Single PNG
**Size:** 120×80px

**Style Notes:**
- Stone archway with magical portal
- Red glow when locked
- Green glow when unlocked
- Can use Konva shapes for MVP

---

## 5. Dungeon Background

### 5.1 Stone Floor Pattern
**Purpose:** Dungeon floor texture
**Asset Type:** Tileable PNG
**Size:** 128×128px

**Style Notes:**
- Dark stone pattern
- Subtle, not distracting
- Can use solid color + grid lines for MVP

### 5.2 Wall Borders
**Purpose:** Arena boundary walls
**Asset Type:** Single PNG or Konva shapes
**Size:** Variable (borders)

**Style Notes:**
- Dark stone walls
- Can be simple rectangles for MVP

---

## 6. UI Elements

### 6.1 Virtual DPad
**Purpose:** Touch controls for mobile
**Asset Type:** Already exists in DungeonLiberator
**Reuse:** Use existing VirtualDPad component

---

## Asset Summary Table

| Category | Assets Required | Priority |
|----------|-----------------|----------|
| Player | knight.png | MEDIUM (can use circle) |
| Creature | shadow-creature.png | MEDIUM (can use circle) |
| Crystals | crystal.png | LOW (can use Konva shapes) |
| Gate | portal.png | LOW (can use Konva shapes) |
| Background | floor.png, walls | LOW (can use gradient) |
| UI | VirtualDPad | NONE (reuse existing) |

---

## Asset Placement

All assets go in: `/public/games/shadow-gate-dungeon/`

| Filename | Description |
|----------|-------------|
| knight.png | Player sprite |
| shadow-creature.png | Pursuer sprite |
| crystal.png | Word crystal |
| portal.png | Exit gate |

---

## MVP Approach

For initial implementation, use Konva primitives:
- Player: Blue circle
- Creature: Purple circle with glow
- Crystal: Cyan circle with text
- Gate: Rectangle with gradient

Assets can be added later for visual polish.
