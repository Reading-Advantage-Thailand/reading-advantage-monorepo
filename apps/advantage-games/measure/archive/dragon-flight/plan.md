# Plan: Dragon Flight Track

## Phase 1: Housekeeping & Deployment Prep [checkpoint: 9ecfc83]
- [x] Task: Configure Next.js for static export and add a GitHub Actions workflow to build a static site artifact. [commit: 8b7cbb8, b64facd]
- [x] Task: Add cover-based cards for all upcoming games to the main menu/choice screen using `public/games/cover/`. [commit: 8b7cbb8, b8c981c, b64facd]
- [x] Task: Update Magic Defense asset references to use `public/games/magic-defense/`. [commit: 8b7cbb8, b64facd]
- [x] Task: Add unit/component tests for the main menu card data and asset mapping updates. [commit: 8b7cbb8, b8c981c, b64facd]
- [x] Task: Measure - User Manual Verification 'Phase 1: Housekeeping & Deployment Prep' (Protocol in workflow.md) [commit: 9ecfc83]

## Phase 2: Dragon Flight Core Logic [checkpoint: a2a0541]
- [x] Task: Define Dragon Flight state/types and gate selection logic (timer, attempts, accuracy, dragon count). [commit: 0b6d7c7]
- [x] Task: Implement boss fight resolution and XP calculation using `src/lib/xp.ts`. [commit: 0b6d7c7]
- [x] Task: Add unit tests for gate selection, dragon count adjustments, boss outcome, and XP output. [commit: 0b6d7c7]
- [x] Task: Measure - User Manual Verification 'Phase 2: Dragon Flight Core Logic' (Protocol in workflow.md) [commit: a2a0541]

## Phase 3: Dragon Flight UI & Interaction [checkpoint: 667d9f7]
- [x] Task: Build the Dragon Flight scene layout (prompt, gates, timer, dragon count). [commit: 61d06d8]
- [x] Task: Implement keyboard and touch input with success/failure feedback. [commit: 61d06d8]
- [x] Task: Add the boss fight/results screen UI and animation polish (Framer Motion). [commit: 61d06d8]
- [x] Task: Add component tests for key UI states (running, boss, results). [commit: 61d06d8]
- [x] Task: Measure - User Manual Verification 'Phase 3: Dragon Flight UI & Interaction' (Protocol in workflow.md) [commit: 667d9f7]

## Phase 4: App Integration & Final Polish
- [x] Task: Add the `/games/dragon-flight` route and integrate with `useGameStore` and XP completion flow. [commit: 53fe993]
- [x] Task: Promote Dragon Flight to a playable card on the main menu once the route is live. [commit: b2a237f]
- [x] Task: Final responsive tuning, accessibility checks, and mobile touch adjustments. [commit: 4c1d209]
- [x] Task: Measure - User Manual Verification 'Phase 4: App Integration & Final Polish' (Protocol in workflow.md)
