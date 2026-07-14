import { z } from "zod";

/**
 * Shared assignment lifecycle status.
 *
 * PB-4 (Wave 4) — single source of truth for the
 * `student_assignments.status` column. The lifecycle is:
 * `CREATED → ASSIGNED → IN_PROGRESS → COMPLETED`, with `OVERDUE`
 * flagged by the server when `dueDate` has passed and the assignment is
 * not `COMPLETED`.
 *
 * Legal transitions:
 *   CREATED → ASSIGNED
 *   ASSIGNED → IN_PROGRESS
 *   CREATED → IN_PROGRESS
 *   IN_PROGRESS → COMPLETED
 *   (any non-COMPLETED) → OVERDUE (server-derived)
 *
 * Disallowed transitions:
 *   COMPLETED → IN_PROGRESS (terminal state)
 *   COMPLETED → CREATED / ASSIGNED / OVERDUE
 */
export const AssignmentStatus = {
  CREATED: "CREATED",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  OVERDUE: "OVERDUE",
} as const;

export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const assignmentStatusSchema = z.enum([
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "OVERDUE",
]);

/**
 * Legal transitions between assignment statuses.
 * Any status NOT listed as a legal target throws `IllegalAssignmentTransitionError`.
 */
export const ALLOWED_ASSIGNMENT_TRANSITIONS: Readonly<Record<
  AssignmentStatus,
  readonly AssignmentStatus[]
>> = {
  CREATED: ["ASSIGNED", "IN_PROGRESS", "OVERDUE"],
  ASSIGNED: ["IN_PROGRESS", "OVERDUE"],
  IN_PROGRESS: ["COMPLETED", "OVERDUE"],
  COMPLETED: [],
  OVERDUE: ["IN_PROGRESS", "COMPLETED"],
};

/**
 * Question scoring rubric — distinguishes how a question is graded so reports
 * can report MCQ accuracy and open-ended accuracy separately.
 */
export const QuestionScoringRubric = {
  MCQ: "MCQ",
  OPEN_ENDED: "OPEN_ENDED",
} as const;

export type QuestionScoringRubric =
  (typeof QuestionScoringRubric)[keyof typeof QuestionScoringRubric];

/**
 * Sentinel error type so callers can detect illegal transitions explicitly
 * without relying on error-message substring matching.
 */
export class IllegalAssignmentTransitionError extends Error {
  readonly code = "ILLEGAL_ASSIGNMENT_TRANSITION";
  readonly from: AssignmentStatus;
  readonly to: AssignmentStatus;

  constructor(from: AssignmentStatus, to: AssignmentStatus) {
    super(
      `Illegal assignment status transition: ${from} -> ${to}. Allowed targets from ${from}: ${
        ALLOWED_ASSIGNMENT_TRANSITIONS[from].join(", ") || "(terminal)"
      }`,
    );
    this.from = from;
    this.to = to;
    this.name = "IllegalAssignmentTransitionError";
  }
}

/**
 * Validates that a transition from `from` to `to` is legal per
 * `ALLOWED_ASSIGNMENT_TRANSITIONS`. Throws `IllegalAssignmentTransitionError`
 * if the transition is illegal; returns `to` if it is legal.
 *
 * Defense A4 (vacuous-pass): both legal and illegal transitions are exercised
 * in PB-4 Red tests.
 */
export function assertLegalAssignmentTransition(
  from: AssignmentStatus,
  to: AssignmentStatus,
): AssignmentStatus {
  if (from === to) {
    return to;
  }
  const allowed = ALLOWED_ASSIGNMENT_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new IllegalAssignmentTransitionError(from, to);
  }
  return to;
}
