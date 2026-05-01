---
name: vocab-game-builder
description: |
  Build vocabulary learning games using React-Konva canvas architecture with strict TDD workflow and phased development. Use this skill when the user wants to: (1) Create a new vocabulary game from scratch, (2) Resume work on an existing game track, (3) Build a mini-game for language learning. Triggers include: "create a vocab game", "build a new game", "make a vocabulary game", "resume game development", "/vocab-game-builder", "new mini-game".
---

# Vocab Game Builder

Build vocabulary learning games using the project's established Konva-based architecture with strict TDD workflow.

---

## Mode Detection

Ask the user: **"Would you like to create a new game or resume an existing track?"**

- **New Game** → Go to Discovery Phase
- **Resume** → Go to Resume Mode

---

## MODE 1: NEW GAME

### Phase 1: Discovery

Engage the user in a structured conversation to understand the game concept. Ask these questions one at a time or in small groups, adapting based on responses:

1. **Concept**: "Describe the game in 1-2 sentences. What's the core fantasy?"

2. **Core Loop**: "What does the player do repeatedly? (e.g., tap targets, match tiles, dodge obstacles, answer questions)"

3. **Vocabulary Role**: "How do vocabulary words appear and get tested? (e.g., displayed on objects, typed as answers, matched as pairs, spoken aloud)"

4. **Win/Lose/XP**: "What triggers victory? What triggers defeat? How should XP be calculated? (accuracy-based, time-based, combo-based, fixed per level, survival duration, etc.)"

5. **Difficulty**: "Single difficulty or progression? (e.g., endless with scaling, level selection, monster/opponent tiers)"

6. **Visual Theme**: "What's the visual style? (fantasy, sci-fi, cute/casual, abstract, retro, etc.)"

7. **Input Style**: "How does the player interact? (tap targets, drag items, swipe gestures, virtual D-pad, tilt, etc.)"

8. **Inspiration**: "Any similar games to reference for mechanics or feel? (e.g., Bejeweled, Fruit Ninja, Space Invaders)"

**After Discovery**: Summarize your understanding back to the user and confirm before proceeding.

---

### Phase 2: Specification

Create the track directory and generate specification files.

#### 2.1 Create Track Directory

```bash
mkdir -p /conductor/tracks/[game-name]-YYYYMMDD
```

Use kebab-case for game name, today's date for YYYYMMDD.

#### 2.2 Generate metadata.json

```json
{
  "track_id": "[game-name]-YYYYMMDD",
  "type": "feature",
  "status": "new",
  "created_at": "YYYY-MM-DDTHH:MM:SSZ",
  "description": "Implementation of [Game Name] vocabulary game"
}
```

#### 2.3 Generate spec.md

Use this template structure:

```markdown
# Game Design Document: [Game Name]

## 1. Overview
**Title:** [Game Name]
**Genre:** [Genre] / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** [1-2 sentence description from discovery]

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach
- **Desktop**: Supported but secondary priority

## 3. Game Flow
[Describe screens and transitions: start → gameplay → win/lose → results]

## 4. Core Gameplay Loop
[Detailed breakdown of what happens each cycle/turn/frame]

## 5. Win/Lose Conditions
- **Victory:** [Condition]
- **Defeat:** [Condition]

## 6. XP & Scoring System
[Describe exactly how XP is calculated based on discovery discussion]

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** [How words appear in game]
- **Testing:** [How player demonstrates knowledge]
- **Educational Goal:** [Learning outcome]

## 8. Mechanics
[Detailed mechanics sections as needed]

## 9. Difficulty/Progression
[Single difficulty or scaling system]

## 10. Visual Style
- **Theme:** [From discovery]
- **Color Palette:** [Suggestions]
- **Effects:** [Particles, animations, feedback]

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DragonFlight, WizardZombie, RuneMatch)

## 12. Configuration
[Config object structure with all tunable values]

## 13. Future Scope (Post-MVP)
[Ideas for later, explicitly out of scope for initial build]
```

