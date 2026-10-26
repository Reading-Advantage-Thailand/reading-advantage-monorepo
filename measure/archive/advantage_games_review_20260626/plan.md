# Implementation Plan: Advantage Games Review

> **Track ID:** `advantage_games_review_20260626`  
> **Parent:** `monorepo_feature_review_masterplan_20260626`

---

## Phase 0: Setup and Inventory

- [b] Task: Confirm fresh `graph.db` and record `advantage-games` file/node/function counts. — deferred:review-execution
- [b] Task: Create `measure/audit-reports/advantage-games_20260626/`. — deferred:review-execution
- [b] Task: Inventory all games, shared runtime modules, assets, tests, E2E helpers, and integration points. — deferred:review-execution
- [b] Task: Create initial `game-readiness-matrix.md`. — deferred:review-execution

## Phase 1: Shared Runtime Review

- [b] Task: Review game shell, routing, shared state, scoring, XP, leaderboard, persistence, and difficulty systems. — deferred:review-execution
- [b] Task: Review asset loading, audio behavior, performance, and mobile/responsive support. — deferred:review-execution
- [b] Task: Record shared runtime findings. — deferred:review-execution

## Phase 2: Per-Game Review

- [b] Task: Review each game for functional correctness, curriculum fit, completion conditions, scoring, accessibility, and mobile behavior. — deferred:review-execution
- [b] Task: Update `game-readiness-matrix.md` for every game. — deferred:review-execution
- [b] Task: Separate defects that affect one game from defects caused by shared runtime. — deferred:review-execution

## Phase 3: Embeddability Review

- [b] Task: Review import contracts for Reading and Primary. — deferred:review-execution
- [b] Task: Identify duplicated game code across apps and reusable package opportunities. — deferred:review-execution
- [b] Task: Propose integration/remediation tracks. — deferred:review-execution

## Phase 4: Gates and Reporting

- [b] Task: Run targeted tests/E2E/lint/build gates appropriate for Advantage Games and record results. — deferred:review-execution
- [b] Task: Complete all required artifacts. — deferred:review-execution
- [b] Task: Run Measure phase acceptance and feed accepted findings into the final roadmap. — deferred:review-execution
