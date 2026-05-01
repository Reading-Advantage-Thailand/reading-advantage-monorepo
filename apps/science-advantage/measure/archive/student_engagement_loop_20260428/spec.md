# Specification: Student Engagement Loop

## Overview

The student experience currently lacks any emotional reward or progression feedback. Students read content blocks, take quizzes, and see a score. There is no reason to return. This track builds a gamification and engagement system that gives students visible progression, rewards for effort, and emotional feedback on completion.

The goal is not to add frivolous decorations but to create a **learning motivation loop**: effort → visible progress → reward → desire to continue.

## Functional Requirements

### 1. XP and Level System
- Every completed lesson awards XP based on score quality (e.g., 100 XP for 90%+, 75 XP for 80%+, 50 XP for passing)
- Quiz attempts award bonus XP for first-attempt success
- A visible XP counter and level badge appear on the student dashboard and profile
- Levels are named thematically (e.g., "Explorer", "Scientist", "Researcher") to match the expedition theme

### 2. Streaks and Daily Engagement
- Track consecutive days of lesson activity
- Show current streak on dashboard with a flame/fire icon
- Streak milestones (7-day, 30-day) award bonus XP and visual celebration
- Streak resets after 24 hours of inactivity with a gentle "come back" message, not punishment

### 3. Achievement Badges
- Define 8-12 achievement badges tied to meaningful milestones:
  - "First Steps" (complete first lesson)
  - "Perfect Score" (100% on any quiz)
  - "Unit Champion" (complete all lessons in a unit)
  - "Science Explorer" (complete 10 lessons)
  - "Lab Partner" (complete all labs in a unit)
  - "Bilingual Scholar" (complete a lesson in Thai mode)
- Badges appear on the student profile with unlock dates
- New badge unlocks trigger a celebration animation

### 4. Celebration Animations
- Confetti particle burst on quiz completion (scale with score: bigger burst for higher scores)
- Progress bar fill animation when lesson is marked complete
- Badge unlock animation (badge scales up with glow effect, then settles into profile)
- Level-up animation with particle effects
- All animations respect `prefers-reduced-motion` — substitute static indicators when reduced motion is preferred

### 5. Dashboard Progress Visualization
- Replace the current "Progress" card with a visual expedition map or progress trail
- Show completed lessons as filled nodes, current lesson as pulsing, upcoming as outlined
- XP progress bar toward next level
- Recent achievements row showing last 3 unlocked badges

### 6. Dead Code Cleanup
- Remove `hover-bounce` and `hover-wiggle` CSS class references from student dashboard (these classes are never defined)
- Remove or replace with actual hover effects from the design system

## Non-Functional Requirements

- All animations must use CSS transitions or lightweight canvas — no heavy animation libraries
- XP calculations must be deterministic and server-side (no client-side XP spoofing)
- Gamification state (XP, streaks, badges) must be stored in the database, not just localStorage
- All gamification UI must degrade gracefully if the backend is unavailable
- Reduced motion support is mandatory (WCAG 2.1 Level AA)

## Acceptance Criteria

1. A student completing a lesson sees XP awarded with a visible animation
2. A student completing a quiz sees a confetti celebration scaled to their score
3. The student dashboard shows current XP, level, streak, and recent badges
4. The student profile shows all earned badges with unlock dates
5. Achievement badges unlock with a celebration animation on the relevant action
6. All animations respect `prefers-reduced-motion`
7. Dead `hover-bounce`/`hover-wiggle` references are removed
8. XP and badge data persist across sessions in the database

## Out of Scope

- Leaderboards or social comparison features (could create anxiety)
- Real-time multiplayer or collaborative features
- Purchasable or lootable items
- Push notifications for streak reminders (deferred to notification system track)
