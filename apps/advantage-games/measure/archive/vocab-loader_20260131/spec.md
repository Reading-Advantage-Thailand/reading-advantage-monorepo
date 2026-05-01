# Per-Game Vocabulary Loading System

## Overview

Replace the current hardcoded vocabulary system with a per-game JSON file loading system. Each game will have its own vocabulary/sentence file in `public/vocab/` that can be manually edited without requiring a rebuild.

## Functional Requirements

### FR-1: JSON Vocabulary Files
- Each game has a dedicated JSON file: `public/vocab/{game-name}.json`
- File structure: Array of `{ "term": string, "translation": string }` objects
- Files are loaded at runtime via fetch, not bundled at build time

### FR-2: Vocabulary Loader Utility
- Create a shared utility function to load vocabulary from JSON files
- Handle loading states (loading, success, error)
- Cache loaded vocabulary to avoid redundant fetches within a session

### FR-3: Fallback System
- If a game's vocabulary file is missing or fails to load, use `public/vocab/default.json`
- The default file contains generic vocabulary suitable for any game
- Log warnings to console when fallback is used

### FR-4: Game Migration
All 8 games will be migrated:
- **Word-based games** (6): enchanted-library, rune-match, wizard-vs-zombie, dragon-flight, rpg-battle, magic-defense
- **Sentence-based games** (2): potion-rush, castle-defense

### FR-5: File Naming Convention
Files named by game slug matching the route:
- `enchanted-library.json`
- `rune-match.json`
- `wizard-vs-zombie.json`
- `dragon-flight.json`
- `rpg-battle.json`
- `magic-defense.json`
- `potion-rush.json`
- `castle-defense.json`
- `default.json` (fallback)

## Non-Functional Requirements

### NFR-1: No Rebuild Required
Vocabulary changes take effect on page refresh without rebuilding the app.

### NFR-2: Type Safety
TypeScript types for vocabulary items remain enforced via runtime validation.

### NFR-3: Backwards Compatibility
Existing SAMPLE_VOCABULARY and SAMPLE_SENTENCES can remain as fallback data until all games are migrated.

## Acceptance Criteria

1. Each game loads vocabulary from its own JSON file in `public/vocab/`
2. Editing a JSON file and refreshing the browser shows updated vocabulary
3. If a game's file is missing, the default vocabulary loads without crashing
4. All 8 games function correctly with the new loading system
5. Console warns when fallback vocabulary is used

## Out of Scope

- Admin UI for editing vocabulary (manual JSON editing only)
- Multiple vocabulary sets per game (e.g., difficulty levels)
- Database storage or API-based vocabulary management
- Vocabulary metadata (categories, difficulty ratings, etc.)
