# Implementation Plan: Multiplayer Competitive Mode

## Phase 1: WebSocket Infrastructure [checkpoint: 394cc64]

- [x] Task: Set up WebSocket server with `ws` library. [0107ddc]
  - [x] Create `lib/multiplayer/ws-server.ts` with WebSocket server initialization.
  - [x] Implement connection lifecycle: open, message, close, error handlers.
  - [x] Add heartbeat mechanism (ping/pong every 30s, disconnect after 3 missed pongs).
  - [x] Write unit tests for connection lifecycle and heartbeat.
- [x] Task: Define message protocol types. [4ee9b4d]
  - [x] Create `types/multiplayer.ts` with all message types (join, leave, state_update, score_submit, round_start, round_end, game_over).
  - [x] Write unit tests for message serialization/deserialization.
- [x] Task: Implement client-side WebSocket hook. [ec906ce]
  - [x] Create `hooks/useMultiplayerSocket.ts` with connect, disconnect, send, and event listener APIs.
  - [x] Handle reconnection logic (retry 3 times with exponential backoff, 60s window).
  - [x] Write unit tests for connection, reconnection, and message handling.
- [x] Task: Measure — User Manual Verification 'Phase 1: WebSocket Infrastructure' (Protocol in workflow.md)

## Phase 2: Room Management [checkpoint: ee1e43a]

- [x] Task: Implement server-side room manager. [be10d7b]
  - [x] Create `lib/multiplayer/room-manager.ts` with create, join, leave, getRoom operations.
  - [x] Room code generation: 6-character alphanumeric, collision-checked.
  - [x] Room lifecycle: pending → active → completed → expired (10min inactivity).
  - [x] Host auto-promotion on disconnect.
  - [x] Write unit tests for all room operations and lifecycle transitions.
- [x] Task: Implement client-side lobby UI. [42c2a3f]
  - [x] Create `components/multiplayer/LobbyScreen.tsx` with create/join flows.
  - [x] Display room code, player list, and host controls (start, kick, transfer host).
  - [x] "Waiting for host..." state for non-host players.
  - [x] Write component tests for lobby interactions.
- [x] Task: Wire lobby to WebSocket server. [2548318]
  - [x] Host creates room via WebSocket message; server responds with room code.
  - [x] Players join via room code; server broadcasts player list update.
  - [x] Write integration tests for create/join flow.
- [x] Task: Measure — User Manual Verification 'Phase 2: Room Management' (Protocol in workflow.md)

## Phase 3: Game State Synchronization [checkpoint: 3bdad72]

- [x] Task: Implement server-authoritative game loop. [db7866e]
  - [x] Create `lib/multiplayer/game-session.ts` with game state machine.
  - [x] Server runs game tick at 20Hz, broadcasts state to all room clients.
  - [x] Server validates player inputs (word selections, answers) and updates authoritative state.
  - [x] Write unit tests for game state machine and input validation.
- [x] Task: Implement client-side game state consumer. [ca991c4]
  - [x] Create `hooks/useMultiplayerGameState.ts` that receives server state and renders locally.
  - [x] Send player inputs to server; display server-confirmed state.
  - [x] Handle latency compensation: optimistic UI for own inputs, rollback on rejection.
  - [x] Write unit tests for state consumption and input handling.
- [x] Task: Build `MultiplayerGameWrapper` component. [3ed7e77]
  - [x] Wraps existing game components, injecting server-authoritative state.
  - [x] Replaces local game state with server state when in multiplayer mode.
  - [x] Write component tests for wrapper integration.
- [x] Task: Measure — User Manual Verification 'Phase 3: Game State Synchronization' (Protocol in workflow.md)

## Phase 4: Scoring, Leaderboard & Anti-Cheat [checkpoint: 01e75c8]

- [x] Task: Implement server-side scoring engine. [fa743f3]
  - [x] Server calculates scores from validated inputs (correct answers, response time).
  - [x] Round progression: server tracks round number, triggers round transitions.
  - [x] Anti-cheat: reject score submissions that exceed maximum possible score for the round.
  - [x] Write unit tests for scoring calculations and anti-cheat validation.
- [x] Task: Build real-time scoreboard overlay. [6cd3888]
  - [x] Create `components/multiplayer/ScoreboardOverlay.tsx` showing all players' scores.
  - [x] Animate score changes with Framer Motion.
  - [x] Round transition screen: intermediate rankings between rounds.
  - [x] Write component tests for scoreboard rendering and animations.
- [x] Task: Build end-of-game podium screen. [01e75c8]
  - [x] Create `components/multiplayer/PodiumScreen.tsx` with final rankings.
  - [x] XP bonus calculation: 1st +50%, 2nd +25%, 3rd +10%.
  - [x] "Play Again" and "Leave Room" actions.
  - [x] Write component tests for podium display and XP calculation.
- [x] Task: Measure — User Manual Verification 'Phase 4: Scoring, Leaderboard & Anti-Cheat' (Protocol in workflow.md)

## Phase 5: Integration Testing & Polish [checkpoint: 5f39039]

- [x] Task: End-to-end multiplayer flow test. [ef2b944]
  - [x] Playwright test: 2 browser contexts, create room, join, play 1 round, verify scores.
  - [x] Test disconnect/reconnect scenario.
  - [x] Test host disconnect and auto-promotion.
- [x] Task: Mobile viewport verification. [ef2b944]
  - [x] Verify all multiplayer UI (lobby, scoreboard, podium) fits within 390×844.
  - [x] Test touch interactions for lobby and scoreboard.
- [x] Task: Performance benchmarking. [ef2b944]
  - [x] Measure WebSocket message latency under load (4 players, 20Hz updates).
  - [x] Verify <100ms state update latency target.
- [x] Task: Measure — User Manual Verification 'Phase 5: Integration Testing & Polish' (Protocol in workflow.md)
