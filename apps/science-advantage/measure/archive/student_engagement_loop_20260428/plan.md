# Implementation Plan

## Phase 1: XP, Levels, and Progression Foundation

- [x] Task: Define database schema for gamification state
  - [x] Write tests for XP calculation, level thresholds, and badge unlock rules
  - [x] Add `GamificationProfile` model to Prisma schema (userId, xp, level, streak, lastActiveAt)
  - [x] Add `Achievement` model (userId, badgeType, unlockedAt)
  - [x] Run migration and verify schema
- [x] Task: Implement XP and level calculation service
  - [x] Write tests for XP award logic (lesson completion XP, quiz score bonus, first-attempt bonus)
  - [x] Write tests for level calculation (XP thresholds, level names)
  - [x] Implement `awardXp()` and `getLevel()` functions
  - [x] Wire XP award into quiz submission endpoint
- [x] Task: Implement streak tracking
  - [x] Write tests for streak calculation (consecutive days, reset logic)
  - [x] Implement streak update on lesson completion
  - [x] Implement streak milestone detection (7-day, 30-day)
- [ ] Task: Measure - Manual Verification 'XP and Streaks'
  - [ ] Verify XP is awarded after quiz submission
  - [ ] Verify streak increments on consecutive days

## Phase 2: Achievement Badges

- [x] Task: Define badge rules and unlock conditions
  - [x] Write tests for each badge type unlock logic
  - [x] Implement badge evaluation service (check conditions against user's completion data)
  - [x] Define 8-12 badge types with thematic names and descriptions (10 badges; BILINGUAL_SCHOLAR deferred)
- [x] Task: Wire badge unlocks to lesson/quiz completion
  - [x] Write tests for badge check triggered on completion events
  - [x] Add badge evaluation call to quiz submission endpoint
  - [x] Return newly unlocked badges in quiz response
- [ ] Task: Measure - Manual Verification 'Badge Unlocks'
  - [ ] Verify "First Steps" badge unlocks on first lesson completion
  - [ ] Verify "Perfect Score" badge unlocks on 100% quiz score

## Phase 3: Celebration Animations

- [x] Task: Implement confetti celebration component
  - [x] Write tests for confetti trigger and reduced-motion fallback
  - [x] Implement lightweight canvas confetti (no heavy library — use CSS animations or minimal canvas)
  - [x] Scale confetti intensity based on quiz score
  - [x] Respect `prefers-reduced-motion` — show static "Congratulations!" badge instead
- [x] Task: Implement progress animations
  - [x] Add fill animation to XP progress bar (CSS transition)
  - [x] Add scale-in animation for badge unlock (badge scales up with glow, settles)
  - [x] Add level-up particle effect (CSS keyframes)
  - [x] All animations respect reduced-motion preference
- [x] Task: Measure - Manual Verification 'Celebrations'
  - [x] Verify confetti fires on quiz completion
  - [x] Verify animations respect prefers-reduced-motion

## Phase 4: Dashboard and Profile Integration

- [x] Task: Replace student dashboard Progress card
  - [x] Write tests for gamification data display
  - [x] Build XP counter + level badge component
  - [x] Build streak display with flame icon
  - [x] Build recent achievements row (last 3 badges)
  - [x] Replace the current "Progress" card with the new gamification dashboard card
- [x] Task: Update student profile with badges
  - [x] Add badges section to `StudentMasteryProfile`
  - [x] Show earned badges with unlock dates in a grid
  - [x] Show locked badges as grayed-out with unlock requirements
- [x] Task: Remove dead code
  - [x] Remove `hover-bounce` and `hover-wiggle` CSS class references from student dashboard
  - [x] Verify no other references to undefined CSS classes
- [x] Task: Measure - Manual Verification 'Dashboard and Profile'
  - [x] Verify student dashboard shows XP, level, streak, and badges
  - [x] Verify student profile shows badge grid with unlock dates
  - [x] Verify dead CSS class references are removed
