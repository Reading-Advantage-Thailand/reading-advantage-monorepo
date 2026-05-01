# Student Engagement Loop — Spec

## Overview

Implement a gamification celebration system that rewards student achievement with visual feedback: confetti, badge unlocks, level-up overlays, and XP progress animations. All animations use CSS/canvas — no external animation libraries.

## Requirements

### Confetti Celebration
- Canvas-based particle system (20/50/80 particles by intensity)
- Particles: colored rectangles and circles falling with gravity, fading in last second
- Design-system colors: forest green, terracotta coral, warm tan, gold
- Auto-removes after 3 seconds
- Respects `prefers-reduced-motion` — shows static "Congratulations!" badge instead

### Badge Unlock Animation
- Bounce-in scale animation (0 → 1.2 → 1.0)
- Glow pulse box-shadow effect
- Shows badge name and description
- Auto-dismiss after 4 seconds or click to dismiss
- Respects `prefers-reduced-motion`

### Level-Up Animation
- Full-screen overlay with semi-transparent backdrop
- Old level name → arrow → new level name
- CSS particle-burst circles radiating outward
- Auto-dismiss after 5 seconds or click to dismiss
- Respects `prefers-reduced-motion`

### XP Progress Bar
- CSS transition: `width 1s ease-out` on `.xp-progress-fill`

## Accessibility
- All animations respect `prefers-reduced-motion: reduce`
- Proper ARIA labels on celebration overlays
- Click-to-dismiss on all overlays
- Reduced motion fallback: static content without animation
