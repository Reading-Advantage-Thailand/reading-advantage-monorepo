/** @jest-environment node */
import { NextRequest } from "next/server";
import type { ExtendedNextRequest } from "@/server/controllers/auth-controller";

let selectResults: unknown[][] = [];
const insertedRows: Array<{ table: unknown; values: unknown }> = [];
const updatedRows: Array<{ table: unknown; values: unknown }> = [];
const conflictConfigs: unknown[] = [];
let conflictResult: unknown[] | undefined;

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  const schema = jest.requireActual("@reading-advantage/db/schema");

  function selection(rows: unknown[]) {
    const chain: any = {
      from: () => chain,
      where: () => chain,
      innerJoin: () => chain,
      leftJoin: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      offset: () => chain,
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
    };
    return chain;
  }

  const db = {
    select: jest.fn(() => selection(selectResults.shift() ?? [])),
    insert: jest.fn((table: unknown) => ({
      values: (values: unknown) => {
        insertedRows.push({ table, values });
        const returned = table === schema.assignments
          ? [{ id: "assignment-1" }]
          : [{ id: "student-assignment-1" }];
        const chain: any = {
          onConflictDoNothing: () => chain,
          onConflictDoUpdate: (config: unknown) => {
            conflictConfigs.push(config);
            return chain;
          },
          returning: async () => conflictResult ?? returned,
        };
        return chain;
      },
    })),
    update: jest.fn((table: unknown) => ({
      set: (values: unknown) => {
        updatedRows.push({ table, values });
        return { where: () => ({ returning: async () => [{ id: "updated" }] }) };
      },
    })),
  };
  return { ...actual, db };
});

import {
  postAssignment,
  updateAssignment,
} from "@/server/controllers/assignment-controller";
import { assignments, studentAssignments } from "@reading-advantage/db/schema";

function request(body: object, user: object): ExtendedNextRequest {
  const req = new NextRequest("http://localhost.test/api/v1/assignments", {
    method: "POST",
    body: JSON.stringify(body),
  }) as ExtendedNextRequest;
  req.session = { user } as never;
  return req;
}

const teacher = {
  id: "teacher-1",
  role: "TEACHER",
  school_id: "school-1",
};

describe("assignment controller writes", () => {
  beforeEach(() => {
    selectResults = [];
    insertedRows.length = 0;
    updatedRows.length = 0;
    conflictConfigs.length = 0;
    conflictResult = undefined;
  });

  it("stores the authorized teacher and article assignment type", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ count: 1 }],
      [{ id: "classroom-1" }],
      [{ id: "article-1" }],
      [],
      [],
    ];

    const response = await postAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          selectedStudents: ["student-1"],
        },
        teacher,
      ),
    );

    expect(response.status).toBe(200);
    const assignmentWrite = insertedRows.find((row) => row.table === assignments);
    expect(assignmentWrite?.values).toMatchObject({
      teacherId: "teacher-1",
      type: "ARTICLE",
    });
  });

  it("rejects a teacher without a classroom in the authorized school", async () => {
    selectResults = [[{ teacherId: "teacher-1" }], []];

    const response = await postAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          selectedStudents: ["student-1"],
        },
        teacher,
      ),
    );

    expect(response.status).toBe(403);
    expect(insertedRows).toHaveLength(0);
  });

  it("rejects an assignment writer without an authenticated teacher identity", async () => {
    const response = await postAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          selectedStudents: ["student-1"],
        },
        { role: "TEACHER", school_id: "school-1" },
      ),
    );

    expect(response.status).toBe(401);
    expect(insertedRows).toHaveLength(0);
  });

  it("rejects a terminal status regression before a write", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ id: "assignment-1" }],
      [{ studentId: "student-1" }],
      [{ status: "COMPLETED" }],
    ];

    const response = await updateAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          studentId: "student-1",
          updates: { status: "IN_PROGRESS" },
        },
        teacher,
      ),
    );

    expect(response.status).toBe(409);
    expect(insertedRows).toHaveLength(0);
    expect(updatedRows).toHaveLength(0);
  });

  it("preserves numeric status input for a legal transition", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ id: "assignment-1" }],
      [{ studentId: "student-1" }],
      [{ status: "NOT_STARTED" }],
    ];

    const response = await updateAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          studentId: "student-1",
          updates: { status: 1 },
        },
        teacher,
      ),
    );

    expect(response.status).toBe(200);
    const progressWrite = insertedRows.find((row) => row.table === studentAssignments);
    expect(progressWrite?.values).toMatchObject({ status: "IN_PROGRESS" });
    expect(conflictConfigs[0]).toMatchObject({ setWhere: expect.anything() });
  });

  it("rejects an unknown assignment status before a write", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ id: "assignment-1" }],
      [{ studentId: "student-1" }],
    ];

    const response = await updateAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          studentId: "student-1",
          updates: { status: "INVALID" },
        },
        teacher,
      ),
    );

    expect(response.status).toBe(400);
    expect(insertedRows).toHaveLength(0);
  });

  it("rejects a student outside the authorized classroom before a write", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ id: "assignment-1" }],
      [],
    ];

    const response = await updateAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          studentId: "student-foreign",
          updates: { status: "IN_PROGRESS" },
        },
        teacher,
      ),
    );

    expect(response.status).toBe(403);
    expect(insertedRows).toHaveLength(0);
    expect(updatedRows).toHaveLength(0);
  });

  it("returns conflict when a concurrent status update changes the observed row", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ id: "assignment-1" }],
      [{ studentId: "student-1" }],
      [{ status: "IN_PROGRESS" }],
    ];
    conflictResult = [];

    const response = await updateAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          studentId: "student-1",
          updates: { status: "COMPLETED" },
        },
        teacher,
      ),
    );

    expect(response.status).toBe(409);
    expect(conflictConfigs[0]).toMatchObject({ setWhere: expect.anything() });
  });

  it("returns conflict when another request inserts a completed row first", async () => {
    selectResults = [
      [{ teacherId: "teacher-1" }],
      [{ id: "classroom-1" }],
      [{ id: "assignment-1" }],
      [{ studentId: "student-1" }],
      [],
    ];
    conflictResult = [];

    const response = await updateAssignment(
      request(
        {
          classroomId: "classroom-1",
          articleId: "article-1",
          studentId: "student-1",
          updates: { status: "IN_PROGRESS" },
        },
        teacher,
      ),
    );

    expect(response.status).toBe(409);
    expect(conflictConfigs[0]).toMatchObject({ setWhere: expect.anything() });
  });
});
