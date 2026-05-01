# Plan: Mobile Optimization (Portrait Mode)

## Phase 1: Investigation & Analysis [checkpoint: ae412cf]
- [x] Task: Use Chrome DevTools to audit **Rune Match** in mobile portrait mode.
    - [x] Sub-task: Identify specific CSS/Layout issues causing unreadable text.
    - [x] Sub-task: Take screenshots or log specific element dimensions needing change.
- [x] Task: Use Chrome DevTools to audit **Castle Defense** in mobile portrait mode.
    - [x] Sub-task: Inspect the Start Screen and identify why the button is cut off.
    - [x] Sub-task: Analyze the main game canvas scaling.
- [x] Task: Use Chrome DevTools to audit **Wizard vs Zombie** in mobile portrait mode.
    - [x] Sub-task: Measure the overlap between the D-pad and the translation text.
- [x] Task: Use Chrome DevTools to audit **Magic Defense** in mobile portrait mode.
    - [x] Sub-task: Determine the exact canvas dimensions vs. viewport width causing the cutoff.
- [ ] Task: Measure - User Manual Verification 'Phase 1: Investigation & Analysis' (Protocol in workflow.md)

## Phase 2: Castle Defense Optimization [checkpoint: e15d81d]
- [x] Task: Refactor Start Screen for Castle Defense.
    - [x] Sub-task: Implement adaptive styles to ensure the Start button is always visible.
- [x] Task: Optimize Castle Defense Main Game Layout.
    - [x] Sub-task: Adjust canvas sizing logic to fit mobile width.
- [ ] Task: Measure - User Manual Verification 'Phase 2: Castle Defense Optimization' (Protocol in workflow.md)

## Phase 3: Wizard vs Zombie Optimization [checkpoint: 2d9e89c]
- [x] Task: Relocate UI Elements.
    - [x] Sub-task: Move Translation/Target text to the top of the screen.
    - [x] Sub-task: Ensure no overlap with the bottom D-pad area.
- [ ] Task: Measure - User Manual Verification 'Phase 3: Wizard vs Zombie Optimization' (Protocol in workflow.md)

## Phase 4: Magic Defense Optimization [checkpoint: 6d142d5]
- [x] Task: Implement Responsive Canvas.
    - [x] Sub-task: Update game logic to calculate canvas size based on window width.
    - [x] Sub-task: Ensure assets scale or reposition correctly within the new bounds.
- [ ] Task: Measure - User Manual Verification 'Phase 4: Magic Defense Optimization' (Protocol in workflow.md)

## Phase 5: Rune Match Optimization [checkpoint: d4522d7]
- [x] Task: Improve Text & Grid Visibility.
    - [x] Sub-task: Adjust font sizes and grid cell dimensions for narrow screens.
    - [x] Sub-task: Ensure contrast and padding are sufficient for readability.
- [~] Task: Measure - User Manual Verification 'Phase 5: Rune Match Optimization' (Protocol in workflow.md)

## Phase 6: Final Verification
- [ ] Task: Fix `InvalidStateError` in Castle Defense (Circle.drawScene).
    - [ ] Sub-task: Investigate `fillPattern` usage or 0-dimension caching issues.
    - [ ] Sub-task: Verify `BackgroundLayer` sync and rendering.
- [ ] Task: Perform a final pass on all optimized games using DevTools mobile emulation to ensure consistency.
- [ ] Task: Measure - User Manual Verification 'Phase 6: Final Verification' (Protocol in workflow.md)
