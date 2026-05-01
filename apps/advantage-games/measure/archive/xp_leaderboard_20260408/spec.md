# Track: XP Leaderboard & Session History

## Overview

Games already award XP at the end of each session, but scores disappear when the player navigates away. This track adds a lightweight persistent leaderboard so players can see their all-time high scores per game and their cumulative XP total — motivating replay and giving teachers a quick-glance view of student engagement.

## Functional Requirements

- Persist each completed game session (game ID, score, XP awarded, accuracy %, timestamp) to `localStorage`.
- Display a `/leaderboard` page listing:
  - Per-game high scores (best session score and XP).
  - Cumulative XP total across all games.
  - Recent session history (last 20 sessions).
- Expose a shared `useLeaderboard` hook consumed by all end-screen components to record a session on completion.
- End screens link to the leaderboard page.
- Leaderboard page supports clearing history (with confirmation).

## Non-Functional Requirements

- No backend required — `localStorage` only.
- Leaderboard page must render correctly on mobile (portrait).
- Recording a session must not block the end-screen XP animation.

## Acceptance Criteria

- [ ] Completing any game writes a session record to `localStorage`.
- [ ] `/leaderboard` renders per-game best scores and cumulative XP.
- [ ] Recent history list shows last 20 sessions with date, game name, score, and XP.
- [ ] Clearing history removes all records after user confirms.
- [ ] End screens display a "View Leaderboard" link after awarding XP.
- [ ] All new code has unit test coverage ≥80%.

## Out of Scope

- Server-side persistence or cross-device sync.
- Social/multiplayer leaderboards.
- Teacher-facing dashboards (separate track).
