# Spec: Teacher Delivery & Classroom Visibility

## Overview

Teachers need a direct operational workflow for running the curriculum. This
track focuses on class setup, curriculum preview, lesson assignment, and
progress visibility so that teacher tooling reflects the actual curriculum model
instead of placeholder dashboard cards.

## Functional Requirements

### FR-1: Curriculum-aware class setup

- Teachers must create or manage classes with a clear curriculum alignment.
- Class details must expose grade, framework, join code, and curriculum state.

### FR-2: Lesson preview before assignment

- Teachers must preview the exact lesson structure students will see.
- Preview should surface standards, lesson type, and content completeness.

### FR-3: Assignment and pacing workflow

- Teachers must be able to decide what their class should do next from the class
  detail surface.
- Curriculum progression should reflect the planned unit and lesson order.

### FR-4: Actionable progress visibility

- Class, student, and lesson detail views must expose progress and completion in
  a way that helps classroom planning.
- Placeholder widgets should be replaced by real signals or hidden.

## Non-Functional Requirements

- Teacher pages must remain fast under normal class sizes.
- The workflow must be understandable without requiring admin intervention.
- The same class data contract must support future analytics work.

## Acceptance Criteria

- [ ] Teachers can inspect a class and understand its curriculum state
- [ ] Teachers can preview lessons with standards and lesson-type fidelity
- [ ] Teachers have a concrete assignment/pacing path from class detail pages
- [ ] Placeholder dashboard surfaces are replaced or removed
- [ ] Progress views support teacher decision-making instead of generic reporting

## Out of Scope

- Full school administration tooling
- Parent communications workflows
