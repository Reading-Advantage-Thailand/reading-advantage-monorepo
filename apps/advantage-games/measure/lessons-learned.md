# Lessons Learned

## Track: Shadow Gate Dungeon Compliance Audit (2026-04-26)
- Result: 25/25 passing after fixes (13 at start, 12 failures)
- Fixes: fullscreen, accessibility, text sizes, API factories, useSession/useScopedI18n, hook deps, component tests, asset dir
- Coverage: 88.67% overall (from 0%)
- **Key Learnings:**
  - Game already had solid rAF + pure tick architecture; only missing platform hooks
  - Adding aria-labels to selects improves both accessibility and testability
  - 49 tests across 6 files reaches 88% coverage efficiently from zero baseline

## Track: Spellweaver's Run Compliance Audit (2026-04-26)
- Result: 25/25 passing after fixes (13 at start, 12 failures)
- Fixes: fullscreen, accessibility, text sizes, calculateSpellweaversRunXP, difficulty tiers, SentenceItem typing, API factories, useSession, component tests, hook deps, unused imports, asset dir
- Coverage: 88.37% overall
- **Key Learnings:**
  - Adding useGameFullscreen + useAccessibilitySettings to an existing rAF game is straightforward
  - calculateSpellweaversRunXP reuses standard bonus pattern (accuracy + survival + speed + progression)
  - 6 component tests raise coverage from 0% to 80% efficiently

## Track: Rune Forge Chamber Compliance Audit (2026-04-26)
- Result: 25/25 passing (already compliant)
- Fixes: Accessibility labels on selects, page test i18n mock
- Coverage: 93.75% overall (100% logic, 90.72% component, 90% page)
- **Key Learnings:**
  - Well-architected games from previous work require minimal audit fixes
  - Label + htmlFor on selects improves both a11y and testability simultaneously
  - High baseline compliance means audit is primarily verification

**Previous audits (condensed):** Rune Forge Chamber, Spellweaver's Run, Village Guardian, Dungeon Liberator, Potion Rush, Rune Match, Castle Defense, Alchemists Synthesis, Wizard vs Zombie, RPG Battle, Magic Defense, Archer's Revenge, Griffin Sky-Joust, Realm Carver, Paladin's Twin-Soul, Dragon Rider, Storm Castle Tower, Abyssal Well, Labyrinth Goblin King, Gryphon Patrol, Griffin Riders Escape.
