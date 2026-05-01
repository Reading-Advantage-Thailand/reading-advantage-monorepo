# Specification: Lesson Type Differentiation

## Overview

The `LessonType` enum defines `LESSON`, `LAB`, `ASSESSMENT`, and `REVIEW` — but they all render through the same `LessonPlayer` with no visual or interaction differentiation. A lab should feel hands-on, an assessment should feel focused and timed, and a review should feel fun and game-like. Currently they all feel the same: a scrolling document with a quiz at the end.

This track gives each lesson type a distinct visual identity and interaction pattern.

## Functional Requirements

### 1. Lesson Type Visual Identity
Each lesson type gets a distinct color accent and icon treatment:
- **LESSON** (explicit instruction): Forest green accent, BookOpen icon. Clean, focused reading layout.
- **LAB** (hands-on investigation): Blue accent, FlaskConical icon. Safety-first visual cues, step-by-step procedure focus.
- **REVIEW** (fun review): Terracotta/coral accent, Gamepad2 icon. Playful visual treatment, larger text, more spacing.
- **ASSESSMENT** (summative assessment): Amber/gold accent, ClipboardCheck icon. Formal, focused layout with timer prominently displayed.

Visual differentiation must appear in:
- Lesson type badge on the curriculum view
- Header accent color on the lesson page
- Background subtle tint or border treatment on the lesson container

### 2. Lab-Specific Features
- **Safety Notice Banner**: If the lesson type is LAB, show a prominent safety notice at the top of the lesson ("Always follow your teacher's safety instructions")
- **Step-by-Step Procedure Mode**: Procedure blocks in labs render in a focused "step mode" — one step at a time with Next Step / Previous Step navigation, not all steps visible at once
- **Timer**: Optional timer widget for lab activities (teacher can set a duration, visible to student)
- **Materials Checklist**: Materials blocks in labs render as a checklist the student can tick off as they gather items

### 3. Assessment-Specific Features
- **Timed Mode**: Assessments display a countdown timer (configurable per assessment, default 30 minutes)
- **Question Navigator**: Show a grid of question numbers that color-code as answered/unanswered/reviewed
- **No Backwards Navigation by Default**: Assessments move forward-only (question 1 → 2 → 3) unless the student explicitly marks a question for review
- **Submission Confirmation**: Double-confirm on submit ("You have X unanswered questions. Are you sure?")
- **Score Delay**: After submission, show a "Grading..." animation for 2-3 seconds before revealing the score (creates anticipation)

### 4. Review-Specific Features
- **Game-Like Presentation**: Review questions render in a larger, more playful card format with bigger text
- **Immediate Feedback**: After each answer, immediately show correct/incorrect with a brief explanation (no waiting until the end)
- **Score Tracker**: Running score visible during the review ("3/5 correct so far!")
- **Encouraging Messages**: Randomized encouraging messages between questions ("Great job!", "Keep going!", "You're on fire!")

### 5. Curriculum View Differentiation
- In the `StudentCurriculumView` accordion, each lesson entry shows its type badge with the appropriate color and icon
- Lesson type badges use the color system: green (lesson), blue (lab), coral (review), gold (assessment)
- Lessons can be filtered by type in the curriculum view (optional toggle)

## Non-Functional Requirements

- Lab timer must work offline (client-side countdown) and sync with server when reconnected
- Assessment timer must be tamper-resistant (server stores the start time, client displays countdown)
- All lesson type features must degrade gracefully if JavaScript is disabled (content still readable)
- Game-like review features must respect `prefers-reduced-motion`

## Acceptance Criteria

1. Each lesson type has a distinct color accent and icon visible in curriculum view and on the lesson page
2. Lab lessons show a safety notice banner at the top
3. Lab procedure blocks render in step-by-step mode
4. Assessment lessons display a countdown timer
5. Assessment questions show a grid navigator with color-coded status
6. Review questions provide immediate per-question feedback
7. Review mode shows a running score tracker
8. Lesson type badge color matches the type (green/blue/coral/gold)
9. All features degrade gracefully without JavaScript

## Out of Scope

- Full game engine for review lessons (e.g., Jeopardy, wheel-spin) — that's a future gamification track
- Physical lab equipment integration or IoT sensors
- Proctoring or lockdown browser for assessments
- Adaptive assessment difficulty
