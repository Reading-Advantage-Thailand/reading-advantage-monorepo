# Track: Games QA/QC - E2E Testing and Validation

## Overview

A comprehensive quality assurance and quality control (QA/QC) track to audit, test, and fix all 26 games in the Reading Advantage platform. Each game receives its own phase with Playwright E2E tests, unit test coverage verification, props/API validation, and visual screenshot capture.

## Games Inventory

### Vocabulary Games (Phase 1-9)
1. archers-revenge
2. dragon-flight
3. dragon-rider
4. enchanted-library
5. magic-defense
6. paladins-twin-soul
7. rpg-battle
8. rune-match
9. wizard-vs-zombie

### Sentence Games (Phase 10-26)
10. abyssal-well
11. castle-defense
12. devourer-slime
13. dungeon-liberator
14. griffin-riders-escape
15. griffin-sky-joust
16. gryphon-patrol
17. haunted-library
18. labyrinth-goblin-king
19. potion-rush
20. realm-carver
21. rune-forge-chamber
22. shadow-gate-dungeon
23. spellweavers-run
24. squires-gauntlet
25. storm-castle-tower
26. village-guardian

## Functional Requirements

### Per-Game Phase Requirements

Each phase must:

1. **Playwright E2E Tests**
   - Set up Playwright configuration (Phase 0 only)
   - Verify game page loads without errors
   - Verify game canvas/component renders correctly
   - Verify basic game interactions (start, play, end)
   - Capture screenshots during gameplay
   - Store screenshots in `public/games/{gameTitle}/`

2. **Unit Test Coverage Audit**
   - Run existing unit tests for the game
   - Verify all tests pass
   - Check coverage meets >80% threshold for game logic files
   - Document and fix failing tests

3. **Props/API Validation**
   - Verify correct prop types for all game components
   - Verify correct API route usage (vocabulary/sentence/complete/ranking)
   - Verify game configuration files use correct data structures
   - Fix any type mismatches or incorrect API usage

4. **Issue Resolution**
   - All issues discovered must be fixed within the phase
   - No issues left unresolved before moving to next game

### Phase 0: Playwright Setup

Initial setup phase before game testing begins:
- Install Playwright and browser dependencies
- Create Playwright configuration file
- Create shared test utilities/helpers
- Create base test fixtures for games
- Verify Playwright runs successfully

## Non-Functional Requirements

- Tests must run in CI environment (`CI=true` for non-interactive execution)
- Tests must be mobile-first (portrait 390×844 viewport)
- Screenshot capture must not slow down tests significantly
- Test execution should be parallelizable per game

## Acceptance Criteria

- [ ] All 26 games have passing E2E tests
- [ ] All 26 games have >80% unit test coverage
- [ ] All game props/APIs validated and correct
- [ ] Screenshots captured for all 26 games in `public/games/{gameTitle}/`
- [ ] All issues found are resolved (no open bugs from this track)
- [ ] Playwright configuration supports CI execution

## Out of Scope

- Performance/load testing
- Accessibility audit (WCAG compliance)
- Localization/i18n testing
- Backend API testing (beyond game integration)
- Cross-browser testing (Chrome-focused)

## Known Issues (from Lessons Learned)

The following issues were identified during previous tracks and should be addressed when found:

- **Lint Errors (Unescaped Entities):** `&apos;` and similar characters in `griffin-sky-joust`, `storm-castle-tower`
- **Hook Dependencies:** Missing dependencies in `useEffect` and `useCallback` hooks across multiple game components (Dragon Flight, Magic Defense)
- **TypeScript `any` Usage:** High usage of `any` type in page tests and some game logic files (Griffin Sky Joust, Realm Carver)
- **Unused Variables:** Many game pages and components have unused imports or variables (Gryphon Patrol, Potion Rush)
- **Callback Naming:** Inconsistent `onComplete` vs `onEnd` callback naming across games