#### 2.4 Generate asset-spec.md

Use this template structure:

```markdown
# [Game Name] — Asset Inventory & Specification

## Platform Notes
- All assets optimized for mobile (portrait)
- Recommend @2x assets for retina displays
- All sprites PNG with transparency
- Keep file sizes small for mobile performance

---

## 1. [Category Name] (e.g., Player Character)

### 1.1 [Asset Name]
**Purpose:** [What it's used for]
**Asset Type:** Sprite sheet / Single PNG
**Sprite Sheet Layout:** [Grid dimensions, e.g., 3×3]
**Frame Size:** [e.g., 128×128px]

| State/Frame | Position | Notes |
|-------------|----------|-------|
| Idle 1 | Row 1, Col 1 | Default state |
| Idle 2 | Row 1, Col 2 | Animation frame |
| ... | ... | ... |

**Style Notes:**
- [Visual direction]
- [Color guidance]
- [Important details]

---

## 2. [Next Category]
[Continue pattern...]

---

## Asset Summary Table

| Category | Assets Required | Priority |
|----------|-----------------|----------|
| [Category] | [Count and names] | HIGH/MEDIUM/LOW |
| ... | ... | ... |

---

## Asset Placement

All assets go in: `/public/games/{type}/[game-name]/`

| Filename | Description |
|----------|-------------|
| player.png | Player sprite sheet |
| ... | ... |

---

## Explicitly Excluded (Scope Control)
- [What we're NOT making]
- [Complexity limits]
```

#### 2.5 User Review

Present the spec.md and asset-spec.md to the user for review. Ask:
- "Does this capture your vision?"
- "Any mechanics to add or remove?"
- "Are the asset requirements clear?"

Revise based on feedback before proceeding.

---

## Templates

Use the templates in `src/templates/game/` to scaffold new games:

| Template | Output | Purpose |
|----------|--------|---------|
| `vocabulary/page.tsx.template` | Page with vocabulary API fetch | Vocabulary games |
| `sentence/page.tsx.template` | Page with sentences API fetch | Sentence games |
| `GameNameGame.tsx.template` | Main Konva component | Both types |
| `gameName.ts.template` | Game logic | Both types |
| `api/vocabulary-route.ts.template` | Vocabulary mock API | Vocabulary games |
| `api/sentences-route.ts.template` | Sentences mock API | Sentence games |
| `api/complete-route.ts.template` | Completion API | Both types |

### Quick Start

```bash
# Set variables
GAME_NAME="my-game"
GAME_CLASS="MyGame"
GAME_TYPE="vocabulary"  # or "sentence"

# Create directories
mkdir -p src/app/\[locale\]/\(student\)/student/games/${GAME_TYPE}/${GAME_NAME}
mkdir -p src/components/games/${GAME_TYPE}/${GAME_NAME}
mkdir -p src/app/api/v1/games/${GAME_NAME}/vocabulary  # or sentences
mkdir -p public/games/${GAME_TYPE}/${GAME_NAME}

# Copy templates
cp src/templates/game/${GAME_TYPE}/page.tsx.template \
   src/app/\[locale\]/\(student\)/student/games/${GAME_TYPE}/${GAME_NAME}/page.tsx

cp src/templates/game/GameNameGame.tsx.template \
   src/components/games/${GAME_TYPE}/${GAME_NAME}/${GAME_CLASS}Game.tsx

cp src/templates/game/gameName.ts.template \
   src/lib/games/${GAME_NAME}.ts

cp src/templates/game/api/vocabulary-route.ts.template \
   src/app/api/v1/games/${GAME_NAME}/vocabulary/route.ts

cp src/templates/game/api/complete-route.ts.template \
   src/app/api/v1/games/${GAME_NAME}/complete/route.ts
```

