# Implementation Plan - RPG Battle Selection Scene

This plan adds a mandatory pre-battle selection flow for hero, location, and enemy, and applies enemy multipliers to HP, damage range, and XP.

## Phase 1: Data Model & Selection State [checkpoint: 6a47620]
- [x] Task: Define selection configuration for heroes, locations, and enemies (labels, assets, multipliers). [commit: e3bc010]
- [x] Task: Extend RPGBattle store to track selection step state and enforce the selection order. [commit: 39577c5]
- [x] Task: Reset selection state on battle start/rematch. [commit: 38f0ba3]
- [x] Task: Add unit tests for selection state transitions and resets. [commit: 38f0ba3]
- [x] Task: Measure - User Manual Verification 'Phase 1: Data Model & Selection State' (Protocol in workflow.md) [commit: 6a47620]

## Phase 2: Selection UI (Modal Flow)
- [x] Task: Add RPG battle location backgrounds and stage new art assets needed for upcoming updates. [commit: 948e22b]
- [x] Task: Build modal-based selection UI for hero, location, and enemy. [commit: 5dd74bf]
- [x] Task: Gate battle start until all selections are confirmed; no back navigation. [commit: 4a68ff1]
- [x] Task: Add component tests for selection UI behavior (step locking and confirmation). [commit: 5dd74bf]
- [x] Task: Show selection images and explicit HP/XP values in the selection modal. [commit: 215f5c6]
- [x] Task: Measure - User Manual Verification 'Phase 2: Selection UI' (Protocol in workflow.md)

## Phase 3: Enemy Scaling (HP, Damage, XP) [checkpoint: 63e5e1a]
- [x] Task: Apply enemy multiplier to base enemy HP and initialize scaled current/max values. [commit: 63794be]
- [x] Task: Update enemy damage calculation to scale the upper bound by the multiplier. [commit: 63794be]
- [x] Task: Multiply base XP by the enemy multiplier and round to nearest integer. [commit: 63794be]
- [x] Task: Add unit tests for HP scaling, damage range scaling, and XP scaling. [commit: 63794be]
- [x] Task: Measure - User Manual Verification 'Phase 3: Enemy Scaling' (Protocol in workflow.md) [commit: 63e5e1a]

## Phase 4: Backgrounds & Responsive Behavior [checkpoint: 6acab48]
- [x] Task: Wire location selection to background assets. [commit: 67e4582]
- [x] Task: Ensure mobile portrait view uses a centered background slice (center-crop). [commit: 67e4582]
- [x] Task: Add UI tests for background selection mapping (desktop + mobile styles where feasible). [commit: 67e4582]
- [x] Task: Measure - User Manual Verification 'Phase 4: Backgrounds & Responsive Behavior' (Protocol in workflow.md) [commit: 6acab48]
