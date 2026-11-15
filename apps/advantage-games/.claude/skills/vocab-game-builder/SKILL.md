---
name: vocab-game-builder
description: |
  Legacy reference for the pre-APK React-Konva vocabulary and sentence games. Use it only to extract a mechanic blueprint from an unmigrated game. New and rebuilt games use apk-game-builder.
---

# Vocab Game Builder

## Scope

This skill is a legacy reference for the pre-APK React-Konva codebase. Use it only to extract a mechanic blueprint from an unmigrated game. Do not scaffold new gameplay with it.

- New and rebuilt games: use the `apk-game-builder` skill (Phaser 4, Advantage Play Kit, edition manifests).
- Workflow, tracks, and commits: follow the root `AGENTS.md` and `measure/workflow.md`.

---

## Templates

The legacy structure used the templates in `src/templates/game/`:

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

These constraints applied to the legacy Konva games:

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
| Game page structure | `src/app/[locale]/(student)/student/games/vocabulary/[gameId]/page.tsx` |
| Sentence game page | `src/app/[locale]/(student)/student/games/sentence/[gameId]/page.tsx` |
| API route factory | `src/lib/games/api/vocabularyRoute.ts` |
| Test patterns | `src/lib/games/__tests__/` |
| Game registry | `src/lib/gameCards.ts` |
| Fullscreen hook | `src/hooks/useGameFullscreen.ts` |
| Scrolling camera | `src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx` |
| Off-screen indicators | `src/lib/games/wizardZombieIndicators.ts`, `src/lib/games/dungeonLiberatorIndicators.ts` |

---
