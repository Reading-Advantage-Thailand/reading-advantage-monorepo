# Spec: Dragon Flight Track

## Overview
This track handles housekeeping for deployment and game selection, then delivers the Dragon Flight (Gate Runner) mini game described in `README.md`.

## Housekeeping Requirements

### 1. Static Site Build (GitHub Actions)
- Add a GitHub Actions workflow that builds a static Next.js site.
- Configure Next.js for static export (e.g., `output: 'export'`), and ensure the workflow produces a deployable artifact.
- The workflow should be non-interactive and aligned with the existing npm toolchain.

### 2. Game Covers on the Main Menu / Choice Screen
- Use cover images from `public/games/cover/`.
- Show all upcoming games alongside existing playable games.
- Each card should display: cover image, title, short description, and status (Play Now vs Coming Soon).
- Existing playable games: Magic Defense, RPG Battle.
- Upcoming games (covers already present):
  - Dragon Flight
  - Treasure Chest Rush
  - Light Barrier
  - Word Collapse
  - Magic Spell Scroll
  - Castle Tower Stack
  - Zombie Escape

### 3. Magic Defense Asset Swap
- Update the Magic Defense game to use assets from `public/games/magic-defense/`.
- Replace references for background, castles/health indicators, and enemies to align with the new asset set.
- Asset details:
  - `castles_3x2_sheet.png` is 1536x1024 (2 columns x 3 rows). Each castle frame is 768x341. Left column is blue (left/right castles), right column is yellow (center castle). Rows map to HP 3/2/1 from top to bottom.
  - `skeletons_3x3_pose_sheet.png` is 426x426 (3x3). Top row is the walking loop. Bottom two rows are 6 death frames in sequence.

## Dragon Flight Game Requirements

### Core Loop
- Duration: 30-second run.
- Each round presents a prompt term and two gates:
  - One gate shows the correct translation.
  - One gate shows a distractor translation from another vocabulary item.
- The player selects the left or right gate to advance.
- Correct gate adds a dragon to the flight.
- Incorrect gate removes a dragon (minimum 1 dragon remains).

### Controls
- Desktop: Left/Right arrow keys (and A/D as secondary bindings).
- Mobile: Tap the left/right gate.

### Boss Fight (End of Run)
- After 30 seconds, show a Skeleton King boss encounter.
- Boss power is based on the run: `bossPower = max(3, ceil(totalAttempts * 0.6))`.
- Victory if `dragonCount >= bossPower`, otherwise defeat.
- Display a results screen with outcome, dragon count, accuracy, and XP.

### XP + Progression
- Use the standard XP formula from `src/lib/xp.ts`:
  - `XP = Math.floor(correctAnswers * accuracy)`
- Expose XP via the game completion callback/store so the main platform can persist it.

### Visual/UX Notes
- Match the "Modern Clean" visual aesthetic (rounded UI, clear hierarchy).
- Provide distinct success/failure feedback on gate selection.
- Ensure responsive layout for mobile portrait and desktop.
- Prefer Framer Motion for animations (gate approach, dragon count changes, boss reveal).

## Out of Scope
- Multiple levels or gauntlet mode.
- Additional enemy types beyond the Skeleton King.
- 3D rendering or R3F integration.

## Open Questions
- Are there specific assets for Dragon Flight beyond the cover image?
- Should the dragon count increase by more than +1 for correct gates?
