# Dungeon Liberator - Asset Specifications

## Canvas

- **Size:** 800 × 600 pixels
- **Ratio:** 4:3
- **Format:** PNG

## Layout Zones

| Zone | X Range | Description |
|------|---------|-------------|
| Left wall | 0-100px | Darker entry zone (player spawns at x:100) |
| Main arena | 100-700px | Play area where prisoners spawn and monsters roam |
| Right wall | 700-800px | Darker exit zone (portal at x:720) |

---

## Assets

### Background

**File:** `public/games/dungeon-liberator/background.png`

**Description:** A dungeon corridor viewed from top-down perspective. Stone floor tiles with cracks, moss patches, and scattered debris. Dark stone walls form the left and right edges (the 100px columns). The exit portal sits embedded in the right wall - a glowing purple magical gateway framed by an ancient stone archway carved with runes. Atmospheric torchlight flickers from wall sconces along the perimeter. Deep shadows in corners with mysterious purple/amber ambient lighting suggesting depth and danger. Cobwebs in corners, occasional bones or debris on floor.

**Key Elements:**
- Stone tile floor (gray/brown tones)
- Left edge: Dark wall with entry archway hint
- Right edge: Dark wall with glowing purple portal archway (at y:220)
- Atmospheric lighting (torches, ambient glow from portal)
- Dungeon details (cracks, debris, cobwebs)

---

### Player (Knight)

**File:** `public/games/dungeon-liberator/player-sheet.png`

**Sheet:** 3×3 poses

**Description:** Top-down view of a knight in blue armor. Round shield visible on back. Helmet with slight plume. Sturdy, heroic appearance. Should read clearly at small size.

**Poses:**
| Row | Col | Pose |
|-----|-----|------|
| 0 | 0 | Idle |
| 0 | 1 | Walk frame 1 |
| 0 | 2 | Walk frame 2 |
| 1 | 0 | Hurt |
| 1 | 1 | (unused) |
| 1 | 2 | (unused) |
| 2 | 0 | (unused) |
| 2 | 1 | (unused) |
| 2 | 2 | (unused) |

---

### Prisoner

**File:** `public/games/dungeon-liberator/prisoner-sheet.png`

**Sheet:** 3×3 poses

**Description:** Top-down view of a villager in tattered gray/brown clothes. Arms bound or huddled posture suggesting captivity. Distinct from monsters - clearly a person to rescue.

**Poses:**
| Row | Col | Pose |
|-----|-----|------|
| 0 | 0 | Idle |
| 0 | 1 | Shifting |
| 0 | 2 | Hopeful |
| 1 | 0 | Fleeing |
| 1 | 1 | (unused) |
| 1 | 2 | (unused) |
| 2 | 0 | (unused) |
| 2 | 1 | (unused) |
| 2 | 2 | (unused) |

**Note:** Collected prisoners are tinted green in code.

---

### Monster (Slime)

**File:** `public/games/dungeon-liberator/slime-sheet.png`

**Sheet:** 3×3 poses

**Description:** Top-down dungeon slime creature. Menacing red/dark tones. Bouncy, blob-like form with glowing eyes. Should look threatening but readable at small size.

**Poses:**
| Row | Col | Pose |
|-----|-----|------|
| 0 | 0 | Idle |
| 0 | 1 | Bounce frame 1 |
| 0 | 2 | Bounce frame 2 |
| 1 | 0 | Attack |
| 1 | 1 | (unused) |
| 1 | 2 | (unused) |
| 2 | 0 | (unused) |
| 2 | 1 | (unused) |
| 2 | 2 | (unused) |

---

### Portal

**Note:** Portal is rendered in code using Konva shapes (Circle + Ring). No separate sprite needed.

---

### Trail Rope

**Note:** Trail connection is rendered in code using Konva Line with brown color. No separate sprite needed.
