# Unified Start and End Screens

## Overview

Create shared start and end screen components that all vocabulary games use, ensuring a consistent RPG-themed user experience across the entire game collection.

## Problem Statement

Currently, the 7 vocabulary games have inconsistent start and end screen implementations:

| Game | Start Screen | End Screen |
|------|--------------|------------|
| Castle Defense | Custom component | Custom component |
| Potion Rush | Custom component | Custom component |
| RPG Battle | Multi-step modal | Separate component |
| Rune Match | Monster selection only | Inline JSX |
| Dragon Flight | None | Inline JSX |
| Wizard vs Zombie | None | Inline JSX |
| Enchanted Library | None | Inline JSX |

This creates:
- Inconsistent UX between games (some have vocabulary preview, some don't)
- Code duplication (similar patterns repeated)
- Maintenance burden (changes must be made in multiple places)
- Inconsistent information shown (XP calculation, stats display varies)

## Proposed Solution: Unified RPG-Themed Components

Create **two shared components** with a **single unified RPG theme**:

1. **`GameStartScreen`** - Consistent start screen for all games
2. **`GameEndScreen`** - Consistent end screen for all games

### Design Philosophy

- **One unified RPG theme** - All games share the same visual language
- **No purple** - Purple gradients look AI-generated; use amber/gold instead
- **Based on Castle Defense** - The existing Castle Defense screens are well-designed; standardize on that approach
- **No new assets needed** - Use Tailwind colors and Lucide icons

## Unified RPG Color Palette

All games use the same palette (no per-game color themes):

| Element | Tailwind Class | Hex | Purpose |
|---------|---------------|-----|---------|
| **Primary/Accent** | `amber-500` | #F59E0B | Buttons, highlights, badges |
| **Primary Hover** | `amber-400` | #FBBF24 | Button hover states |
| **Background** | `slate-950` | #020617 | Main overlay background |
| **Card Background** | `slate-900` | #0F172A | Content cards |
| **Border** | `white/10` | rgba | Subtle borders |
| **Text Primary** | `white` | #FFFFFF | Headings, important text |
| **Text Secondary** | `slate-300` | #CBD5E1 | Body text, descriptions |
| **Text Muted** | `slate-400` | #94A3B8 | Labels, hints |
| **Victory** | `emerald-500` | #10B981 | Victory states |
| **Victory Subtle** | `emerald-500/20` | rgba | Victory backgrounds |
| **Defeat** | `rose-500` | #F43F5E | Defeat states |
| **Defeat Subtle** | `rose-500/20` | rgba | Defeat backgrounds |
| **XP/Magic** | `cyan-400` | #22D3EE | XP display, magical effects |

## Functional Requirements

### 1. GameStartScreen Component

**Required Props:**
- `gameTitle: string` - The game's display name
- `vocabulary: VocabularyItem[]` - Sentences/terms to practice
- `onStart: () => void` - Callback when start button is clicked

**Optional Props:**
- `gameSubtitle?: string` - Tagline (e.g., "Kingdom Defense")
- `instructions?: Instruction[]` - Array of numbered instructions
- `proTip?: string` - Optional pro tip text
- `controls?: ControlHint[]` - Control hints for footer
- `startButtonText?: string` - Custom CTA text (default: "Start Game")
- `icon?: LucideIcon` - Game icon for header (default: Gamepad2)

**Layout (based on Castle Defense):**
```
┌─────────────────────────────────────────────────┐
│  [Subtitle Badge]                               │
│  Game Title                                     │
├─────────────────────┬───────────────────────────┤
│                     │                           │
│  How to Play        │  Vocabulary List          │
│  1. Step one        │  ┌─────────────────────┐  │
│  2. Step two        │  │ Term → Translation  │  │
│  3. Step three      │  │ Term → Translation  │  │
│                     │  │ Term → Translation  │  │
│  💡 Pro Tip         │  │ ...scrollable...    │  │
│                     │  └─────────────────────┘  │
│                     │  [X Sentences]            │
├─────────────────────┴───────────────────────────┤
│  [Controls]                    [Start Button]   │
└─────────────────────────────────────────────────┘
```

**Features:**
- Full-screen overlay with `bg-slate-950/90 backdrop-blur-sm`
- Two-column layout on desktop, stacked on mobile
- Scrollable vocabulary list with term + translation
- Vocabulary count badge
- Framer Motion fade-in animation
- Responsive: stacks below `lg` breakpoint

### 2. GameEndScreen Component

**Required Props:**
- `status: 'victory' | 'defeat' | 'complete'` - Outcome determines styling
- `score: number` - Final score
- `xp: number` - XP earned
- `accuracy: number` - Accuracy (0-1, displayed as percentage)
- `onRestart: () => void` - Callback for restart button

**Optional Props:**
- `onExit?: () => void` - Exit button callback (shows second button if provided)
- `customStats?: GameStat[]` - Up to 2 additional stats
- `title?: string` - Override title (default based on status)
- `subtitle?: string` - Override subtitle message
- `restartButtonText?: string` - Custom CTA text (default: "Play Again")

**Layout (based on Castle Defense):**
```
┌─────────────────────────────────────────────────┐
│              [Status Icon]                      │
│              Victory! / Defeat                  │
│              subtitle message                   │
├─────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐            │
│  │ 🏆 Score     │  │ 🎯 Accuracy  │            │
│  │    1,250     │  │     85%      │            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ Custom Stat  │  │ Custom Stat  │            │
│  │    Value     │  │    Value     │            │
│  └──────────────┘  └──────────────┘            │
│  ┌─────────────────────────────────┐           │
│  │     ⚡ XP Earned: 125           │           │
│  └─────────────────────────────────┘           │
├─────────────────────────────────────────────────┤
│           [Play Again Button]                   │
│           [Exit Button - optional]              │
└─────────────────────────────────────────────────┘
```

**Features:**
- Full-screen overlay with backdrop blur
- Status-conditional styling (emerald for victory, rose for defeat)
- Status icon changes based on outcome
- 2x2 grid for stats
- Prominent XP display with status-themed colors
- Framer Motion scale-in animation

### 3. Types

```typescript
interface Instruction {
  step: number;       // e.g., 1, 2, 3
  text: string;       // Instruction text
  icon?: LucideIcon;  // Optional icon
}

interface ControlHint {
  label: string;      // e.g., "Move"
  keys: string;       // e.g., "Arrows / WASD"
  color: string;      // Tailwind color class
}

interface GameStat {
  label: string;      // e.g., "Waves Cleared"
  value: number | string;
  icon?: LucideIcon;
}
```

## Non-Functional Requirements

1. **Accessibility**
   - All buttons have visible focus states (`focus-visible:ring-2`)
   - Color contrast meets WCAG AA
   - Buttons have minimum 44px touch targets

2. **Performance**
   - Animations use `transform` and `opacity` (GPU-accelerated)
   - No layout thrashing

3. **Responsiveness**
   - Works on mobile (320px) through desktop (1920px+)
   - Two-column becomes single-column below `lg` (1024px)
   - Vocabulary list scrollable with max-height

4. **Consistency**
   - Follow Castle Defense screen patterns exactly
   - Use Framer Motion for animations
   - Use Lucide icons

## Acceptance Criteria

### Must Have
- [ ] `GameStartScreen` renders vocabulary list, instructions, and amber start button
- [ ] `GameEndScreen` renders score, accuracy, XP with status-based styling
- [ ] No purple colors anywhere
- [ ] All games use the shared components
- [ ] Components work on mobile and desktop
- [ ] Unit tests with >80% coverage

### Should Have
- [ ] Smooth Framer Motion animations
- [ ] Control hints hidden on mobile (touch is implicit)
- [ ] Exit button support for games that need it

## Out of Scope

- Per-game color themes (all games use unified RPG theme)
- New image/texture assets
- Sound effects
- Changes to game logic or scoring

## Migration Strategy

### Phase 1: Build Components
Create `GameStartScreen` and `GameEndScreen` based on Castle Defense patterns

### Phase 2: Migrate Games (easiest first)
1. Dragon Flight, Wizard vs Zombie, Enchanted Library (no existing screens)
2. Rune Match (inline screens)
3. RPG Battle (has components)
4. Castle Defense, Potion Rush (replace existing with shared)

### Phase 3: Cleanup
Remove deprecated game-specific screen components

## Multi-Step Games (RPG Battle, Rune Match)

For games with native selection screens, the flow is:

```
GameStartScreen → Native Selection Screen(s) → Gameplay → GameEndScreen
```

**RPG Battle:**
- GameStartScreen shows vocabulary + "Begin" button
- Clicking "Begin" opens BattleSelectionModal (hero → location → enemy)
- Battle plays
- GameEndScreen shows results

**Rune Match:**
- GameStartScreen shows vocabulary + "Begin" button
- Clicking "Begin" opens MonsterSelection
- Match plays
- GameEndScreen shows results

The native selection screens (BattleSelectionModal, MonsterSelection) remain unchanged - they handle game-specific configuration. GameStartScreen purely handles vocabulary preview and instructions.

## Files to Create
- `src/components/game/GameStartScreen.tsx`
- `src/components/game/GameEndScreen.tsx`
- `src/components/game/__tests__/GameStartScreen.test.tsx`
- `src/components/game/__tests__/GameEndScreen.test.tsx`

## Files to Eventually Remove
- `src/components/castle-defense/CastleDefenseStartScreen.tsx`
- `src/components/castle-defense/CastleDefenseEndScreen.tsx`
- `src/components/potion-rush/PotionRushStartScreen.tsx`
- `src/components/potion-rush/PotionRushSummary.tsx`
- `src/components/rpg-battle/BattleResults.tsx`