See `src/templates/game/README.md` for full documentation.

---

### Phase 3: Planning

Generate plan.md with adaptive phases based on game complexity.

#### Standard Phase Structure

Adapt these phases based on the specific game:

```markdown
# Implementation Plan: [Game Name]

This plan outlines the steps to build "[Game Name]" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure
**Assets Required:** None (can start immediately)

- [ ] Task: Create configuration file `src/lib/games/[gameName]Config.ts` with all balance values.
- [ ] Task: Define game state types in `src/lib/games/[gameName].ts`.
- [ ] Task: Create `src/app/[locale]/(student)/student/games/{type}/[game-name]` route and page structure.
- [ ] Task: Create `[GameName]Game` container component at `src/components/games/{type}/[game-name]/[GameName]Game.tsx`.
- [ ] Task: Create mock API routes using factories in `src/app/api/v1/games/[game-name]/`.
- [ ] Task: Add translations to `src/locales/en.ts`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1'

## Phase 2: Core Game Logic
**Assets Required:** None (logic only)

- [ ] Task: Implement `create[GameName]State()` initialization function.
- [ ] Task: Implement core game tick/update function.
- [ ] Task: Implement [game-specific mechanics]...
- [ ] Task: Implement win/lose condition detection.
- [ ] Task: Conductor - User Manual Verification 'Phase 2'

## Phase 3: Rendering
**Assets Required:** [List specific assets needed]
- [ ] /public/games/{type}/[game-name]/[asset1].png
- [ ] /public/games/{type}/[game-name]/[asset2].png

- [ ] Task: Implement asset preloading.
- [ ] Task: Render [game elements] with Konva.
- [ ] Task: Implement sprite animations.
- [ ] Task: Conductor - User Manual Verification 'Phase 3'

## Phase 4: Input & Controls
**Assets Required:** [If any, e.g., virtual D-pad]

- [ ] Task: Implement touch/tap handling.
- [ ] Task: Implement [game-specific input]...
- [ ] Task: Ensure 44×44px minimum touch targets.
- [ ] Task: Conductor - User Manual Verification 'Phase 4'

## Phase 5: UI & HUD
**Assets Required:** [UI elements if any]

- [ ] Task: Implement score/progress display.
- [ ] Task: Implement health/status indicators.
- [ ] Task: Implement [game-specific UI]...
- [ ] Task: Conductor - User Manual Verification 'Phase 5'

## Phase 6: Game States
**Assets Required:** [Victory/defeat screens if any]

- [ ] Task: Implement start/title screen using GameStartScreen.
- [ ] Task: Implement victory state and XP display using GameEndScreen.
- [ ] Task: Implement defeat state.
- [ ] Task: Implement pause functionality (if applicable).
- [ ] Task: Conductor - User Manual Verification 'Phase 6'

## Phase 7: Polish & Balance
**Assets Required:** [Effects, particles if any]

- [ ] Task: Add visual feedback and juice.
- [ ] Task: Implement sound effects (useSound hook).
- [ ] Task: Balance tuning based on playtesting.
- [ ] Task: Register game in gameCards.ts with correct type (vocabulary/sentence).
- [ ] Task: Conductor - User Manual Verification 'Phase 7'

---

## Configuration Reference
[Include the config structure from spec.md]

## Technical Notes
- Follow architecture patterns from existing Konva games.
- Use pure state object with tick function for game logic.
- Mobile-first: test on 390×844 viewport.
- All text minimum 16px, touch targets minimum 44×44px.
- Use API route factories from `@/lib/games/api`.
- Import shared screens from `@/components/games/game/`.
- **Game loop**: Action/real-time games MUST use `requestAnimationFrame` with delta-time (not `useInterval`). Use this pattern:

```tsx
const lastFrameRef = useRef<number>(0)
const rafRef = useRef<number>(0)

