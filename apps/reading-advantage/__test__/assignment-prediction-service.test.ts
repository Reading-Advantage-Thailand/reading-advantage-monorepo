/**
 * Assignment Prediction Service Tests
 *
 * Verifies the at-risk SQL uses the unified Drizzle column name
 * `a.created_at` (not the legacy quoted Prisma column `a."createdAt"`).
 *
 * @jest-environment node
 */

const executeMock = jest.fn();

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  return {
    ...actual,
    db: { execute: (...args: unknown[]) => executeMock(...args) },
  };
});

import { PgDialect } from "drizzle-orm/pg-core";
import { getAtRiskStudents } from "../server/services/metrics/assignment-prediction-service";

const dialect = new PgDialect();

function renderSql(sqlObj: any): { text: string; params: unknown[] } {
  const q = dialect.sqlToQuery(sqlObj);
  return { text: q.sql, params: q.params };
}

describe("getAtRiskStudents SQL", () => {
  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockResolvedValue([]);
  });

  it("references a.created_at (unified Drizzle column), not the legacy a.\"createdAt\"", async () => {
    await getAtRiskStudents(undefined, undefined, undefined, 5);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const { text } = renderSql(executeMock.mock.calls[0][0]);

    expect(text).toMatch(/a\.created_at/);
    expect(text).not.toMatch(/a\."createdAt"/);
  });

  it("binds classroomId, schoolId, assignmentId, and limit as parameters", async () => {
    await getAtRiskStudents(
      "classroom-1",
      undefined,
      "assignment-1",
      7,
    );

    const { text, params } = renderSql(executeMock.mock.calls[0][0]);
    expect(text).toMatch(/\$\d+/);
    expect(params).toEqual(
      expect.arrayContaining(["assignment-1", "classroom-1", 7]),
    );
    // None of the user-supplied values should be inlined into the SQL text.
    expect(text).not.toContain("'classroom-1'");
    expect(text).not.toContain("'assignment-1'");
  });

  it("prefers classroom scoping over school scoping when both are provided", async () => {
    await getAtRiskStudents("classroom-1", "school-1", undefined, 3);

    const { text, params } = renderSql(executeMock.mock.calls[0][0]);
    expect(text).toMatch(/a\.classroom_id\s*=\s*\$\d+/);
    expect(text).not.toMatch(/c\.school_id\s*=/);
    expect(params).toContain("classroom-1");
    expect(params).not.toContain("school-1");
  });

  it("returns an empty array when the query yields no rows", async () => {
    executeMock.mockResolvedValueOnce([]);
    const out = await getAtRiskStudents();
    expect(out).toEqual([]);
  });
});
