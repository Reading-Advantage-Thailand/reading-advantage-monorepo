# Rune Match — Asset Inventory & Specification

---

## 1. Monsters (PRIMARY ANTAGONISTS)

Four monsters of increasing difficulty. Each needs multiple states for combat feedback.

### 1.1 Goblin (3 XP - Easy)

**Purpose:** Entry-level opponent, low threat
**Sprite Sheet:** 4×1 or 2×2 grid, transparent

| State | Frames | Notes |
|-------|--------|-------|
| Idle | 1-2 | Slight breathing/bounce |
| Attack | 2-3 | Swipe or lunge motion |
| Hurt | 1-2 | Flinch/recoil |
| Death | 3-4 | Collapse or poof |

**Style Notes:**
* Small, impish creature
* Green/brown coloring
* Non-threatening but mischievous

---

### 1.2 Skeleton (6 XP - Medium)

**Purpose:** Mid-tier threat, classic RPG enemy
**Sprite Sheet:** 4×1 or 2×2 grid, transparent

| State | Frames | Notes |
|-------|--------|-------|
| Idle | 1-2 | Subtle bone rattle |
| Attack | 2-3 | Slash or claw swipe |
| Hurt | 1-2 | Bones scatter slightly |
| Death | 3-4 | Crumble to pile |

**Style Notes:**
* Humanoid skeleton warrior
* Pale bone coloring
* Optional: tattered armor/cape

---

### 1.3 Orc (9 XP - Hard)

**Purpose:** Heavy hitter, intimidating presence
**Sprite Sheet:** 4×1 or 2×2 grid, transparent

| State | Frames | Notes |
|-------|--------|-------|
| Idle | 1-2 | Breathing, weapon ready |
| Attack | 2-3 | Heavy swing |
| Hurt | 1-2 | Grunt/stagger |
| Death | 3-4 | Fall forward |

**Style Notes:**
* Large, muscular humanoid
* Green skin, tusks
* Armored, carries weapon

---

### 1.4 Dragon (12 XP - Boss)

**Purpose:** Ultimate challenge, impressive presence
**Sprite Sheet:** 4×1 or 2×2 grid, transparent

| State | Frames | Notes |
|-------|--------|-------|
| Idle | 2-3 | Wing flap, breathing smoke |
| Attack | 3-4 | Fire breath or claw |
| Hurt | 1-2 | Roar/recoil |
| Death | 4-5 | Dramatic collapse |

**Style Notes:**
* Classic fantasy dragon
* Red/black coloring preferred
* Wings visible, imposing size
* Larger sprite than other monsters (~1.5x)

---

### 1.5 Monster Display Size

| Monster | Suggested Size | Display Position |
|---------|---------------|------------------|
| Goblin | 150×150px | Right side of screen |
| Skeleton | 180×180px | Right side of screen |
| Orc | 200×200px | Right side of screen |
| Dragon | 250×250px | Right side of screen |

---

## 2. Rune Tiles (CORE GAMEPLAY OBJECTS)

### 2.1 Base Vocabulary Rune (CRITICAL)

**Purpose:** The tile that holds vocabulary text
**Asset Type:** Single PNG, transparent

**CRITICAL DESIGN RULE:**
There is only ONE rune design. All vocabulary words use the SAME visual tile. The only difference between runes is the text rendered on top by the engine. This forces players to READ the words.

**Visual Specs:**
* Stone or crystal appearance
* Neutral color (gray stone, blue crystal, etc.)
* Slight magical glow/sheen
* Clear center area for text overlay
* Size: 64×64px recommended

---

### 2.2 Rune States

| State | Asset Type | Notes |
|-------|------------|-------|
| Normal | Base rune | Default appearance |
| Selected | Rune + highlight border | When first tile of swap is tapped |
| Matched | Rune + bright flash | Brief moment before explosion |
| Falling | Same as normal | Engine handles animation |

**Selected Highlight:**
* Golden or white glowing border
* Can be overlay PNG or engine-drawn

**Matched Flash:**
* Bright white/yellow overlay
* Single frame, engine fades it

---

### 2.3 Heal Rune (Power-Up)

**Purpose:** Match 3+ to restore 5 HP
**Asset Type:** Single PNG, transparent
**Size:** 64×64px (same as base rune)

**Visual Specs:**
* DISTINCT from vocabulary runes
* Heart icon or red crystal
* Clearly communicates "health"
* Soft red/pink glow

---

### 2.4 Shield Rune (Power-Up)

**Purpose:** Match 3+ to block next attack
**Asset Type:** Single PNG, transparent
**Size:** 64×64px (same as base rune)

**Visual Specs:**
* DISTINCT from vocabulary runes
* Shield icon or blue barrier crystal
* Clearly communicates "defense"
* Soft blue glow

---