useEffect(() => {
  if (gamePhase !== 'playing') return

  const loop = (timestamp: number) => {
    const delta = lastFrameRef.current ? timestamp - lastFrameRef.current : 16
    lastFrameRef.current = timestamp
    const clampedDelta = Math.min(delta, 50) // cap to prevent physics jumps on tab-switch
    setGameState(prevState => {
      if (!prevState || prevState.status !== 'playing') return prevState
      return tickGameName(prevState, clampedDelta)
    })
    rafRef.current = requestAnimationFrame(loop)
  }

  rafRef.current = requestAnimationFrame(loop)
  return () => {
    cancelAnimationFrame(rafRef.current)
    lastFrameRef.current = 0
  }
}, [gamePhase])
```

Only use `useInterval` for turn-based or timer-only games (e.g., Rune Forge Chamber countdown).
```

#### Phase Adaptation Guidelines

- **Simple games** (3-4 phases): Combine logic+rendering, skip complex UI
- **Complex games** (7+ phases): Split mechanics into multiple phases
- **Selection screens**: Add dedicated phase if game has level/character selection
- **Multiplayer elements**: Add dedicated phase for any shared state

---

### Phase 4: Implementation (TDD Workflow)

For each task in plan.md, follow this strict process:

#### 4.1 Asset Gate Check

Before starting any phase, check its **Assets Required** section:

```
"Phase [N] requires these assets:
- [ ] /public/games/[game-name]/[asset].png

Please confirm when assets are in place, or let me know if you need more time."
```

Do NOT proceed with rendering/visual tasks until assets are confirmed.

#### 4.2 Task Selection

1. Find the next `[ ]` task in sequential order
2. Mark it as in-progress: `[~]`
3. Commit this change: `conductor(plan): Mark task '[name]' as in-progress`

#### 4.3 RED Phase (Write Failing Tests)

1. Create test file if it doesn't exist: `src/lib/__tests__/[gameName].test.ts` or `src/components/[game-name]/__tests__/[Component].test.tsx`
2. Write tests that define expected behavior
3. Run tests: `CI=true npm test`
4. **CRITICAL**: Confirm tests FAIL before proceeding
5. Show the user the failing test output

#### 4.4 GREEN Phase (Implement)

1. Write minimum code to make tests pass
2. Run tests: `CI=true npm test`
3. Confirm all tests PASS
4. Check coverage: target >80% for new code

#### 4.5 Refactor (Optional)

1. Improve code clarity if needed
2. Re-run tests to verify still passing

#### 4.6 Commit & Update Plan

1. Stage changes: `git add .`
2. Commit with conventional message:
   ```
   feat([game-name]): [description]
   ```
3. Get commit SHA
4. Update plan.md: `[~]` → `[x] ... <sha>`
5. Commit plan update: `conductor(plan): Mark task '[name]' as complete`

#### 4.7 Repeat

Continue with next task until phase is complete.

---

### Phase 5: Phase Checkpoint

When all tasks in a phase are complete:

#### 5.1 Verify Tests

```bash
CI=true npm test
```

If tests fail:
- Propose up to 2 fix attempts
- If still failing, stop and ask user for guidance

#### 5.2 Verify Coverage

Ensure >80% coverage for new code. If below:
- Write additional tests before proceeding

#### 5.3 Generate Manual Verification Plan

Create a step-by-step verification plan based on:
- product.md (overall product goals)
- product-guidelines.md (interaction standards)
- spec.md (game-specific requirements)
- plan.md (phase objectives)

Example:
```
## Manual Verification Plan - Phase 3: Rendering

1. Open game at http://localhost:3000/en/student/games/{type}/[game-name]
2. Verify viewport is portrait-oriented (390×844 reference)
3. Verify [game elements] render correctly
4. Verify sprite animations play smoothly
5. Verify no visual glitches on scroll/resize
6. Test on mobile device or DevTools mobile emulation

Does everything look correct? Please confirm or report issues.
```

