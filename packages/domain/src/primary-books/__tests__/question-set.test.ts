import { describe, expect, it } from "vitest";
import { STUDENT_MCQ_COUNT, STUDENT_SAQ_COUNT, studentQuestionSet } from "../question-set.js";

describe("studentQuestionSet", () => {
  it("keeps the first five MCQs by order and the first SAQ", () => {
    const mcq = [5, 3, 0, 1, 4, 2, 6].map((order) => ({ order, question: `q${order}` }));
    expect(studentQuestionSet(mcq, STUDENT_MCQ_COUNT).map((q) => q.order)).toEqual([0, 1, 2, 3, 4]);
    expect(studentQuestionSet([{ order: 1, q: "b" }, { order: 0, q: "a" }], STUDENT_SAQ_COUNT)).toEqual([{ order: 0, q: "a" }]);
  });

  it("keeps the stored order for rows without an order and puts them after ordered rows", () => {
    const rows = [{ q: "x" }, { order: null, q: "y" }, { order: 0, q: "z" }];
    expect(studentQuestionSet(rows, 3).map((r) => r.q)).toEqual(["z", "x", "y"]);
    expect(studentQuestionSet([], 5)).toEqual([]);
  });
});
