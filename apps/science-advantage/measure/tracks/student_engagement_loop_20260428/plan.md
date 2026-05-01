# Student Engagement Loop — Phase 4 Plan

## Phase 4: Dashboard and Profile Integration

### Task 1: GamificationDashboardCard component
- [x] Create `components/features/student/gamification-dashboard-card.tsx`
- [x] XP counter with level badge (thematic name like "Explorer")
- [x] XP progress bar toward next level (smooth fill via Radix Progress)
- [x] Current streak display with Flame icon
- [x] Recent achievements row showing last 3 unlocked badges
- [x] "View All Badges" link to profile
- [x] Fetches data from `/api/students/me/gamification`
- [x] Loading skeleton state, error state

### Task 2: Gamification API endpoint
- [x] Create `app/api/students/me/gamification/route.ts`
- [x] GET endpoint returns: xp, level, levelName, streak, recentAchievements (last 3), totalAchievements
- [x] Requires student auth via `getCurrentSession()`
- [x] Uses GamificationProfile and Achievement models
- [x] Returns 404 if no gamification profile exists

### Task 3: Student dashboard integration
- [x] `app/(student)/student/page.tsx` imports GamificationDashboardCard
- [x] Card displayed in Progress section of dashboard
- [x] Existing class cards and other sections preserved

### Task 4: Badges section on student profile
- [x] `StudentBadgesSection` component exists at `components/features/student/mastery-profile/student-badges-section.tsx`
- [x] Shows all earned badges in grid with icon, name, description, unlock date
- [x] Shows locked badges as grayed-out with "Locked" badge
- [x] Fetches achievements from `/api/students/[studentId]/achievements`
- [x] Wired into `StudentMasteryProfile` component
