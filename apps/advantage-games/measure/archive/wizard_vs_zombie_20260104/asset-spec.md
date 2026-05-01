# Zombie Tag — Asset Inventory & Pose Sheet Plan

---

## 1. Player Character — Wizard (CORE ASSET)

![Image](https://img.itch.zone/aW1nLzExNzY5ODcwLmdpZg%3D%3D/original/xB2sjT.gif)

![Image](https://img.itch.zone/aW1nLzExNzY5NzQzLnBuZw%3D%3D/original/VtxNjz.png)

![Image](https://files.idyllic.app/files/static/2465039)

### 1.1 Wizard Pose Sheet (3×3)

**Purpose:** Movement + state communication
**Sprite Sheet:** 3×3 grid, square, transparent

| Row | State                  | Notes                      |
| --- | ---------------------- | -------------------------- |
| 1   | Idle (3 frames)        | Subtle robe / staff motion |
| 2   | Walk (3 frames)        | Continuous loop            |
| 3   | Cast / Heal (3 frames) | Used on orb pickup         |

**Hard Rules**

* Facing **north (up)** only
* No directional variants
* Animation must read clearly at small sizes

---

### 1.2 Wizard Critical Overlay (STATIC)

**Purpose:** Communicate low HP without re-animating base sprite
**Asset Type:** Static PNG overlay, transparent

* Red glow / pulse ring
* Slight magical distortion
* Engine-animated opacity

---

## 2. Enemy — Zombie (PRIMARY PRESSURE UNIT)

![Image](https://opengameart.org/sites/default/files/export_move.gif)

![Image](https://opengameart.org/sites/default/files/skeleton-attack_0.png)

![Image](https://img.craftpix.net/2018/03/TDS-Monster-Character-Sprites.gif)

### 2.1 Zombie Walk Pose Sheet (3×3)

**Purpose:** Continuous threat movement
**Sprite Sheet:** 3×3 grid, square, transparent

| Row | State                         | Notes                  |
| --- | ----------------------------- | ---------------------- |
| 1   | Walk Cycle (3 frames)         | Slow, dragging         |
| 2   | Walk Cycle (alt 3 frames)     | Slight variation       |
| 3   | Stagger / Pushback (3 frames) | Triggered by shockwave |

**Hard Rules**

* Non-gory
* No attack animation (contact is passive)
* Clear silhouette from top-down view

---

### 2.2 Zombie Shadow (STATIC)

**Purpose:** Depth separation from floor
**Asset Type:** Semi-transparent oval

* Used by all zombies
* No baked lighting

---

## 3. Vocabulary Orbs (CRITICAL LEARNING OBJECT)

![Image](https://cdn.gamedevmarket.net/wp-content/uploads/20191203170224/f150248b218879a3f8fbfa2599ae5dd6.png)

![Image](https://png.pngtree.com/png-vector/20250813/ourlarge/pngtree-pixel-art-sci-fi-shield-orb-glowing-blue-transparent-sphere-electric-png-image_17118054.webp)

![Image](https://tabletopdominion.com/cdn/shop/files/TTD000456-2.webp?v=1764831301)

### 3.1 Orb Base (STATIC)

**Purpose:** Base pickup object
**Asset Type:** Static PNG, transparent

* Neutral color (blue/white)
* Text rendered by engine
* Must not imply correctness

---

### 3.2 Orb Glow Loop (3-Frame Mini Sheet)

**Purpose:** Visual salience
**Sprite Sheet:** 1×3 or 3×1 (engine preference)

* Gentle pulse
* Loopable
* Same glow for correct and incorrect

---

### 3.3 Orb Collected Effect (STATIC / MINI SHEET)

**Purpose:** Pickup feedback
Options:

* 3-frame dissolve mini sheet **or**
* Single burst PNG

---

## 4. Shockwave Effect (FEEDBACK CORE)

![Image](https://fbi.cults3d.com/uploaders/19858587/illustration-file/7262f250-76d5-40fa-b2f0-ba8c3251500c/all-parts.jpg)

![Image](https://i.pinimg.com/originals/ae/9e/57/ae9e57b8ac632f2cc06b50394716bcaa.gif)

![Image](https://images.pond5.com/magic-effect-frosty-fog-effects-footage-281390630_iconl.jpeg)

### 4.1 Shockwave Ring (5–7 Frames)

**Purpose:** Success confirmation + crowd control
**Sprite Sheet:** Single row, transparent

* Circular expansion
* Soft magical edge
* No damage visuals

---

## 5. Arena Floor & Environment (STATIC TILES)

![Image](https://opengameart.org/sites/default/files/demo_1_15.png)

![Image](https://2minutetabletop.com/wp-content/uploads/2022/04/Fantasy-Stadium-Arid-Clash-Day-44x32-.jpg)

![Image](https://tilemart.com/cdn/shop/files/TM0001-01170-P1.jpg?v=1732573836\&width=1080)

### 5.1 Floor Tile (SEAMLESS)

**Purpose:** Playfield background
**Asset Type:** Tileable PNG

* Low contrast
* No directional texture
* Must support text readability

---

### 5.2 Arena Boundary Markers (OPTIONAL)

**Purpose:** Visual arena limits
**Asset Type:** Static props

Examples:

* Rune circles
* Broken pillars
* Magic barriers

---

## 6. UI-Related Visual Assets (NON-INTERACTIVE)

### 6.1 Health Bar Elements

**Assets Needed**

* Empty bar
* Fill bar
* Critical flash overlay

---

### 6.2 Prompt Panel Background

**Purpose:** Readability for “HEAL: Find ____”
**Asset Type:** Semi-transparent panel

* No text baked in
* Soft vignette edges

---

## 7. Universal Utility Assets

### 7.1 Ground Shadow (GLOBAL)

* Reused by wizard, zombies, orbs
* Single PNG

---

### 7.2 Hit / Contact Flash (STATIC)

* White or pale magic flash
* Triggered on zombie contact

---

## 8. Asset Summary Table (Locked Scope)

| Category    | Assets                               |
| ----------- | ------------------------------------ |
| Wizard      | 3×3 pose sheet + critical overlay    |
| Zombies     | 3×3 walk/stagger sheet + shadow      |
| Orbs        | Base orb + glow loop + pickup effect |
| Effects     | Shockwave sheet                      |
| Environment | Floor tile + optional boundaries     |
| UI          | HP bar parts + prompt panel          |
| Utility     | Shadows, contact flash               |

---

## 9. Explicitly Excluded (To Prevent Scope Creep)

* No directional sprites
* No zombie attack animations
* No orb correctness color coding
* No gore, blood, or corpse states
* No camera-facing rotations
