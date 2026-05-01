# Spec: Student Learning Loop

## Overview

Turn the existing student surfaces into a complete and coherent learning loop.
Students should be able to enter the right class, open the correct lesson, move
through the lesson type-specific content, complete the quiz or activity, and
see what comes next without hitting placeholder or ambiguous states.

## Functional Requirements

### FR-1: Stable curriculum navigation

- Students must enter lessons through canonical class, unit, and lesson routes.
- Deep links must use canonical slugs and remain stable.

### FR-2: Complete lesson delivery

- Structured lesson content must render reliably for all supported block types.
- Lesson type-specific affordances must exist for explicit instruction, lab,
  fun review, and summative assessment.

### FR-3: Coherent quiz and completion flow

- Students must be able to start, complete, and review quizzes without route or
  data inconsistencies.
- Lesson completion status should update predictably across the student UI.

### FR-4: Bilingual scaffolding where the content requires it

- Thai support should appear where the content contract provides it.
- The UI must not present fake or empty translation affordances.

### FR-5: Meaningful post-lesson next step

- After quiz submission, the student should see a trustworthy recommendation,
  retry path, or curriculum fallback.

## Non-Functional Requirements

- Pages must work on classroom laptop and tablet widths.
- The learning loop must degrade gracefully when optional AI services fail.
- The default path must remain understandable to a student without teacher help.

## Acceptance Criteria

- [ ] Students can navigate class -> unit -> lesson on stable routes
- [ ] Each planned lesson type has a defined student rendering path
- [ ] Quiz submission updates completion and result surfaces coherently
- [ ] Thai scaffolding only appears when valid translated content exists
- [ ] Post-lesson next-step guidance remains useful with or without AI success

## Out of Scope

- Parent-facing reporting
- Broad gamification systems beyond what is needed for the core loop
