# Implementation Plan: XP Leaderboard & Session History

## Phase 1: Storage Layer

- [x] Task: Define session record schema and localStorage key.
  - [x] Create `types/leaderboard.ts` with `SessionRecord` and `LeaderboardState` types.
  - [x] Write unit tests for serialization/deserialization round-trips.
- [x] Task: Implement `useLeaderboard` hook.
  - [x] `recordSession(gameId, score, xp, accuracy)` — prepends to history, caps at 20 entries, updates per-game high score.
  - [x] `clearHistory()` — wipes all leaderboard data from localStorage.
  - [x] `getLeaderboard()` — returns current state.
  - [x] Write unit tests covering all three operations and the 20-entry cap.
- [x] Task: Measure — User Manual Verification 'Phase 1: Storage Layer' (Protocol in workflow.md)

## Phase 2: Leaderboard Page

- [x] Task: Create `/leaderboard` route and page component.
  - [x] Cumulative XP banner at top.
  - [x] Per-game best score table (game name, best score, best XP, last played).
  - [x] Recent sessions list (last 20 rows: date, game, score, XP, accuracy).
  - [x] "Clear History" button with confirmation dialog.
- [x] Task: Write component tests for leaderboard page.
  - [x] Empty-state render (no sessions yet).
  - [x] Populated-state render with fixture data.
  - [x] Clear history flow.
- [x] Task: Measure — User Manual Verification 'Phase 2: Leaderboard Page' (Protocol in workflow.md)

## Phase 3: End-Screen Integration

- [x] Task: Wire `useLeaderboard.recordSession` into shared end-screen component.
  - [x] Call `recordSession` after XP animation completes.
  - [x] Add "View Leaderboard" link button on end screen.
- [x] Task: Regression-test two representative end screens.
  - [x] Confirm existing XP award flow is unaffected.
  - [x] Confirm session is written to localStorage.
- [x] Task: Measure — User Manual Verification 'Phase 3: End-Screen Integration' (Protocol in workflow.md)
