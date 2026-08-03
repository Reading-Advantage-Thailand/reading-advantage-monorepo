import { describe, expect, it } from "vitest";
import {
  draftLessonSchema,
  lessonToWorkbookContent,
  workbookContentToLesson,
} from "./lesson-mapping";

describe("workbookContentToLesson", () => {
  it("maps normalized content to legacy field names", () => {
    const lesson = workbookContentToLesson({
      title: "The Library Map",
      cefrLevel: "A2",
      paragraphs: [
        { order: 0, text: "First." },
        { order: 1, text: "Second." },
      ],
      questions: [
        {
          questionId: "q-2",
          prompt: "Where is the map?",
          questionType: "multiple-choice",
          choices: ["A", "B"],
        },
      ],
      assets: [],
    });
    expect(lesson.lesson_title).toBe("The Library Map");
    expect(lesson.cefr_level).toBe("A2");
    expect(lesson.article_paragraphs).toEqual([
      { number: 1, text: "First." },
      { number: 2, text: "Second." },
    ]);
    expect(lesson.comprehension_questions).toEqual([
      { number: 2, question: "Where is the map?", options: ["A", "B"] },
    ]);
  });

  it("maps the unknown CEFR sentinel back to an empty field", () => {
    const lesson = workbookContentToLesson({
      title: "T",
      cefrLevel: "unknown",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [],
      assets: [],
    });
    expect(lesson.cefr_level).toBeUndefined();
  });

  it("numbers questions without a numeric id from their position", () => {
    const lesson = workbookContentToLesson({
      title: "T",
      cefrLevel: "A1",
      paragraphs: [{ order: 0, text: "p" }],
      questions: [
        {
          questionId: "custom",
          prompt: "Why?",
          questionType: "multiple-choice",
          choices: [],
        },
      ],
      assets: [],
    });
    expect(lesson.comprehension_questions[0].number).toBe(1);
  });
});

describe("lessonToWorkbookContent", () => {
  it("maps legacy fields to the normalized contract with q- ids", () => {
    const content = lessonToWorkbookContent({
      lesson_title: "The Library Map",
      cefr_level: "A2",
      article_paragraphs: [
        { number: 2, text: "Second." },
        { number: 1, text: "First." },
      ],
      comprehension_questions: [
        { number: 1, question: "Where?", options: ["A", "B"] },
      ],
    });
    expect(content.title).toBe("The Library Map");
    expect(content.cefrLevel).toBe("A2");
    expect(content.paragraphs).toEqual([
      { order: 0, text: "First." },
      { order: 1, text: "Second." },
    ]);
    expect(content.questions[0].questionId).toBe("q-1");
    expect(content.questions[0].questionType).toBe("multiple-choice");
    expect(content.questions[0].choices).toEqual(["A", "B"]);
  });

  it("defaults the cefr level to the unknown sentinel", () => {
    const content = lessonToWorkbookContent({
      lesson_title: "T",
      article_paragraphs: [{ number: 1, text: "p" }],
      comprehension_questions: [],
    });
    expect(content.cefrLevel).toBe("unknown");
  });

  it("drops blank paragraphs so the contract stays publishable", () => {
    const content = lessonToWorkbookContent({
      lesson_title: "T",
      cefr_level: "A1",
      article_paragraphs: [
        { number: 1, text: "  " },
        { number: 2, text: "kept" },
      ],
      comprehension_questions: [],
    });
    expect(content.paragraphs).toEqual([{ order: 0, text: "kept" }]);
  });

  it("preserves existing asset metadata", () => {
    const assets = [
      { key: "media/x.png", contentType: "image/png", byteSize: 3, checksum: "a" },
    ];
    const content = lessonToWorkbookContent(
      {
        lesson_title: "T",
        cefr_level: "A1",
        article_paragraphs: [{ number: 1, text: "p" }],
        comprehension_questions: [],
      },
      assets,
    );
    expect(content.assets).toEqual(assets);
  });

  it("round-trips through the editor schema", () => {
    const lesson = {
      lesson_title: "Round Trip",
      cefr_level: "B1",
      article_paragraphs: [{ number: 1, text: "para" }],
      comprehension_questions: [
        { number: 1, question: "Q?", options: ["x", "y"] },
      ],
    };
    expect(draftLessonSchema.safeParse(lesson).success).toBe(true);
    const restored = workbookContentToLesson(
      lessonToWorkbookContent(lesson),
    );
    expect(restored.lesson_title).toBe("Round Trip");
    expect(restored.cefr_level).toBe("B1");
    expect(restored.article_paragraphs).toEqual([
      { number: 1, text: "para" },
    ]);
    expect(restored.comprehension_questions).toEqual([
      { number: 1, question: "Q?", options: ["x", "y"] },
    ]);
  });
});

describe("draftLessonSchema", () => {
  it("rejects a lesson without a title", () => {
    const result = draftLessonSchema.safeParse({
      lesson_title: "",
      article_paragraphs: [],
      comprehension_questions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields outside the normalized contract", () => {
    const result = draftLessonSchema.safeParse({
      lesson_title: "T",
      article_paragraphs: [],
      comprehension_questions: [],
      writing_prompt: "not persisted",
    });
    expect(result.success).toBe(false);
  });
});