#### 5.4 User Confirmation

Wait for explicit user confirmation before proceeding.

#### 5.5 Create Checkpoint Commit

```bash
git add .
git commit -m "conductor(checkpoint): Checkpoint end of Phase [N]: [Phase Name]"
```

Add git notes with verification summary:
```bash
git notes add -m "Phase [N] verified: [summary of what was tested]" <sha>
```

#### 5.6 Update Plan with Checkpoint

Find phase heading in plan.md, append checkpoint SHA:
```markdown
## Phase 3: Rendering [checkpoint: abc1234]
```

Commit: `conductor(plan): Mark Phase [N] '[Phase Name]' as complete`

---

### Phase 6: Completion

When all phases are complete:

#### 6.1 Update Game Registry

Add entry to `/src/lib/gameCards.ts`:

```typescript
{
  id: '[game-name]',
  title: '[Game Name]',
  description: '[Short description from spec]',
  type: 'vocabulary', // or 'sentence'
  href: '/[locale]/(student)/student/games/vocabulary/[game-name]',
  imageSrc: withBasePath('/games/cover/[game-name]-cover.png'),
  status: 'playable' as const,
}
```

#### 6.2 Create Cover Image Entry

Remind user to add cover image:
```
Please add a cover image at:
/public/games/cover/[game-name]-cover.png

Recommended size: 400×300px or similar 4:3 ratio
```

#### 6.3 Archive Track

```bash
mv /conductor/tracks/[game-name]-YYYYMMDD /conductor/archive/[game-name]-YYYYMMDD
```

Update metadata.json status to "completed".

#### 6.4 Final Announcement

```
🎮 [Game Name] is complete!

- Game URL: /[locale]/(student)/student/games/{type}/[game-name]
- Track archived: /conductor/archive/[game-name]-YYYYMMDD
- Registry updated: src/lib/gameCards.ts

The game is now playable from the main menu.
```

---

## MODE 2: RESUME TRACK

### 2.1 List Active Tracks

```bash
ls /conductor/tracks/
```

Present list to user and ask which to resume.

### 2.2 Load Track State

Read the selected track's files:
- `plan.md` - Find current phase and task
- `spec.md` - Understand game design
- `asset-spec.md` - Know asset requirements
- `metadata.json` - Track metadata

### 2.3 Identify Current Position

Look for:
1. First `[~]` task (in-progress) → Resume this task
2. If no `[~]`, find first `[ ]` task → Start this task
3. Check if current phase has asset requirements

### 2.4 Resume Workflow

Continue with the standard TDD workflow from current position.

---

## Directory Structure

All games follow the reading-advantage-compatible structure:

```
src/
├── app/[locale]/(student)/student/games/
│   ├── vocabulary/                    # Word-based games
│   │   └── [game-name]/
│   │       └── page.tsx               # Page wrapper with API fetch
│   └── sentence/                      # Phrase-based games
│       └── [game-name]/
│           └── page.tsx
├── components/games/
│   ├── game/                          # Shared components
│   │   ├── GameStartScreen.tsx
│   │   └── GameEndScreen.tsx
│   ├── vocabulary/[game-name]/
│   │   └── [GameName]Game.tsx         # Main Konva game component
│   └── sentence/[game-name]/
│       └── [GameName]Game.tsx
├── lib/games/
│   ├── api/                           # API route factories
│   │   ├── vocabularyRoute.ts
│   │   ├── sentencesRoute.ts
│   │   └── completeRoute.ts
│   ├── [gameName].ts                  # Game logic (pure functions)
│   └── sampleVocabulary.ts            # Mock data for dev
├── app/api/v1/games/[game-name]/
│   ├── vocabulary/route.ts            # GET vocabulary (vocabulary games)
│   ├── sentences/route.ts             # GET sentences (sentence games)
│   ├── complete/route.ts              # POST game completion
│   └── ranking/route.ts               # GET rankings (optional)
├── hooks/
│   ├── useSession.ts                  # Session stub (returns mock user)
│   └── useDirectionalInput.ts
├── locales/
│   ├── en.ts                          # UI strings
│   └── client.ts                      # i18n hooks
└── templates/game/                    # Game scaffolding templates
    ├── vocabulary/page.tsx.template
    ├── sentence/page.tsx.template
    └── api/
        ├── vocabulary-route.ts.template
        └── complete-route.ts.template

public/games/
├── vocabulary/[game-name]/            # Vocabulary game assets
└── sentence/[game-name]/              # Sentence game assets
```

