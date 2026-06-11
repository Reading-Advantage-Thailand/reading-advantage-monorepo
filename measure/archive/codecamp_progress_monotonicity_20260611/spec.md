# Spec: CodeCamp Progress Monotonicity

## Problem

An approved GitHub PR marks its exercise lesson `completed`, but a later submission
through the lesson's built-in exercise form writes `in_progress` through the shared
progress upsert. This leaves contradictory data (`status = in_progress` with a populated
`completed_at`) and makes an approved lesson appear incomplete.

Production incident evidence for
`Reading-Advantage-Thailand/codecamp-exercise-vitest/pull/1`:

- PR review became `approved` at `2026-06-09 07:17:58 UTC`.
- The exercise progress row became `completed` at the same time.
- `codecamp.submitExercise` ran at `2026-06-09 07:33:08 UTC` and downgraded the row to
  `in_progress`.
- The affected production row was repaired on `2026-06-11`.

## Acceptance Criteria

1. Once CodeCamp lesson progress is `completed`, later writes of `in_progress` or
   `not_started` preserve `completed`.
2. New and not-yet-completed progress writes retain their current behavior.
3. A regression test covers the monotonic completion contract.
4. The affected production lesson remains `completed`, and no approved PR points to a
   non-completed exercise lesson.

## Out of Scope

- Durable webhook retry/DLQ behavior, owned by `webhook_review_reliability_20260605`.
- Changing the built-in exercise evaluator or PR review rubric.
