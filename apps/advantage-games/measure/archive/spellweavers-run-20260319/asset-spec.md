# Spellweaver's Run — Asset Inventory & Specification

## Platform Notes
- All assets optimized for mobile (portrait)
- Recommend @2x assets for retina displays
- All sprites PNG with transparency
- Keep file sizes small for mobile performance

---

## 1. Word Orbs

### 1.1 Word Orb Sprite
**Purpose:** Display collectible word orbs in 3 lanes
**Asset Type:** Single PNG (can be colored programmatically)
**Size:** 64×64px

**Style Notes:**
- Glowing magical orb appearance
- Semi-transparent with inner glow
- Color variations possible via code (correct = green tint, wrong = red flash)

---

## 2. UI Elements

### 2.1 Floating Scroll
**Purpose:** Background for translation display at top of screen
**Asset Type:** 9-slice or single PNG
**Size:** 360×80px (scalable width)

**Style Notes:**
- Parchment/scroll appearance
- Fantasy RPG aesthetic
- Rolled edges optional

### 2.2 Mana Bar
**Purpose:** Display remaining mana
**Asset Type:** None (rendered with Konva shapes)
**Implementation:** Rectangular bar with gradient fill, border

---

## 3. Backgrounds

### 3.1 Parallax Layer 1 - Far Trees
**Purpose:** Distant forest background
**Asset Type:** Single PNG (tiled vertically)
**Size:** 400×1200px

**Style Notes:**
- Silhouette trees in mist
- Dark blue/green tones
- Very slow parallax

### 3.2 Parallax Layer 2 - Mid Trees
**Purpose:** Mid-ground forest
**Asset Type:** Single PNG (tiled vertically)
**Size:** 400×1200px

**Style Notes:**
- More detailed trees
- Medium parallax speed

### 3.3 Parallax Layer 3 - Near Elements
**Purpose:** Foreground elements
**Asset Type:** Single PNG (tiled vertically)
**Size:** 400×1200px

**Style Notes:**
- Tree trunks, ferns
- Fastest parallax
- Optional: magical particles

---

## 4. Effects (Optional)

### 4.1 Sparkle Particle
**Purpose:** Correct collection feedback
**Asset Type:** Single PNG
**Size:** 32×32px

**Style Notes:**
- Star/sparkle shape
- White/gold color
- Can be scaled/rotated

### 4.2 Magic Trail
**Purpose:** Orb movement trail
**Asset Type:** None (rendered with code)
**Implementation:** Fading circle particles

---

## Asset Summary Table

| Category | Assets Required | Priority |
|----------|-----------------|----------|
| Word Orbs | orb.png | HIGH |
| UI Elements | scroll.png | HIGH |
| Backgrounds | parallax-1.png, parallax-2.png, parallax-3.png | MEDIUM |
| Effects | sparkle.png | LOW |

---

## Asset Placement

All assets go in: `/public/games/spellweavers-run/`

| Filename | Description |
|----------|-------------|
| orb.png | Word orb sprite (64×64) |
| scroll.png | Floating scroll background |
| parallax-far.png | Far tree layer |
| parallax-mid.png | Mid tree layer |
| parallax-near.png | Near elements layer |
| sparkle.png | Sparkle particle (optional) |

---

## Explicitly Excluded (Scope Control)
- Character sprites (no visible player character)
- Enemy sprites (no opponents)
- Multiple environment themes (MVP uses single forest theme)
- Animated orbs (static orb, animated via code)
- Sound files (handled separately if needed)
