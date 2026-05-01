# Spec: Dragon Rider - Reskin of Dragon Flight

## Overview
Create a reskinned version of the Dragon Flight game called "Dragon Rider". This is a cosmetic reskin that uses new assets but maintains identical gameplay mechanics, code structure, and functionality to the original Dragon Flight game.

## Goals
- Provide visual variety by offering an alternative theme for the same game mechanic
- Reuse proven gameplay code from Dragon Flight
- Create a separate game entry accessible via its own route

## Assets
New sprite assets are already available in `public/games/dragon-rider/`:
- `boss-3x3-sheet-facing-up.png` - Boss sprite
- `dragon-army-3x3-sheet-facing-up.png` - Enemy army sprites
- `gates-3x3-sheet-facing-up.png` - Gate sprites
- `loading-screen-background.png` - Loading screen
- `parallax-bottom-tiling.png` - Background layer (bottom)
- `parallax-middle-tiling.png` - Background layer (middle)
- `parallax-top-tiling.png` - Background layer (top)
- `player-3x3-sheet-facing-camera.png` - Player sprite (facing camera)
- `player-3x3-sheet-facing-down.png` - Player sprite (facing down)

## Requirements

### Functional Requirements
1. **Identical Gameplay**: All game mechanics must match Dragon Flight exactly
2. **Separate Route**: Accessible at `/games/dragon-rider`
3. **Asset Integration**: Use all new assets from `public/games/dragon-rider/`
4. **Vocabulary Loading**: Load vocabulary from 'dragon-rider' dataset
5. **XP/Results**: Integrate with existing game store for XP and results tracking

### File Structure
Create parallel structure to dragon-flight:
- `src/app/games/dragon-rider/page.tsx` - Game page component
- `src/app/games/dragon-rider/page.test.tsx` - Page tests
- `src/components/dragon-rider/DragonRiderGame.tsx` - Main game component
- `src/components/dragon-rider/DragonRiderGame.test.tsx` - Component tests
- `src/lib/dragonRider.ts` - Game logic (copied from dragonFlight.ts)
- `src/lib/dragonRider.test.ts` - Logic tests

### Visual Changes
1. **Title**: Change "Dragon Flight" to "Dragon Rider"
2. **Description**: Update to reflect the dragon rider theme
3. **Asset Paths**: Update all sprite paths to use `/games/dragon-rider/` assets
4. **Sprite Animations**: Adjust to work with new sprite orientations (facing-camera vs facing-up)

### Non-Requirements
- No gameplay changes
- No new features
- No changes to core game mechanics
- No changes to scoring or XP systems

## Acceptance Criteria
- [ ] Game is accessible at `/games/dragon-rider` route
- [ ] All dragon-rider assets are loaded and displayed correctly
- [ ] Game plays identically to Dragon Flight
- [ ] Vocabulary loads from 'dragon-rider' dataset
- [ ] XP and results are tracked correctly in game store
- [ ] All existing tests pass
- [ ] New tests achieve >80% code coverage
- [ ] Visual appearance uses dragon-rider theme throughout

## Technical Constraints
- Must follow existing React-Konva architecture
- Must maintain TDD workflow
- Must follow established code style and patterns from dragon-flight
- Asset paths must reference `/games/dragon-rider/` directory

## Success Metrics
- Code coverage >80%
- All tests passing
- Game loads and plays without errors
- Visual assets render correctly at all screen sizes
