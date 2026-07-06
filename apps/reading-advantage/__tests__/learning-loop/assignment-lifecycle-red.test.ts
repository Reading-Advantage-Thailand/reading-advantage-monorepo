/**
 * PB-8 Red Test — Assignment lifecycle + overdue detection
 *
 * Evidence refs: Reading M-RA-PB-8; site-closures/M-RA-PB-8.md.
 *
 * Today `getStudentAssignments` maps string status to integers via
 * `statusToInt` and does not compute an overdue state from `dueDate`.
 * The fix must use a shared `AssignmentStatus` enum and mark assignments
 * whose `dueDate` is in the past as OVERDUE (unless already COMPLETED).
 *
 * Falsification conditions:
 *  - If an overdue assignment is not flagged as OVERDUE, the assertion fails.
 *  - If COMPLETED assignments are incorrectly flagged as OVERDUE, the
 *    negative-control assertion fails.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  const schema = jest.requireActual("@reading-advantage/db/schema");

  function fluent(returnValue: any) {
    const chain: any = {};
    chain.where = () => chain;
    chain.innerJoin = () => chain;
    chain.leftJoin = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.offset = () => Promise.resolve(returnValue);
    // The first query (count) is awaited directly from the chain; the second
    // goes through limit().offset(). We return the same Promise both ways.
    chain.then = (cb: any) => Promise.resolve(returnValue).then(cb);
    return chain;
  }

  let rowReturnValue: any = [];
  let countReturnValue: any = [{ count: 0 }];

  const mockDb = new Proxy({} as any, {
    get(_target, prop: string) {
      if (prop === "_setTestData") {
        return (count: any, rows: any) => {
          countReturnValue = count;
          rowReturnValue = rows;
        };
      }
      if (prop === "select") {
        return (fields: any) => ({
          from: (table: any) => {
            if (table === schema.studentAssignments) {
              // Heuristic: if selecting count, return count; otherwise rows.
              const isCount = fields && typeof fields === "object" && "count" in fields;
              return fluent(isCount ? countReturnValue : rowReturnValue);
            }
            return fluent([]);
          },
        });
      }
      return () => fluent([]);
    },
  });

  return {
    ...actual,
    db: mockDb,
  };
});

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

import { getStudentAssignments } from "@/server/controllers/assignment-controller";
import { db } from "@reading-advantage/db";

function makeRequest(studentId: string, sessionUser: any): ExtendedNextRequest {
  const req = new NextRequest(
    `http://localhost:3000/api/v1/assignments?studentId=${studentId}`,
    { method: "GET" }
  ) as ExtendedNextRequest;
  req.session = { user: sessionUser };
  return req;
}

describe("PB-8 assignment lifecycle + overdue detection (Red)", () => {
  const sessionUser = {
    id: "student-1",
    role: "STUDENT",
    schoolId: "school-a",
    license_id: "license-a",
  };

  function setData(status: string, dueDate: Date) {
    (db as any)._setTestData(
      [{ count: 1 }],
      [
        {
          id: "sa-1",
          studentId: "student-1",
          status,
          createdAt: new Date(),
          assignmentId: "a-1",
          classroomId: "c-1",
          articleId: "article-1",
          assignmentTitle: "Assignment",
          assignmentDescription: null,
          dueDate,
          articleTitle: "Article 1",
          articleSummary: null,
          classroomName: "Class 1",
          studentName: "Student 1",
        },
      ]
    );
  }

  it("flags an overdue NOT_STARTED assignment as OVERDUE", async () => {
    setData("NOT_STARTED", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

    const res = await getStudentAssignments(makeRequest("student-1", sessionUser));
    const body = await res.json();

    const assignment = body.assignments[0];
    expect(assignment).toBeDefined();
    expect(assignment.status).toBe("OVERDUE");
  });

  it("does not flag a COMPLETED assignment as OVERDUE even when past due", async () => {
    setData("COMPLETED", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

    const res = await getStudentAssignments(makeRequest("student-1", sessionUser));
    const body = await res.json();

    const assignment = body.assignments[0];
    expect(assignment).toBeDefined();
    expect(assignment.status).toBe("COMPLETED");
  });
});