## Technical Constraints

These are non-negotiable for all games:

| Constraint | Value |
|------------|-------|
| **Platform** | Mobile-first, portrait orientation |
| **Viewport** | 390×844 reference, responsive scaling |
| **Rendering** | React-Konva (Canvas) |
| **State** | Pure functions returning new state objects |
| **Vocabulary** | `VocabularyItem[]` with `{ term, translation }` |
| **Tests** | Jest + React Testing Library |
| **Coverage** | >80% for new code |
| **Touch targets** | Minimum 44×44px |
| **Text size** | Minimum 16px |
| **Game loop** | `requestAnimationFrame` with delta-time (action games), `useInterval` (turn-based/timer-only games) |
| **Assets** | PNG with transparency, sprite sheets |
| **Asset location** | `/public/games/{type}/[game-name]/` |
| **Fullscreen** | All games use `useGameFullscreen` hook during gameplay |

## Fullscreen Mode (Required for All Games)

All Konva games MUST enter fullscreen when gameplay starts and exit on game end. This eliminates browser chrome, page headers, and allows the player to rotate to landscape for more space.

```typescript
import { useGameFullscreen } from '@/hooks/useGameFullscreen'

// In the game component:
const { containerRef, enterFullscreen, exitFullscreen } = useGameFullscreen()

// Enter on game start:
onStart={() => { resetGame(); setGamePhase('playing'); enterFullscreen() }}

// Exit on game end:
setGamePhase('ended'); exitFullscreen()

// The containerRef goes on the outermost div:
<div ref={containerRef} className="... fullscreen:h-screen fullscreen:rounded-none">
```

**Reference:** `src/hooks/useGameFullscreen.ts`

## Scrolling Viewport / Camera System

Games with a world larger than the mobile screen (e.g., 800x600) MUST use a scrolling camera that follows the player instead of shrinking the entire world to fit. Shrink-to-fit makes text unreadable and sprites too small on mobile.

### When to use a camera
- **Camera required:** World dimensions > 500px in either axis AND player moves freely in the world (e.g., dungeon-liberator 800x600, wizard-vs-zombie 800x600)
- **Fit-to-screen OK:** World designed for mobile viewport (390x844) OR the player needs to see the entire board at once (e.g., potion-rush sushi-chef style)

### Camera pattern

```typescript
// State
const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 })

// In game loop — update camera each tick:
const scaleY = dimensions.height / GAME_HEIGHT
const scale = Math.max(scaleY, 0.8) // never smaller than 0.8x

let camX = dimensions.width / 2 - player.x * scale
let camY = dimensions.height / 2 - player.y * scale

// Clamp to world bounds
const minX = dimensions.width - GAME_WIDTH * scale
const minY = dimensions.height - GAME_HEIGHT * scale
if (minX > 0) camX = (dimensions.width - GAME_WIDTH * scale) / 2
else camX = Math.max(minX, Math.min(0, camX))
if (minY > 0) camY = (dimensions.height - GAME_HEIGHT * scale) / 2
else camY = Math.max(minY, Math.min(0, camY))

setCamera({ x: camX, y: camY, scale })

// Apply to Konva Layer (NOT Stage):
<Layer scaleX={camera.scale} scaleY={camera.scale} x={camera.x} y={camera.y}>
```

