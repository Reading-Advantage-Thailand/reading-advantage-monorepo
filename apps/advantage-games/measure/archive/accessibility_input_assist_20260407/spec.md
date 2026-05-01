# Track: Shared Accessibility and Input Assist Layer

## Overview

Provide reusable accessibility and assistive-input options so games are easier to use across skill levels and device constraints.

## Functional Requirements

- Define a shared accessibility settings model.
- Implement support for larger text and touch-target sizing.
- Add optional assist mode behaviors where applicable.
- Expose consistent configuration at game entry points.

## Non-Functional Requirements

- Accessibility settings must not break existing layouts on mobile.
- Feature flags/configs should be backward-compatible.

## Acceptance Criteria

- [x] Shared settings surface exists and can be read by multiple games.
- [x] At least two active games consume the assist layer.
  - [x] WizardZombieGame (vocabulary) - accessibility hook integrated, touch targets and text scaled
  - [x] DungeonLiberatorGame (sentence) - accessibility hook integrated, touch targets scaled
- [x] Updated games retain existing gameplay completion flow.
- [x] Accessibility behavior is documented for future tracks.

## Out of Scope

- Full WCAG certification pass.
- Localization overhaul.

