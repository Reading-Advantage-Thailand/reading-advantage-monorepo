/**
 * PB-4 Red Test — Assignment status shared enum & lifecycle
 *
 * Evidence refs: Reading M-RA-PB-4; site-closures/M-RA-PB-4.md.
 *
 * Today:
 *  - `@reading-advantage/types` does NOT export `AssignmentStatus`.
 *  - `apps/reading-advantage/server/controllers/assignment-controller.ts`
 *    uses a local `statusToInt` helper + ad-hoc string comparisons.
 *  - `packages/api/src/routers/progress.ts:54` passes `status: z.string()`
 *    into `updateLessonProgress`, which expects the enum union from
 *    `packages/domain/src/progress/schemas.ts`. This produces the baseline
 *    TS2322 that blocks aggregate check-types/test.
 *
 * Falsification conditions:
 *  - If `AssignmentStatus` is not added to `@reading-advantage/types`, the
 *    enum-export assertion fails.
 *  - If `progress.ts:54` is not aligned to the enum, `pnpm check-types` in
 *    `packages/api` still fails with TS2322.
 *  - If `updateAssignment` allows `COMPLETED -> IN_PROGRESS`, the lifecycle
 *    assertion fails.
 *
 * @jest-environment node
 */

import { execSync } from "child_process";
import { resolve } from "path";
import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

var selectMock: jest.Mock;
var fromMock: jest.Mock;
var whereMock: jest.Mock;
var limitMock: jest.Mock;
var updateMock: jest.Mock;
var insertMock: jest.Mock;
var returningMock: jest.Mock;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");

  selectMock = jest.fn();
  fromMock = jest.fn();
  whereMock = jest.fn();
  limitMock = jest.fn();
  updateMock = jest.fn();
  insertMock = jest.fn();
  returningMock = jest.fn();

  const mockDb: any = {};
  mockDb.select = selectMock.mockImplementation(() => mockDb);
  mockDb.from = fromMock.mockImplementation(() => mockDb);
  mockDb.where = whereMock.mockImplementation(() => mockDb);
  mockDb.limit = limitMock.mockResolvedValue([]);
  mockDb.update = updateMock.mockImplementation(() => mockDb);
  mockDb.set = jest.fn().mockImplementation(() => mockDb);
  mockDb.insert = insertMock.mockImplementation(() => mockDb);
  mockDb.values = jest.fn().mockImplementation(() => mockDb);
  mockDb.returning = returningMock.mockImplementation(() => mockDb);
  mockDb.onConflictDoUpdate = jest.fn().mockImplementation(() => mockDb);

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { updateAssignment } from "@/server/controllers/assignment-controller";

function makeRequest(body: object): ExtendedNextRequest {
  return new NextRequest("http://localhost:3000/api/v1/assignments", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as ExtendedNextRequest;
}

describe("PB-4 assignment status shared enum & lifecycle (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Teacher has access to classroom
    limitMock.mockImplementation(async () => {
      const lastFrom = fromMock.mock.calls[fromMock.mock.calls.length - 1]?.[0];
      const schema = jest.requireActual("@reading-advantage/db/schema");
      if (lastFrom === schema.classroomTeachers) {
        return [{ teacherId: "teacher-1" }];
      }
      if (lastFrom === schema.assignments) {
        return [{ id: "assignment-1", classroomId: "classroom-1" }];
      }
      return [];
    });

    returningMock.mockResolvedValue([
      {
        id: "student-assignment-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        status: "IN_PROGRESS",
      },
    ]);
  });

  it("exports AssignmentStatus from @reading-advantage/types", () => {
    const types = require("@reading-advantage/types");
    expect(types.AssignmentStatus).toBeDefined();
    expect(Object.keys(types.AssignmentStatus)).toEqual(
      expect.arrayContaining(["CREATED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "OVERDUE"])
    );
  });

  it("rejects illegal lifecycle transition COMPLETED -> IN_PROGRESS", async () => {
    // Simulate an existing COMPLETED student assignment by making the
    // upsert RETURNING report the previous status as COMPLETED. The controller
    // currently writes the requested status without checking transitions, so
    // this returns 200; after the fix it must return 4xx.
    returningMock.mockResolvedValue([
      {
        id: "student-assignment-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        status: "COMPLETED",
      },
    ]);

    const res = await updateAssignment(
      makeRequest({
        classroomId: "classroom-1",
        articleId: "article-1",
        studentId: "student-1",
        updates: { status: "IN_PROGRESS" },
      })
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("packages/api check-types exits 0 (proves progress.ts:54 TS2322 fixed)", () => {
    let exitCode: number;
    let stdout = "";
    let stderr = "";
    try {
      const result = execSync("pnpm check-types", {
        cwd: resolve(__dirname, "../../../../packages/api"),
        encoding: "utf-8",
        env: { ...process.env, CI: "true" },
      });
      exitCode = 0;
      stdout = result;
    } catch (err: any) {
      exitCode = err.status ?? 1;
      stdout = err.stdout?.toString() ?? "";
      stderr = err.stderr?.toString() ?? "";
    }

    // A3 labeled-integer parse: report the exact failing line if still red.
    const combined = `${stdout}\n${stderr}`;
    const hasProgressTs54Error = /progress\.ts\(54,/.test(combined) && combined.includes("TS2322");
    expect({
      exitCode,
      progressTs54TS2322: hasProgressTs54Error,
    }).toEqual({
      exitCode: 0,
      progressTs54TS2322: false,
    });
  });
});
