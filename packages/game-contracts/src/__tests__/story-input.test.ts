import { describe, expect, it } from "vitest";

import {
  baseLevel,
  cefrLevelSchema,
  normalizeCefrLevel,
  parseStoryIndex,
  parseStoryInput,
  sentenceInputSchema,
  storyIndexSchema,
  storyInputSchema,
  toSentenceInput,
  toStoryIndexEntry,
  toVocabularyInput,
  vocabularyInputSchema,
} from "../index.js";

const story = {
  schemaVersion: 1,
  id: "pip-the-puppy",
  title: "Pip the Puppy",
  series: "Origins 2",
  lesson: 12,
  level: "A0",
  genre: "animal story",
  paragraphs: [
    { text: "Pip is a small puppy.", translation: "พิพเป็นลูกสุนัขตัวเล็ก" },
    { text: "Pip is a brave puppy now." },
  ],
  images: ["img-1.webp"],
  vocabulary: [
    { id: "w-brave", term: "brave", translation: "กล้าหาญ", definition: "not afraid" },
    { id: "w-puppy", term: "puppy", translation: "ลูกสุนัข", definition: "a young dog", phonetic: "ˈpʌpi" },
  ],
  sentences: [
    {
      id: "s-1",
      text: "Pip is a brave puppy now.",
      words: ["Pip", "is", "a", "brave", "puppy", "now."],
      translation: "ตอนนี้พิพเป็นลูกสุนัขที่กล้าหาญ",
      paragraph: 1,
    },
    { id: "s-2", text: "Pip is a small puppy.", words: ["Pip", "is", "a", "small", "puppy."] },
  ],
  fills: [{ id: "f-1", sentence: "Pip is a ___ puppy.", answer: "brave", paragraph: 1 }],
  questions: [
    { id: "q-1", question: "What is Pip?", options: ["a puppy", "a kitten"], answer: 0, paragraph: 0 },
  ],
  source: { file: "primary/origins-2/lesson-12.json", translationsGenerated: true },
} as const;

describe("story input contract", () => {
  it("accepts a complete story", () => {
    expect(storyInputSchema.parse(story)).toEqual(story);
    expect(parseStoryInput(story)).toEqual(story);
  });

  it("accepts a story with only questions", () => {
    const questionsOnly = { ...story, vocabulary: [], sentences: [], fills: [] };
    expect(storyInputSchema.safeParse(questionsOnly).success).toBe(true);
  });

  it.each([
    ["wrapper object", { story }],
    ["vocabulary array", [{ term: "brave", translation: "กล้าหาญ" }]],
    ["unknown field", { ...story, author: "unknown" }],
    ["uppercase id", { ...story, id: "Pip" }],
    ["unknown level", { ...story, level: "C2" }],
    ["no paragraphs", { ...story, paragraphs: [] }],
    ["no items", { ...story, vocabulary: [], sentences: [], fills: [], questions: [] }],
    ["duplicate item ids", { ...story, vocabulary: [story.vocabulary[0], story.vocabulary[0]] }],
    ["words that do not join to the sentence", {
      ...story,
      sentences: [{ ...story.sentences[1], words: ["Pip", "is", "small."] }],
    }],
    ["two blanks", { ...story, fills: [{ ...story.fills[0], sentence: "___ is a ___." }] }],
    ["HTML in a fill", { ...story, fills: [{ ...story.fills[0], sentence: "Pip is <b>___</b>." }] }],
    ["answer outside the options", { ...story, questions: [{ ...story.questions[0], answer: 2 }] }],
    ["duplicate options", { ...story, questions: [{ ...story.questions[0], options: ["a", "a"] }] }],
    ["paragraph outside the paragraphs", { ...story, fills: [{ ...story.fills[0], paragraph: 2 }] }],
    ["image outside the story folder", { ...story, images: ["../secret.png"] }],
  ])("rejects %s", (_label, candidate) => {
    expect(storyInputSchema.safeParse(candidate).success).toBe(false);
  });

  it("lists every problem in the parse error", () => {
    expect(() => parseStoryInput({ ...story, level: "C2", id: "Pip" }, "lesson 12")).toThrow(
      /Invalid lesson 12:\n(?:.*\n)*level: /u,
    );
  });
});

describe("derived inputs", () => {
  it("derives the canonical vocabulary array from the story words", () => {
    const derived = toVocabularyInput(storyInputSchema.parse(story));
    expect(derived).toEqual([
      { term: "brave", translation: "กล้าหาญ" },
      { term: "puppy", translation: "ลูกสุนัข" },
    ]);
    expect(vocabularyInputSchema.parse(derived)).toEqual(derived);
  });

  it("derives the canonical sentence array with an empty translation when the story has none", () => {
    const derived = toSentenceInput(storyInputSchema.parse(story));
    expect(derived).toEqual([
      { term: "Pip is a brave puppy now.", translation: "ตอนนี้พิพเป็นลูกสุนัขที่กล้าหาญ" },
      { term: "Pip is a small puppy.", translation: "" },
    ]);
    expect(sentenceInputSchema.parse(derived)).toEqual(derived);
  });
});

describe("CEFR levels", () => {
  it("reads workbook values with or without the CEFR prefix", () => {
    expect(normalizeCefrLevel("CEFR A0")).toBe("A0");
    expect(normalizeCefrLevel("cefr A0+")).toBe("A0+");
    expect(normalizeCefrLevel("A1")).toBe("A1");
    expect(() => normalizeCefrLevel("CEFR C2")).toThrow(/Unknown CEFR level/u);
  });

  it("drops the half step for the base level", () => {
    expect(baseLevel("A0+")).toBe("A0");
    expect(baseLevel("A1")).toBe("A1");
    expect(cefrLevelSchema.options).toContain("Pre-A1");
  });
});

describe("story index", () => {
  it("builds an index row with the first image as the cover and the review state", () => {
    const entry = toStoryIndexEntry(storyInputSchema.parse(story));
    expect(entry).toEqual({
      id: "pip-the-puppy",
      title: "Pip the Puppy",
      level: "A0",
      series: "Origins 2",
      lesson: 12,
      cover: "img-1.webp",
      reviewed: false,
    });
    expect(parseStoryIndex([entry])).toEqual([entry]);
  });

  it("omits the cover for a story without images and marks reviewed stories", () => {
    const entry = toStoryIndexEntry(
      storyInputSchema.parse({ ...story, images: [], source: { file: story.source.file } }),
    );
    expect(entry).not.toHaveProperty("cover");
    expect(entry.reviewed).toBe(true);
  });

  it("rejects duplicate story ids", () => {
    const entry = toStoryIndexEntry(storyInputSchema.parse(story));
    expect(storyIndexSchema.safeParse([entry, entry]).success).toBe(false);
    expect(() => parseStoryIndex([entry, entry])).toThrow(/Invalid story index/u);
  });
});
