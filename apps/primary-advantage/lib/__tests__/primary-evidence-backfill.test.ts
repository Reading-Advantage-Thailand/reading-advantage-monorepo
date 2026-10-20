import { describe, expect, it } from "vitest";

import { movedQuizSourceRows } from "../primary-evidence-backfill";

const SCHOOL = "6455aefa-f64a-4db8-91e3-0ff0cdb29868";
const quiz = (id: string, createdAt: unknown = "2026-10-20T09:30:00.000Z", activityType = "MC_QUESTION") => ({ id, userId: "student-1", activityType, targetId: "article-1", createdAt, details: {} });

describe("movedQuizSourceRows", () => {
  it("lists a quiz row that a lesson repeat moved, with the user_activity source and the attempt's school", () => {
    const rows = movedQuizSourceRows([{ schoolId: SCHOOL, activities: [quiz("moved-1")] }], new Set());
    expect(rows).toEqual([{ payload: { sourceTable: "user_activity", rowId: "moved-1" }, schoolId: SCHOOL, occurredAt: new Date("2026-10-20T09:30:00.000Z") }]);
  });

  it("lists all three quiz types and leaves out other lesson activities", () => {
    const activities = [quiz("mc", undefined, "MC_QUESTION"), quiz("sa", undefined, "SA_QUESTION"), quiz("la", undefined, "LA_QUESTION"), quiz("cards", undefined, "SENTENCE_FLASHCARDS")];
    expect(movedQuizSourceRows([{ schoolId: SCHOOL, activities }], new Set()).map((row) => row.payload.rowId)).toEqual(["mc", "sa", "la"]);
  });

  it("leaves out an id that is still a live user_activity row, and lists an id once", () => {
    const rows = movedQuizSourceRows([{ schoolId: SCHOOL, activities: [quiz("live"), quiz("twice")] }, { schoolId: SCHOOL, activities: [quiz("twice")] }], new Set(["live"]));
    expect(rows.map((row) => row.payload.rowId)).toEqual(["twice"]);
  });

  it("leaves out an attempt without a school or without an activities array", () => {
    expect(movedQuizSourceRows([{ schoolId: null, activities: [quiz("a")] }, { schoolId: SCHOOL, activities: null }, { schoolId: SCHOOL, activities: { id: "b" } }], new Set())).toEqual([]);
  });

  it("leaves out an element without a string id or a valid time, and accepts a Date", () => {
    const at = new Date("2025-11-05T21:30:13.344Z");
    const activities = [null, { activityType: "MC_QUESTION", createdAt: at }, { ...quiz("no-time"), createdAt: undefined }, quiz("bad-time", "not a date"), quiz("date", at)];
    expect(movedQuizSourceRows([{ schoolId: SCHOOL, activities }], new Set())).toEqual([{ payload: { sourceTable: "user_activity", rowId: "date" }, schoolId: SCHOOL, occurredAt: at }]);
  });
});
