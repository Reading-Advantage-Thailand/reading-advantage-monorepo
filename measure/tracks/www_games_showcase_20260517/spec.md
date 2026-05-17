# Specification: Create Advantage Games Showcase Page

## Overview

The company website currently has no showcase for `apps/advantage-games`, which contains 27 playable educational games (vocabulary and sentence games). This track creates a dedicated games showcase page that highlights the actual implemented games, features, and capabilities.

## Current State

- No games page exists on www-reading-advantage
- Games are only accessible within reading-advantage and primary-advantage apps
- No marketing presence for the games arcade

## Actual Implementation (from apps/advantage-games)

### Game Arcade
- Standalone arcade home with game cards
- Leaderboard with XP tracking, per-game high scores, recent sessions
- 27 playable games across 2 categories

### Vocabulary Games (Word/Phrase Translation)
- Magic Defense, RPG Battle, Dragon Flight, Dragon Rider
- Enchanted Library, Wizard vs Zombie, Rune Match
- Alchemist's Synthesis, Archer's Revenge, Paladin's Twin-Soul

### Sentence Games (Sentence Ordering)
- Castle Defense, Potion Rush, Dungeon Liberator
- Spellweaver's Run, Shadow Gate Dungeon, Rune Forge Chamber
- Village Guardian, Labyrinth of the Goblin King
- The Abyssal Well, Storm the Castle Tower
- Griffin Sky-Joust, Realm Carver, Griffin Rider's Escape
- Haunted Library, Gryphon Patrol, Devourer Slime, Babel's Architect

### Technical Features
- XP calculation: Math.floor(correctAnswers * accuracy)
- Per-game vocabulary JSON files
- API endpoints for game feeds, completion logging, rankings
- Mobile-first, portrait-oriented canvas rendering
- React-Konva HTML5 Canvas with Zustand state management

## Functional Requirements

### FR-1: Create Games Landing Page
- URL: `/games` or `/products/advantage-games`
- Hero section: "27 Educational Games" with animated counter
- Game categories: Vocabulary Games, Sentence Games

### FR-2: Game Cards Grid
- Display all 27 games in a responsive grid
- Each card: game name, category badge, brief description
- Visual distinction between vocabulary (purple/magic theme) and sentence (blue/castle theme)
- Hover effects showing game type icon

### FR-3: Feature Highlights
- XP System: How scoring works
- Leaderboard: Global and per-game rankings
- Adaptive Difficulty: Games adjust to player level
- Cross-Platform: Works in reading-advantage and primary-advantage

### FR-4: Gameplay Previews
- Static screenshots or animated GIFs of gameplay
- Show Dragon Flight, Wizard vs Zombie, Potion Rush as featured games
- Include device mockups (phone/tablet)

### FR-5: Integration Info
- Explain games are embedded in reading-advantage and primary-advantage
- CTA to try games in those platforms
- For schools: mention games are part of platform subscription

## Non-Functional Requirements

### NFR-1: Consistent Design
- Create new games-themed color palette (indigo/purple for magic, blue for castle)
- Follow existing product page layout patterns
- Use clay-inspired design tokens

### NFR-2: i18n Support
- Create EN, TH, and ZH locale entries for games page
- Game names may remain in English for brand consistency

### NFR-3: Performance
- Lazy load game card images
- Optimize for mobile (most games are portrait-oriented)

### NFR-4: Build Verification
- Page must build successfully
- No new lint errors

## Acceptance Criteria

1. Games showcase page exists and is accessible
2. All 27 games are listed with correct categorization
3. Page highlights XP system, leaderboard, and adaptive difficulty
4. Gameplay previews/screenshots included
5. Integration with reading/primary advantage mentioned
6. All three locale versions available
7. Build passes without errors
8. Mobile responsive layout

## Out of Scope

- Embedding actual playable games on marketing site
- Creating new game implementations
- Backend API changes
- Real-time leaderboard data from marketing site