### Off-screen indicators (required with camera)

When using a camera, entities can be off-screen. Add arrow indicators pointing to important off-screen items (words, targets, prisoners, orbs).

```typescript
import { calculateIndicators } from '@/lib/games/[gameName]Indicators'

// Calculate each frame:
const indicators = calculateIndicators(entities, camera, dimensions)

// Render as HTML overlays (not Konva — they stay fixed on screen):
{indicators.map((ind) => (
  <div key={ind.id} className="absolute z-10 pointer-events-none"
    style={{ left: ind.x, top: ind.y,
      transform: `translate(-50%, -50%) rotate(${ind.rotation}deg)` }}>
    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px]
      border-r-transparent border-b-[15px] border-b-amber-400 animate-pulse" />
  </div>
))}
```

**Reference implementations:**
- Camera: `src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx`
- Camera: `src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx`
- Indicators: `src/lib/games/wizardZombieIndicators.ts`
- Indicators: `src/lib/games/dungeonLiberatorIndicators.ts`

## API Route Patterns

Use the unified factory functions for mock API routes:

```typescript
// vocabulary/route.ts
import { createVocabularyRoute } from '@/lib/games/api'
import { SAMPLE_VOCABULARY } from '@/lib/games/sampleVocabulary'

export const dynamic = "force-static"
const { GET } = createVocabularyRoute(SAMPLE_VOCABULARY)
export { GET }

// sentences/route.ts (for sentence games)
import { createSentencesRoute } from '@/lib/games/api'
import { SAMPLE_SENTENCES } from '@/lib/games/sampleSentences'

export const dynamic = "force-static"
const { GET } = createSentencesRoute(SAMPLE_SENTENCES)
export { GET }

// complete/route.ts
import { createCompleteRoute } from '@/lib/games/api'

export const dynamic = "force-static"
const { POST } = createCompleteRoute()
export { POST }
```

## i18n & Session Hooks

```typescript
// In page.tsx
import { useScopedI18n, useCurrentLocale } from '@/locales/client'
import { useSession } from '@/hooks/useSession'

export default function GamePage() {
  const t = useScopedI18n('games.gameName')
  const locale = useCurrentLocale()
  const { data: { user } } = useSession()
  
  // t('title'), t('description'), t('loading')
  // locale for API fetches
}
```

## Shared Component Imports

```typescript
import { GameEndScreen } from '@/components/games/game/GameEndScreen'
import { GameStartScreen } from '@/components/games/game/GameStartScreen'
import { DPad } from '@/components/ui/DPad'
```

---

## Reference Files

When building games, reference these existing implementations:

| Pattern | Reference File |
|---------|----------------|
| Pure state management | `src/lib/games/dragonFlight.ts` |
| Konva game component | `src/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx` |
| Asset preloading | `src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx` |
| Game page structure | `src/app/[locale]/(student)/student/games/vocabulary/dragon-flight/page.tsx` |
| Sentence game page | `src/app/[locale]/(student)/student/games/sentence/castle-defense/page.tsx` |
| API route factory | `src/lib/games/api/vocabularyRoute.ts` |
| Test patterns | `src/lib/games/__tests__/` |
| Game registry | `src/lib/gameCards.ts` |
| Fullscreen hook | `src/hooks/useGameFullscreen.ts` |
| Scrolling camera | `src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx` |
| Off-screen indicators | `src/lib/games/wizardZombieIndicators.ts`, `src/lib/games/dungeonLiberatorIndicators.ts` |

---

## Workflow Protocol Reference

For detailed workflow rules, see:
- `/conductor/workflow.md` - Full task and checkpoint protocol
- `/conductor/product.md` - Product vision and goals
- `/conductor/product-guidelines.md` - Design and interaction standards
- `/conductor/tech-stack.md` - Technology choices
- `/conductor/code_styleguides/` - Coding standards
