/**
 * PB-5 Red Test — Reporting metrics correctness
 *
 * Evidence refs: Reading M-RA-PB-5; site-closures/M-RA-PB-5.md.
 *
 * Today `class-accuracy-controller.ts` reports MCQ and open-ended accuracy
 * separately, but the shared scoring rubric enum does not exist and the
 * overall accuracy is a simple unweighted blend.
 *
 * Falsification conditions:
 *  - If the shared scoring rubric enum is not added to `@reading-advantage/types`,
 *    the enum-export assertion fails.
 *  - If the controller collapses the two question types into a single
 *    accuracy figure, the separate-accuracy assertion fails.
 *  - If the overall accuracy is not weighted by question type for a mixed
 *    cohort, the weighted-overall assertion fails.
 *
 * @jest-environment node
 */

import { NextRequest } from "next/server";

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  const schema = jest.requireActual("@reading-advantage/db/schema");

  function fluent(returnValue: any) {
    const chain: any = Promise.resolve(returnValue);
    chain.where = () => chain;
    chain.innerJoin = () => chain;
    chain.gte = () => chain;
    chain.inArray = () => chain;
    chain.limit = () => chain;
    return chain;
  }

  let studentsReturnValue: any = [];
  let activitiesReturnValue: any = [];

  const mockDb = new Proxy({} as any, {
    get(_target, prop: string) {
      if (prop === "_setTestData") {
        return (students: any, activities: any) => {
          studentsReturnValue = students;
          activitiesReturnValue = activities;
        };
      }
      if (prop === "select") {
        return () => ({
          from: (table: any) => {
            if (table === schema.classroomTeachers) {
              return fluent([{ teacherId: "teacher-1" }]);
            }
            if (table === schema.classroomStudents) {
              return fluent(studentsReturnValue);
            }
            if (table === schema.userActivity) {
              return fluent(activitiesReturnValue);
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

import { getClassAccuracy } from "@/server/controllers/class-accuracy-controller";
import { db } from "@reading-advantage/db";

function makeRequest(classroomId: string, session: any): NextRequest {
  const req = new NextRequest(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/accuracy?timeframe=30d`,
    { method: "GET" }
  );
  (req as any).session = session;
  (req as any).params = { classroomId };
  return req;
}

describe("PB-5 reporting metrics correctness (Red)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exports a shared scoring rubric enum from @reading-advantage/types", () => {
    const types = require("@reading-advantage/types");
    expect(types.QuestionScoringRubric).toBeDefined();
  });

  it("MCQ-only cohort reports mcqAccuracy > 0 and openEndedAccuracy = 0", async () => {
    (db as any)._setTestData(
      [{ studentId: "student-1", studentName: "S1", level: 1, cefrLevel: "A1" }],
      [
        { userId: "student-1", activityType: "MC_QUESTION", details: { isCorrect: true } },
        { userId: "student-1", activityType: "MC_QUESTION", details: { isCorrect: true } },
        { userId: "student-1", activityType: "MC_QUESTION", details: { isCorrect: false } },
      ]
    );

    const res = await getClassAccuracy(
      makeRequest("classroom-1", { user: { id: "teacher-1", role: "TEACHER" } })
    );
    const body = await res.json();

    expect(body.classAverages.mcqAccuracy).toBeGreaterThan(0);
    expect(body.classAverages.openEndedAccuracy).toBe(0);
  });

  it("open-ended-only cohort reports mcqAccuracy = 0 and openEndedAccuracy > 0", async () => {
    (db as any)._setTestData(
      [{ studentId: "student-1", studentName: "S1", level: 1, cefrLevel: "A1" }],
      [
        { userId: "student-1", activityType: "SA_QUESTION", details: { score: 4 } },
        { userId: "student-1", activityType: "SA_QUESTION", details: { score: 2 } },
      ]
    );

    const res = await getClassAccuracy(
      makeRequest("classroom-1", { user: { id: "teacher-1", role: "TEACHER" } })
    );
    const body = await res.json();

    expect(body.classAverages.mcqAccuracy).toBe(0);
    expect(body.classAverages.openEndedAccuracy).toBeGreaterThan(0);
  });

  it("mixed cohort overall accuracy is weighted by question type", async () => {
    // 1 MCQ correct out of 1 = 100%; 3 open-ended, 1 correct = 33.33%.
    // Weighted by attempts: (1*100 + 3*33.33) / 4 = 50%.
    // Simple unweighted average of the two accuracies: 66.67%.
    (db as any)._setTestData(
      [{ studentId: "student-1", studentName: "S1", level: 1, cefrLevel: "A1" }],
      [
        { userId: "student-1", activityType: "MC_QUESTION", details: { isCorrect: true } },
        { userId: "student-1", activityType: "SA_QUESTION", details: { score: 4 } },
        { userId: "student-1", activityType: "SA_QUESTION", details: { score: 2 } },
        { userId: "student-1", activityType: "LA_QUESTION", details: { score: 1 } },
      ]
    );

    const res = await getClassAccuracy(
      makeRequest("classroom-1", { user: { id: "teacher-1", role: "TEACHER" } })
    );
    const body = await res.json();

    const expectedWeighted = (1 * 100 + 3 * (1 / 3) * 100) / (1 + 3);
    expect(body.classAverages.overallAccuracy).toBeCloseTo(expectedWeighted, 1);
  });
});