## 3. Effects

### 3.1 Match Explosion

**Purpose:** Visual feedback when tiles clear
**Sprite Sheet:** 1×5 or 1×6 frames, transparent

**Visual Specs:**
* Magical particle burst
* Radiates outward from center
* Neutral color (white/gold/blue)
* Duration: ~300ms

---

### 3.2 Cascade Indicator (OPTIONAL)

**Purpose:** Show combo chain
**Asset Type:** Could be engine-rendered text

* "x2!", "x3!", etc.
* Floating numbers with glow

---

### 3.3 Monster Attack Effect

**Purpose:** Visual for monster hitting player
**Sprite Sheet:** 1×3 or 1×4 frames, transparent

**Visual Specs:**
* Slash marks or impact burst
* Red/orange coloring
* Appears briefly over game board
* Syncs with screen shake

---

### 3.4 Heal Effect

**Purpose:** Visual when heal rune matched
**Sprite Sheet:** 1×3 frames or particle sprites

**Visual Specs:**
* Green sparkles rising
* Heart particles
* Plays around player HP bar area

---

### 3.5 Shield Effect

**Purpose:** Visual when shield activated
**Asset Type:** Single PNG or 2-frame loop

**Visual Specs:**
* Blue bubble or barrier
* Semi-transparent
* Appears near player HP bar
* Disappears when shield consumed

---

## 4. UI Elements

### 4.1 HP Bars

**Assets Needed:**
* Bar frame/border (empty state)
* Bar fill (scales with HP)
* Optional: Critical state overlay (red pulse when low)

**Specs:**
* Player HP bar: Left side of screen
* Monster HP bar: Above or beside monster
* Width: ~200px, Height: ~20px

---

### 4.2 Power Word Display

**Purpose:** Shows current target term
**Asset Type:** Panel/frame PNG

**Visual Specs:**
* Semi-transparent dark panel
* Magical border/runes decoration
* Text rendered by engine: "POWER: [word]"
* Position: Top of screen

---

### 4.3 XP Badge

**Purpose:** Shows earned XP on victory
**Asset Type:** Single PNG frame

**Visual Specs:**
* Star or gem icon
* Space for number overlay
* Gold/magical appearance

---

## 5. Backgrounds

### 5.1 Monster Selection Screen Background

**Purpose:** Backdrop for difficulty selection
**Asset Type:** Single PNG, full screen

**Visual Specs:**
* Dungeon entrance or castle hall
* Dark, atmospheric
* Space for 4 monster "pedestals"
* Low detail to not distract from UI

---

### 5.2 Game Board Background

**Purpose:** Area behind the rune grid
**Asset Type:** Tileable or single PNG

**Visual Specs:**
* Stone dungeon floor or magical surface
* LOW CONTRAST (critical!)
* Must not interfere with rune text readability
* Subtle texture only

---

### 5.3 Monster Arena Area

**Purpose:** Background behind monster on right side
**Asset Type:** Single PNG or part of main background

**Visual Specs:**
* Slightly different from board area
* Frames the monster
* Darker or with different texture

---

## 6. Game State Screens

### 6.1 Victory Banner

**Purpose:** Displayed when monster defeated
**Asset Type:** Single PNG, transparent

**Visual Specs:**
* "VICTORY!" or decorative frame
* Gold/triumphant colors
* Space for XP display below

---

### 6.2 Defeat Banner

**Purpose:** Displayed when player dies
**Asset Type:** Single PNG, transparent

**Visual Specs:**
* "DEFEATED!" or skull imagery
* Dark red/gray colors
* Non-gory, fantasy-appropriate

---

## 7. Asset Summary Table

| Category | Assets Required | Priority |
|----------|-----------------|----------|
| Monsters | 4 sprite sheets (Goblin, Skeleton, Orc, Dragon) | HIGH |
| Runes | Base rune + Heal rune + Shield rune | HIGH |
| Rune States | Selected highlight, Matched flash | MEDIUM |
| Effects | Match explosion, Attack effect | MEDIUM |
| Effects | Heal effect, Shield effect | LOW |
| UI | HP bar elements, Power Word panel | HIGH |
| Backgrounds | Selection screen, Game board | MEDIUM |
| Banners | Victory, Defeat | LOW |

---

## 8. Explicitly Excluded (Scope Control)

* No multiple rune colors for vocabulary (ONE design only)
* No monster walking animations (they are stationary)
* No player character sprite (implied off-screen mage)
* No gore, blood, or graphic violence
* No complex particle systems (keep effects simple)
* No audio assets in this spec (separate consideration)

---

## 9. Technical Notes

* All sprites should be PNG with transparency
* Recommend @2x assets for retina displays
* Sprite sheets should have consistent frame sizes
* Engine will handle: text rendering on runes, animations, scaling
