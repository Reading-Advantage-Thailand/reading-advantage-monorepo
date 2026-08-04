import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  draftLessonSchema,
  lessonToWorkbookContent,
  workbookContentToLesson,
} from "./lesson-mapping";

const ORIGINS_FIXTURE_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../lib/__fixtures__/origins-2-a0-lesson-01.json",
);

/**
 * Loads the real origins-2-a0 lesson 01 fixture as the legacy editor shape.
 * @returns The raw lesson object from the fixture file.
 */
function loadOriginsFixtureLesson(): unknown {
  return JSON.parse(readFileSync(ORIGINS_FIXTURE_PATH, "utf8"));
}

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

  it("rejects unknown fields outside the extended editor contract", () => {
    const result = draftLessonSchema.safeParse({
      lesson_title: "T",
      article_paragraphs: [],
      comprehension_questions: [],
      mystery_editor_field: "not a legacy lesson field",
    });
    expect(result.success).toBe(false);
  });
});

/**
 * A lesson populating every field the editor schema accepts.
 *
 * The real `origins-2-a0` fixture carries only 25 of these, so on its own it
 * cannot prove losslessness — a field with no mapping in either direction
 * round-trips "successfully" simply by being absent. The exhaustiveness test
 * below pins this constant to `draftLessonSchema`, so a field added to the
 * schema without a mapping fails here rather than silently dropping data.
 */
const MAXIMAL_LESSON = {
  lesson_number: "07",
  lesson_title: "The Library Map",
  level_name: "Origins 2",
  cefr_level: "A0",
  article_type: "nonfiction",
  genre: "informational",
  vocabulary: [
    {
      word: "atlas",
      phonetic: "/ˈatləs/",
      definition: "a book of maps",
      thai_definition: "สมุดแผนที่",
    },
  ],
  article_image_url: ["https://cdn.example.com/hero.png"],
  article_caption: "A reading room",
  article_url: "https://example.com/article",
  article_images: [
    {
      url: "https://cdn.example.com/inline.png",
      caption: "Shelves",
      image_prompt: "library shelves, warm light",
      position: "inline-para-2" as const,
    },
  ],
  article_paragraphs: [
    { number: 1, text: "The library has a map by the door." },
    { number: 2, text: "The map shows where each subject lives." },
  ],
  comprehension_questions: [
    { number: 1, question: "Where is the map?", options: ["By the door", "Outside"] },
  ],
  short_answer_question: "Why is a library map useful?",
  short_answer_hint: "Think about finding a book quickly.",
  sentence_starters: ["The map helps me because"],
  vocab_match: [
    {
      number: 1,
      word: "atlas",
      letter: "a",
      definition: "a book of maps",
      thai_definition: "สมุดแผนที่",
    },
  ],
  vocab_fill: [{ number: 1, sentence: "I used an ___ to find the river." }],
  vocab_word_bank: ["atlas", "shelf"],
  sentence_order_questions: [{ words: ["map", "the", "read", "I"] }],
  sentence_completion_prompts: [{ number: 1, prompt: "The library map shows" }],
  writing_prompt: "Describe how you would find a book.",
  writing_practice_url: "https://practice.example.com/lesson-07",
  writing_plan_prompts: ["What do you want to find?"],
  writing_sentence_frames: ["First, I would ___."],
  connection_question: "When did a map help you?",
  grammar_search_term: "present simple",
  phonics_focus: "short a",
  discussion_question: "Should every building have a map?",
  reflection_focus: "Finding information quickly",
  mc_answers: [{ number: 1, letter: "a", text: "By the door" }],
  vocab_match_answer_string: "1-a",
  vocab_fill_answer_string: "1. atlas",
  sentence_order_answers: [{ number: 1, sentence: "I read the map." }],
  translation_paragraphs: [{ label: "1", text: "ห้องสมุดมีแผนที่อยู่ที่ประตู" }],
};

describe("maximal lesson round-trip", () => {
  it("covers every field the editor schema accepts", () => {
    const schemaFields = Object.keys(draftLessonSchema.shape).sort();
    const fixtureFields = Object.keys(MAXIMAL_LESSON).sort();
    expect(fixtureFields).toEqual(schemaFields);
  });

  it("is accepted by the editor schema", () => {
    expect(draftLessonSchema.safeParse(MAXIMAL_LESSON).success).toBe(true);
  });

  it("keeps every field intact through save then load", () => {
    const saved = lessonToWorkbookContent(MAXIMAL_LESSON);
    const restored = workbookContentToLesson(saved);
    expect(restored).toEqual(MAXIMAL_LESSON);
  });

  it("keeps every field intact through load then save", () => {
    const saved = lessonToWorkbookContent(MAXIMAL_LESSON);
    const reSaved = lessonToWorkbookContent(workbookContentToLesson(saved));
    expect(reSaved).toEqual(saved);
  });

  it("carries the writing practice url through the normalized contract", () => {
    const saved = lessonToWorkbookContent(MAXIMAL_LESSON);
    expect(saved.writingPracticeUrl).toBe(
      "https://practice.example.com/lesson-07",
    );
  });
});

describe("origins-2-a0 lesson round-trip", () => {
  it("accepts the real fixture lesson under the extended editor schema", () => {
    const fixture = loadOriginsFixtureLesson();
    expect(draftLessonSchema.safeParse(fixture).success).toBe(true);
  });

  it("keeps every fixture field intact through save then load", () => {
    const fixture = loadOriginsFixtureLesson() as Parameters<
      typeof lessonToWorkbookContent
    >[0];
    const saved = lessonToWorkbookContent(fixture);
    const restored = workbookContentToLesson(saved);
    expect(restored).toEqual(fixture);
  });

  it("keeps every normalized field intact through load then save", () => {
    const fixture = loadOriginsFixtureLesson() as Parameters<
      typeof lessonToWorkbookContent
    >[0];
    const saved = lessonToWorkbookContent(fixture);
    const loaded = workbookContentToLesson(saved);
    const reSaved = lessonToWorkbookContent(loaded);
    expect(reSaved).toEqual(saved);
  });
});
