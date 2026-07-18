// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  SALES_CURRICULUM_EXPECTED_COUNTS,
  buildStaticSalesCurriculumRows,
} from "./static-seed";
import {
  curriculumGraphDigest,
  PINNED_SALES_CURRICULUM_COUNTS,
  PINNED_SALES_CURRICULUM_GRAPH_SHA256,
} from "./verify-sales-curriculum";

describe("Sales production curriculum contract", () => {
  it("has exact stable cardinalities and unique deterministic IDs", () => {
    expect(SALES_CURRICULUM_EXPECTED_COUNTS).toEqual({
      modules: 6,
      lessons: 26,
      rubrics: 8,
      scenarios: 8,
      quizQuestions: 13,
    });
    const first = buildStaticSalesCurriculumRows();
    const second = buildStaticSalesCurriculumRows();
    expect(second).toEqual(first);
    expect(PINNED_SALES_CURRICULUM_COUNTS).toEqual(
      SALES_CURRICULUM_EXPECTED_COUNTS,
    );
    expect(curriculumGraphDigest(first)).toBe(
      PINNED_SALES_CURRICULUM_GRAPH_SHA256,
    );
    const ids = [
      ...first.modules.map((row) => row.id),
      ...first.lessons.map((row) => row.id),
      ...first.rubrics.map((row) => row.id),
      ...first.scenarios.map((row) => row.id),
      ...first.quizQuestions.map((row) => row.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("binds every lesson/scenario/question and approves reviewed content", () => {
    const rows = buildStaticSalesCurriculumRows();
    const moduleIds = new Set(rows.modules.map((row) => row.id));
    const lessonIds = new Set(rows.lessons.map((row) => row.id));
    const rubricIds = new Set(rows.rubrics.map((row) => row.id));
    expect(rows.lessons.every((row) => moduleIds.has(row.moduleId))).toBe(true);
    expect(rows.lessons.every((row) => row.reviewStatus === "approved")).toBe(true);
    expect(rows.rubrics.every((row) => row.reviewStatus === "approved")).toBe(true);
    expect(rows.scenarios.every((row) =>
      lessonIds.has(row.lessonId) && rubricIds.has(row.rubricId))).toBe(true);
    expect(rows.quizQuestions.every((row) => lessonIds.has(row.lessonId))).toBe(true);
    for (const lesson of rows.lessons) {
      if (lesson.type === "theory") expect(lesson.content.trim()).not.toBe("");
      if (lesson.type === "roleplay") {
        expect(rows.scenarios.some((row) => row.lessonId === lesson.id)).toBe(true);
      }
      if (lesson.type === "quiz") {
        expect(rows.quizQuestions.some((row) => row.lessonId === lesson.id)).toBe(true);
      }
    }
  });
});
