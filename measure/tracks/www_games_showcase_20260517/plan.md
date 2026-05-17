# Implementation Plan: Create Advantage Games Showcase Page

## Phase 1: Contract & Schema Definition

- [ ] Task: Audit games and define page structure
  - [ ] Review `apps/advantage-games` game list and categories
  - [ ] Document all 27 games with names and types
  - [ ] Define page URL structure (`/games` or `/products/advantage-games`)
  - [ ] Create content schema for game cards

## Phase 2: Test

- [ ] Task: Write tests for games page
  - [ ] Create test for game cards grid
  - [ ] Create test for category filtering
  - [ ] Create test for hero section
  - [ ] Verify tests fail (Red phase)

## Phase 3: Implement

### Phase 3a: Content & Locale

- [ ] Task: Create locale entries
  - [ ] Add games page content to `messages/en.json`
  - [ ] Add games page content to `messages/th.json`
  - [ ] Add games page content to `messages/zh.json`
  - [ ] Include: game names, descriptions, feature highlights

### Phase 3b: Page Components

- [ ] Task: Create games page route
  - [ ] Create `app/[locale]/(marketing)/games/page.tsx` or `/products/advantage-games/page.tsx`
  - [ ] Add to navigation if needed
  - [ ] Set up metadata and SEO

- [ ] Task: Build hero section
  - [ ] "27 Educational Games" headline with animated counter
  - [ ] Subtitle explaining game-based learning
  - [ ] CTA to explore games

- [ ] Task: Build game cards grid
  - [ ] Create reusable `GameCard` component
  - [ ] Display all 27 games in responsive grid
  - [ ] Category badges (Vocabulary/Sentence)
  - [ ] Theme colors (purple for magic, blue for castle)

- [ ] Task: Build features section
  - [ ] XP System explanation
  - [ ] Leaderboard highlights
  - [ ] Adaptive difficulty
  - [ ] Cross-platform integration

- [ ] Task: Build integration section
  - [ ] Explain games are in reading/primary advantage
  - [ ] CTA to try those platforms
  - [ ] School licensing info

### Phase 3c: Assets

- [ ] Task: Create game imagery
  - [ ] Design or capture game card thumbnails
  - [ ] Create featured game showcase (Dragon Flight, Wizard vs Zombie, Potion Rush)
  - [ ] Optimize all images

- [ ] Task: Assemble and verify
  - [ ] Build page
  - [ ] Add to sitemap
  - [ ] Test responsive layout

### Phase 3d: Quality Gates

- [ ] Task: Verify build and tests
  - [ ] Build passes
  - [ ] Lint clean
  - [ ] Tests pass (Green phase)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Update generated documentation
- [ ] Task: Manual verification (locales, mobile, performance)
