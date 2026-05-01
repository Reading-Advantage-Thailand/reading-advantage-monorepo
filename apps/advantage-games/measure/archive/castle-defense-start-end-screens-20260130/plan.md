# Plan: Castle Defense - Start and End Screens

## Pre-Implementation Checklist

Before starting ANY phase, the implementer MUST:
1. Read `spec.md` in this directory completely.
2. Review Wizard vs Zombie start/end overlays in `src/components/wizard-vs-zombie/WizardZombieGame.tsx`.
3. Review Potion Rush start/end patterns in `src/components/potion-rush/PotionRushStartScreen.tsx` and `src/components/potion-rush/PotionRushSummary.tsx`.
4. Review current Castle Defense start/end views in `src/components/castle-defense/CastleDefenseGame.tsx` and state fields in `src/lib/castleDefense.ts`.

---

## Phase 1: Data & XP Foundations [checkpoint: 937dc04]

### Task 1.1: Define performance metrics in state
- [x] Sub-task: Decide which breakdown metrics to show (waves survived, total enemies defeated, word accuracy or sentence completion). a3ca3a0
- [x] Sub-task: Write tests in `src/lib/__tests__/castleDefense.test.ts` for new metric fields: a3ca3a0
  - Initial values set on `createCastleDefenseState()`.
  - Metric updates during `advanceCastleDefenseTime()` and/or word collection.
- [x] Sub-task: Implement state fields and updates in `src/lib/castleDefense.ts`. a3ca3a0
- [x] Sub-task: Run tests: `CI=true npm test src/lib/__tests__/castleDefense.test.ts`. a3ca3a0

**Verification**: Tests pass and metrics update correctly. ✅

### Task 1.2: Add XP calculation helper
- [x] Sub-task: Write tests for `calculateCastleDefenseXP(score)` (ceil(score * 0.01)). 65963b3
- [x] Sub-task: Implement helper (location: `src/lib/castleDefense.ts` or a dedicated util if preferred). 65963b3
- [x] Sub-task: Run tests: `CI=true npm test src/lib/__tests__/castleDefense.test.ts`. 65963b3

**Verification**: XP helper returns expected rounded-up values. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 1: Data & XP Foundations' (Protocol in workflow.md)

---

## Phase 2: Start Screen [checkpoint: 6312920]

### Task 2.1: Build Castle Defense start screen component
- [x] Sub-task: Create `src/components/castle-defense/CastleDefenseStartScreen.tsx` patterned after Wizard vs Zombie. 3a77304
- [x] Sub-task: Include title, short rules/controls, and a sentence list (use `VocabularyItem[]`, show term + translation). 3a77304
- [x] Sub-task: Add CTA button that calls `onStart`. 3a77304
- [x] Sub-task: Write tests in `src/components/castle-defense/CastleDefenseStartScreen.test.tsx`: 3a77304
  - Renders title and rules section.
  - Renders sentence list entries.
  - Calls `onStart` when CTA clicked.
- [x] Sub-task: Run tests: `CI=true npm test src/components/castle-defense/CastleDefenseStartScreen.test.tsx`. 3a77304

**Verification**: Start screen renders and CTA works. ✅

### Task 2.2: Integrate start screen into game
- [x] Sub-task: Replace the inline start view in `CastleDefenseGame.tsx` with the new component. 3a77304
- [x] Sub-task: Ensure gameplay does not start until `onStart` is triggered. 3a77304
- [x] Sub-task: Verify list of sentences uses the same vocabulary passed to the game. 3a77304

**Verification**: Game start is gated by the new start screen. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 2: Start Screen' (Protocol in workflow.md)

---

## Phase 3: End Screen [checkpoint: 005e1e1]

### Task 3.1: Build Castle Defense end screen component
- [x] Sub-task: Create `src/components/castle-defense/CastleDefenseEndScreen.tsx` styled like Wizard vs Zombie. 4b1f0b6
- [x] Sub-task: Show final score, XP earned, and performance breakdown metrics. 4b1f0b6
- [x] Sub-task: Include Restart/Play Again button. 4b1f0b6
- [x] Sub-task: Write tests in `src/components/castle-defense/CastleDefenseEndScreen.test.tsx`: 4b1f0b6
  - Renders final score and XP line.
  - Renders performance metrics.
  - Calls restart handler when CTA clicked.
- [x] Sub-task: Run tests: `CI=true npm test src/components/castle-defense/CastleDefenseEndScreen.test.tsx`. 4b1f0b6

**Verification**: End screen renders required stats and CTA works. ✅

### Task 3.2: Integrate end screen into game flow
- [x] Sub-task: Replace the inline gameover/victory views in `CastleDefenseGame.tsx` with the new end screen component. 4b1f0b6
- [x] Sub-task: Use status to drive defeat vs victory messaging. 4b1f0b6
- [x] Sub-task: Wire XP value from `calculateCastleDefenseXP(score)` and metrics from state. 4b1f0b6
- [x] Sub-task: Update `onComplete` payload to use new XP and accuracy metric (if tracked). 4b1f0b6

**Verification**: End screen shows correct values on game over or victory. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 3: End Screen' (Protocol in workflow.md)

---

## Phase 4: Visual & Responsive Polish [checkpoint: 28a6cae]

### Task 4.1: Align styling with Wizard vs Zombie
- [x] Sub-task: Verify typography, spacing, and card styles match the existing Wizard vs Zombie tone. 9f6518a
- [x] Sub-task: Ensure sentence list is scrollable and readable on small screens. 9f6518a
- [x] Sub-task: Confirm buttons have proper focus/hover states. 9f6518a

**Verification**: Start and end screens are polished on desktop and mobile. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 4: Visual & Responsive Polish' (Protocol in workflow.md)

---

## Summary

**Track Goals:**
1. Add a Wizard vs Zombie-style start screen with sentence list.
2. Add a Wizard vs Zombie-style end screen with score, XP (1% rounded up), and performance breakdown.
3. Keep Castle Defense gameplay gated until start and surfaced with a polished end summary.

**Key Files to Modify:**
- `src/components/castle-defense/CastleDefenseGame.tsx`
- `src/components/castle-defense/CastleDefenseStartScreen.tsx`
- `src/components/castle-defense/CastleDefenseEndScreen.tsx`
- `src/lib/castleDefense.ts`
- `src/lib/__tests__/castleDefense.test.ts`
- `src/components/castle-defense/*.test.tsx`
