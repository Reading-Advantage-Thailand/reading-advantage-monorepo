import { describe, expect, it } from "vitest";

import type { LegacyWorkbookLesson } from "../legacy-workbook-importer.js";
import { getTranslations } from "./i18n/index.js";
import { buildLessonPlan, renderLessonPlan } from "./lesson-plan.js";
import { makeFullLesson, makeMinimalLesson } from "./lesson-fixture.js";

const full = makeFullLesson();
const cefrLevel = "A2";

describe("buildLessonPlan", () => {
  it("maps lesson fields and vocabulary word/definition pairs", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    expect(plan.lessonNumber).toBe(1);
    expect(plan.lessonTitle).toBe("The Night Sky");
    expect(plan.cefrLevel).toBe("A2");
    expect(plan.genre).toBe("science");
    expect(plan.articleType).toBe("expository");
    expect(plan.vocabulary).toEqual([
      { word: "orbit", definition: "The path a planet takes around a star." },
      { word: "gravity", definition: "The force that pulls things toward Earth." },
    ]);
  });

  it("numbers lessons from one based on the lesson index", () => {
    expect(buildLessonPlan(full, 4, cefrLevel, "en").lessonNumber).toBe(5);
  });

  it("builds four period plans with the 13-step grouping", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    expect(plan.periods).toHaveLength(4);
    expect(plan.periods.map(p => p.periodNumber)).toEqual([1, 2, 3, 4]);
    expect(plan.periods[0].steps.map(s => s.stepNumber)).toEqual([1, 2, 3, 4]);
    expect(plan.periods[1].steps.map(s => s.stepNumber)).toEqual([5, 6, 7]);
    expect(plan.periods[2].steps.map(s => s.stepNumber)).toEqual([8, 9, 10]);
    expect(plan.periods[3].steps.map(s => s.stepNumber)).toEqual([11, 12, 13]);
  });

  it("builds four objectives including the genre/title reading objective", () => {
    const lp = getTranslations("en").lessonPlan;
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    expect(plan.objectives).toHaveLength(4);
    expect(plan.objectives[0]).toBe(lp.objectiveRead("science", "The Night Sky"));
    expect(plan.objectives).toContain(lp.objectiveVocab);
    expect(plan.objectives).toContain(lp.objectiveComprehension);
    expect(plan.objectives).toContain(lp.objectiveWriting);
  });

  it("falls back to the untitled label for an empty lesson title", () => {
    const lp = getTranslations("en").lessonPlan;
    const untitledLesson = { ...makeMinimalLesson(), lesson_title: "" } as LegacyWorkbookLesson;
    const plan = buildLessonPlan(untitledLesson, 0, cefrLevel, "en");
    expect(plan.lessonTitle).toBe(lp.untitled);
    expect(plan.objectives[0]).toBe(lp.objectiveRead("", lp.untitled));
  });

  it("handles lessons without vocabulary or genre metadata", () => {
    const plan = buildLessonPlan(makeMinimalLesson(), 0, "A1", "en");
    expect(plan.vocabulary).toEqual([]);
    expect(plan.genre).toBeUndefined();
    expect(plan.articleType).toBeUndefined();
  });
});

describe("renderLessonPlan", () => {
  it("emits the lesson plan wrapper with the lesson id", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    const html = renderLessonPlan(plan);
    expect(html).toContain('<div class="tm-lesson-plan" id="lesson-1">');
    expect(html).toContain("Lesson 1: The Night Sky");
  });

  it("renders objectives as a list", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    const html = renderLessonPlan(plan);
    expect(html).toContain('<div class="tm-lesson-objectives">');
    const liCount = (html.match(/<li>/g) ?? []).length;
    expect(liCount).toBeGreaterThanOrEqual(4);
  });

  it("renders the vocabulary overview with escaped words and definitions", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    const html = renderLessonPlan(plan);
    expect(html).toContain('<div class="tm-vocab-overview">');
    expect(html).toContain("<strong>orbit</strong>: The path a planet takes around a star.");
    expect(html).toContain("<strong>gravity</strong>: The force that pulls things toward Earth.");
  });

  it("renders four period blocks inside the lesson plan", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    const html = renderLessonPlan(plan);
    expect((html.match(/<div class="tm-period" data-period=/g) ?? []).length).toBe(4);
  });

  it("renders lesson metadata for genre, type, CEFR, and duration", () => {
    const plan = buildLessonPlan(full, 0, cefrLevel, "en");
    const html = renderLessonPlan(plan);
    expect(html).toContain("Genre:</strong> science");
    expect(html).toContain("Type:</strong> expository");
    expect(html).toContain("CEFR:</strong> A2");
  });

  it("emits no undefined strings for a partial lesson", () => {
    const plan = buildLessonPlan(makeMinimalLesson(), 0, "A1", "en");
    const html = renderLessonPlan(plan);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain('<div class="tm-vocab-overview">');
  });

  it("renders Thai strings when lang is th", () => {
    const th = getTranslations("th");
    const plan = buildLessonPlan(full, 0, cefrLevel, "th");
    const html = renderLessonPlan(plan, undefined, "th");
    expect(html).toContain(th.lessonPlan.lesson);
  });
});
