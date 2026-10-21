// @vitest-environment node
/**
 * PR found on 2026-10-21 that the teacher assignment dashboard showed no student names: the
 * controller sent `displayName: undefined` for each student.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({ currentUser: vi.fn(), getCurrentUser: vi.fn() }));

import { toAssignmentStudent } from "../assignmentController";

const row = { studentAssignmentId: "sa-1", studentAssignmentStudentId: "st-1", studentName: "บีม", studentUsername: "bluetiger47" };

describe("toAssignmentStudent", () => {
  it("sends the student name and the status code", () => {
    expect(toAssignmentStudent({ ...row, studentAssignmentStatus: "IN_PROGRESS" })).toEqual({ id: "sa-1", studentId: "st-1", status: 1, displayName: "บีม" });
    expect(toAssignmentStudent({ ...row, studentAssignmentStatus: "COMPLETED" }).status).toBe(2);
  });

  it("counts a missing status as not started and falls back to the username", () => {
    expect(toAssignmentStudent({ ...row, studentAssignmentStatus: null, studentName: null })).toEqual({ id: "sa-1", studentId: "st-1", status: 0, displayName: "bluetiger47" });
  });
});
