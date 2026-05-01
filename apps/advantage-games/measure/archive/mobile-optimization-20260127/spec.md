# Specification: Mobile Optimization (Portrait Mode)

## Overview
This track focuses on improving the mobile user experience, specifically for portrait orientation, across several key games. The goal is to implement adaptive layouts that reorganize UI elements and adjust game canvases to fit narrow screens without sacrificing playability or legibility, rather than simple scaling which often results in unreadable text.

## Functional Requirements

### General
- **Adaptive Layouts:** Games must detect mobile/portrait context and switch to a layout optimized for vertical screens.
- **Touch Targets:** Interactive elements (buttons, D-pads) must be at least 44x44px and positioned to avoid accidental touches or obstruction by hands.

### Specific Game Adjustments
1.  **Rune Match:**
    -   Improve text legibility on runes and translations.
    -   Ensure the grid fits within the screen width without text becoming microscopic.

2.  **Castle Defense:**
    -   Fix the Start Screen layout so the "Start" button is fully visible and easily clickable without scrolling.
    -   Ensure the main game map is viewable or follows the player appropriately.

3.  **Wizard vs Zombie:**
    -   Relocate the "Translation" or "Target Word" display to the top of the screen.
    -   Ensure the D-pad/controls at the bottom do not obscure critical gameplay information (like the word to translate).

4.  **Magic Defense:**
    -   Adjust the game canvas size to fit within the viewport width.
    -   Prevent critical game elements from being cut off on the sides.

## Non-Functional Requirements
-   **Performance:** Layout calculations should not introduce significant lag.
-   **Tooling:** Use the Chrome DevTools extension to inspect the current state and verify fixes in a mobile emulation environment.

## Out of Scope
-   Landscape mode optimizations (focus is strictly Portrait).
-   Major gameplay mechanic changes (only UI/UX adjustments).
