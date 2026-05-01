---
title: Component Library / Design System
type: archive
status: deprecated
created_at: 2025-11-29
tags: [front-end, component-library, design-system, archive]
---
# Component Library / Design System

**Design System Approach:** Extend existing Advantage ecosystem design system with science-specific components while maintaining consistency across products

## Core Components

### Science Experiment Card

**Purpose:** Display experiment information with visual preview and safety indicators

**Variants:**

- Physics, Chemistry, Biology, Earth Science themes
- Completed, In-progress, Locked states
- Recommended vs. Self-selected

**States:**

- Default: Preview with basic information
- Hover: Expanded preview with safety requirements
- Active: Full experiment interface
- Disabled: Locked with prerequisite information

**Usage Guidelines:**

- Use consistent color coding for science disciplines
- Include safety level indicators
- Show estimated completion time
- Display prerequisite skills when locked

### Virtual Laboratory Controls

**Purpose:** Interactive controls for experiment manipulation

**Variants:**

- Equipment selection toolbar
- Measurement instruments
- Safety equipment controls
- Observation tools

**States:**

- Available: Ready for use
- In-use: Currently active
- Disabled: Not applicable to current experiment
- Error: Incorrect usage with guidance

**Usage Guidelines:**

- Large touch targets for mobile use
- Clear visual feedback for interactions
- Tooltips explaining function and safety
- Consistent placement across experiments

### Progress Visualization Components

**Purpose:** Show learning progress and achievement

**Variants:**

- Skill tree visualization
- Progress bars with milestones
- Achievement badges
- Streak counters

**States:**

- Current progress
- Completed milestones
- Future goals
- Locked content

**Usage Guidelines:**

- Use gamification elements appropriately for age groups
- Provide clear meaning for different visual indicators
- Ensure accessibility with alternative text and patterns
- Celebrate achievements appropriately

### Bilingual Content Display

**Purpose:** Seamless Thai/English content presentation

**Variants:**

- Primary language with secondary language toggle
- Side-by-side comparison for vocabulary
- Mixed content with proper language handling

**States:**

- Thai primary
- English primary
- Bilingual display
- Language switching animation

**Usage Guidelines:**

- Maintain proper text direction for each language
- Ensure font rendering quality for Thai characters
- Provide smooth language transitions
- Respect user language preferences