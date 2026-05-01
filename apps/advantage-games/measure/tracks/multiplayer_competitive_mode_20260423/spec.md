# Track: Multiplayer Competitive Mode

## Overview

Add real-time multiplayer competitive mode where 2-4 players join a room and compete in vocabulary/sentence games simultaneously. Players see each other's scores in real-time, progress through rounds together, and are ranked at the end. Similar to Quizlet Live but with the arcade game mechanics already established in the platform.

## Functional Requirements

### Room Creation & Joining
- Host creates a room and receives a 6-character alphanumeric room code.
- Players join via room code from a lobby screen.
- Host can start the game once 2-4 players are in the lobby.
- Host can kick players before the game starts.
- Room expires after 10 minutes of inactivity.
- Players can choose a display name and avatar (from existing game assets).

### WebSocket Communication
- Establish a WebSocket connection between client and server for each room.
- Handle player join/leave events with broadcast to all room members.
- Heartbeat mechanism to detect disconnected players.
- Graceful reconnection: if a player's connection drops, they can rejoin within 60 seconds using the room code.
- Fallback to long-polling if WebSocket is unavailable.

### Game State Synchronization
- All players in a room play the same game with the same vocabulary/sentence pack.
- Game parameters (difficulty tier, word count, time limit) set by host before starting.
- Server is authoritative for game state: word spawns, scoring, round timing.
- Clients render local state and send input events to server.
- Server broadcasts state updates at 20Hz tick rate (50ms intervals).
- Anti-cheat: server validates all score submissions; client-side score is display-only.

### Scoring & Leaderboard
- Real-time scoreboard overlay showing all players' current scores.
- Round-based progression: configurable number of rounds (3, 5, or 7).
- Between rounds, show a round summary with rankings.
- End-of-game podium screen with final rankings, XP awards, and stats.
- Bonus XP for top 3 finishers (1st: +50%, 2nd: +25%, 3rd: +10%).

### Host/Player Roles
- Host controls: game selection, difficulty, round count, start/stop.
- Host can transfer host role to another player.
- If host disconnects, auto-promote the next player in join order.
- Players see a "Waiting for host..." screen if host hasn't started.

## Non-Functional Requirements

- WebSocket server must handle 100 concurrent rooms (400 players).
- Latency target: <100ms for state updates on typical home connections.
- Room state must survive brief server restarts (in-memory with Redis backup).
- Mobile-first UI: all multiplayer UI elements fit within 390×844 portrait viewport.
- Accessible: screen reader announcements for player join/leave events.

## Technical Constraints

- WebSocket server: Node.js with `ws` library (no Socket.IO — keep bundle small).
- Room state: in-memory Map with Redis pub/sub for horizontal scaling (future).
- Client state management: Zustand store for multiplayer state, separate from game state.
- Integration with existing game components via a `MultiplayerGameWrapper` that injects server-authoritative state.

## Acceptance Criteria

- [ ] Host can create a room and share a 6-character code.
- [ ] Players can join a room using the code.
- [ ] Host can start the game; all players begin simultaneously.
- [ ] Real-time scoreboard updates during gameplay.
- [ ] Round transitions show intermediate rankings.
- [ ] End-of-game podium shows final rankings and XP bonuses.
- [ ] Disconnected players can reconnect within 60 seconds.
- [ ] Anti-cheat: server rejects invalid score submissions.
- [ ] All multiplayer UI fits within 390×844 portrait viewport.
- [ ] All new code has unit test coverage ≥80%.

## Out of Scope

- Persistent user accounts or matchmaking based on skill rating.
- Voice/text chat between players.
- Spectator mode.
- Cross-server horizontal scaling (Redis pub/sub structure designed but not implemented).
- Custom game creation by players (use pre-defined game/vocabulary packs only).
